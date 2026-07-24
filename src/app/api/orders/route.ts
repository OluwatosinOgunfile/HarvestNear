import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { listingImageUrl } from "@/lib/images";
import { canMutateAs, checkRateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

type CheckoutItem = { listingId: string; quantity: number };

export async function GET() {
  const user = await getSessionUser();
  if (!user || !["consumer", "farmer"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sql = getDatabase();
  const orders = await sql`
    SELECT orders.id, orders.order_number, orders.status, orders.total_kobo, orders.subtotal_kobo, orders.discount_kobo,
      orders.delivery_fee_kobo, orders.fulfilment_method, orders.delivery_address_snapshot,
      orders.placed_at, orders.delivered_at,
      EXISTS (SELECT 1 FROM manual_payment_receipts receipt WHERE receipt.order_id = orders.id) AS receipt_submitted,
      (SELECT payment.status FROM payments payment WHERE payment.order_id = orders.id ORDER BY payment.created_at DESC LIMIT 1) AS payment_status,
      (SELECT json_build_object('status', refund.status, 'resolution_method', refund.resolution_method, 'amount_kobo', refund.amount_kobo, 'cancellation_fee_kobo', refund.cancellation_fee_kobo, 'requested_at', refund.requested_at) FROM refunds refund WHERE refund.order_id = orders.id ORDER BY refund.requested_at DESC LIMIT 1) AS refund,
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
        'quantity', item.quantity, 'unit_price_kobo', item.unit_price_kobo, 'image', item.image_url, 'status', item.status,
        'preparing_at', item.preparing_at, 'ready_at', item.ready_at, 'dispatched_at', item.dispatched_at,
        'received_at', item.received_at, 'updated_at', item.updated_at
      ) ORDER BY item.created_at) FILTER (WHERE item.id IS NOT NULL), '[]') AS items
    FROM orders LEFT JOIN order_items item ON item.order_id = orders.id
    WHERE orders.customer_id = ${user.id}
    GROUP BY orders.id ORDER BY orders.created_at DESC
  `;
  return NextResponse.json({ orders: orders.map((order) => ({ ...order, items: (order.items as Array<Record<string, unknown>>).map((item) => ({ ...item, image: item.image && item.listing_id ? listingImageUrl(String(item.listing_id), item.image) : item.image })) })) });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !["consumer", "farmer"].includes(user.role) || !canMutateAs(user)) return NextResponse.json({ error: "Sign in with a non-impersonated account to place an order" }, { status: 401 });
  if (!await checkRateLimit(request, "orders.create", 10, 10 * 60, user.id)) return NextResponse.json({ error: "Too many checkout attempts. Try again later." }, { status: 429 });
  const body = await request.json().catch(() => null) as { items?: CheckoutItem[]; fulfilmentMethod?: string } | null;
  if (!Array.isArray(body?.items) || body.items.length > 50) return NextResponse.json({ error: "Invalid basket" }, { status: 400 });
  const items = body.items.filter((item) => /^[0-9a-f-]{36}$/i.test(item.listingId) && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 10_000);
  const fulfilmentMethod = body?.fulfilmentMethod === "pickup" ? "farm_pickup" : "doorstep";
  if (!items.length) return NextResponse.json({ error: "Your basket is empty" }, { status: 400 });

  const sql = getDatabase();
  const [paymentSettings] = await sql`SELECT is_enabled, bank_name, account_name, account_number FROM manual_payment_settings WHERE id = 1`;
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
  const orderNumber = `HN-${Date.now().toString().slice(-8)}`;
  const subtotalKobo = listings.reduce((sum, listing) => sum + Number(listing.unit_price_kobo) * Number(requested.get(String(listing.id))), 0);
  const deliveryFeeKobo = fulfilmentMethod === "doorstep" ? 180000 : 0;
  const grossTotalKobo = subtotalKobo + deliveryFeeKobo;
  const [creditAccount] = await sql`SELECT balance_kobo FROM store_credit_accounts WHERE user_id = ${user.id}`;
  const creditAppliedKobo = Math.min(grossTotalKobo, Number(creditAccount?.balance_kobo || 0));
  const payableKobo = grossTotalKobo - creditAppliedKobo;
  const paidWithCredit = payableKobo === 0;
  if (!paidWithCredit && (!paymentSettings?.is_enabled || !paymentSettings.bank_name || !paymentSettings.account_name || !paymentSettings.account_number)) return NextResponse.json({ error: "Manual bank payment is not currently available" }, { status: 503 });
  const farms = new Map<string, typeof listings>();
  for (const listing of listings) farms.set(String(listing.farm_id), [...(farms.get(String(listing.farm_id)) ?? []), listing]);

  const queries = [sql`
    INSERT INTO orders (id, order_number, customer_id, status, subtotal_kobo, delivery_fee_kobo, discount_kobo, total_kobo, fulfilment_method, delivery_address_snapshot, placed_at, paid_at)
    VALUES (${orderId}, ${orderNumber}, ${user.id}, ${paidWithCredit ? "confirmed" : "pending_payment"}::order_status, ${subtotalKobo}, ${deliveryFeeKobo}, ${creditAppliedKobo}, ${payableKobo}, ${fulfilmentMethod}::fulfilment_method,
      ${fulfilmentMethod === "doorstep" ? JSON.stringify({ city: "Gudu", state: "FCT" }) : null}::jsonb, now(), ${paidWithCredit ? new Date() : null})
  `];

  for (const [farmId, farmListings] of farms) {
    const farmOrderId = randomUUID();
    const farmSubtotal = farmListings.reduce((sum, listing) => sum + Number(listing.unit_price_kobo) * Number(requested.get(String(listing.id))), 0);
    queries.push(sql`INSERT INTO farm_orders (id, order_id, farm_id, status, subtotal_kobo, platform_fee_kobo, farmer_net_kobo, confirmed_at) VALUES (${farmOrderId}, ${orderId}, ${farmId}, ${paidWithCredit ? "confirmed" : "pending_payment"}::order_status, ${farmSubtotal}, ${Math.round(farmSubtotal * .1)}, ${Math.round(farmSubtotal * .9)}, ${paidWithCredit ? new Date() : null})`);
    for (const listing of farmListings) {
      const quantity = Number(requested.get(String(listing.id)));
      queries.push(sql`INSERT INTO order_items (order_id, farm_order_id, listing_id, product_name, farm_name, unit, quantity, unit_price_kobo, line_total_kobo, image_url, status) VALUES (${orderId}, ${farmOrderId}, ${listing.id}, ${listing.title}, ${listing.farm_name}, ${listing.unit}, ${quantity}, ${listing.unit_price_kobo}, ${Number(listing.unit_price_kobo) * quantity}, ${listing.image_url}, ${paidWithCredit ? "confirmed" : "pending_payment"}::order_status)`);
      queries.push(sql`UPDATE produce_listings SET quantity_available = quantity_available - ${quantity}, quantity_sold = quantity_sold + ${quantity}, status = CASE WHEN quantity_available - ${quantity} <= quantity_reserved THEN 'sold_out'::listing_status ELSE status END, updated_at = now(), version = version + 1 WHERE id = ${listing.id} AND quantity_available - quantity_reserved >= ${quantity}`);
    }
  }
  if (payableKobo > 0) queries.push(sql`INSERT INTO payments (order_id, provider, provider_reference, status, amount_kobo, payment_channel, provider_response) VALUES (${orderId}, 'manual', ${`manual-${orderNumber}`}, 'initialized', ${payableKobo}, 'bank_transfer', '{"mode":"manual","receiptSubmitted":false}'::jsonb)`);
  if (creditAppliedKobo > 0) queries.push(sql`UPDATE store_credit_accounts SET balance_kobo = balance_kobo - ${creditAppliedKobo}, updated_at = now() WHERE user_id = ${user.id} AND balance_kobo >= ${creditAppliedKobo}`);
  if (creditAppliedKobo > 0) queries.push(sql`INSERT INTO store_credit_transactions (user_id, amount_kobo, transaction_type, reference_type, reference_id, description) VALUES (${user.id}, ${-creditAppliedKobo}, 'order_debit', 'order', ${orderId}, ${`Account credit applied to order ${orderNumber}`})`);
  queries.push(sql`DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id = ${user.id})`);
  queries.push(sql`INSERT INTO notifications (user_id, type, title, message, action_url, metadata) VALUES (${user.id}, 'order', ${paidWithCredit ? "Order confirmed with account credit" : "Payment receipt required"}, ${paidWithCredit ? `Your account credit paid order ${orderNumber} in full.` : `Order ${orderNumber} is reserved. Upload your bank-transfer receipt for administrator confirmation.`}, '/orders', ${JSON.stringify({ orderId, orderNumber, creditAppliedKobo })}::jsonb)`);
  if (paidWithCredit) queries.push(sql`INSERT INTO notifications (user_id, type, title, message, action_url, metadata) SELECT DISTINCT farm.owner_id, 'order', 'New order to fulfil', ${`Order ${orderNumber} is paid and ready for fulfilment.`}, '/farmer', ${JSON.stringify({ orderId, orderNumber })}::jsonb FROM farm_orders farm_order JOIN farms farm ON farm.id = farm_order.farm_id WHERE farm_order.order_id = ${orderId}`);
  if (paidWithCredit && fulfilmentMethod === "doorstep") {
    const deliveryId = randomUUID(); const trackingCode = `TRK-${orderNumber.slice(3)}`;
    queries.push(sql`INSERT INTO deliveries (id, order_id, status, tracking_code, scheduled_date, window_start, window_end, notes) VALUES (${deliveryId}, ${orderId}, 'scheduled', ${trackingCode}, current_date + 1, '09:00', '13:00', 'Paid with account credit; awaiting farm preparation')`);
    queries.push(sql`INSERT INTO delivery_events (delivery_id, status, message) VALUES (${deliveryId}, 'scheduled', 'Payment completed with account credit')`);
  }

  try {
    await sql.transaction(queries);
    return NextResponse.json({ orderId, orderNumber, requiresReceipt: !paidWithCredit, creditAppliedKobo, payableKobo }, { status: 201 });
  } catch (error) {
    console.error("Checkout failed", error);
    return NextResponse.json({ error: "Could not complete the order. Refresh your basket and try again." }, { status: 409 });
  }
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user || !["consumer", "farmer"].includes(user.role) || !canMutateAs(user)) return NextResponse.json({ error: "Impersonation is read-only" }, { status: 403 });
  const body = await request.json().catch(() => null) as { orderId?: string; itemId?: string; action?: string } | null;
  if (!body?.orderId || !body.itemId || body.action !== "confirm_item_receipt") return NextResponse.json({ error: "Select the product you received" }, { status: 400 });
  const sql = getDatabase();
  const [item] = await sql`
    SELECT item.id, item.product_name, item.status, item.farm_order_id, item.order_id,
      orders.order_number, orders.fulfilment_method, farm.owner_id AS farmer_id
    FROM order_items item
    JOIN orders ON orders.id = item.order_id
    JOIN farm_orders farm_order ON farm_order.id = item.farm_order_id
    JOIN farms farm ON farm.id = farm_order.farm_id
    WHERE item.id = ${body.itemId} AND item.order_id = ${body.orderId} AND orders.customer_id = ${user.id}
  `;
  if (!item) return NextResponse.json({ error: "Order product not found" }, { status: 404 });
  const pickup = ["farm_pickup", "collection_hub"].includes(String(item.fulfilment_method));
  const allowed = pickup ? ["ready", "dispatched"] : ["dispatched"];
  if (!allowed.includes(String(item.status))) return NextResponse.json({ error: pickup ? "This product is not ready for collection" : "This product has not been dispatched yet" }, { status: 409 });
  const finalStatus = pickup ? "collected" : "delivered";
  await sql.transaction([
    sql`UPDATE order_items SET status = ${finalStatus}::order_status, received_at = now(), updated_at = now() WHERE id = ${item.id}`,
    sql`UPDATE farm_orders farm_order SET status = CASE
      WHEN NOT EXISTS (SELECT 1 FROM order_items child WHERE child.farm_order_id = farm_order.id AND child.status NOT IN ('delivered','collected')) THEN ${finalStatus}::order_status
      WHEN ${item.fulfilment_method} = 'doorstep' AND NOT EXISTS (SELECT 1 FROM order_items child WHERE child.farm_order_id = farm_order.id AND child.status NOT IN ('dispatched','delivered')) THEN 'dispatched'::order_status
      WHEN NOT EXISTS (SELECT 1 FROM order_items child WHERE child.farm_order_id = farm_order.id AND child.status NOT IN ('ready','dispatched','delivered','collected')) THEN 'ready'::order_status
      ELSE 'preparing'::order_status END,
      updated_at = now() WHERE farm_order.id = ${item.farm_order_id}`,
    sql`UPDATE orders customer_order SET status = CASE
      WHEN NOT EXISTS (SELECT 1 FROM order_items child WHERE child.order_id = customer_order.id AND child.status NOT IN ('delivered','collected')) THEN ${finalStatus}::order_status
      WHEN ${item.fulfilment_method} = 'doorstep' AND NOT EXISTS (SELECT 1 FROM farm_orders child WHERE child.order_id = customer_order.id AND child.status NOT IN ('dispatched','delivered')) THEN 'dispatched'::order_status
      WHEN NOT EXISTS (SELECT 1 FROM farm_orders child WHERE child.order_id = customer_order.id AND child.status NOT IN ('ready','dispatched','delivered','collected')) THEN 'ready'::order_status
      ELSE 'preparing'::order_status END,
      delivered_at = CASE WHEN NOT EXISTS (SELECT 1 FROM order_items child WHERE child.order_id = customer_order.id AND child.status NOT IN ('delivered','collected')) THEN now() ELSE delivered_at END,
      updated_at = now() WHERE customer_order.id = ${item.order_id}`,
  ]);
  const [updatedOrder] = await sql`SELECT status FROM orders WHERE id = ${item.order_id}`;
  const completed = ["delivered", "collected"].includes(String(updatedOrder?.status));
  await sql`INSERT INTO notifications (user_id, type, title, message, action_url, metadata)
    VALUES (${item.farmer_id}, 'order', 'Product received by customer',
      ${`The buyer confirmed receipt of ${item.product_name} in order ${item.order_number}.`}, '/farmer',
      ${JSON.stringify({ orderId: String(item.order_id), itemId: String(item.id), status: finalStatus })}::jsonb)`;
  if (completed) {
    if (!pickup) {
      await sql`UPDATE deliveries SET status = 'delivered', delivered_at = now(), recipient_name = ${`${user.firstName} ${user.lastName}`}, updated_at = now() WHERE order_id = ${item.order_id}`;
      await sql`INSERT INTO delivery_events (delivery_id, status, message) SELECT id, 'delivered', 'Customer acknowledged receipt of every product' FROM deliveries WHERE order_id = ${item.order_id}`;
    }
    await sql`INSERT INTO notifications (user_id, type, title, message, action_url, metadata)
      VALUES (${user.id}, 'order', 'Tell us about your order', 'Every product has been received. Rate the farms and share feedback about your experience.', '/orders',
        ${JSON.stringify({ orderId: String(item.order_id), completed: true })}::jsonb)`;
  }
  const farms = completed ? await sql`SELECT farm.id, farm.name FROM farm_orders fo JOIN farms farm ON farm.id = fo.farm_id WHERE fo.order_id = ${item.order_id} ORDER BY farm.name` : [];
  return NextResponse.json({ status: finalStatus, orderStatus: updatedOrder?.status, completed, farms });
}
