import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/db";

export const revalidate = 300;

export async function GET() {
  try {
    const sql = getDatabase();
    const centres = await sql`
      SELECT id, name, address_text, city, state, latitude, longitude, opening_hours
      FROM collection_hubs
      WHERE is_active
      ORDER BY state, city, name
    `;
    return NextResponse.json({ centres }, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    console.error("Could not load pickup centres", error);
    return NextResponse.json({ error: "Could not load pickup centres" }, { status: 500 });
  }
}
