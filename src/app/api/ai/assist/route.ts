import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { faqKnowledge, groundedFaqFallback, listingFallback, runStructuredAi } from "@/lib/harvest-ai";
import { mobileCorsHeaders, mobileOptions } from "@/lib/mobile-cors";
import { checkRateLimit } from "@/lib/security";

export const runtime = "nodejs";
export const OPTIONS = mobileOptions;
const keyFor = (value:string) => createHash("sha256").update(value).digest("hex");

export async function POST(request: Request) {
  const headers=mobileCorsHeaders(request); const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
  const feature=String(body?.feature||""); const input=String(body?.input||"").trim();
  if(!input||input.length>1500)return NextResponse.json({error:"Enter a shorter request"},{status:400,headers});
  const user=await getSessionUser();
  if(feature!=="faq"&&!user)return NextResponse.json({error:"Authentication required"},{status:401,headers});
  if(feature==="listing"&&user?.role!=="farmer")return NextResponse.json({error:"Farmer account required"},{status:403,headers});
  if(!["listing","faq","photo"].includes(feature))return NextResponse.json({error:"Unsupported assistant feature"},{status:400,headers});
  if(!await checkRateLimit(request,`ai.${feature}`,feature==="faq"?30:20,86400,user?.id||"public"))return NextResponse.json({error:"Daily assistant limit reached. You can continue without AI."},{status:429,headers});
  const sql=getDatabase(); const cacheKey=keyFor(`${feature}:${input.toLowerCase()}:${feature==="photo"?JSON.stringify(body?.metadata||{}):""}`);
  const [cached]=await sql`SELECT response FROM ai_response_cache WHERE cache_key=${cacheKey} AND expires_at>now()`;
  if(cached)return NextResponse.json({...cached.response,cached:true},{headers});
  let result:Record<string,unknown>; let enhanced=false;
  if(feature==="listing"){
    const categories=await sql`SELECT id,name FROM produce_categories WHERE is_active ORDER BY name` as {id:string;name:string}[];
    const fallback=listingFallback(input,categories);
    const ai=await runStructuredAi("You assist Nigerian farmers. Return JSON only: title, description, categoryName, unit, badge. Never invent price, quantity, dates, certifications or health claims.",`Available categories: ${categories.map(x=>x.name).join(", ")}\nFarmer notes: ${input}`);
    const matched=categories.find(x=>x.name.toLowerCase()===String(ai?.categoryName||fallback.categoryName).toLowerCase());
    result={...fallback,...(ai?{title:String(ai.title||fallback.title).slice(0,100),description:String(ai.description||fallback.description).slice(0,500),unit:String(ai.unit||fallback.unit).slice(0,40),badge:String(ai.badge||fallback.badge).slice(0,50)}:{}),categoryId:matched?.id||fallback.categoryId,categoryName:matched?.name||fallback.categoryName}; enhanced=Boolean(ai);
  }else if(feature==="photo"){
    const meta=body?.metadata as Record<string,unknown>|undefined; const width=Number(meta?.width||0),height=Number(meta?.height||0),size=Number(meta?.fileSize||0);
    const warnings:string[]=[]; if(width<900||height<675)warnings.push("Use a picture at least 900 by 675 pixels for a clearer marketplace preview."); if(size>3*1024*1024)warnings.push("Compress this picture below 3 MB before uploading."); if(width&&height&&(width/height<1.15||width/height>1.7))warnings.push("A landscape picture close to 4:3 will frame the produce better.");
    const listing=listingFallback(input,await sql`SELECT id,name FROM produce_categories WHERE is_active ORDER BY name` as {id:string;name:string}[]); result={quality:warnings.length?"needs_attention":"ready",warnings,categoryId:listing.categoryId,categoryName:listing.categoryName};
  }else{
    const fallback=groundedFaqFallback(input); const context=faqKnowledge.map((x,i)=>`${i+1}. ${x.title}: ${x.answer}`).join("\n");
    const ai=await runStructuredAi("Answer only from the supplied HarvestNearU guidance. Return JSON only: answer and sourceTitle. If guidance is insufficient, answer exactly: I cannot confirm that from the Help Centre. Please create a support ticket.",`GUIDANCE:\n${context}\n\nQUESTION: ${input}`);
    result={answer:String(ai?.answer||fallback?.answer||"I cannot confirm that from the Help Centre. Please create a support ticket.").slice(0,900),sourceTitle:String(ai?.sourceTitle||fallback?.title||"Help Centre").slice(0,100)}; enhanced=Boolean(ai);
  }
  await sql`INSERT INTO ai_response_cache(cache_key,feature,response,expires_at) VALUES(${cacheKey},${feature},${JSON.stringify(result)}::jsonb,now()+interval '7 days') ON CONFLICT(cache_key) DO UPDATE SET response=excluded.response,expires_at=excluded.expires_at`;
  return NextResponse.json({...result,enhanced},{headers});
}
