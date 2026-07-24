import { del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { listingImageUrl, profileImageUrl } from "@/lib/images";
import { canMutateAs, checkRateLimit, validText } from "@/lib/security";

async function farmerSession(write = false) {
  const user = await getSessionUser();
  return user?.role === "farmer" && (!write || canMutateAs(user)) ? user : null;
}

function validListingImage(value?: string) {
  if (!value) return true;
  if (/^\/produce\/[a-z0-9._-]+$/i.test(value)) return true;
  try { return new URL(value).hostname.endsWith(".blob.vercel-storage.com"); } catch { return false; }
}

export async function GET(request: Request) {
  const user = await farmerSession();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sql = getDatabase();
  const farms = await sql`SELECT id, name, verification_status, city, state FROM farms WHERE owner_id = ${user.id} ORDER BY created_at`;
  const requestedFarmId = new URL(request.url).searchParams.get("farmId");
  const farm = farms.find((item) => String(item.id) === requestedFarmId) || farms[0];
  if (!farm) return NextResponse.json({ error: "No farm is linked to this account" }, { status: 404 });

  const [metricRows, orders, listings, categories, reviews] = await Promise.all([
    sql`SELECT
      coalesce((SELECT sum(farmer_net_kobo) FROM farm_orders fo JOIN orders o ON o.id = fo.order_id WHERE fo.farm_id = ${farm.id} AND o.paid_at::date = current_date AND fo.status NOT IN ('cancelled','refunded')), 0) AS today_sales_kobo,
      (SELECT count(*)::int FROM farm_orders WHERE farm_id = ${farm.id} AND status IN ('paid','confirmed','preparing','ready','dispatched')) AS open_orders,
      coalesce((SELECT sum(quantity_available - quantity_reserved) FROM produce_listings WHERE farm_id = ${farm.id} AND status = 'active'), 0) AS available_stock,
      (SELECT count(*)::int FROM produce_listings WHERE farm_id = ${farm.id} AND status = 'active') AS active_listings,
      coalesce((SELECT sum(subtotal_kobo) FROM farm_orders fo WHERE fo.farm_id = ${farm.id} AND fo.status IN ('delivered','collected') AND NOT EXISTS (SELECT 1 FROM payouts WHERE payouts.farm_order_id = fo.id)), 0) AS payout_gross_kobo,
      coalesce((SELECT sum(platform_fee_kobo) FROM farm_orders fo WHERE fo.farm_id = ${farm.id} AND fo.status IN ('delivered','collected') AND NOT EXISTS (SELECT 1 FROM payouts WHERE payouts.farm_order_id = fo.id)), 0) AS payout_fee_kobo,
      coalesce((SELECT sum(farmer_net_kobo) FROM farm_orders fo WHERE fo.farm_id = ${farm.id} AND fo.status IN ('delivered','collected') AND NOT EXISTS (SELECT 1 FROM payouts WHERE payouts.farm_order_id = fo.id)), 0) AS next_payout_kobo,
      coalesce((SELECT sum(subtotal_kobo) FROM farm_orders WHERE farm_id = ${farm.id} AND status IN ('delivered','collected')), 0) AS cumulative_gross_kobo,
      coalesce((SELECT sum(platform_fee_kobo) FROM farm_orders WHERE farm_id = ${farm.id} AND status IN ('delivered','collected')), 0) AS cumulative_fee_kobo,
      coalesce((SELECT sum(farmer_net_kobo) FROM farm_orders WHERE farm_id = ${farm.id} AND status IN ('delivered','collected')), 0) AS cumulative_net_kobo`,
    sql`SELECT fo.id, o.order_number, fo.status, fo.subtotal_kobo, fo.farmer_net_kobo, o.fulfilment_method, o.placed_at,
      o.delivery_address_snapshot, o.customer_note, users.id AS customer_id, users.email AS customer_email, users.phone AS customer_phone, users.avatar_url AS customer_avatar,
      delivery.tracking_code, delivery.status AS delivery_status, delivery.window_start, delivery.window_end,
      users.first_name || ' ' || users.last_name AS customer,
      json_agg(json_build_object(
        'id', items.id, 'name', items.product_name, 'quantity', items.quantity, 'unit', items.unit,
        'status', items.status, 'preparing_at', items.preparing_at, 'ready_at', items.ready_at,
        'dispatched_at', items.dispatched_at, 'received_at', items.received_at, 'updated_at', items.updated_at
      ) ORDER BY items.created_at) AS items
      FROM farm_orders fo JOIN orders o ON o.id = fo.order_id JOIN users ON users.id = o.customer_id
      JOIN order_items items ON items.farm_order_id = fo.id LEFT JOIN deliveries delivery ON delivery.order_id = o.id WHERE fo.farm_id = ${farm.id} AND fo.status <> 'pending_payment'
      GROUP BY fo.id, o.order_number, o.fulfilment_method, o.placed_at, o.delivery_address_snapshot, o.customer_note, users.id, users.email, users.phone, users.avatar_url, users.first_name, users.last_name, delivery.tracking_code, delivery.status, delivery.window_start, delivery.window_end
      ORDER BY o.placed_at DESC LIMIT 50`,
    sql`SELECT listing.id, listing.title, listing.unit, listing.unit_price_kobo, listing.quantity_available,
      listing.quantity_reserved, listing.quantity_sold, listing.status, listing.harvest_date, listing.badge, product.category_id, image.url AS image_url
      FROM produce_listings listing JOIN products product ON product.id = listing.product_id
      LEFT JOIN LATERAL (SELECT url FROM listing_images WHERE listing_id = listing.id ORDER BY sort_order LIMIT 1) image ON true
      WHERE listing.farm_id = ${farm.id} ORDER BY listing.created_at DESC LIMIT 50`,
    sql`SELECT id, name FROM produce_categories WHERE is_active ORDER BY name`,
    sql`SELECT review.id, review.rating, review.comment, review.farmer_reply, review.created_at,
      users.first_name || ' ' || users.last_name AS customer_name, orders.order_number
      FROM reviews review JOIN users ON users.id = review.customer_id JOIN orders ON orders.id = review.order_id
      WHERE review.farm_id = ${farm.id} AND review.is_visible
      ORDER BY review.created_at DESC LIMIT 50`,
  ]);
  return NextResponse.json({ user, farm, farms, metrics: metricRows[0], orders: orders.map((order) => {
    const itemTracking = order.items as Array<{ id: string; name: string; quantity: number; unit: string; status: string; preparing_at: string | null; ready_at: string | null; dispatched_at: string | null; received_at: string | null; updated_at: string }>;
    return { ...order, items: itemTracking.map((item) => `${item.quantity} ${item.unit} · ${item.name} (${item.status.replaceAll("_", " ")})`).join(", "), itemTracking, customer_avatar: order.customer_avatar ? profileImageUrl(String(order.customer_id), order.customer_avatar) : null };
  }), listings: listings.map((listing) => ({ ...listing, stored_image_url: listing.image_url, image_url: listing.image_url ? listingImageUrl(String(listing.id), listing.image_url) : null })), categories, reviews });
}

export async function POST(request: Request) {
  const user = await farmerSession(true);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!await checkRateLimit(request, "farmer.write", 60, 60 * 60, user.id)) return NextResponse.json({ error: "Update limit reached. Try again later." }, { status: 429 });
  const body = await request.json().catch(() => null) as Record<string, string> | null;
  if (body?.type === "farm") {
    return POSTFarm(request, user, body);
  }
  if (!body?.farmId || !body.categoryId || !body.name || !body.unit || !body.price || !body.stock || !body.harvestDate) return NextResponse.json({ error: "Complete all required fields" }, { status: 400 });
  if (!validText(body.name, 140) || !validText(body.unit, 40) || (body.badge && !validText(body.badge, 80))) return NextResponse.json({ error: "One or more listing fields are too long" }, { status: 400 });
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

async function POSTFarm(_request: Request, user: { id: string; email: string }, body: Record<string, string>) {
  if (!body.name?.trim() || !body.location?.trim() || !body.phone?.trim()) return NextResponse.json({ error: "Farm name, location, and phone are required" }, { status: 400 });
  if (!validText(body.name, 140) || !validText(body.location, 300) || !validText(body.phone, 30)) return NextResponse.json({ error: "One or more farm fields are too long" }, { status: 400 });
  const latitude = Number(body.latitude), longitude = Number(body.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return NextResponse.json({ error: "Capture valid farm coordinates" }, { status: 400 });
  const parts = body.location.split(",").map((part) => part.trim()).filter(Boolean);
  const slug = `${body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${randomUUID().slice(0, 8)}`;
  const sql = getDatabase();
  const [farm] = await sql`INSERT INTO farms (owner_id, name, slug, description, phone, email, address_text, city, state, latitude, longitude, verification_status, offers_pickup) VALUES (${user.id}, ${body.name.trim()}, ${slug}, 'New farm awaiting profile completion and verification.', ${body.phone.trim()}, ${user.email}, ${body.location.trim()}, ${parts[0] || "Abuja"}, ${parts.at(-1) || "FCT"}, ${latitude}, ${longitude}, 'pending', true) RETURNING id, name, verification_status`;
  await sql`INSERT INTO notifications (user_id, type, title, message, action_url, metadata) VALUES (${user.id}, 'farm', 'Farm submitted for verification', ${`${body.name.trim()} has been added and is awaiting administrator verification.`}, '/farmer', ${JSON.stringify({ farmId: String(farm.id), status: "pending" })}::jsonb)`;
  return NextResponse.json({ farm }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await farmerSession();
  if (!session) return NextResponse.json({ error: "Sign in with a farmer account to update this workspace" }, { status: 403 });
  if (!canMutateAs(session)) return NextResponse.json({ error: "Administrator impersonation is read-only. Return to administration and sign in as the farmer to update fulfilment." }, { status: 403 });
  const user = session;
  if (!await checkRateLimit(request, "farmer.write", 60, 60 * 60, user.id)) return NextResponse.json({ error: "Update limit reached. Try again later." }, { status: 429 });
  const body = await request.json().catch(() => null) as Record<string, string> | null;
  const sql = getDatabase();
  if (body?.type === "item" && body.id && ["preparing", "ready", "dispatched"].includes(body.status)) {
    const [item] = await sql`
      SELECT item.id, item.product_name, item.status, item.farm_order_id, item.order_id,
        customer_order.order_number, customer_order.customer_id, customer_order.fulfilment_method
      FROM order_items item
      JOIN farm_orders farm_order ON farm_order.id = item.farm_order_id
      JOIN orders customer_order ON customer_order.id = item.order_id
      WHERE item.id = ${body.id}
        AND farm_order.farm_id IN (SELECT id FROM farms WHERE owner_id = ${user.id})
    `;
    if (!item) return NextResponse.json({ error: "Order item not found" }, { status: 404 });
    const expected = ["confirmed", "paid"].includes(String(item.status)) ? "preparing" : item.status === "preparing" ? "ready" : item.status === "ready" && item.fulfilment_method === "doorstep" ? "dispatched" : null;
    if (body.status !== expected) return NextResponse.json({ error: "This product cannot move to that tracking stage" }, { status: 409 });

    await sql.transaction([
      sql`UPDATE order_items SET status = ${body.status}::order_status,
        preparing_at = CASE WHEN ${body.status} = 'preparing' THEN now() ELSE preparing_at END,
        ready_at = CASE WHEN ${body.status} = 'ready' THEN now() ELSE ready_at END,
        dispatched_at = CASE WHEN ${body.status} = 'dispatched' THEN now() ELSE dispatched_at END,
        updated_at = now() WHERE id = ${item.id}`,
      sql`UPDATE farm_orders farm_order SET status = CASE
        WHEN ${item.fulfilment_method} = 'doorstep' AND NOT EXISTS (SELECT 1 FROM order_items child WHERE child.farm_order_id = farm_order.id AND child.status NOT IN ('dispatched','delivered')) THEN 'dispatched'::order_status
        WHEN NOT EXISTS (SELECT 1 FROM order_items child WHERE child.farm_order_id = farm_order.id AND child.status NOT IN ('ready','dispatched','delivered','collected')) THEN 'ready'::order_status
        WHEN EXISTS (SELECT 1 FROM order_items child WHERE child.farm_order_id = farm_order.id AND child.status IN ('preparing','ready','dispatched')) THEN 'preparing'::order_status
        ELSE 'confirmed'::order_status END,
        confirmed_at = coalesce(confirmed_at, now()),
        ready_at = CASE WHEN NOT EXISTS (SELECT 1 FROM order_items child WHERE child.farm_order_id = farm_order.id AND child.status NOT IN ('ready','dispatched','delivered','collected')) THEN coalesce(ready_at, now()) ELSE ready_at END,
        updated_at = now()
        WHERE farm_order.id = ${item.farm_order_id}`,
      sql`UPDATE orders customer_order SET status = CASE
        WHEN ${item.fulfilment_method} = 'doorstep' AND NOT EXISTS (SELECT 1 FROM farm_orders child WHERE child.order_id = customer_order.id AND child.status NOT IN ('dispatched','delivered')) THEN 'dispatched'::order_status
        WHEN NOT EXISTS (SELECT 1 FROM farm_orders child WHERE child.order_id = customer_order.id AND child.status NOT IN ('ready','dispatched','delivered','collected')) THEN 'ready'::order_status
        WHEN EXISTS (SELECT 1 FROM farm_orders child WHERE child.order_id = customer_order.id AND child.status IN ('preparing','ready','dispatched')) THEN 'preparing'::order_status
        ELSE 'confirmed'::order_status END,
        updated_at = now() WHERE customer_order.id = ${item.order_id}`,
    ]);

    const [updatedOrder] = await sql`SELECT status FROM orders WHERE id = ${item.order_id}`;
    if (updatedOrder?.status === "ready") {
      await sql`UPDATE deliveries SET status = 'assigned', updated_at = now(), notes = 'All products are packed and awaiting courier pickup' WHERE order_id = ${item.order_id}`;
      await sql`INSERT INTO delivery_events (delivery_id, status, message) SELECT id, 'assigned', 'All products are packed and ready for dispatch' FROM deliveries WHERE order_id = ${item.order_id}`;
    } else if (updatedOrder?.status === "dispatched") {
      await sql`UPDATE deliveries SET status = 'in_transit', picked_up_at = coalesce(picked_up_at, now()), updated_at = now() WHERE order_id = ${item.order_id}`;
      await sql`INSERT INTO delivery_events (delivery_id, status, message) SELECT id, 'in_transit', 'All products have left their farms and are on the way' FROM deliveries WHERE order_id = ${item.order_id}`;
    }
    const itemCopy = body.status === "preparing" ? "is now being prepared" : body.status === "ready" ? "is packed and ready" : "has left the farm and is on the way";
    await sql`INSERT INTO notifications (user_id, type, title, message, action_url, metadata)
      VALUES (${item.customer_id}, ${body.status === "dispatched" ? "delivery" : "order"}, 'Product tracking updated',
        ${`${item.product_name} in order ${item.order_number} ${itemCopy}.`}, '/orders',
        ${JSON.stringify({ orderId: String(item.order_id), itemId: String(item.id), orderNumber: String(item.order_number), status: body.status })}::jsonb)`;
    return NextResponse.json({ updated: true, orderStatus: updatedOrder?.status });
  }
  if (body?.type === "order" && body.id && ["preparing", "ready", "dispatched"].includes(body.status)) {
    const [order] = await sql`SELECT farm_order.id, farm_order.order_id, customer_order.fulfilment_method FROM farm_orders farm_order JOIN orders customer_order ON customer_order.id = farm_order.order_id WHERE farm_order.id = ${body.id} AND farm_order.farm_id IN (SELECT id FROM farms WHERE owner_id = ${user.id})`;
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (body.status === "dispatched" && ["farm_pickup", "collection_hub"].includes(String(order.fulfilment_method))) return NextResponse.json({ error: "Pickup orders are completed when the customer confirms collection" }, { status: 409 });
    const [customerOrder] = await sql`SELECT customer_id, order_number FROM orders WHERE id = ${order.order_id}`;
    if (!customerOrder) return NextResponse.json({ error: "Customer order not found" }, { status: 404 });
    const copy = body.status === "preparing" ? "A farmer is preparing produce for your order." : body.status === "ready" ? "Your produce is packed and ready for fulfilment." : "Your produce has left the farm and is on the way.";
    const updates = [
      sql`UPDATE farm_orders SET status = ${body.status}::order_status, confirmed_at = coalesce(confirmed_at, now()), ready_at = CASE WHEN ${body.status} = 'ready' THEN now() ELSE ready_at END, updated_at = now() WHERE id = ${body.id}`,
      sql`INSERT INTO notifications (user_id, type, title, message, action_url, metadata) VALUES (${customerOrder.customer_id}, ${body.status === "dispatched" ? "delivery" : "order"}, ${body.status === "preparing" ? "Order preparation started" : body.status === "ready" ? "Order ready" : "Delivery is on the way"}, ${copy}, '/orders', ${JSON.stringify({ orderId: String(order.order_id), orderNumber: String(customerOrder.order_number), status: body.status })}::jsonb)`,
    ];
    if (body.status === "preparing") updates.push(sql`UPDATE orders SET status = 'preparing', updated_at = now() WHERE id = ${order.order_id} AND NOT EXISTS (SELECT 1 FROM farm_orders WHERE order_id = ${order.order_id} AND id <> ${body.id} AND status <> 'preparing')`);
    if (body.status === "ready") {
      updates.push(sql`UPDATE orders SET status = 'ready', updated_at = now() WHERE id = ${order.order_id} AND NOT EXISTS (SELECT 1 FROM farm_orders WHERE order_id = ${order.order_id} AND id <> ${body.id} AND status <> 'ready')`);
      updates.push(sql`UPDATE deliveries SET status = 'assigned', updated_at = now(), notes = 'Produce packed and awaiting courier pickup' WHERE order_id = ${order.order_id} AND NOT EXISTS (SELECT 1 FROM farm_orders WHERE order_id = ${order.order_id} AND id <> ${body.id} AND status <> 'ready')`);
      updates.push(sql`INSERT INTO delivery_events (delivery_id, status, message) SELECT delivery.id, 'assigned', 'All produce is packed and ready for dispatch' FROM deliveries delivery WHERE delivery.order_id = ${order.order_id} AND NOT EXISTS (SELECT 1 FROM farm_orders WHERE order_id = ${order.order_id} AND id <> ${body.id} AND status <> 'ready')`);
    }
    if (body.status === "dispatched") {
      updates.push(sql`UPDATE orders SET status = 'dispatched', updated_at = now() WHERE id = ${order.order_id} AND NOT EXISTS (SELECT 1 FROM farm_orders WHERE order_id = ${order.order_id} AND id <> ${body.id} AND status <> 'dispatched')`);
      updates.push(sql`UPDATE deliveries SET status = 'in_transit', picked_up_at = coalesce(picked_up_at, now()), updated_at = now() WHERE order_id = ${order.order_id} AND NOT EXISTS (SELECT 1 FROM farm_orders WHERE order_id = ${order.order_id} AND id <> ${body.id} AND status <> 'dispatched')`);
      updates.push(sql`INSERT INTO delivery_events (delivery_id, status, message) SELECT delivery.id, 'in_transit', 'Produce left the farm and is on the way' FROM deliveries delivery WHERE delivery.order_id = ${order.order_id} AND NOT EXISTS (SELECT 1 FROM farm_orders WHERE order_id = ${order.order_id} AND id <> ${body.id} AND status <> 'dispatched')`);
    }
    await sql.transaction(updates);
    return NextResponse.json({ updated: true });
  }
  if (body?.type === "listing" && body.id && ["active", "paused"].includes(body.status)) {
    if (!body.categoryId || !body.name || !body.unit || !body.price || !body.stock || !body.harvestDate) return NextResponse.json({ error: "Complete all required fields" }, { status: 400 });
    if (!validListingImage(body.imageUrl)) return NextResponse.json({ error: "Upload a JPG, PNG, or WebP image no larger than 2 MB" }, { status: 400 });
    const price = Number(body.price);
    const stock = Number(body.stock);
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(stock) || stock < 0) return NextResponse.json({ error: "Enter a valid price and quantity" }, { status: 400 });
    const [ownedListing] = await sql`SELECT listing.id, listing.quantity_reserved, image.url AS image_url FROM produce_listings listing LEFT JOIN LATERAL (SELECT url FROM listing_images WHERE listing_id = listing.id ORDER BY sort_order LIMIT 1) image ON true WHERE listing.id = ${body.id} AND listing.farm_id IN (SELECT id FROM farms WHERE owner_id = ${user.id})`;
    if (!ownedListing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    if (stock < Number(ownedListing.quantity_reserved)) return NextResponse.json({ error: "Quantity cannot be lower than stock already reserved" }, { status: 400 });
    const slug = body.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    try {
      const [product] = await sql`INSERT INTO products (category_id, name, slug, default_unit) VALUES (${body.categoryId}, ${body.name}, ${slug}, ${body.unit}) ON CONFLICT (slug) DO UPDATE SET category_id = excluded.category_id, name = excluded.name, default_unit = excluded.default_unit RETURNING id`;
      await sql`UPDATE produce_listings SET product_id = ${product.id}, title = ${body.name}, unit = ${body.unit}, unit_price_kobo = ${Math.round(price * 100)}, quantity_available = ${stock}, harvest_date = ${body.harvestDate}, status = ${body.status}::listing_status, badge = ${body.badge || null}, updated_at = now(), version = version + 1 WHERE id = ${body.id}`;
      await sql`DELETE FROM listing_images WHERE listing_id = ${body.id}`;
      if (body.imageUrl) await sql`INSERT INTO listing_images (listing_id, url, alt_text) VALUES (${body.id}, ${body.imageUrl}, ${body.name})`;
      const previousImage = ownedListing.image_url ? String(ownedListing.image_url) : "";
      if (previousImage && previousImage !== body.imageUrl && previousImage.includes(".blob.vercel-storage.com")) await del(previousImage).catch((error) => console.error("Old listing image cleanup failed", error));
      return NextResponse.json({ updated: true });
    } catch (error) {
      console.error("Farmer listing update failed", error);
      return NextResponse.json({ error: "Could not update listing" }, { status: 400 });
    }
  }
  return NextResponse.json({ error: "Invalid update" }, { status: 400 });
}
