import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/db";

export const revalidate = 300;

export async function GET() {
  try {
    const sql = getDatabase();
    const centres = await sql`
      SELECT hub.id, hub.name, hub.address_text, hub.city, hub.state, hub.latitude, hub.longitude,
        hub.opening_hours, area.id AS area_id, area.name AS area_name
      FROM collection_hubs hub
      JOIN service_areas area ON area.id = hub.area_id
      WHERE hub.is_active AND area.is_active
      ORDER BY area.state, area.city, area.name, hub.name
    `;
    return NextResponse.json({ centres }, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    console.error("Could not load pickup centres", error);
    return NextResponse.json({ error: "Could not load pickup centres" }, { status: 500 });
  }
}
