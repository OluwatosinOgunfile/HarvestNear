import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth";
import { mobileCorsHeaders, mobileOptions } from "@/lib/mobile-cors";

export const OPTIONS = mobileOptions;

export async function POST(request: Request) {
  await deleteSession();
  return NextResponse.json({ signedOut: true }, { headers: mobileCorsHeaders(request) });
}
