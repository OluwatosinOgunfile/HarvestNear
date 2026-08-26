import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { faqKnowledge, groundedFaqFallback, listingFallback, photoQualityFallback, runStructuredAi } from "@/lib/harvest-ai";
import { mobileCorsHeaders, mobileOptions } from "@/lib/mobile-cors";
import { checkRateLimit } from "@/lib/security";
import { searchIntentFallback } from "@/lib/search-intent";

export const runtime = "nodejs";
export const OPTIONS = mobileOptions;
const keyFor = (value:string) => createHash("sha256").update(value).digest("hex");

export async function POST(request: Request) {
  const headers=mobileCorsHeaders(request); const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
  const feature=String(body?.feature||""); const input=String(body?.input||"").trim();
  if(!input||input.length>1500)return NextResponse.json({error:"Enter a shorter request"},{status:400,headers});
  const user=await getSessionUser();
  if(!["faq","search"].includes(feature)&&!user)return NextResponse.json({error:"Authentication required"},{status:401,headers});
  if(feature==="listing"&&user?.role!=="farmer")return NextResponse.json({error:"Farmer account required"},{status:403,headers});
  if(!["listing","faq","photo","search"].includes(feature))return NextResponse.json({error:"Unsupported assistant feature"},{status:400,headers});
  const sql=getDatabase(); const cacheVersion=feature==="search"?"v2:":""; const cacheKey=keyFor(`${cacheVersion}${feature}:${input.toLowerCase()}:${feature==="photo"?JSON.stringify(body?.metadata||{}):""}`);
  const [cached]=await sql`SELECT response FROM ai_response_cache WHERE cache_key=${cacheKey} AND expires_at>now()`;
  if(cached)return NextResponse.json({...cached.response,cached:true},{headers});
  const dailyLimit=feature==="faq"?30:20;
  if(feature!=="search"&&!await checkRateLimit(request,`ai.${feature}`,dailyLimit,86400,user?.id||"public"))return NextResponse.json({error:"Daily assistant limit reached. You can continue without AI and try again tomorrow."},{status:429,headers});
  let result:Record<string,unknown>; let enhanced=false;
  if(feature==="search"){
    const fallback=searchIntentFallback(input);
    const ai=await runStructuredAi("Expand a Nigerian grocery shopping request into produce search terms. Return JSON only: terms (an array of at most 12 short ingredient or product names) and explanation. Do not provide a recipe and do not claim items are available.",input);
    const aiTerms=Array.isArray(ai?.terms)?ai.terms.map(String).filter(Boolean).slice(0,12):[];
    result={terms:[...new Set([...fallback.terms,...aiTerms].map((term)=>term.toLowerCase()))].slice(0,14),explanation:String(ai?.explanation||fallback.explanation).slice(0,140)}; enhanced=aiTerms.length>0;
  }else if(feature==="listing"){
    const categories=await sql`SELECT id,name FROM produce_categories WHERE is_active ORDER BY name` as {id:string;name:string}[];
    const fallback=listingFallback(input,categories);
    const ai=await runStructuredAi("You assist Nigerian farmers. Return JSON only: title, description, categoryName, unit, badge. Never invent price, quantity, dates, certifications or health claims.",`Available categories: ${categories.map(x=>x.name).join(", ")}\nFarmer notes: ${input}`);
    const matched=categories.find(x=>x.name.toLowerCase()===String(ai?.categoryName||fallback.categoryName).toLowerCase());
    result={...fallback,...(ai?{title:String(ai.title||fallback.title).slice(0,100),description:String(ai.description||fallback.description).slice(0,500),unit:String(ai.unit||fallback.unit).slice(0,40),badge:String(ai.badge||fallback.badge).slice(0,50)}:{}),categoryId:matched?.id||fallback.categoryId,categoryName:matched?.name||fallback.categoryName}; enhanced=Boolean(ai);
  }else if(feature==="photo"){
    const meta=body?.metadata as Record<string,unknown>|undefined; const width=Number(meta?.width||0),height=Number(meta?.height||0),size=Number(meta?.fileSize||0);
    const quality=photoQualityFallback(width,height,size);
    const listing=listingFallback(input,await sql`SELECT id,name FROM produce_categories WHERE is_active ORDER BY name` as {id:string;name:string}[]); result={...quality,categoryId:listing.categoryId,categoryName:listing.categoryName};
  }else{
    const fallback=groundedFaqFallback(input); const context=faqKnowledge.map((x,i)=>`${i+1}. ${x.title}: ${x.answer}`).join("\n");
    const ai=await runStructuredAi("Answer only from the supplied HarvestNearU guidance. Return JSON only: answer and sourceTitle. If guidance is insufficient, answer exactly: I cannot confirm that from the Help Centre. Please create a support ticket.",`GUIDANCE:\n${context}\n\nQUESTION: ${input}`);
    result={answer:String(ai?.answer||fallback?.answer||"I cannot confirm that from the Help Centre. Please create a support ticket.").slice(0,900),sourceTitle:String(ai?.sourceTitle||fallback?.title||"Help Centre").slice(0,100)}; enhanced=Boolean(ai);
  }
  await sql`INSERT INTO ai_response_cache(cache_key,feature,response,expires_at) VALUES(${cacheKey},${feature},${JSON.stringify(result)}::jsonb,now()+interval '7 days') ON CONFLICT(cache_key) DO UPDATE SET response=excluded.response,expires_at=excluded.expires_at`;
  return NextResponse.json({...result,enhanced},{headers});
}
