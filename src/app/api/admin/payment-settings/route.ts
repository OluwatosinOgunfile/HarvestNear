import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { canMutateAs, validText } from "@/lib/security";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !["admin", "support"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sql = getDatabase();
  const [settings] = await sql`SELECT bank_name, account_name, account_number, instructions, is_enabled, updated_at FROM manual_payment_settings WHERE id = 1`;
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const administrator = await getSessionUser();
  if (!administrator || administrator.role !== "admin" || !canMutateAs(administrator)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null) as { bankName?: string; accountName?: string; accountNumber?: string; instructions?: string; isEnabled?: boolean } | null;
  if (!body || !validText(body.bankName, 120) || !validText(body.accountName, 160) || !validText(body.accountNumber, 30) || !/^[0-9 -]+$/.test(body.accountNumber!)) {
    return NextResponse.json({ error: "Enter valid bank and account details" }, { status: 400 });
  }
  if (body.instructions && !validText(body.instructions, 500)) return NextResponse.json({ error: "Payment instructions are too long" }, { status: 400 });
  const sql = getDatabase();
  const [settings] = await sql`
    UPDATE manual_payment_settings SET bank_name = ${body.bankName!.trim()}, account_name = ${body.accountName!.trim()},
      account_number = ${body.accountNumber!.replaceAll(" ", "").replaceAll("-", "")}, instructions = ${body.instructions?.trim() || null},
      is_enabled = ${Boolean(body.isEnabled)}, updated_by = ${administrator.id}, updated_at = now()
    WHERE id = 1 RETURNING bank_name, account_name, account_number, instructions, is_enabled, updated_at
  `;
  await sql`INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_data) VALUES (${administrator.id}, 'payment.settings_updated', 'payment_settings', '1', ${JSON.stringify({ bankName: settings.bank_name, accountName: settings.account_name, accountNumberLast4: String(settings.account_number).slice(-4), isEnabled: settings.is_enabled })}::jsonb)`;
  return NextResponse.json({ settings });
}
