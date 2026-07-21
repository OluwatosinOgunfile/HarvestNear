import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { listingImageUrl } from "@/lib/images";
import { profileImageUrl } from "@/lib/images";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionUser();
  if (!session || !["consumer", "farmer"].includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sql = getDatabase();
  const [user] = await sql`SELECT id, first_name, last_name, email, phone, avatar_url, role, email_verified_at, phone_verified_at, created_at FROM users WHERE id = ${session.id}`;
  const addresses = await sql`SELECT id, label, recipient_name, recipient_phone, line1, line2, city, state, landmark, is_default FROM addresses WHERE user_id = ${session.id} ORDER BY is_default DESC, created_at`;
  const [stats] = await sql`SELECT count(DISTINCT orders.id)::int AS total_orders,
    count(DISTINCT item.farm_name)::int AS farms_supported,
    count(DISTINCT orders.id) FILTER (WHERE orders.status IN ('delivered','collected'))::int AS completed_orders
    FROM orders LEFT JOIN order_items item ON item.order_id = orders.id WHERE orders.customer_id = ${session.id}`;
  if (session.role === "consumer") {
    const [preferences] = await sql`SELECT preferred_radius_km, dietary_preferences, marketing_consent FROM consumer_profiles WHERE user_id = ${session.id}`;
    return NextResponse.json({ user: { ...user, avatar_url: user.avatar_url ? profileImageUrl(String(user.id), user.avatar_url) : null }, addresses, stats, preferences: preferences ?? { preferred_radius_km: 20, dietary_preferences: [], marketing_consent: false } });
  }
  const [farm] = await sql`SELECT id, name, description, phone, email, address_text, city, state, logo_url, cover_image_url, verification_status, delivery_radius_km, offers_pickup, offers_delivery, average_rating, review_count, created_at FROM farms WHERE owner_id = ${session.id} ORDER BY created_at LIMIT 1`;
  const listings = farm ? await sql`SELECT listing.id, listing.title, listing.unit, listing.unit_price_kobo, listing.quantity_available, listing.status, image.url AS image_url FROM produce_listings listing LEFT JOIN LATERAL (SELECT url FROM listing_images WHERE listing_id = listing.id ORDER BY sort_order LIMIT 1) image ON true WHERE listing.farm_id = ${farm.id} ORDER BY listing.created_at DESC LIMIT 6` : [];
  const [farmStats] = farm ? await sql`SELECT count(DISTINCT fo.id) FILTER (WHERE fo.status IN ('delivered','collected'))::int AS fulfilled_orders, count(DISTINCT o.customer_id)::int AS customers FROM farm_orders fo JOIN orders o ON o.id = fo.order_id WHERE fo.farm_id = ${farm.id}` : [{ fulfilled_orders: 0, customers: 0 }];
  return NextResponse.json({ user: { ...user, avatar_url: user.avatar_url ? profileImageUrl(String(user.id), user.avatar_url) : null }, addresses, stats, farm, listings: listings.map((listing) => ({ ...listing, image_url: listing.image_url ? listingImageUrl(String(listing.id), listing.image_url) : null })), farmStats });
}

export async function PATCH(request: Request) {
  const session = await getSessionUser();
  if (!session || !["consumer", "farmer"].includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, string | boolean> | null;
  if (!body?.firstName || !body.lastName || !body.email) return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  const sql = getDatabase();
  try {
    await sql`UPDATE users SET first_name = ${String(body.firstName).trim()}, last_name = ${String(body.lastName).trim()}, email = ${String(body.email).trim().toLowerCase()}, phone = ${body.phone ? String(body.phone).trim() : null}, updated_at = now() WHERE id = ${session.id}`;
    if (session.role === "consumer") {
      const radius = Math.max(1, Number(body.preferredRadius || 20));
      await sql`INSERT INTO consumer_profiles (user_id, preferred_radius_km, marketing_consent) VALUES (${session.id}, ${radius}, ${Boolean(body.marketingConsent)}) ON CONFLICT (user_id) DO UPDATE SET preferred_radius_km = excluded.preferred_radius_km, marketing_consent = excluded.marketing_consent, updated_at = now()`;
    } else if (body.farmId) {
      await sql`UPDATE farms SET name = ${String(body.farmName || "").trim()}, description = ${body.description ? String(body.description).trim() : null}, phone = ${String(body.farmPhone || body.phone || "").trim()}, email = ${body.farmEmail ? String(body.farmEmail).trim() : null}, address_text = ${String(body.address || "").trim()}, city = ${String(body.city || "").trim()}, state = ${String(body.state || "").trim()}, delivery_radius_km = ${Math.max(0, Number(body.deliveryRadius || 0))}, offers_pickup = ${Boolean(body.offersPickup)}, offers_delivery = ${Boolean(body.offersDelivery)}, updated_at = now() WHERE id = ${String(body.farmId)} AND owner_id = ${session.id}`;
    }
    return NextResponse.json({ updated: true });
  } catch (error) {
    console.error("Profile update failed", error);
    return NextResponse.json({ error: "Could not save profile. Check that the email and phone are not already in use." }, { status: 400 });
  }
}
