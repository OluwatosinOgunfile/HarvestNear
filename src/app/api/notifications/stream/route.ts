import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { dispatchNotificationEmails } from "@/lib/notification-email";

export const dynamic="force-dynamic";
export async function GET(request:Request){
 const user=await getSessionUser();if(!user)return new Response("Unauthorized",{status:401});
 const encoder=new TextEncoder();let closed=false;request.signal.addEventListener("abort",()=>{closed=true});
 const stream=new ReadableStream({async start(controller){let last="";while(!closed){try{const sql=getDatabase();const rows=await sql`SELECT id,type,title,message,action_url,read_at,created_at FROM notifications WHERE user_id=${user.id} AND read_at IS NULL ORDER BY created_at DESC LIMIT 50`;const signature=rows.map(row=>row.id).join(",");if(signature!==last){controller.enqueue(encoder.encode(`event: notifications\ndata: ${JSON.stringify({notifications:rows})}\n\n`));last=signature;void dispatchNotificationEmails(10,user.id).catch(()=>undefined);}else controller.enqueue(encoder.encode(": keepalive\n\n"));}catch{controller.enqueue(encoder.encode("event: retry\ndata: {}\n\n"));}await new Promise(resolve=>setTimeout(resolve,3000));}try{controller.close()}catch{}}});
 return new Response(stream,{headers:{"Content-Type":"text/event-stream","Cache-Control":"no-cache, no-transform","Connection":"keep-alive","X-Accel-Buffering":"no"}});
}
