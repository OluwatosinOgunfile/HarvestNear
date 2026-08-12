import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createSession, getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { canMutateAs, checkRateLimit } from "@/lib/security";

const hash=(value:string)=>createHash("sha256").update(value).digest("hex");

export async function POST(request:Request){
  const user=await getSessionUser();
  if(!canMutateAs(user)||!["admin","support"].includes(user.role))return NextResponse.json({error:"Forbidden"},{status:403});
  if(!await checkRateLimit(request,"auth.mobile_handoff",10,10*60,user.id))return NextResponse.json({error:"Too many console handoff attempts"},{status:429});
  const code=randomBytes(32).toString("base64url");const sql=getDatabase();
  await sql.transaction([
    sql`DELETE FROM mobile_web_handoffs WHERE user_id=${user.id} OR expires_at<=now() OR used_at IS NOT NULL`,
    sql`INSERT INTO mobile_web_handoffs(user_id,code_hash,expires_at) VALUES(${user.id},${hash(code)},now()+interval '2 minutes')`,
  ]);
  return NextResponse.json({handoffUrl:`/api/auth/mobile-handoff?code=${encodeURIComponent(code)}`});
}

export async function GET(request:Request){
  const code=new URL(request.url).searchParams.get("code")||"";
  if(!/^[A-Za-z0-9_-]{40,60}$/.test(code))return NextResponse.redirect(new URL("/?auth=signin",request.url));
  const sql=getDatabase();
  const [handoff]=await sql`UPDATE mobile_web_handoffs handoff SET used_at=now() FROM users WHERE handoff.code_hash=${hash(code)} AND handoff.used_at IS NULL AND handoff.expires_at>now() AND users.id=handoff.user_id AND users.is_active AND users.role IN ('admin','support') RETURNING handoff.user_id`;
  if(!handoff)return NextResponse.redirect(new URL("/?auth=signin",request.url));
  await createSession(String(handoff.user_id));
  return NextResponse.redirect(new URL("/admin",request.url));
}
