import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { mobileCorsHeaders, mobileOptions } from "@/lib/mobile-cors";

export const OPTIONS = mobileOptions;

export async function GET(request: Request) {
  return NextResponse.json({ user: await getSessionUser() }, { headers: mobileCorsHeaders(request) });
}
