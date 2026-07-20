import { NextRequest, NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";

type EntityType = "users" | "farms" | "produce" | "options";

async function authorize(write = false) {
  const user = await getSessionUser();
  if (!user || !["admin", "support"].includes(user.role) || (write && user.role !== "admin")) return null;
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
      SELECT users.id, users.first_name, users.last_name, users.email, users.phone, users.role, users.is_active,
        users.email_verified_at, users.phone_verified_at, users.last_login_at, users.created_at, users.updated_at,
        (SELECT count(*)::int FROM farms WHERE owner_id = users.id) AS farm_count,
        (SELECT count(*)::int FROM orders WHERE customer_id = users.id) AS order_count,
        (SELECT count(*)::int FROM addresses WHERE user_id = users.id) AS address_count
      FROM users WHERE users.id = ${id} LIMIT 1
    ` : await sql`
      SELECT users.id, users.first_name, users.last_name, users.email, users.phone, users.role, users.is_active, users.created_at,
        (SELECT count(*)::int FROM farms WHERE owner_id = users.id) AS farm_count,
        (SELECT count(*)::int FROM orders WHERE customer_id = users.id) AS order_count
      FROM users ORDER BY users.created_at DESC LIMIT 100
    `;
    return NextResponse.json(id ? { entity: rows[0] ?? null } : { entities: rows });
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
      ORDER BY CASE farms.verification_status WHEN 'pending' THEN 0 WHEN 'rejected' THEN 1 WHEN 'verified' THEN 2 ELSE 3 END, farms.created_at DESC
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
      if (!body.ownerId || !body.name || !body.phone || !body.city || !body.state || !body.address) throw new Error("Complete all required fields");
      const [entity] = await sql`
        INSERT INTO farms (owner_id, name, slug, phone, email, address_text, city, state, latitude, longitude, verification_status, offers_pickup, offers_delivery)
        VALUES (${body.ownerId}, ${body.name}, ${slugify(body.name) + "-" + Date.now().toString(36)}, ${body.phone}, ${body.email || null}, ${body.address}, ${body.city}, ${body.state}, ${Number(body.latitude || 9.0765)}, ${Number(body.longitude || 7.3986)}, 'pending', true, ${body.offersDelivery === "true"})
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
    if (!id || !body || !["users", "farms", "produce"].includes(type)) return NextResponse.json({ error: "A valid entity ID is required" }, { status: 400 });
    const sql = getDatabase();

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

    const [farm] = await sql`
      UPDATE farms
      SET verification_status = ${body.verificationStatus}::verification_status,
          verified_at = CASE WHEN ${body.verificationStatus}::text = 'verified' THEN now() ELSE NULL END,
          updated_at = now()
      WHERE id = ${id}
      RETURNING id, verification_status, verified_at
    `;
    if (!farm) return NextResponse.json({ error: "Farm not found" }, { status: 404 });
    if (body.verificationStatus === "rejected") {
      await sql`UPDATE produce_listings SET status = 'paused', updated_at = now() WHERE farm_id = ${id} AND status = 'active'`;
    }
    const approved = body.verificationStatus === "verified";
    const sideEffects = await Promise.allSettled([
      sql`
        INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_data)
        VALUES (${administrator.id}, ${approved ? "farm.verified" : `farm.${body.verificationStatus}`}, 'farm', ${id}, jsonb_build_object('verification_status', ${body.verificationStatus}))
      `,
      sql`
        INSERT INTO notifications (user_id, type, title, message, action_url, metadata)
        SELECT owner_id, 'account', ${approved ? "Your farm is verified" : "Farm verification update"},
          ${approved ? "Your farm has been approved and can now publish harvests to the marketplace." : "Your farm verification was not approved. Review your farm information before trying again."},
          '/profile', jsonb_build_object('farmId', farms.id, 'verificationStatus', ${body.verificationStatus})
        FROM farms WHERE farms.id = ${id}
      `,
    ]);
    sideEffects.forEach((result) => { if (result.status === "rejected") console.error("Farm verification side effect failed", result.reason); });
    return NextResponse.json({ farm });
  } catch (error) {
    const databaseError = error as { code?: string };
    console.error("Administrator entity update failed", error);
    if (databaseError.code === "23505") return NextResponse.json({ error: "Another record already uses those details" }, { status: 409 });
    if (databaseError.code === "23514") return NextResponse.json({ error: "The updated values violate a database constraint" }, { status: 400 });
    return NextResponse.json({ error: "Could not update the record" }, { status: 500 });
  }
}
