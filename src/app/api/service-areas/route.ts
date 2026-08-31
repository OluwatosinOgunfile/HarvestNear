import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("Could not load service areas", error);
    return NextResponse.json({ error: "Could not load service areas" }, { status: 500 });
  }
}
