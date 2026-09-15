import "server-only";
import { after } from "next/server";

import { getDatabase } from "@/lib/db";

type PushJob={notification_id:string;title:string;message:string;action_url:string|null;expo_push_token:string};

/**
 * Sends every notification that has a device to send to and has not been pushed yet. Passing a user
 * narrows it to the person whose action created the notification, which is what the immediate
 * dispatch below uses so one request does not carry the whole backlog.
 */
export async function dispatchMobilePushNotifications(limit=100,userId?:string){
  const sql=getDatabase();
  const jobs=await sql`SELECT notification.id AS notification_id,notification.title,notification.message,notification.action_url,token.expo_push_token FROM notifications notification JOIN mobile_push_tokens token ON token.user_id=notification.user_id WHERE notification.read_at IS NULL AND notification.push_sent_at IS NULL AND (${userId||null}::uuid IS NULL OR notification.user_id=${userId||null}::uuid) ORDER BY notification.created_at LIMIT ${limit}` as PushJob[];
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

/**
 * Pushes as soon as the request that created the notification has answered, rather than waiting for
 * a schedule. This matters more than it sounds: the Vercel Hobby plan allows two cron jobs on daily
 * schedules only, and both were spent, so a push about an order could be a day late. The cron and
 * the workflow that calls it stay as a backstop for notifications nobody's request created, such as
 * the ones the payout runner and the Paystack webhook write.
 *
 * A failure here is logged and dropped. The notification is already saved and its push_sent_at is
 * still empty, so the backstop will carry it, and a push that cannot be delivered must never fail
 * the action that caused it.
 */
export function dispatchMobilePushAfterResponse(userId?:string){
  after(async () => {
    try {
      for (let batch = 0; batch < 5; batch += 1) {
        const sent = await dispatchMobilePushNotifications(100, userId);
        if (sent < 100) break;
      }
    } catch (error) {
      console.error("Immediate push dispatch failed; the scheduled run will retry", error);
    }
  });
}
