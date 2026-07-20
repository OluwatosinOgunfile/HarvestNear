import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";

export async function GET() {
  const session = await getSessionUser();
  if (!session || !["admin", "support"].includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sql = getDatabase();
  const [metrics, users] = await Promise.all([
    sql`SELECT
      (SELECT count(*)::int FROM users WHERE is_active) AS users,
      (SELECT count(*)::int FROM farms WHERE verification_status = 'verified') AS verified_farms,
      (SELECT count(*)::int FROM farms WHERE verification_status = 'pending') AS pending_farms,
      (SELECT count(*)::int FROM produce_listings WHERE status = 'active') AS listings,
      (SELECT count(*)::int FROM orders) AS orders,
      (SELECT count(*)::int FROM refunds WHERE status IN ('requested','under_review')) AS open_refunds`,
    sql`SELECT id, first_name, last_name, email, role, is_active, created_at FROM users ORDER BY created_at DESC LIMIT 100`,
  ]);
  return NextResponse.json({ metrics: metrics[0], users });
}
