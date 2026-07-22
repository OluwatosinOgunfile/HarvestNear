import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !["consumer", "farmer"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sql = getDatabase();
  const [account] = await sql`SELECT balance_kobo, updated_at FROM store_credit_accounts WHERE user_id = ${user.id}`;
  return NextResponse.json({ balanceKobo: Number(account?.balance_kobo || 0), updatedAt: account?.updated_at || null });
}
