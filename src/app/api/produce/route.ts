import { NextRequest, NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { DEFAULT_LISTING_IMAGE, listingImageUrl } from "@/lib/images";

export const dynamic = "force-dynamic";

const DEFAULT_LATITUDE = 9.0019;
const DEFAULT_LONGITUDE = 7.4534;

export async function GET(request: NextRequest) {
  try {
    const sql = getDatabase();
    const session = await getSessionUser();
    let latitude = Number(request.nextUrl.searchParams.get("lat") ?? DEFAULT_LATITUDE);
    let longitude = Number(request.nextUrl.searchParams.get("lng") ?? DEFAULT_LONGITUDE);
    let proximitySource: "saved_address" | "selected_location" = "selected_location";
    let proximityLabel: string | null = null;
    const selectedLocationOverride = request.nextUrl.searchParams.get("origin") === "selected";

    if (session && ["consumer", "farmer"].includes(session.role) && !selectedLocationOverride) {
      const [address] = await sql`
        SELECT label, city, state, latitude, longitude
        FROM addresses
        WHERE user_id = ${session.id}
        ORDER BY is_default DESC, updated_at DESC
        LIMIT 1
      `;
      const savedLatitude = Number(address?.latitude);
      const savedLongitude = Number(address?.longitude);
      if (Number.isFinite(savedLatitude) && Number.isFinite(savedLongitude)) {
        latitude = savedLatitude;
        longitude = savedLongitude;
        proximitySource = "saved_address";
        proximityLabel = [address.label, address.city, address.state].filter(Boolean).join(" · ");
      }
    }

    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }

    const [rows, statsRows] = await Promise.all([sql`
      SELECT
        listing.id,
        farm.id AS farm_id,
        listing.title AS name,
        farm.name AS farmer,
        farm.city || ', ' || farm.state AS location,
        round(distance_km(${latitude}, ${longitude}, farm.latitude, farm.longitude)::numeric, 1) AS distance,
        listing.unit_price_kobo,
        listing.unit,
        (listing.quantity_available - listing.quantity_reserved) AS stock,
        listing.quantity_sold AS sold,
        listing.last_restock_total,
        category.name AS category,
        listing.harvest_date,
        coalesce((SELECT round(avg(review.rating)::numeric, 2) FROM reviews review WHERE review.farm_id = farm.id AND review.is_visible), 0) AS rating,
        (SELECT count(*)::int FROM reviews WHERE farm_id = farm.id AND is_visible) AS review_count,
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
        AND farm.verification_status = 'verified'
      ORDER BY distance_km(${latitude}, ${longitude}, farm.latitude, farm.longitude), listing.created_at DESC
    `, sql`
      SELECT
        count(*) FILTER (WHERE verification_status = 'verified')::int AS farms,
        coalesce(round(avg(average_rating) FILTER (WHERE verification_status = 'verified'), 1), 0) AS average_rating,
        (SELECT count(*)::int
          FROM produce_listings listing
          JOIN farms listing_farm ON listing_farm.id = listing.farm_id
          WHERE listing.status = 'active'
            AND listing.quantity_available > listing.quantity_reserved
            AND listing_farm.verification_status = 'verified') AS listings,
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
        farmId: String(row.farm_id),
        name: String(row.name),
        farmer: String(row.farmer),
        location: String(row.location),
        distance: Number(row.distance),
        price: Number(row.unit_price_kobo) / 100,
        unit: String(row.unit),
        stock: Number(row.stock),
        sold: Number(row.sold),
        restockTotal: Number(row.last_restock_total),
        category: String(row.category),
        available: daysAway <= 0 ? "Today" : daysAway === 1 ? "Tomorrow" : harvestDate.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Lagos" }),
        rating: Number(row.rating),
        reviewCount: Number(row.review_count),
        badge: row.badge ? String(row.badge) : undefined,
        image: row.image ? listingImageUrl(String(row.id), row.image) : DEFAULT_LISTING_IMAGE,
      };
    });

    const stats = statsRows[0];
    return NextResponse.json({
      produce,
      proximity: { source: proximitySource, label: proximityLabel },
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
