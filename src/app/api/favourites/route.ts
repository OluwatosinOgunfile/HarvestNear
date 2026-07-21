import { NextRequest, NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

async function userId() {
  const user = await getSessionUser();
  return user && ["consumer", "farmer"].includes(user.role) ? user.id : null;
}

export async function GET() {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = getDatabase();
  const rows = await sql`SELECT listing_id FROM favourites WHERE user_id = ${id} ORDER BY created_at DESC`;
  return NextResponse.json({ favourites: rows.map((row) => String(row.listing_id)) });
}

export async function PUT(request: NextRequest) {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { listingId?: string; saved?: boolean } | null;
  const listingId = String(body?.listingId || "");
  if (!/^[0-9a-f-]{36}$/i.test(listingId)) return NextResponse.json({ error: "Invalid listing" }, { status: 400 });
  const sql = getDatabase();
  if (body?.saved) await sql`INSERT INTO favourites (user_id, listing_id) SELECT ${id}, id FROM produce_listings WHERE id = ${listingId} ON CONFLICT DO NOTHING`;
  else await sql`DELETE FROM favourites WHERE user_id = ${id} AND listing_id = ${listingId}`;
  return NextResponse.json({ saved: Boolean(body?.saved) });
}
