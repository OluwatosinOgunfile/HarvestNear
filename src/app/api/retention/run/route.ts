import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { RETENTION } from "@/lib/legal";
import { runRetention } from "@/lib/retention";
import { canMutateAs } from "@/lib/security";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function secretMatches(request: Request) {
  const secret = process.env.RETENTION_RUN_SECRET || process.env.PAYOUT_RUN_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
  const supplied = Buffer.from(header, "utf8");
  const expected = Buffer.from(secret, "utf8");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

async function handle(request: Request) {
  if (!secretMatches(request)) {
    const user = await getSessionUser();
    if (!user || user.role !== "admin" || !canMutateAs(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    return NextResponse.json({ policy: RETENTION, ...(await runRetention()) });
  } catch (error) {
    console.error("Retention run failed", error);
    return NextResponse.json({ error: "The retention run could not be completed" }, { status: 500 });
  }
}

export async function GET(request: Request) { return handle(request); }
export async function POST(request: Request) { return handle(request); }
