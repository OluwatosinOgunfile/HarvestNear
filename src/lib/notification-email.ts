import "server-only";
import { after } from "next/server";
import { getDatabase } from "@/lib/db";
import { sendNotificationEmail } from "@/lib/email";

export async function dispatchNotificationEmails(limit=25, userId?:string) {
  const sql=getDatabase();
  const jobs=await sql`SELECT outbox.id, notification.title, notification.message, notification.action_url, notification.type, users.email, users.first_name
    FROM notification_email_outbox outbox JOIN notifications notification ON notification.id=outbox.notification_id JOIN users ON users.id=outbox.user_id
    LEFT JOIN user_email_preferences preference ON preference.user_id=users.id
    WHERE outbox.sent_at IS NULL AND outbox.next_attempt_at<=now() AND (${userId || null}::uuid IS NULL OR outbox.user_id=${userId || null}::uuid)
      AND CASE
        WHEN notification.metadata->>'emailCategory'='nearby_produce' THEN coalesce(preference.nearby_produce,false)
        WHEN notification.type='delivery' THEN coalesce(preference.delivery_updates,true)
        WHEN notification.type='farm' THEN coalesce(preference.farm_updates,true)
        WHEN notification.title ILIKE '%rating%' OR notification.title ILIKE '%review%' THEN coalesce(preference.rating_updates,true)
        WHEN notification.title ILIKE '%support%' OR notification.title ILIKE '%ticket%' THEN coalesce(preference.support_updates,true)
        ELSE true
      END
    ORDER BY outbox.created_at LIMIT ${limit}`;
  await Promise.all(jobs.map(async(job)=>{try{await sendNotificationEmail({email:String(job.email),firstName:String(job.first_name),title:String(job.title),message:String(job.message),actionUrl:job.action_url?String(job.action_url):null});await sql`UPDATE notification_email_outbox SET sent_at=now(),attempts=attempts+1,last_error=NULL WHERE id=${job.id}`;}catch(error){await sql`UPDATE notification_email_outbox SET attempts=attempts+1,last_error=${String((error as Error).message).slice(0,500)},next_attempt_at=now()+least(attempts+1,60)*interval '1 minute' WHERE id=${job.id}`;}}));
  return jobs.length;
}

export function dispatchNotificationEmailsAfterResponse(userId?: string) {
  after(async () => {
    for (let batch = 0; batch < 10; batch += 1) {
      const processed = await dispatchNotificationEmails(100, userId);
      if (processed < 100) break;
    }
  });
}
