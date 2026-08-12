import { NextResponse } from "next/server";
import { dispatchMobilePushNotifications } from "@/lib/push-notifications";

export async function GET(request:Request){
  const secret=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
  if(!process.env.CRON_SECRET||secret!==process.env.CRON_SECRET)return NextResponse.json({error:"Unauthorized"},{status:401});
  const sent=await dispatchMobilePushNotifications();
  return NextResponse.json({sent});
}
