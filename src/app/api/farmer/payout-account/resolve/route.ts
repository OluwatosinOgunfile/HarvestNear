import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { mobileCorsHeaders, mobileOptions } from "@/lib/mobile-cors";
import { resolveNigerianAccount } from "@/lib/paystack";
import { canMutateAs, checkRateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";
export const OPTIONS = mobileOptions;

/**
 * Returns the name Paystack holds for an account so the farmer can check it before anything is
 * saved. Nothing is written here and no transfer recipient is created; a mistyped digit resolves to
 * a stranger's name, which is exactly what the farmer needs to see before confirming.
 */
export async function POST(request: Request) {
  const headers = mobileCorsHeaders(request);
  const user = await getSessionUser();
  if (!user || user.role !== "farmer" || !canMutateAs(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers });
  if (!await checkRateLimit(request, "farmer.payout-account.resolve", 30, 60 * 60, user.id)) {
    return NextResponse.json({ error: "Too many account lookups. Try again shortly." }, { status: 429, headers });
  }

  const body = await request.json().catch(() => null) as { farmId?: string; bankCode?: string; accountNumber?: string } | null;
  if (!body?.farmId || !body.bankCode || !/^\d{10}$/.test(body.accountNumber || "")) {
    return NextResponse.json({ error: "Select a bank and enter a valid 10-digit account number" }, { status: 400, headers });
  }

  const sql = getDatabase();
  const [farm] = await sql`SELECT id FROM farms WHERE id=${body.farmId} AND owner_id=${user.id}`;
  if (!farm) return NextResponse.json({ error: "Farm not found" }, { status: 404, headers });

  try {
    const resolved = await resolveNigerianAccount({ accountNumber: body.accountNumber!, bankCode: body.bankCode });
    if (!resolved.accountName) return NextResponse.json({ error: "The bank did not return a name for this account" }, { status: 400, headers });
    return NextResponse.json({ accountName: resolved.accountName, accountLast4: resolved.accountLast4 }, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not check this account number" }, { status: 400, headers });
  }
}
