import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { createPayoutRecipient, listNigerianBanks } from "@/lib/paystack";
import { canMutateAs, checkRateLimit } from "@/lib/security";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "farmer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const farmId = new URL(request.url).searchParams.get("farmId");
  const sql = getDatabase();
  const [farm] = await sql`SELECT id FROM farms WHERE id=${farmId} AND owner_id=${user.id}`;
  if (!farm) return NextResponse.json({ error: "Farm not found" }, { status: 404 });
  const [account, banks] = await Promise.all([
    sql`SELECT provider, bank_code, bank_name, account_last4, account_name, updated_at FROM farmer_payout_accounts WHERE farm_id=${farm.id} AND is_default LIMIT 1`,
    listNigerianBanks(),
  ]);
  return NextResponse.json({ account: account[0] || null, banks: banks.sort((a,b) => a.name.localeCompare(b.name)) });
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "farmer" || !canMutateAs(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!await checkRateLimit(request, "farmer.payout-account", 5, 60 * 60, user.id)) return NextResponse.json({ error: "Too many account changes. Try again later." }, { status: 429 });
  const body = await request.json().catch(() => null) as { farmId?: string; bankCode?: string; bankName?: string; accountNumber?: string } | null;
  if (!body?.farmId || !body.bankCode || !body.bankName || !/^\d{10}$/.test(body.accountNumber || "")) return NextResponse.json({ error: "Select a bank and enter a valid 10-digit account number" }, { status: 400 });
  const sql = getDatabase();
  const [farm] = await sql`SELECT id, name FROM farms WHERE id=${body.farmId} AND owner_id=${user.id}`;
  if (!farm) return NextResponse.json({ error: "Farm not found" }, { status: 404 });
  try {
    const recipient = await createPayoutRecipient({ farmName: String(farm.name), accountNumber: body.accountNumber!, bankCode: body.bankCode });
    const [existingRecipient] = await sql`SELECT farm_id FROM farmer_payout_accounts WHERE provider='paystack' AND recipient_code=${recipient.recipientCode}`;
    if (existingRecipient && String(existingRecipient.farm_id) !== String(farm.id)) {
      return NextResponse.json({ error: "This payout recipient is already assigned to another farm" }, { status: 409 });
    }
    await sql`UPDATE farmer_payout_accounts SET is_default=false, updated_at=now() WHERE farm_id=${farm.id} AND is_default`;
    const [account] = await sql`INSERT INTO farmer_payout_accounts (farm_id, provider, bank_code, bank_name, account_last4, account_name, recipient_code, is_default)
      VALUES (${farm.id}, 'paystack', ${body.bankCode}, ${body.bankName}, ${recipient.accountLast4}, ${recipient.accountName}, ${recipient.recipientCode}, true)
      ON CONFLICT (provider, recipient_code) DO UPDATE SET bank_code=excluded.bank_code, bank_name=excluded.bank_name, account_last4=excluded.account_last4, account_name=excluded.account_name, is_default=true, updated_at=now()
      RETURNING bank_code, bank_name, account_last4, account_name, updated_at`;
    await sql`INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_data) VALUES (${user.id}, 'payout.account_updated', 'farm', ${farm.id}, ${JSON.stringify({ bankCode: body.bankCode, bankName: body.bankName, accountLast4: recipient.accountLast4 })}::jsonb)`;
    return NextResponse.json({ account });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not verify payout account" }, { status: 400 }); }
}
