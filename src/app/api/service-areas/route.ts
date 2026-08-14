import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/db";

export const revalidate = 300;

export async function GET() {
  try {
    const sql = getDatabase();
    const areas = await sql`
      SELECT id, name, city, state, latitude, longitude
      FROM service_areas
      WHERE is_active
      ORDER BY state, city, name
    `;
    return NextResponse.json({ areas }, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    console.error("Could not load service areas", error);
    return NextResponse.json({ error: "Could not load service areas" }, { status: 500 });
  }
}
