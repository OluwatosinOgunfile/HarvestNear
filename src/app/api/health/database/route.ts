import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sql = getDatabase();
    const [database] = await sql`
      SELECT current_database() AS name, NOW() AS checked_at
    `;

    return NextResponse.json({
      connected: true,
      database: database.name,
      checkedAt: database.checked_at,
    });
  } catch (error) {
    console.error("Database health check failed", error);

    return NextResponse.json(
      {
        connected: false,
        error: process.env.DATABASE_URL
          ? "Could not connect to the database"
          : "DATABASE_URL is not configured",
      },
      { status: 503 },
    );
  }
}
