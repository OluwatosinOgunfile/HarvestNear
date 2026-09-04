import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { mobileCorsHeaders, mobileOptions } from "@/lib/mobile-cors";

export const OPTIONS = mobileOptions;

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user || !["consumer", "farmer"].includes(user.role)) return NextResponse.json({ user }, { headers: mobileCorsHeaders(request) });
  const sql = getDatabase();
  const [location] = await sql`SELECT EXISTS(SELECT 1 FROM addresses WHERE user_id=${user.id} AND latitude IS NOT NULL AND longitude IS NOT NULL) AS saved`;
  return NextResponse.json({ user: { ...user, requiresLocation: !Boolean(location?.saved) } }, { headers: mobileCorsHeaders(request) });
}
