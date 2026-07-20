import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";

async function farmerSession() {
  const user = await getSessionUser();
  return user?.role === "farmer" ? user : null;
}

function validListingImage(value?: string) {
  if (!value) return true;
  if (/^\/produce\/[a-z0-9._-]+$/i.test(value)) return true;
  return /^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(value) && value.length <= 2_800_000;
}

export async function GET() {
  const user = await farmerSession();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sql = getDatabase();
  const [farm] = await sql`SELECT id, name, verification_status FROM farms WHERE owner_id = ${user.id} ORDER BY created_at LIMIT 1`;
  if (!farm) return NextResponse.json({ error: "No farm is linked to this account" }, { status: 404 });

  const [metricRows, orders, listings, categories] = await Promise.all([
    sql`SELECT
      coalesce((SELECT sum(farmer_net_kobo) FROM farm_orders fo JOIN orders o ON o.id = fo.order_id WHERE fo.farm_id = ${farm.id} AND o.paid_at::date = current_date AND fo.status NOT IN ('cancelled','refunded')), 0) AS today_sales_kobo,
      (SELECT count(*)::int FROM farm_orders WHERE farm_id = ${farm.id} AND status IN ('paid','confirmed','preparing','ready','dispatched')) AS open_orders,
      coalesce((SELECT sum(quantity_available - quantity_reserved) FROM produce_listings WHERE farm_id = ${farm.id} AND status = 'active'), 0) AS available_stock,
      (SELECT count(*)::int FROM produce_listings WHERE farm_id = ${farm.id} AND status = 'active') AS active_listings,
      coalesce((SELECT sum(farmer_net_kobo) FROM farm_orders fo WHERE fo.farm_id = ${farm.id} AND fo.status IN ('delivered','collected') AND NOT EXISTS (SELECT 1 FROM payouts WHERE payouts.farm_order_id = fo.id)), 0) AS next_payout_kobo`,
    sql`SELECT fo.id, o.order_number, fo.status, fo.subtotal_kobo, fo.farmer_net_kobo, o.fulfilment_method, o.placed_at,
      users.first_name || ' ' || users.last_name AS customer,
      string_agg(items.quantity::text || ' ' || items.unit || ' · ' || items.product_name, ', ' ORDER BY items.created_at) AS items
      FROM farm_orders fo JOIN orders o ON o.id = fo.order_id JOIN users ON users.id = o.customer_id
      JOIN order_items items ON items.farm_order_id = fo.id WHERE fo.farm_id = ${farm.id}
      GROUP BY fo.id, o.order_number, o.fulfilment_method, o.placed_at, users.first_name, users.last_name
      ORDER BY o.placed_at DESC LIMIT 50`,
    sql`SELECT listing.id, listing.title, listing.unit, listing.unit_price_kobo, listing.quantity_available,
      listing.quantity_reserved, listing.quantity_sold, listing.status, listing.harvest_date, listing.badge, product.category_id, image.url AS image_url
      FROM produce_listings listing JOIN products product ON product.id = listing.product_id
      LEFT JOIN LATERAL (SELECT url FROM listing_images WHERE listing_id = listing.id ORDER BY sort_order LIMIT 1) image ON true
      WHERE listing.farm_id = ${farm.id} ORDER BY listing.created_at DESC LIMIT 50`,
    sql`SELECT id, name FROM produce_categories WHERE is_active ORDER BY name`,
  ]);
  return NextResponse.json({ user, farm, metrics: metricRows[0], orders, listings, categories });
}

export async function POST(request: Request) {
  const user = await farmerSession();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, string> | null;
  if (!body?.farmId || !body.categoryId || !body.name || !body.unit || !body.price || !body.stock || !body.harvestDate) return NextResponse.json({ error: "Complete all required fields" }, { status: 400 });
  if (!validListingImage(body.imageUrl)) return NextResponse.json({ error: "Upload a JPG, PNG, or WebP image no larger than 2 MB" }, { status: 400 });
  const sql = getDatabase();
  const [ownedFarm] = await sql`SELECT id FROM farms WHERE id = ${body.farmId} AND owner_id = ${user.id} AND verification_status = 'verified'`;
  if (!ownedFarm) return NextResponse.json({ error: "Only verified farms can publish listings" }, { status: 403 });
  const slug = body.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  try {
    const [product] = await sql`INSERT INTO products (category_id, name, slug, default_unit) VALUES (${body.categoryId}, ${body.name}, ${slug}, ${body.unit}) ON CONFLICT (slug) DO UPDATE SET default_unit = excluded.default_unit RETURNING id`;
    const [listing] = await sql`
      INSERT INTO produce_listings (farm_id, product_id, title, unit, unit_price_kobo, quantity_available, harvest_date, available_from, available_until, status, badge)
      VALUES (${ownedFarm.id}, ${product.id}, ${body.name}, ${body.unit}, ${Math.round(Number(body.price) * 100)}, ${Number(body.stock)}, ${body.harvestDate}, now(), now() + interval '14 days', 'active', ${body.badge || null}) RETURNING id
    `;
    if (body.imageUrl) await sql`INSERT INTO listing_images (listing_id, url, alt_text) VALUES (${listing.id}, ${body.imageUrl}, ${body.name})`;
    return NextResponse.json({ id: listing.id }, { status: 201 });
  } catch (error) {
    console.error("Farmer listing creation failed", error);
    return NextResponse.json({ error: "Could not create listing" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const user = await farmerSession();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, string> | null;
  const sql = getDatabase();
  if (body?.type === "order" && body.id && ["preparing", "ready", "collected"].includes(body.status)) {
    const [order] = await sql`UPDATE farm_orders SET status = ${body.status}::order_status, confirmed_at = coalesce(confirmed_at, now()), ready_at = CASE WHEN ${body.status} = 'ready' THEN now() ELSE ready_at END, updated_at = now() WHERE id = ${body.id} AND farm_id IN (SELECT id FROM farms WHERE owner_id = ${user.id}) RETURNING id`;
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return NextResponse.json({ updated: true });
  }
  if (body?.type === "listing" && body.id && ["active", "paused"].includes(body.status)) {
    if (!body.categoryId || !body.name || !body.unit || !body.price || !body.stock || !body.harvestDate) return NextResponse.json({ error: "Complete all required fields" }, { status: 400 });
    if (!validListingImage(body.imageUrl)) return NextResponse.json({ error: "Upload a JPG, PNG, or WebP image no larger than 2 MB" }, { status: 400 });
    const price = Number(body.price);
    const stock = Number(body.stock);
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(stock) || stock < 0) return NextResponse.json({ error: "Enter a valid price and quantity" }, { status: 400 });
    const [ownedListing] = await sql`SELECT id, quantity_reserved FROM produce_listings WHERE id = ${body.id} AND farm_id IN (SELECT id FROM farms WHERE owner_id = ${user.id})`;
    if (!ownedListing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    if (stock < Number(ownedListing.quantity_reserved)) return NextResponse.json({ error: "Quantity cannot be lower than stock already reserved" }, { status: 400 });
    const slug = body.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    try {
      const [product] = await sql`INSERT INTO products (category_id, name, slug, default_unit) VALUES (${body.categoryId}, ${body.name}, ${slug}, ${body.unit}) ON CONFLICT (slug) DO UPDATE SET category_id = excluded.category_id, name = excluded.name, default_unit = excluded.default_unit RETURNING id`;
      await sql`UPDATE produce_listings SET product_id = ${product.id}, title = ${body.name}, unit = ${body.unit}, unit_price_kobo = ${Math.round(price * 100)}, quantity_available = ${stock}, harvest_date = ${body.harvestDate}, status = ${body.status}::listing_status, badge = ${body.badge || null}, updated_at = now(), version = version + 1 WHERE id = ${body.id}`;
      await sql`DELETE FROM listing_images WHERE listing_id = ${body.id}`;
      if (body.imageUrl) await sql`INSERT INTO listing_images (listing_id, url, alt_text) VALUES (${body.id}, ${body.imageUrl}, ${body.name})`;
      return NextResponse.json({ updated: true });
    } catch (error) {
      console.error("Farmer listing update failed", error);
      return NextResponse.json({ error: "Could not update listing" }, { status: 400 });
    }
  }
  return NextResponse.json({ error: "Invalid update" }, { status: 400 });
}
