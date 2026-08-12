import "server-only";
import { getDatabase } from "@/lib/db";
import { sendNotificationEmail } from "@/lib/email";

export async function dispatchNotificationEmails(limit=25, userId?:string) {
  const sql=getDatabase();
  const jobs=await sql`SELECT outbox.id, notification.title, notification.message, notification.action_url, users.email, users.first_name
    FROM notification_email_outbox outbox JOIN notifications notification ON notification.id=outbox.notification_id JOIN users ON users.id=outbox.user_id
    WHERE outbox.sent_at IS NULL AND outbox.next_attempt_at<=now() AND (${userId || null}::uuid IS NULL OR outbox.user_id=${userId || null}::uuid)
    ORDER BY outbox.created_at LIMIT ${limit}`;
  for(const job of jobs){try{await sendNotificationEmail({email:String(job.email),firstName:String(job.first_name),title:String(job.title),message:String(job.message),actionUrl:job.action_url?String(job.action_url):null});await sql`UPDATE notification_email_outbox SET sent_at=now(),attempts=attempts+1,last_error=NULL WHERE id=${job.id}`;}catch(error){await sql`UPDATE notification_email_outbox SET attempts=attempts+1,last_error=${String((error as Error).message).slice(0,500)},next_attempt_at=now()+least(attempts+1,60)*interval '1 minute' WHERE id=${job.id}`;}}
  return jobs.length;
}
