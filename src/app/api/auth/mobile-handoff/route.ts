import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createSession, getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { canMutateAs, checkRateLimit } from "@/lib/security";
import { isSuperAdminAccount, superAdminCredentialVersion, verifySuperAdminPassword } from "@/lib/super-admin";

const hash=(value:string)=>createHash("sha256").update(value).digest("hex");

export async function POST(request:Request){
  const user=await getSessionUser();
  if(!canMutateAs(user)||!["admin","support"].includes(user.role))return NextResponse.json({error:"Forbidden"},{status:403});
  const body=await request.json().catch(()=>null) as {password?:string}|null;
  if(!body?.password)return NextResponse.json({error:"Enter your password to unlock the console"},{status:400});
  if(!await checkRateLimit(request,"auth.mobile_handoff",10,10*60,user.id))return NextResponse.json({error:"Too many console handoff attempts"},{status:429});
  const code=randomBytes(32).toString("base64url");const sql=getDatabase();
  const [account]=await sql`SELECT id,email,role,password_hash IS NOT NULL AND password_hash=crypt(${body.password},password_hash) AS password_valid FROM users WHERE id=${user.id} AND is_active AND role IN ('admin','support') LIMIT 1`;
  const verified=account&&(isSuperAdminAccount(account)?verifySuperAdminPassword(body.password):Boolean(account.password_valid));
  if(!verified)return NextResponse.json({error:"Incorrect password"},{status:401});
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
  const [handoff]=await sql`UPDATE mobile_web_handoffs handoff SET used_at=now() FROM users WHERE handoff.code_hash=${hash(code)} AND handoff.used_at IS NULL AND handoff.expires_at>now() AND users.id=handoff.user_id AND users.is_active AND users.role IN ('admin','support') RETURNING handoff.user_id,users.email,users.role`;
  if(!handoff)return NextResponse.redirect(new URL("/?auth=signin",request.url));
  await createSession(String(handoff.user_id),{maxAgeMinutes:15,credentialVersion:isSuperAdminAccount(handoff)?superAdminCredentialVersion():null});
  return NextResponse.redirect(new URL("/admin",request.url));
}
