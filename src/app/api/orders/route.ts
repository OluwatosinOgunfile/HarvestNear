import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { listingImageUrl } from "@/lib/images";

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
      (SELECT json_build_object('id', delivery.id, 'status', delivery.status, 'tracking_code', delivery.tracking_code,
        'courier_name', delivery.courier_name, 'courier_phone', delivery.courier_phone, 'scheduled_date', delivery.scheduled_date,
        'window_start', delivery.window_start, 'window_end', delivery.window_end,
        'events', coalesce((SELECT json_agg(json_build_object('id', event.id, 'status', event.status, 'message', event.message, 'occurred_at', event.occurred_at) ORDER BY event.occurred_at) FROM delivery_events event WHERE event.delivery_id = delivery.id), '[]'))
        FROM deliveries delivery WHERE delivery.order_id = orders.id) AS tracking,
      coalesce((SELECT json_agg(json_build_object('id', farm.id, 'name', farm.name, 'rating', review.rating, 'comment', review.comment) ORDER BY farm.name)
        FROM farm_orders fo JOIN farms farm ON farm.id = fo.farm_id
        LEFT JOIN reviews review ON review.order_id = orders.id AND review.farm_id = farm.id AND review.customer_id = ${user.id}
        WHERE fo.order_id = orders.id), '[]') AS farms,
      coalesce(json_agg(json_build_object(
        'id', item.id, 'listing_id', item.listing_id, 'name', item.product_name, 'farm', item.farm_name, 'unit', item.unit,
        'quantity', item.quantity, 'unit_price_kobo', item.unit_price_kobo, 'image', item.image_url
      ) ORDER BY item.created_at) FILTER (WHERE item.id IS NOT NULL), '[]') AS items
    FROM orders LEFT JOIN order_items item ON item.order_id = orders.id
    WHERE orders.customer_id = ${user.id}
    GROUP BY orders.id ORDER BY orders.created_at DESC
  `;
  return NextResponse.json({ orders: orders.map((order) => ({ ...order, items: (order.items as Array<Record<string, unknown>>).map((item) => ({ ...item, image: item.image && item.listing_id ? listingImageUrl(String(item.listing_id), item.image) : item.image })) })) });
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
      listing.farm_id, farm.owner_id AS farm_owner_id, farm.name AS farm_name, image.url AS image_url
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
  const deliveryId = randomUUID();
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
  queries.push(sql`DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id = ${user.id})`);
  queries.push(sql`INSERT INTO notifications (user_id, type, title, message, action_url, metadata) VALUES (${user.id}, 'order', 'Order confirmed', ${`Your order ${orderNumber} has been confirmed and sent to the participating farms.`}, '/orders', ${JSON.stringify({ orderId, orderNumber })}::jsonb)`);
  for (const [, farmListings] of farms) {
    const ownerId = String(farmListings[0].farm_owner_id);
    queries.push(sql`INSERT INTO notifications (user_id, type, title, message, action_url, metadata) VALUES (${ownerId}, 'order', 'New order to fulfil', ${`Order ${orderNumber} includes produce from your farm.`}, '/farmer', ${JSON.stringify({ orderId, orderNumber })}::jsonb)`);
  }
  if (fulfilmentMethod === "doorstep") {
    const trackingCode = `TRK-${orderNumber.slice(3)}`;
    queries.push(sql`INSERT INTO deliveries (id, order_id, status, tracking_code, scheduled_date, window_start, window_end, notes) VALUES (${deliveryId}, ${orderId}, 'scheduled', ${trackingCode}, current_date + 1, '09:00', '13:00', 'Awaiting farm preparation')`);
    queries.push(sql`INSERT INTO delivery_events (delivery_id, status, message) VALUES (${deliveryId}, 'scheduled', 'Delivery scheduled and produce reserved')`);
  }

  try {
    await sql.transaction(queries);
    return NextResponse.json({ orderId, orderNumber }, { status: 201 });
  } catch (error) {
    console.error("Checkout failed", error);
    return NextResponse.json({ error: "Could not complete the order. Refresh your basket and try again." }, { status: 409 });
  }
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user || !["consumer", "farmer"].includes(user.role)) return NextResponse.json({ error: "Sign in to update an order" }, { status: 401 });
  const body = await request.json().catch(() => null) as { orderId?: string; action?: string } | null;
  if (!body?.orderId || body.action !== "confirm_receipt") return NextResponse.json({ error: "Invalid order update" }, { status: 400 });
  const sql = getDatabase();
  const [order] = await sql`SELECT id, fulfilment_method, status FROM orders WHERE id = ${body.orderId} AND customer_id = ${user.id}`;
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  const pickup = ["farm_pickup", "collection_hub"].includes(String(order.fulfilment_method));
  const allowed = pickup ? ["ready", "dispatched"] : ["dispatched"];
  if (!allowed.includes(String(order.status))) return NextResponse.json({ error: pickup ? "This order is not ready for collection" : "This order has not been dispatched yet" }, { status: 409 });
  const finalStatus = pickup ? "collected" : "delivered";
  const queries = [
    sql`UPDATE orders SET status = ${finalStatus}::order_status, delivered_at = now(), updated_at = now() WHERE id = ${order.id}`,
    sql`UPDATE farm_orders SET status = ${finalStatus}::order_status, updated_at = now() WHERE order_id = ${order.id}`,
  ];
  if (!pickup) {
    queries.push(sql`UPDATE deliveries SET status = 'delivered', delivered_at = now(), recipient_name = ${`${user.firstName} ${user.lastName}`}, updated_at = now() WHERE order_id = ${order.id}`);
    queries.push(sql`INSERT INTO delivery_events (delivery_id, status, message) SELECT id, 'delivered', 'Customer acknowledged receipt of produce' FROM deliveries WHERE order_id = ${order.id}`);
  }
  queries.push(sql`INSERT INTO notifications (user_id, type, title, message, action_url, metadata) SELECT farm.owner_id, 'order', 'Order received by customer', ${`The customer confirmed receipt of their produce. This order is now ${finalStatus}.`}, '/farmer', ${JSON.stringify({ orderId: String(order.id), status: finalStatus })}::jsonb FROM farm_orders farm_order JOIN farms farm ON farm.id = farm_order.farm_id WHERE farm_order.order_id = ${order.id}`);
  queries.push(sql`INSERT INTO notifications (user_id, type, title, message, action_url, metadata) VALUES (${user.id}, 'order', 'Rate your farm experience', 'Your produce has been received. Share a rating to help nearby shoppers choose confidently.', '/orders', ${JSON.stringify({ orderId: String(order.id) })}::jsonb)`);
  await sql.transaction(queries);
  const farms = await sql`SELECT farm.id, farm.name FROM farm_orders fo JOIN farms farm ON farm.id = fo.farm_id WHERE fo.order_id = ${order.id} ORDER BY farm.name`;
  return NextResponse.json({ status: finalStatus, farms });
}
