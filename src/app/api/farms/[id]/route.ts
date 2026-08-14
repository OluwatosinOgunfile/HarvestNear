import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { DEFAULT_LISTING_IMAGE, listingImageUrl } from "@/lib/images";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const sql = getDatabase();
  const [farms, listings, reviews] = await Promise.all([
    sql`SELECT farm.id, farm.name, farm.description, farm.address_text, farm.city, farm.state, farm.latitude, farm.longitude,
      farm.offers_pickup, farm.offers_delivery,
      coalesce((SELECT round(avg(review.rating)::numeric, 2) FROM reviews review WHERE review.farm_id=farm.id AND review.is_visible), 0) AS average_rating,
      (SELECT count(*)::int FROM reviews review WHERE review.farm_id=farm.id AND review.is_visible) AS review_count,
      owner.first_name, owner.last_name
      FROM farms farm JOIN users owner ON owner.id=farm.owner_id
      WHERE farm.id=${id} AND farm.verification_status='verified' LIMIT 1`,
    sql`SELECT listing.id, listing.title AS name, listing.unit, listing.unit_price_kobo,
      (listing.quantity_available-listing.quantity_reserved) AS stock,
      category.id AS category_id, category.name AS category, image.url AS image
      FROM produce_listings listing JOIN products product ON product.id=listing.product_id
      JOIN produce_categories category ON category.id=product.category_id
      LEFT JOIN LATERAL (SELECT url FROM listing_images WHERE listing_id=listing.id ORDER BY sort_order,created_at LIMIT 1) image ON true
      WHERE listing.farm_id=${id} AND listing.status='active' AND listing.quantity_available>listing.quantity_reserved
      AND (listing.available_from IS NULL OR listing.available_from<=now())
      AND (listing.available_until IS NULL OR listing.available_until>now())
      ORDER BY listing.created_at DESC`,
    sql`SELECT review.id, review.rating, review.comment, review.farmer_reply, review.created_at,
      customer.first_name, customer.last_name
      FROM reviews review JOIN users customer ON customer.id=review.customer_id
      WHERE review.farm_id=${id} AND review.is_visible ORDER BY review.created_at DESC LIMIT 30`,
  ]);
  if (!farms[0]) return NextResponse.json({ error: "Farm not found" }, { status: 404 });
  const categoryIds = listings.map((listing) => String(listing.category_id));
  const recommendations = categoryIds.length ? await sql`SELECT listing.id, listing.title AS name, listing.unit, listing.unit_price_kobo,
    (listing.quantity_available-listing.quantity_reserved) AS stock, farm.id AS farm_id, farm.name AS farm_name,
    category.name AS category, image.url AS image
    FROM produce_listings listing JOIN farms farm ON farm.id=listing.farm_id
    JOIN products product ON product.id=listing.product_id JOIN produce_categories category ON category.id=product.category_id
    LEFT JOIN LATERAL (SELECT url FROM listing_images WHERE listing_id=listing.id ORDER BY sort_order,created_at LIMIT 1) image ON true
    WHERE listing.farm_id<>${id} AND product.category_id=ANY(${categoryIds}::uuid[])
    AND farm.verification_status='verified' AND listing.status='active'
    AND listing.quantity_available>listing.quantity_reserved
    AND (listing.available_from IS NULL OR listing.available_from<=now())
    AND (listing.available_until IS NULL OR listing.available_until>now())
    ORDER BY listing.created_at DESC LIMIT 8` : [];
  const withImage = (listing: Record<string, unknown>) => ({
    ...listing,
    image: listing.image ? listingImageUrl(String(listing.id), listing.image) : DEFAULT_LISTING_IMAGE,
  });
  return NextResponse.json({
    farm: farms[0],
    listings: listings.map(withImage),
    reviews,
    recommendations: recommendations.map(withImage),
  });
}
