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
      (SELECT count(*)::int FROM orders WHERE status IN ('paid','confirmed','preparing','ready','dispatched')) AS open_orders,
      (SELECT count(*)::int FROM refunds WHERE status IN ('requested','under_review')) AS open_refunds,
      (SELECT count(*)::int FROM deliveries WHERE status = 'failed') AS failed_deliveries,
      (SELECT count(*)::int FROM reviews WHERE NOT is_visible) AS hidden_reviews,
      (SELECT count(*)::int FROM carts WHERE expires_at > now()) AS active_carts,
      (SELECT count(*)::int FROM notifications WHERE read_at IS NULL) AS unread_notifications,
      coalesce((SELECT sum(total_kobo) FROM orders WHERE paid_at IS NOT NULL AND status NOT IN ('cancelled','refunded')), 0) AS gross_sales_kobo`,
    sql`SELECT id, first_name, last_name, email, role, is_active, created_at FROM users ORDER BY created_at DESC LIMIT 100`,
  ]);
  return NextResponse.json({ metrics: metrics[0], users });
}
