import { NextResponse } from "next/server";
import { dispatchMobilePushNotifications } from "@/lib/push-notifications";
import { secretMatches } from "@/lib/security";

export async function GET(request:Request){
  const secret=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
  if(!secretMatches(secret,process.env.CRON_SECRET))return NextResponse.json({error:"Unauthorized"},{status:401});
  const sent=await dispatchMobilePushNotifications();
  return NextResponse.json({sent});
}
