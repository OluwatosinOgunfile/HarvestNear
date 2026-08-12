import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { canMutateAs } from "@/lib/security";

const validToken=(value:string)=>/^ExponentPushToken\[[A-Za-z0-9_-]+\]$/.test(value)||/^ExpoPushToken\[[A-Za-z0-9_-]+\]$/.test(value);

export async function POST(request:Request){
  const user=await getSessionUser();
  if(!canMutateAs(user))return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await request.json().catch(()=>null) as {token?:string;platform?:string;deviceName?:string}|null;
  if(!body?.token||!validToken(body.token)||!["android","ios"].includes(body.platform||""))return NextResponse.json({error:"Invalid push token"},{status:400});
  const sql=getDatabase();
  await sql`INSERT INTO mobile_push_tokens(user_id,expo_push_token,platform,device_name,last_seen_at) VALUES(${user.id},${body.token},${body.platform},${body.deviceName?.slice(0,120)||null},now()) ON CONFLICT(expo_push_token) DO UPDATE SET user_id=excluded.user_id,platform=excluded.platform,device_name=excluded.device_name,last_seen_at=now()`;
  return NextResponse.json({registered:true});
}

export async function DELETE(request:Request){
  const user=await getSessionUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await request.json().catch(()=>null) as {token?:string}|null;if(!body?.token)return NextResponse.json({error:"Invalid push token"},{status:400});
  const sql=getDatabase();await sql`DELETE FROM mobile_push_tokens WHERE user_id=${user.id} AND expo_push_token=${body.token}`;
  return NextResponse.json({removed:true});
}
