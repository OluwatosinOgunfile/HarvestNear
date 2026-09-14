import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

const RANGES = new Set([7, 30, 90]);

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const requested = Number(new URL(request.url).searchParams.get("days") || 30);
  const days = RANGES.has(requested) ? requested : 30;
  const sql = getDatabase();

  const [totals, series, pages, referrers, devices] = await Promise.all([
    sql`
      SELECT
        count(*)::int AS views,
        count(DISTINCT visitor_hash)::int AS visitors,
        count(DISTINCT session_hash)::int AS sessions,
        count(*) FILTER (WHERE created_at >= now() - interval '24 hours')::int AS views_today
      FROM web_page_views WHERE created_at >= now() - (${days} * interval '1 day')
    `,
    // A row per day including days with no traffic, so the line does not invent a shorter period.
    sql`
      SELECT to_char(day, 'YYYY-MM-DD') AS day,
        coalesce(count(view.id), 0)::int AS views,
        coalesce(count(DISTINCT view.visitor_hash), 0)::int AS visitors
      FROM generate_series(date_trunc('day', now() - (${days - 1} * interval '1 day')), date_trunc('day', now()), interval '1 day') AS day
      LEFT JOIN web_page_views view ON date_trunc('day', view.created_at) = day
      GROUP BY day ORDER BY day
    `,
    sql`
      SELECT path, count(*)::int AS views, count(DISTINCT visitor_hash)::int AS visitors
      FROM web_page_views WHERE created_at >= now() - (${days} * interval '1 day')
      GROUP BY path ORDER BY count(*) DESC LIMIT 10
    `,
    sql`
      SELECT coalesce(referrer_host, 'Direct or unknown') AS source, count(*)::int AS views
      FROM web_page_views WHERE created_at >= now() - (${days} * interval '1 day')
      GROUP BY referrer_host ORDER BY count(*) DESC LIMIT 8
    `,
    sql`
      SELECT device, client, count(*)::int AS views
      FROM web_page_views WHERE created_at >= now() - (${days} * interval '1 day')
      GROUP BY device, client ORDER BY count(*) DESC
    `,
  ]);

  return NextResponse.json({
    days,
    totals: totals[0] || { views: 0, visitors: 0, sessions: 0, views_today: 0 },
    series,
    pages,
    referrers,
    devices,
  });
}
