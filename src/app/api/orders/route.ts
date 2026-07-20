import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

type CheckoutItem = { listingId: string; quantity: number };

export async function GET() {
  const user = await getSessionUser();
  if (!user || !["consumer", "farmer"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sql = getDatabase();
  const orders = await sql`
    SELECT orders.id, orders.order_number, orders.status, orders.total_kobo, orders.subtotal_kobo,
      orders.delivery_fee_kobo, orders.fulfilment_method, orders.delivery_address_snapshot,
      orders.placed_at, orders.delivered_at,
      coalesce(json_agg(json_build_object(
        'id', item.id, 'name', item.product_name, 'farm', item.farm_name, 'unit', item.unit,
        'quantity', item.quantity, 'unit_price_kobo', item.unit_price_kobo, 'image', item.image_url
      ) ORDER BY item.created_at) FILTER (WHERE item.id IS NOT NULL), '[]') AS items
    FROM orders LEFT JOIN order_items item ON item.order_id = orders.id
    WHERE orders.customer_id = ${user.id}
    GROUP BY orders.id ORDER BY orders.created_at DESC
  `;
  return NextResponse.json({ orders });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !["consumer", "farmer"].includes(user.role)) return NextResponse.json({ error: "Sign in to place an order" }, { status: 401 });
  const body = await request.json().catch(() => null) as { items?: CheckoutItem[]; fulfilmentMethod?: string } | null;
  const items = body?.items?.filter((item) => item.listingId && Number.isInteger(item.quantity) && item.quantity > 0) ?? [];
  const fulfilmentMethod = body?.fulfilmentMethod === "pickup" ? "farm_pickup" : "doorstep";
  if (!items.length) return NextResponse.json({ error: "Your basket is empty" }, { status: 400 });

  const sql = getDatabase();
  const listingIds = items.map((item) => item.listingId);
  const listings = await sql`
    SELECT listing.id, listing.title, listing.unit, listing.unit_price_kobo, listing.quantity_available,
      listing.farm_id, farm.name AS farm_name, image.url AS image_url
    FROM produce_listings listing JOIN farms farm ON farm.id = listing.farm_id
    LEFT JOIN LATERAL (SELECT url FROM listing_images WHERE listing_id = listing.id ORDER BY sort_order LIMIT 1) image ON true
    WHERE listing.id = ANY(${listingIds}::uuid[]) AND listing.status = 'active' AND farm.verification_status = 'verified'
  `;
  if (listings.length !== items.length) return NextResponse.json({ error: "One or more listings are no longer available" }, { status: 409 });

  const requested = new Map(items.map((item) => [item.listingId, item.quantity]));
  for (const listing of listings) {
    if (Number(listing.quantity_available) < Number(requested.get(String(listing.id)))) return NextResponse.json({ error: `${listing.title} does not have enough stock` }, { status: 409 });
  }

  const orderId = randomUUID();
  const orderNumber = `HN-${Date.now().toString().slice(-8)}`;
  const subtotalKobo = listings.reduce((sum, listing) => sum + Number(listing.unit_price_kobo) * Number(requested.get(String(listing.id))), 0);
  const deliveryFeeKobo = fulfilmentMethod === "doorstep" ? 180000 : 0;
  const farms = new Map<string, typeof listings>();
  for (const listing of listings) farms.set(String(listing.farm_id), [...(farms.get(String(listing.farm_id)) ?? []), listing]);

  const queries = [sql`
    INSERT INTO orders (id, order_number, customer_id, status, subtotal_kobo, delivery_fee_kobo, total_kobo, fulfilment_method, delivery_address_snapshot, placed_at, paid_at)
    VALUES (${orderId}, ${orderNumber}, ${user.id}, 'confirmed', ${subtotalKobo}, ${deliveryFeeKobo}, ${subtotalKobo + deliveryFeeKobo}, ${fulfilmentMethod}::fulfilment_method,
      ${fulfilmentMethod === "doorstep" ? JSON.stringify({ city: "Gudu", state: "FCT" }) : null}::jsonb, now(), now())
  `];

  for (const [farmId, farmListings] of farms) {
    const farmOrderId = randomUUID();
    const farmSubtotal = farmListings.reduce((sum, listing) => sum + Number(listing.unit_price_kobo) * Number(requested.get(String(listing.id))), 0);
    queries.push(sql`INSERT INTO farm_orders (id, order_id, farm_id, status, subtotal_kobo, platform_fee_kobo, farmer_net_kobo, confirmed_at) VALUES (${farmOrderId}, ${orderId}, ${farmId}, 'confirmed', ${farmSubtotal}, ${Math.round(farmSubtotal * .1)}, ${Math.round(farmSubtotal * .9)}, now())`);
    for (const listing of farmListings) {
      const quantity = Number(requested.get(String(listing.id)));
      queries.push(sql`INSERT INTO order_items (order_id, farm_order_id, listing_id, product_name, farm_name, unit, quantity, unit_price_kobo, line_total_kobo, image_url) VALUES (${orderId}, ${farmOrderId}, ${listing.id}, ${listing.title}, ${listing.farm_name}, ${listing.unit}, ${quantity}, ${listing.unit_price_kobo}, ${Number(listing.unit_price_kobo) * quantity}, ${listing.image_url})`);
      queries.push(sql`UPDATE produce_listings SET quantity_available = quantity_available - ${quantity}, quantity_sold = quantity_sold + ${quantity}, status = CASE WHEN quantity_available - ${quantity} <= quantity_reserved THEN 'sold_out'::listing_status ELSE status END, updated_at = now(), version = version + 1 WHERE id = ${listing.id} AND quantity_available - quantity_reserved >= ${quantity}`);
    }
  }
  queries.push(sql`INSERT INTO payments (order_id, provider_reference, status, amount_kobo, paid_at, provider_response) VALUES (${orderId}, ${`demo-${orderNumber}`}, 'successful', ${subtotalKobo + deliveryFeeKobo}, now(), '{"mode":"demo"}'::jsonb)`);

  try {
    await sql.transaction(queries);
    return NextResponse.json({ orderId, orderNumber }, { status: 201 });
  } catch (error) {
    console.error("Checkout failed", error);
    return NextResponse.json({ error: "Could not complete the order. Refresh your basket and try again." }, { status: 409 });
  }
}
