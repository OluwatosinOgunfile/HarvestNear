import { NextRequest, NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { listingImageUrl, profileImageUrl } from "@/lib/images";

type EntityType = "users" | "farms" | "produce" | "orders" | "refunds" | "reviews" | "activity" | "options";

async function authorize(write = false) {
  const user = await getSessionUser();
  if (!user || !["admin", "support"].includes(user.role) || (write && (user.role !== "admin" || user.impersonating))) return null;
  return user;
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function GET(request: NextRequest) {
  if (!await authorize()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const type = request.nextUrl.searchParams.get("type") as EntityType;
  const id = request.nextUrl.searchParams.get("id");
  const sql = getDatabase();

  if (type === "options") {
    const [owners, farms, categories] = await Promise.all([
      sql`SELECT id, first_name || ' ' || last_name AS name FROM users WHERE role = 'farmer' AND is_active ORDER BY first_name`,
      sql`SELECT id, name FROM farms WHERE verification_status <> 'suspended' ORDER BY name`,
      sql`SELECT id, name FROM produce_categories WHERE is_active ORDER BY name`,
    ]);
    return NextResponse.json({ owners, farms, categories });
  }

  if (type === "users") {
    const rows = id ? await sql`
      SELECT users.id, users.first_name, users.last_name, users.email, users.phone, users.role, users.is_active, users.avatar_url,
        users.email_verified_at, users.phone_verified_at, users.last_login_at, users.created_at, users.updated_at,
        (SELECT count(*)::int FROM farms WHERE owner_id = users.id) AS farm_count,
        (SELECT count(*)::int FROM orders WHERE customer_id = users.id) AS order_count,
        (SELECT count(*)::int FROM addresses WHERE user_id = users.id) AS address_count
      FROM users WHERE users.id = ${id} LIMIT 1
    ` : await sql`
      SELECT users.id, users.first_name, users.last_name, users.email, users.phone, users.role, users.is_active, users.avatar_url, users.created_at,
        (SELECT count(*)::int FROM farms WHERE owner_id = users.id) AS farm_count,
        (SELECT string_agg(farm.name, ', ' ORDER BY farm.created_at) FROM farms farm WHERE farm.owner_id = users.id) AS farm_names,
        (SELECT count(*)::int FROM orders WHERE customer_id = users.id) AS order_count
      FROM users ORDER BY users.created_at DESC LIMIT 100
    `;
    const mapped = rows.map((row) => ({ ...row, avatar_url: row.avatar_url ? profileImageUrl(String(row.id), String(row.avatar_url)) : null }));
    return NextResponse.json(id ? { entity: mapped[0] ?? null } : { entities: mapped });
  }

  if (type === "farms") {
    const rows = id ? await sql`
      SELECT farms.*, users.first_name || ' ' || users.last_name AS owner_name, users.email AS owner_email,
        (SELECT count(*)::int FROM produce_listings WHERE farm_id = farms.id) AS listing_count,
        (SELECT count(*)::int FROM farm_orders WHERE farm_id = farms.id) AS order_count
      FROM farms JOIN users ON users.id = farms.owner_id WHERE farms.id = ${id} LIMIT 1
    ` : await sql`
      SELECT farms.id, farms.name, farms.city, farms.state, farms.verification_status, farms.average_rating,
        farms.offers_delivery, farms.created_at, users.first_name || ' ' || users.last_name AS owner_name,
        (SELECT count(*)::int FROM produce_listings WHERE farm_id = farms.id AND status = 'active') AS listing_count
      FROM farms JOIN users ON users.id = farms.owner_id
      ORDER BY farms.created_at DESC
      LIMIT 100
    `;
    return NextResponse.json(id ? { entity: rows[0] ?? null } : { entities: rows });
  }

  if (type === "produce") {
    const rows = id ? await sql`
      SELECT listing.*, product.name AS product_name, category.name AS category_name, farm.name AS farm_name,
        image.url AS image_url
      FROM produce_listings listing JOIN products product ON product.id = listing.product_id
      JOIN produce_categories category ON category.id = product.category_id JOIN farms farm ON farm.id = listing.farm_id
      LEFT JOIN LATERAL (SELECT url FROM listing_images WHERE listing_id = listing.id ORDER BY sort_order LIMIT 1) image ON true
      WHERE listing.id = ${id} LIMIT 1
    ` : await sql`
      SELECT listing.id, listing.title, listing.unit, listing.unit_price_kobo, listing.quantity_available,
        listing.quantity_reserved, listing.quantity_sold, listing.status, listing.harvest_date, listing.created_at,
        farm.name AS farm_name, category.name AS category_name, image.url AS image_url
      FROM produce_listings listing JOIN products product ON product.id = listing.product_id
      JOIN produce_categories category ON category.id = product.category_id JOIN farms farm ON farm.id = listing.farm_id
      LEFT JOIN LATERAL (SELECT url FROM listing_images WHERE listing_id = listing.id ORDER BY sort_order LIMIT 1) image ON true
      ORDER BY listing.created_at DESC LIMIT 100
    `;
    const mapped = rows.map((row) => ({ ...row, image_url: row.image_url ? listingImageUrl(String(row.id), String(row.image_url)) : null }));
    return NextResponse.json(id ? { entity: mapped[0] ?? null } : { entities: mapped });
  }

  if (type === "orders") {
    const rows = id ? await sql`
      SELECT orders.*, users.first_name || ' ' || users.last_name AS customer_name, users.email AS customer_email, users.phone AS customer_phone,
        payment.status AS payment_status, payment.provider_reference, delivery.status AS delivery_status, delivery.tracking_code,
        receipt.original_name AS payment_receipt_name, receipt.submitted_at AS payment_receipt_submitted_at,
        delivery.courier_name, delivery.courier_phone, delivery.scheduled_date, delivery.window_start, delivery.window_end,
        coalesce((SELECT json_agg(json_build_object('product', item.product_name, 'farm', item.farm_name, 'quantity', item.quantity, 'unit', item.unit, 'total_kobo', item.line_total_kobo) ORDER BY item.created_at) FROM order_items item WHERE item.order_id = orders.id), '[]') AS items,
        coalesce((SELECT json_agg(json_build_object('status', event.status, 'message', event.message, 'occurred_at', event.occurred_at) ORDER BY event.occurred_at) FROM delivery_events event JOIN deliveries d ON d.id = event.delivery_id WHERE d.order_id = orders.id), '[]') AS delivery_events
      FROM orders JOIN users ON users.id = orders.customer_id
      LEFT JOIN LATERAL (SELECT * FROM payments WHERE order_id = orders.id ORDER BY created_at DESC LIMIT 1) payment ON true
      LEFT JOIN manual_payment_receipts receipt ON receipt.order_id = orders.id
      LEFT JOIN deliveries delivery ON delivery.order_id = orders.id WHERE orders.id = ${id} LIMIT 1
    ` : await sql`
      SELECT orders.id, orders.order_number, orders.status, orders.subtotal_kobo, orders.delivery_fee_kobo, orders.total_kobo, orders.fulfilment_method, orders.placed_at,
        users.first_name || ' ' || users.last_name AS customer_name, users.email AS customer_email,
        delivery.status AS delivery_status, delivery.tracking_code,
        EXISTS (SELECT 1 FROM manual_payment_receipts receipt WHERE receipt.order_id = orders.id) AS receipt_submitted,
        (SELECT count(*)::int FROM order_items WHERE order_id = orders.id) AS item_count,
        (SELECT string_agg(DISTINCT item.farm_name, ', ' ORDER BY item.farm_name) FROM order_items item WHERE item.order_id = orders.id) AS farm_names,
        coalesce((SELECT json_agg(json_build_object('id', item.id, 'product', item.product_name, 'farm', item.farm_name, 'quantity', item.quantity, 'unit', item.unit, 'unit_price_kobo', item.unit_price_kobo, 'line_total_kobo', item.line_total_kobo) ORDER BY item.created_at) FROM order_items item WHERE item.order_id = orders.id), '[]') AS items
      FROM orders JOIN users ON users.id = orders.customer_id LEFT JOIN deliveries delivery ON delivery.order_id = orders.id
      ORDER BY orders.created_at DESC LIMIT 100
    `;
    return NextResponse.json(id ? { entity: rows[0] ?? null } : { entities: rows });
  }

  if (type === "refunds") {
    const rows = id ? await sql`
      SELECT refund.*, orders.order_number, orders.total_kobo AS order_total_kobo,
        users.first_name || ' ' || users.last_name AS customer_name, users.email AS customer_email
      FROM refunds refund JOIN orders ON orders.id = refund.order_id JOIN users ON users.id = refund.requested_by
      WHERE refund.id = ${id} LIMIT 1
    ` : await sql`
      SELECT refund.id, refund.status, refund.reason, refund.amount_kobo, refund.requested_at, orders.order_number,
        users.first_name || ' ' || users.last_name AS customer_name
      FROM refunds refund JOIN orders ON orders.id = refund.order_id JOIN users ON users.id = refund.requested_by
      ORDER BY refund.requested_at DESC LIMIT 100
    `;
    return NextResponse.json(id ? { entity: rows[0] ?? null } : { entities: rows });
  }

  if (type === "reviews") {
    const rows = id ? await sql`
      SELECT review.*, farm.name AS farm_name, orders.order_number,
        users.first_name || ' ' || users.last_name AS customer_name, users.email AS customer_email
      FROM reviews review JOIN farms farm ON farm.id = review.farm_id JOIN orders ON orders.id = review.order_id
      JOIN users ON users.id = review.customer_id WHERE review.id = ${id} LIMIT 1
    ` : await sql`
      SELECT review.id, review.rating, review.comment, review.is_visible, review.created_at, farm.name AS farm_name,
        orders.order_number, users.first_name || ' ' || users.last_name AS customer_name
      FROM reviews review JOIN farms farm ON farm.id = review.farm_id JOIN orders ON orders.id = review.order_id
      JOIN users ON users.id = review.customer_id ORDER BY review.created_at DESC LIMIT 100
    `;
    return NextResponse.json(id ? { entity: rows[0] ?? null } : { entities: rows });
  }

  if (type === "activity") {
    const rows = id ? await sql`
      SELECT log.*, coalesce(users.first_name || ' ' || users.last_name, 'System') AS actor_name, users.email AS actor_email
      FROM audit_logs log LEFT JOIN users ON users.id = log.actor_id WHERE log.id::text = ${id} LIMIT 1
    ` : await sql`
      SELECT log.id::text AS id, log.action, log.entity_type, log.entity_id, log.created_at,
        coalesce(users.first_name || ' ' || users.last_name, 'System') AS actor_name
      FROM audit_logs log LEFT JOIN users ON users.id = log.actor_id ORDER BY log.created_at DESC LIMIT 150
    `;
    return NextResponse.json(id ? { entity: rows[0] ?? null } : { entities: rows });
  }

  return NextResponse.json({ error: "Unknown entity type" }, { status: 400 });
}

export async function POST(request: NextRequest) {
  if (!await authorize(true)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const type = request.nextUrl.searchParams.get("type") as EntityType;
  const body = await request.json().catch(() => null) as Record<string, string> | null;
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const sql = getDatabase();

  try {
    if (type === "users") {
      if (!body.firstName || !body.lastName || !body.email || !body.phone || !body.role || !body.password) throw new Error("Complete all required fields");
      if (!["consumer", "farmer", "admin", "support"].includes(body.role)) throw new Error("Invalid role");
      const [entity] = await sql`
        INSERT INTO users (first_name, last_name, email, phone, role, password_hash, email_verified_at)
        VALUES (${body.firstName}, ${body.lastName}, ${body.email.toLowerCase()}, ${body.phone}, ${body.role}::user_role, crypt(${body.password}, gen_salt('bf', 12)), now())
        RETURNING id
      `;
      if (body.role === "consumer") await sql`INSERT INTO consumer_profiles (user_id) VALUES (${entity.id})`;
      return NextResponse.json({ id: entity.id }, { status: 201 });
    }

    if (type === "farms") {
      if (!body.ownerId || !body.name || !body.phone || !body.city || !body.state || !body.address || !body.latitude || !body.longitude) throw new Error("Complete all required fields and capture the farm location");
      const latitude = Number(body.latitude); const longitude = Number(body.longitude);
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error("Enter valid farm coordinates");
      const [entity] = await sql`
        INSERT INTO farms (owner_id, name, slug, phone, email, address_text, city, state, latitude, longitude, verification_status, offers_pickup, offers_delivery)
        VALUES (${body.ownerId}, ${body.name}, ${slugify(body.name) + "-" + Date.now().toString(36)}, ${body.phone}, ${body.email || null}, ${body.address}, ${body.city}, ${body.state}, ${latitude}, ${longitude}, 'pending', true, ${body.offersDelivery === "true"})
        RETURNING id
      `;
      return NextResponse.json({ id: entity.id }, { status: 201 });
    }

    if (type === "produce") {
      if (!body.farmId || !body.categoryId || !body.name || !body.unit || !body.price || !body.stock || !body.harvestDate) throw new Error("Complete all required fields");
      const slug = slugify(body.name);
      const [product] = await sql`
        INSERT INTO products (category_id, name, slug, default_unit)
        VALUES (${body.categoryId}, ${body.name}, ${slug}, ${body.unit})
        ON CONFLICT (slug) DO UPDATE SET category_id = excluded.category_id, default_unit = excluded.default_unit, updated_at = now()
        RETURNING id
      `;
      const [entity] = await sql`
        INSERT INTO produce_listings (farm_id, product_id, title, unit, unit_price_kobo, quantity_available, harvest_date, available_from, available_until, status, badge)
        VALUES (${body.farmId}, ${product.id}, ${body.name}, ${body.unit}, ${Math.round(Number(body.price) * 100)}, ${Number(body.stock)}, ${body.harvestDate}, now(), now() + interval '14 days', 'active', ${body.badge || null})
        RETURNING id
      `;
      if (body.imageUrl) await sql`INSERT INTO listing_images (listing_id, url, alt_text) VALUES (${entity.id}, ${body.imageUrl}, ${body.name})`;
      return NextResponse.json({ id: entity.id }, { status: 201 });
    }
  } catch (error) {
    const databaseError = error as { code?: string; message?: string };
    const message = databaseError.code === "23505" ? "A record with those details already exists" : databaseError.message || "Could not add record";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  return NextResponse.json({ error: "Unknown entity type" }, { status: 400 });
}

export async function DELETE(request: NextRequest) {
  const session = await authorize(true);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const type = request.nextUrl.searchParams.get("type") as EntityType;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "An entity ID is required" }, { status: 400 });
  const sql = getDatabase();

  if (type === "users") {
    if (id === session.id) return NextResponse.json({ error: "You cannot remove your own account" }, { status: 400 });
    await sql`UPDATE users SET is_active = false, updated_at = now() WHERE id = ${id}`;
  } else if (type === "farms") {
    await sql`UPDATE farms SET verification_status = 'suspended', updated_at = now() WHERE id = ${id}`;
    await sql`UPDATE produce_listings SET status = 'paused', updated_at = now() WHERE farm_id = ${id} AND status = 'active'`;
  } else if (type === "produce") {
    await sql`UPDATE produce_listings SET status = 'paused', updated_at = now() WHERE id = ${id}`;
  } else return NextResponse.json({ error: "Unknown entity type" }, { status: 400 });

  return NextResponse.json({ removed: true });
}

export async function PATCH(request: NextRequest) {
  try {
    const administrator = await authorize(true);
    if (!administrator) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const type = request.nextUrl.searchParams.get("type") as EntityType;
    const id = request.nextUrl.searchParams.get("id");
    const body = await request.json().catch(() => null) as Record<string, string> | null;
    if (!id || !body || !["users", "farms", "produce", "orders", "refunds", "reviews"].includes(type)) return NextResponse.json({ error: "A valid entity ID is required" }, { status: 400 });
    const sql = getDatabase();

    if (type === "orders") {
      const allowed = ["paid","confirmed","preparing","ready","dispatched","delivered","collected","cancelled","refunded"];
      if (!allowed.includes(body.status)) return NextResponse.json({ error: "Invalid order status" }, { status: 400 });
      const [currentOrder] = await sql`SELECT status FROM orders WHERE id = ${id}`;
      if (currentOrder?.status === "pending_payment" && body.status !== "cancelled") return NextResponse.json({ error: "Confirm the submitted payment receipt before advancing this order" }, { status: 409 });
      const [entity] = await sql`UPDATE orders SET status = ${body.status}::order_status, delivered_at = CASE WHEN ${body.status} IN ('delivered','collected') THEN coalesce(delivered_at, now()) ELSE delivered_at END, updated_at = now() WHERE id = ${id} RETURNING id, customer_id, order_number, status`;
      if (!entity) return NextResponse.json({ error: "Order not found" }, { status: 404 });
      await sql`UPDATE farm_orders SET status = ${body.status}::order_status, updated_at = now() WHERE order_id = ${id}`;
      if (body.status === "dispatched") await sql`UPDATE deliveries SET status = 'in_transit', picked_up_at = coalesce(picked_up_at, now()), updated_at = now() WHERE order_id = ${id}`;
      if (body.status === "delivered") await sql`UPDATE deliveries SET status = 'delivered', delivered_at = coalesce(delivered_at, now()), updated_at = now() WHERE order_id = ${id}`;
      if (body.status === "cancelled") await sql`UPDATE deliveries SET status = 'cancelled', updated_at = now() WHERE order_id = ${id}`;
      if (["dispatched","delivered","cancelled"].includes(body.status)) await sql`INSERT INTO delivery_events (delivery_id, status, message) SELECT id, ${body.status === "dispatched" ? "in_transit" : body.status}, ${`Administrator updated fulfilment to ${body.status}.`} FROM deliveries WHERE order_id = ${id}`;
      await sql`INSERT INTO notifications (user_id, type, title, message, action_url, metadata) VALUES (${entity.customer_id}, 'order', 'Order status updated', ${`An administrator updated order ${entity.order_number} to ${body.status.replaceAll("_", " ")}.`}, '/orders', ${JSON.stringify({ orderId: id, status: body.status })}::jsonb)`;
      await sql`INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_data) VALUES (${administrator.id}, 'order.status_updated', 'order', ${id}, ${JSON.stringify({ status: body.status })}::jsonb)`;
      return NextResponse.json({ entity });
    }

    if (type === "refunds") {
      const allowed = ["requested","under_review","approved","rejected","processing","completed","failed"];
      if (!allowed.includes(body.status)) return NextResponse.json({ error: "Invalid refund status" }, { status: 400 });
      const [entity] = await sql`UPDATE refunds SET status = ${body.status}::refund_status, resolution_note = ${body.adminNote || null}, reviewed_by = ${administrator.id}, resolved_at = CASE WHEN ${body.status} IN ('completed','rejected','failed') THEN now() ELSE NULL END, completed_at = CASE WHEN ${body.status} = 'completed' THEN now() ELSE completed_at END, updated_at = now() WHERE id = ${id} RETURNING id, requested_by, order_id, status`;
      if (!entity) return NextResponse.json({ error: "Refund not found" }, { status: 404 });
      if (body.status === "completed") {
        await sql`UPDATE orders SET status = 'refunded', updated_at = now() WHERE id = ${entity.order_id}`;
        await sql`UPDATE farm_orders SET status = 'refunded', updated_at = now() WHERE order_id = ${entity.order_id}`;
        await sql`UPDATE payments SET status = 'refunded', updated_at = now() WHERE order_id = ${entity.order_id} AND status = 'successful'`;
      }
      await sql`INSERT INTO notifications (user_id, type, title, message, action_url, metadata) VALUES (${entity.requested_by}, 'order', 'Refund status updated', ${`Your refund request is now ${body.status.replaceAll("_", " ")}.`}, '/orders', ${JSON.stringify({ refundId: id, orderId: String(entity.order_id), status: body.status })}::jsonb)`;
      await sql`INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_data) VALUES (${administrator.id}, 'refund.status_updated', 'refund', ${id}, ${JSON.stringify({ status: body.status, adminNote: body.adminNote || null })}::jsonb)`;
      return NextResponse.json({ entity });
    }

    if (type === "reviews") {
      const [entity] = await sql`UPDATE reviews SET is_visible = ${body.isVisible === "true"}, farmer_reply = ${body.farmerReply || null}, updated_at = now() WHERE id = ${id} RETURNING id, farm_id, is_visible`;
      if (!entity) return NextResponse.json({ error: "Review not found" }, { status: 404 });
      await sql`UPDATE farms SET average_rating = coalesce((SELECT round(avg(rating)::numeric, 2) FROM reviews WHERE farm_id = ${entity.farm_id} AND is_visible), 0), review_count = (SELECT count(*) FROM reviews WHERE farm_id = ${entity.farm_id} AND is_visible), updated_at = now() WHERE id = ${entity.farm_id}`;
      await sql`INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_data) VALUES (${administrator.id}, 'review.moderated', 'review', ${id}, ${JSON.stringify({ isVisible: body.isVisible === "true" })}::jsonb)`;
      return NextResponse.json({ entity });
    }

    if (!body.verificationStatus) {
      let entity;
      if (type === "users") {
        if (!body.firstName || !body.lastName || !body.email || !body.phone || !["consumer", "farmer", "admin", "support"].includes(body.role)) {
          return NextResponse.json({ error: "Complete all required user fields" }, { status: 400 });
        }
        if (id === administrator.id && body.role !== "admin") return NextResponse.json({ error: "You cannot change your own administrator role" }, { status: 400 });
        [entity] = await sql`
          UPDATE users SET first_name = ${body.firstName}, last_name = ${body.lastName}, email = ${body.email.toLowerCase()},
            phone = ${body.phone}, role = ${body.role}::user_role, is_active = ${body.isActive === "true"}, updated_at = now()
          WHERE id = ${id} RETURNING id
        `;
      } else if (type === "farms") {
        if (!body.ownerId || !body.name || !body.phone || !body.address || !body.city || !body.state) {
          return NextResponse.json({ error: "Complete all required farm fields" }, { status: 400 });
        }
        [entity] = await sql`
          UPDATE farms SET owner_id = ${body.ownerId}, name = ${body.name}, phone = ${body.phone}, email = ${body.email || null},
            address_text = ${body.address}, city = ${body.city}, state = ${body.state}, offers_delivery = ${body.offersDelivery === "true"}, updated_at = now()
          WHERE id = ${id} RETURNING id
        `;
      } else {
        if (!body.farmId || !body.title || !body.unit || !body.price || !body.stock || !body.harvestDate || !["draft", "active", "sold_out", "expired", "paused"].includes(body.status)) {
          return NextResponse.json({ error: "Complete all required produce fields" }, { status: 400 });
        }
        [entity] = await sql`
          UPDATE produce_listings SET farm_id = ${body.farmId}, title = ${body.title}, unit = ${body.unit},
            unit_price_kobo = ${Math.round(Number(body.price) * 100)}, quantity_available = ${Number(body.stock)},
            harvest_date = ${body.harvestDate}, badge = ${body.badge || null}, status = ${body.status}::listing_status, updated_at = now()
          WHERE id = ${id} RETURNING id
        `;
      }
      if (!entity) return NextResponse.json({ error: "Entity not found" }, { status: 404 });
      await sql`
        INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_data)
        VALUES (${administrator.id}, ${`${type}.updated`}, ${type.slice(0, -1)}, ${id}, ${JSON.stringify(body)}::jsonb)
      `;
      return NextResponse.json({ entity });
    }

    if (type !== "farms" || !["pending", "verified", "rejected"].includes(body.verificationStatus)) {
      return NextResponse.json({ error: "Invalid verification status" }, { status: 400 });
    }

    const [existingFarm] = await sql`SELECT id, owner_id, name FROM farms WHERE id = ${id}`;
    if (!existingFarm) return NextResponse.json({ error: "Farm not found" }, { status: 404 });
    const approved = body.verificationStatus === "verified";
    const title = approved ? "Your farm is verified" : body.verificationStatus === "rejected" ? "Farm verification was not approved" : "Farm verification is pending";
    const message = approved ? `${existingFarm.name} has been approved and can now publish harvests to the marketplace.` : body.verificationStatus === "rejected" ? `${existingFarm.name} was not approved. Review the farm information before trying again.` : `${existingFarm.name} has been returned to the verification queue.`;
    const metadata = JSON.stringify({ farmId: String(existingFarm.id), verificationStatus: body.verificationStatus });
    const changes = [
      sql`UPDATE farms SET verification_status = ${body.verificationStatus}::verification_status, verified_at = CASE WHEN ${body.verificationStatus} = 'verified' THEN now() ELSE NULL END, updated_at = now() WHERE id = ${id}`,
      sql`
        INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_data)
        VALUES (${administrator.id}, ${approved ? "farm.verified" : `farm.${body.verificationStatus}`}, 'farm', ${id}, ${metadata}::jsonb)
      `,
      sql`
        INSERT INTO notifications (user_id, type, title, message, action_url, metadata)
        SELECT ${existingFarm.owner_id}, 'account', ${title}, ${message}, '/profile', ${metadata}::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = ${existingFarm.owner_id} AND metadata->>'farmId' = ${String(existingFarm.id)} AND metadata->>'verificationStatus' = ${body.verificationStatus})
      `,
    ];
    if (body.verificationStatus === "rejected") changes.push(sql`UPDATE produce_listings SET status = 'paused', updated_at = now() WHERE farm_id = ${id} AND status = 'active'`);
    await sql.transaction(changes);
    const [farm] = await sql`SELECT id, verification_status, verified_at FROM farms WHERE id = ${id}`;
    return NextResponse.json({ farm });
  } catch (error) {
    const databaseError = error as { code?: string };
    console.error("Administrator entity update failed", error);
    if (databaseError.code === "23505") return NextResponse.json({ error: "Another record already uses those details" }, { status: 409 });
    if (databaseError.code === "23514") return NextResponse.json({ error: "The updated values violate a database constraint" }, { status: 400 });
    return NextResponse.json({ error: "Could not update the record" }, { status: 500 });
  }
}
