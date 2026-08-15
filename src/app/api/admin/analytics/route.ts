import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sql = getDatabase();
  const [summaryRows, daily, statuses, farms, categories] = await Promise.all([
    sql`SELECT
      (SELECT count(*)::int FROM users WHERE is_active) AS active_users,
      (SELECT count(DISTINCT customer_id)::int FROM orders WHERE paid_at IS NOT NULL) AS paying_customers,
      (SELECT count(*)::int FROM orders WHERE created_at >= now() - interval '30 days') AS orders_30d,
      coalesce((SELECT sum(total_kobo) FROM orders WHERE paid_at IS NOT NULL AND status NOT IN ('cancelled','refunded') AND created_at >= now() - interval '30 days'), 0) AS revenue_30d_kobo,
      coalesce((SELECT round(avg(total_kobo)) FROM orders WHERE paid_at IS NOT NULL AND status NOT IN ('cancelled','refunded')), 0) AS average_order_kobo,
      coalesce((SELECT round(100.0 * count(*) FILTER (WHERE status IN ('delivered','collected')) / nullif(count(*) FILTER (WHERE status <> 'pending_payment'), 0), 1) FROM orders), 0) AS fulfilment_rate`,
    sql`WITH days AS (
      SELECT generate_series(current_date - interval '29 days', current_date, interval '1 day')::date AS day
    )
    SELECT days.day,
      count(orders.id)::int AS orders,
      coalesce(sum(orders.total_kobo) FILTER (WHERE orders.paid_at IS NOT NULL AND orders.status NOT IN ('cancelled','refunded')), 0) AS revenue_kobo,
      count(DISTINCT orders.customer_id) FILTER (WHERE orders.paid_at IS NOT NULL)::int AS customers
    FROM days LEFT JOIN orders ON orders.created_at >= days.day AND orders.created_at < days.day + interval '1 day'
    GROUP BY days.day ORDER BY days.day`,
    sql`SELECT status::text, count(*)::int AS count FROM orders GROUP BY status ORDER BY count DESC`,
    sql`SELECT farm.id, farm.name,
      coalesce(sum(item.quantity), 0)::int AS units,
      coalesce(sum(item.line_total_kobo), 0) AS sales_kobo,
      count(DISTINCT item.order_id)::int AS orders
    FROM farms farm
    JOIN farm_orders farm_order ON farm_order.farm_id = farm.id
    JOIN order_items item ON item.farm_order_id = farm_order.id
    WHERE item.status NOT IN ('pending_payment','cancelled','refunded')
    GROUP BY farm.id, farm.name ORDER BY sales_kobo DESC, units DESC LIMIT 8`,
    sql`SELECT category.name,
      coalesce(sum(item.quantity), 0)::int AS units,
      coalesce(sum(item.line_total_kobo), 0) AS sales_kobo
    FROM order_items item
    JOIN produce_listings listing ON listing.id = item.listing_id
    JOIN products product ON product.id = listing.product_id
    JOIN produce_categories category ON category.id = product.category_id
    WHERE item.status NOT IN ('pending_payment','cancelled','refunded')
    GROUP BY category.id, category.name ORDER BY sales_kobo DESC, units DESC LIMIT 8`,
  ]);

  return NextResponse.json({ summary: summaryRows[0], daily, statuses, farms, categories }, {
    headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" },
  });
}
