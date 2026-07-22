import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !["consumer", "farmer"].includes(user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = getDatabase();
  const [credit] = await sql`SELECT balance_kobo FROM store_credit_accounts WHERE user_id = ${user.id}`;
  const [settings] = await sql`SELECT bank_name, account_name, account_number, instructions, is_enabled FROM manual_payment_settings WHERE id = 1`;
  if (!settings?.is_enabled || !settings.bank_name || !settings.account_name || !settings.account_number) {
    return NextResponse.json({ settings: null, storeCreditKobo: Number(credit?.balance_kobo || 0), manualPaymentAvailable: false });
  }
  return NextResponse.json({ settings, storeCreditKobo: Number(credit?.balance_kobo || 0), manualPaymentAvailable: true });
}
