import { NextRequest, NextResponse } from "next/server";

import { getDatabase } from "@/lib/db";
import { listingImageUrl } from "@/lib/images";

export const dynamic = "force-dynamic";

const DEFAULT_LATITUDE = 9.0019;
const DEFAULT_LONGITUDE = 7.4534;

export async function GET(request: NextRequest) {
  const latitude = Number(request.nextUrl.searchParams.get("lat") ?? DEFAULT_LATITUDE);
  const longitude = Number(request.nextUrl.searchParams.get("lng") ?? DEFAULT_LONGITUDE);

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  try {
    const sql = getDatabase();
    const [rows, statsRows] = await Promise.all([sql`
      SELECT
        listing.id,
        listing.title AS name,
        farm.name AS farmer,
        farm.city || ', ' || farm.state AS location,
        round(distance_km(${latitude}, ${longitude}, farm.latitude, farm.longitude)::numeric, 1) AS distance,
        listing.unit_price_kobo,
        listing.unit,
        (listing.quantity_available - listing.quantity_reserved) AS stock,
        listing.quantity_sold AS sold,
        category.name AS category,
        listing.harvest_date,
        farm.average_rating AS rating,
        listing.badge,
        image.url AS image
      FROM produce_listings listing
      JOIN farms farm ON farm.id = listing.farm_id
      JOIN products product ON product.id = listing.product_id
      JOIN produce_categories category ON category.id = product.category_id
      LEFT JOIN LATERAL (
        SELECT url FROM listing_images
        WHERE listing_id = listing.id
        ORDER BY sort_order, created_at
        LIMIT 1
      ) image ON true
      WHERE listing.status = 'active'
        AND listing.quantity_available > listing.quantity_reserved
        AND listing.available_until > now()
        AND farm.verification_status = 'verified'
      ORDER BY distance_km(${latitude}, ${longitude}, farm.latitude, farm.longitude), listing.created_at DESC
    `, sql`
      SELECT
        count(*) FILTER (WHERE verification_status = 'verified')::int AS farms,
        coalesce(round(avg(average_rating) FILTER (WHERE verification_status = 'verified'), 1), 0) AS average_rating,
        (SELECT count(*)::int FROM produce_listings WHERE status = 'active' AND quantity_available > quantity_reserved AND available_until > now()) AS listings,
        (SELECT count(*)::int FROM users WHERE role = 'consumer' AND is_active) AS consumers,
        (SELECT count(*)::int FROM users WHERE role = 'farmer' AND is_active) AS farmers
      FROM farms
    `]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const produce = rows.map((row) => {
      const harvestDate = new Date(String(row.harvest_date));
      harvestDate.setHours(0, 0, 0, 0);
      const daysAway = Math.round((harvestDate.getTime() - today.getTime()) / 86_400_000);

      return {
        id: String(row.id),
        name: String(row.name),
        farmer: String(row.farmer),
        location: String(row.location),
        distance: Number(row.distance),
        price: Number(row.unit_price_kobo) / 100,
        unit: String(row.unit),
        stock: Number(row.stock),
        sold: Number(row.sold),
        category: String(row.category),
        available: daysAway <= 0 ? "Today" : daysAway === 1 ? "Tomorrow" : harvestDate.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Lagos" }),
        rating: Number(row.rating),
        badge: row.badge ? String(row.badge) : undefined,
        image: row.image ? listingImageUrl(String(row.id), row.image) : "/produce/vine-ripe-tomatoes.webp",
      };
    });

    const stats = statsRows[0];
    return NextResponse.json({
      produce,
      stats: {
        farms: Number(stats.farms),
        listings: Number(stats.listings),
        averageRating: Number(stats.average_rating),
        consumers: Number(stats.consumers),
        farmers: Number(stats.farmers),
      },
    });
  } catch (error) {
    console.error("Could not load produce", error);
    return NextResponse.json({ error: "Could not load produce" }, { status: 500 });
  }
}
