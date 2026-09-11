import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { DEFAULT_LISTING_IMAGE, listingImageUrl } from "@/lib/images";
import { mobileCorsHeaders, mobileOptions } from "@/lib/mobile-cors";
import { canMutateAs, checkRateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";
export const OPTIONS = mobileOptions;

const MAX_ALERTS_PER_CUSTOMER = 100;

export async function GET(request: Request) {
  const headers = mobileCorsHeaders(request);
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ alerts: [], watching: [] }, { headers });
  const sql = getDatabase();
  const rows = await sql`
    SELECT alert.listing_id, alert.created_at, alert.notified_at, listing.title, listing.unit, listing.unit_price_kobo,
      (listing.quantity_available - listing.quantity_reserved) AS stock, listing.status,
      farm.id AS farm_id, farm.name AS farm_name, image.url AS image
    FROM restock_alerts alert
    JOIN produce_listings listing ON listing.id = alert.listing_id
    JOIN farms farm ON farm.id = listing.farm_id
    LEFT JOIN LATERAL (SELECT url FROM listing_images WHERE listing_id = listing.id ORDER BY sort_order, created_at LIMIT 1) image ON true
    WHERE alert.user_id = ${user.id}
    ORDER BY alert.created_at DESC
  `;
  const alerts = rows.map((row) => ({
    listingId: String(row.listing_id),
    title: String(row.title),
    unit: String(row.unit),
    price: Number(row.unit_price_kobo) / 100,
    stock: Number(row.stock),
    status: String(row.status),
    farmId: String(row.farm_id),
    farmName: String(row.farm_name),
    image: row.image ? listingImageUrl(String(row.listing_id), row.image) : DEFAULT_LISTING_IMAGE,
    notified: Boolean(row.notified_at),
  }));
  return NextResponse.json({ alerts, watching: alerts.filter((alert) => !alert.notified).map((alert) => alert.listingId) }, { headers });
}

export async function PUT(request: Request) {
  const headers = mobileCorsHeaders(request);
  const user = await getSessionUser();
  if (!user || !canMutateAs(user)) return NextResponse.json({ error: "Sign in to be told when produce returns" }, { status: 403, headers });
  if (!await checkRateLimit(request, "restock.alert", 60, 60 * 60, user.id)) return NextResponse.json({ error: "Too many restock alerts. Try again later." }, { status: 429, headers });
  const body = await request.json().catch(() => null) as { listingId?: string; watching?: boolean } | null;
  if (!body?.listingId) return NextResponse.json({ error: "Select a listing" }, { status: 400, headers });
  const sql = getDatabase();

  if (body.watching === false) {
    await sql`DELETE FROM restock_alerts WHERE user_id = ${user.id} AND listing_id = ${body.listingId}`;
    return NextResponse.json({ watching: false }, { headers });
  }

  const [listing] = await sql`
    SELECT listing.id, (listing.quantity_available - listing.quantity_reserved) AS stock
    FROM produce_listings listing JOIN farms farm ON farm.id = listing.farm_id
    WHERE listing.id = ${body.listingId} AND farm.verification_status = 'verified' LIMIT 1
  `;
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404, headers });
  if (Number(listing.stock) > 0) return NextResponse.json({ error: "This produce is in stock right now", inStock: true }, { status: 409, headers });

  const [{ count }] = await sql`SELECT count(*)::int AS count FROM restock_alerts WHERE user_id = ${user.id} AND notified_at IS NULL`;
  if (Number(count) >= MAX_ALERTS_PER_CUSTOMER) return NextResponse.json({ error: "You are already watching the maximum number of listings" }, { status: 409, headers });

  await sql`
    INSERT INTO restock_alerts (user_id, listing_id) VALUES (${user.id}, ${body.listingId})
    ON CONFLICT (user_id, listing_id) DO UPDATE SET notified_at = NULL, created_at = now()
  `;
  return NextResponse.json({ watching: true }, { headers });
}
