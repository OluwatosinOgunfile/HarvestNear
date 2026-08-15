import { NextRequest, NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { DEFAULT_LISTING_IMAGE, listingImageUrl } from "@/lib/images";

export const dynamic = "force-dynamic";

const DEFAULT_LATITUDE = 9.0019;
const DEFAULT_LONGITUDE = 7.4534;

const DEVELOPMENT_ORIGINS = new Set([
  "http://localhost:8081",
  "http://127.0.0.1:8081",
  "http://localhost:8082",
  "http://127.0.0.1:8082",
  "http://localhost:19006",
  "http://127.0.0.1:19006",
]);

function corsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get("origin");
  const configuredOrigins = new Set(
    (process.env.MOBILE_WEB_ORIGINS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  if (!origin || (!DEVELOPMENT_ORIGINS.has(origin) && !configuredOrigins.has(origin))) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Accept, Content-Type",
    Vary: "Origin",
  };
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

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
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400, headers: corsHeaders(request) });
    }

    const [rows, statsRows, farmRows] = await Promise.all([sql`
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
        AND (listing.available_from IS NULL OR listing.available_from <= now())
        AND (listing.available_until IS NULL OR listing.available_until > now())
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
            AND (listing.available_from IS NULL OR listing.available_from <= now())
            AND (listing.available_until IS NULL OR listing.available_until > now())
            AND listing_farm.verification_status = 'verified') AS listings,
        (SELECT count(*)::int FROM users WHERE role = 'consumer' AND is_active) AS consumers,
        (SELECT count(*)::int FROM users WHERE role = 'farmer' AND is_active) AS farmers
      FROM farms
    `, sql`
      SELECT
        farm.id,
        farm.name,
        farm.city || ', ' || farm.state AS location,
        coalesce((SELECT sum(item.quantity)::int
          FROM order_items item
          JOIN farm_orders farm_order ON farm_order.id = item.farm_order_id
          WHERE farm_order.farm_id = farm.id
            AND item.status NOT IN ('pending_payment', 'cancelled', 'refunded')), 0) AS sold,
        coalesce((SELECT round(avg(review.rating)::numeric, 2) FROM reviews review WHERE review.farm_id = farm.id AND review.is_visible), 0) AS rating,
        (SELECT count(*)::int FROM reviews review WHERE review.farm_id = farm.id AND review.is_visible) AS review_count,
        (SELECT count(*)::int FROM produce_listings listing
          WHERE listing.farm_id = farm.id AND listing.status = 'active'
            AND listing.quantity_available > listing.quantity_reserved
            AND (listing.available_from IS NULL OR listing.available_from <= now())
            AND (listing.available_until IS NULL OR listing.available_until > now())) AS listings,
        featured.id AS listing_id,
        featured.category,
        featured.image_url
      FROM farms farm
      JOIN LATERAL (
        SELECT listing.id, category.name AS category, image.url AS image_url
        FROM produce_listings listing
        JOIN products product ON product.id = listing.product_id
        JOIN produce_categories category ON category.id = product.category_id
        LEFT JOIN LATERAL (
          SELECT url FROM listing_images
          WHERE listing_id = listing.id
          ORDER BY sort_order, created_at
          LIMIT 1
        ) image ON true
        WHERE listing.farm_id = farm.id AND listing.status = 'active'
          AND listing.quantity_available > listing.quantity_reserved
          AND (listing.available_from IS NULL OR listing.available_from <= now())
          AND (listing.available_until IS NULL OR listing.available_until > now())
        ORDER BY listing.quantity_sold DESC, listing.created_at DESC
        LIMIT 1
      ) featured ON true
      WHERE farm.verification_status = 'verified'
      ORDER BY sold DESC, rating DESC, review_count DESC, farm.created_at DESC
      LIMIT 8
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
    const bestSellingFarms = farmRows.map((farm) => ({
      id: String(farm.id),
      name: String(farm.name),
      location: String(farm.location),
      image: farm.image_url ? listingImageUrl(String(farm.listing_id), farm.image_url) : DEFAULT_LISTING_IMAGE,
      category: String(farm.category),
      rating: Number(farm.rating),
      reviewCount: Number(farm.review_count),
      sold: Number(farm.sold),
      listings: Number(farm.listings),
    }));
    return NextResponse.json({
      produce,
      bestSellingFarms,
      proximity: { source: proximitySource, label: proximityLabel },
      stats: {
        farms: Number(stats.farms),
        listings: Number(stats.listings),
        averageRating: Number(stats.average_rating),
        consumers: Number(stats.consumers),
        farmers: Number(stats.farmers),
      },
    }, { headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30", ...corsHeaders(request) } });
  } catch (error) {
    console.error("Could not load produce", error);
    return NextResponse.json({ error: "Could not load produce" }, { status: 500, headers: corsHeaders(request) });
  }
}
