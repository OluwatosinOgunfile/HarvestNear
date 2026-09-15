import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { payoutPolicy, runAutomaticPayouts } from "@/lib/payouts";
import { dispatchMobilePushAfterResponse } from "@/lib/push-notifications";
import { canMutateAs } from "@/lib/security";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function secretMatches(request: Request) {
  const secret = process.env.PAYOUT_RUN_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim()
    || request.headers.get("x-payout-run-secret")?.trim()
    || "";
  const supplied = Buffer.from(header, "utf8");
  const expected = Buffer.from(secret, "utf8");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

async function handle(request: Request) {
  // Vercel Cron presents the secret; an administrator can also trigger a run by hand.
  let trigger = "cron";
  if (!secretMatches(request)) {
    const user = await getSessionUser();
    if (!user || user.role !== "admin" || !canMutateAs(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    trigger = `admin:${user.id}`;
  }
  try {
    const summary = await runAutomaticPayouts();
    return NextResponse.json({ trigger, policy: payoutPolicy(), ...summary });
  } catch (error) {
    console.error("Automatic payout run failed", error);
    return NextResponse.json({ error: "The payout run could not be completed" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  dispatchMobilePushAfterResponse();
  return handle(request);
}
