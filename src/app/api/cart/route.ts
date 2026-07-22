import { NextRequest, NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { canMutateAs } from "@/lib/security";

export const dynamic = "force-dynamic";

async function authorize(write = false) {
  const user = await getSessionUser();
  return user && ["consumer", "farmer"].includes(user.role) && (!write || canMutateAs(user)) ? user : null;
}

export async function GET() {
  const user = await authorize();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = getDatabase();
  const rows = await sql`
    SELECT item.listing_id, least(item.quantity, listing.quantity_available - listing.quantity_reserved) AS quantity
    FROM carts cart
    JOIN cart_items item ON item.cart_id = cart.id
    JOIN produce_listings listing ON listing.id = item.listing_id
    WHERE cart.user_id = ${user.id} AND listing.status = 'active'
      AND listing.quantity_available > listing.quantity_reserved
  `;
  return NextResponse.json({ cart: Object.fromEntries(rows.map((row) => [String(row.listing_id), Number(row.quantity)])) });
}

export async function PUT(request: NextRequest) {
  const user = await authorize(true);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { items?: Array<{ listingId?: string; quantity?: number }> } | null;
  if (!body || !Array.isArray(body.items) || body.items.length > 100) return NextResponse.json({ error: "Invalid cart" }, { status: 400 });
  const items = body.items
    .map((item) => ({ listingId: String(item.listingId || ""), quantity: Math.floor(Number(item.quantity)) }))
    .filter((item) => /^[0-9a-f-]{36}$/i.test(item.listingId) && item.quantity > 0);
  const sql = getDatabase();
  let [cart] = await sql`SELECT id FROM carts WHERE user_id = ${user.id}`;
  if (!cart) [cart] = await sql`INSERT INTO carts (user_id, expires_at) VALUES (${user.id}, now() + interval '90 days') RETURNING id`;
  await sql`DELETE FROM cart_items WHERE cart_id = ${cart.id}`;
  for (const item of items) {
    await sql`
      INSERT INTO cart_items (cart_id, listing_id, quantity)
      SELECT ${cart.id}, listing.id, least(${item.quantity}, listing.quantity_available - listing.quantity_reserved)
      FROM produce_listings listing
      WHERE listing.id = ${item.listingId} AND listing.status = 'active'
        AND listing.quantity_available > listing.quantity_reserved
      ON CONFLICT (cart_id, listing_id) DO UPDATE SET quantity = excluded.quantity, updated_at = now()
    `;
  }
  await sql`UPDATE carts SET expires_at = now() + interval '90 days', updated_at = now() WHERE id = ${cart.id}`;
  return GET();
}

export async function DELETE() {
  const user = await authorize(true);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = getDatabase();
  await sql`DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id = ${user.id})`;
  return NextResponse.json({ cart: {} });
}
