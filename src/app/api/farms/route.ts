import { NextRequest, NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { DEFAULT_LISTING_IMAGE, listingImageUrl } from "@/lib/images";
import { mobileCorsHeaders, mobileOptions } from "@/lib/mobile-cors";

export const dynamic = "force-dynamic";
export const OPTIONS = mobileOptions;

const DEFAULT_LATITUDE = 9.0019;
const DEFAULT_LONGITUDE = 7.4534;

export async function GET(request: NextRequest) {
  const headers = mobileCorsHeaders(request);
  try {
    const sql = getDatabase();
    const session = await getSessionUser();
    let latitude = Number(request.nextUrl.searchParams.get("lat") ?? DEFAULT_LATITUDE);
    let longitude = Number(request.nextUrl.searchParams.get("lng") ?? DEFAULT_LONGITUDE);
    const selectedLocationOverride = request.nextUrl.searchParams.get("origin") === "selected";

    if (session && ["consumer", "farmer"].includes(session.role) && !selectedLocationOverride) {
      const [address] = await sql`
        SELECT latitude, longitude FROM addresses WHERE user_id = ${session.id}
        ORDER BY is_default DESC, updated_at DESC LIMIT 1
      `;
      const savedLatitude = Number(address?.latitude);
      const savedLongitude = Number(address?.longitude);
      if (Number.isFinite(savedLatitude) && Number.isFinite(savedLongitude)) { latitude = savedLatitude; longitude = savedLongitude; }
    }
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400, headers });
    }

    // Every verified farm is listed, including farms whose shelves are momentarily empty, so the
    // directory stays a complete picture of who is nearby rather than only who has stock today.
    const rows = await sql`
      SELECT
        farm.id, farm.name, farm.city || ', ' || farm.state AS location, farm.description,
        farm.offers_pickup, farm.offers_delivery,
        round(distance_km(${latitude}, ${longitude}, farm.latitude, farm.longitude)::numeric, 1) AS distance,
        coalesce((SELECT round(avg(review.rating)::numeric, 2) FROM reviews review WHERE review.farm_id = farm.id AND review.is_visible), 0) AS rating,
        (SELECT count(*)::int FROM reviews review WHERE review.farm_id = farm.id AND review.is_visible) AS review_count,
        stock.in_stock, stock.out_of_stock, stock.categories,
        featured.listing_id, featured.image_url
      FROM farms farm
      JOIN LATERAL (
        SELECT
          count(*) FILTER (WHERE listing.status = 'active' AND listing.quantity_available > listing.quantity_reserved
            AND (listing.available_from IS NULL OR listing.available_from <= now())
            AND (listing.available_until IS NULL OR listing.available_until > now()))::int AS in_stock,
          count(*) FILTER (WHERE listing.status IN ('active', 'sold_out') AND listing.quantity_available <= listing.quantity_reserved)::int AS out_of_stock,
          coalesce(array_agg(DISTINCT category.name) FILTER (WHERE category.name IS NOT NULL), '{}') AS categories
        FROM produce_listings listing
        JOIN products product ON product.id = listing.product_id
        JOIN produce_categories category ON category.id = product.category_id
        WHERE listing.farm_id = farm.id AND listing.status IN ('active', 'sold_out')
      ) stock ON true
      LEFT JOIN LATERAL (
        SELECT listing.id AS listing_id, image.url AS image_url
        FROM produce_listings listing
        LEFT JOIN LATERAL (SELECT url FROM listing_images WHERE listing_id = listing.id ORDER BY sort_order, created_at LIMIT 1) image ON true
        WHERE listing.farm_id = farm.id AND image.url IS NOT NULL
        ORDER BY (listing.status = 'active' AND listing.quantity_available > listing.quantity_reserved) DESC, listing.quantity_sold DESC, listing.created_at DESC
        LIMIT 1
      ) featured ON true
      WHERE farm.verification_status = 'verified'
      ORDER BY distance_km(${latitude}, ${longitude}, farm.latitude, farm.longitude), farm.name
    `;

    const farms = rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      location: String(row.location),
      description: row.description ? String(row.description) : null,
      distance: Number(row.distance),
      rating: Number(row.rating),
      reviewCount: Number(row.review_count),
      inStock: Number(row.in_stock),
      outOfStock: Number(row.out_of_stock),
      categories: Array.isArray(row.categories) ? row.categories.map(String) : [],
      offersPickup: Boolean(row.offers_pickup),
      offersDelivery: Boolean(row.offers_delivery),
      image: row.image_url ? listingImageUrl(String(row.listing_id), row.image_url) : DEFAULT_LISTING_IMAGE,
    }));
    return NextResponse.json({ farms }, { headers });
  } catch (error) {
    console.error("Could not load farms", error);
    return NextResponse.json({ error: "Could not load farms" }, { status: 500, headers });
  }
}
