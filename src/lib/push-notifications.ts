import "server-only";
import { getDatabase } from "@/lib/db";

type PushJob={notification_id:string;title:string;message:string;action_url:string|null;expo_push_token:string};

export async function dispatchMobilePushNotifications(limit=100){
  const sql=getDatabase();
  const jobs=await sql`SELECT notification.id AS notification_id,notification.title,notification.message,notification.action_url,token.expo_push_token FROM notifications notification JOIN mobile_push_tokens token ON token.user_id=notification.user_id WHERE notification.read_at IS NULL AND notification.push_sent_at IS NULL ORDER BY notification.created_at LIMIT ${limit}` as PushJob[];
  if(!jobs.length)return 0;
  const messages=jobs.map(job=>({to:job.expo_push_token,sound:"default",title:job.title,body:job.message,data:{route:job.action_url||"/notifications"},priority:"high",channelId:"actionable"}));
  const response=await fetch("https://exp.host/--/api/v2/push/send",{method:"POST",headers:{Accept:"application/json","Accept-Encoding":"gzip, deflate","Content-Type":"application/json"},body:JSON.stringify(messages)});
  if(!response.ok)throw new Error(`Expo push delivery failed (${response.status})`);
  const payload=await response.json().catch(()=>null) as {data?:Array<{status?:string;details?:{error?:string}}>}|null;
  const receipts=payload?.data||[];
  const invalidTokens=jobs.filter((_,index)=>receipts[index]?.status==="error"&&receipts[index]?.details?.error==="DeviceNotRegistered").map(job=>job.expo_push_token);
  if(invalidTokens.length)await sql`DELETE FROM mobile_push_tokens WHERE expo_push_token=ANY(${invalidTokens}::text[])`;
  const delivered=[...new Set(jobs.filter((_,index)=>receipts[index]?.status==="ok").map(job=>job.notification_id))];
  if(delivered.length)await sql`UPDATE notifications SET push_sent_at=now() WHERE id=ANY(${delivered}::uuid[])`;
  return delivered.length;
}
