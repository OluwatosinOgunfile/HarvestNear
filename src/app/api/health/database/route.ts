import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sql = getDatabase();
    await sql`SELECT 1 AS healthy`;

    return NextResponse.json({
      connected: true,
      healthy: true,
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
