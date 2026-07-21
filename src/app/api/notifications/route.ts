import { NextRequest, NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = getDatabase();
  const notifications = await sql`
    SELECT id, type, title, message, action_url, read_at, created_at
    FROM notifications WHERE user_id = ${user.id}
    ORDER BY created_at DESC LIMIT 100
  `;
  return NextResponse.json({ notifications });
}

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: string; all?: boolean } | null;
  const sql = getDatabase();
  if (body?.all) await sql`UPDATE notifications SET read_at = coalesce(read_at, now()) WHERE user_id = ${user.id}`;
  else if (body?.id && /^[0-9a-f-]{36}$/i.test(body.id)) await sql`UPDATE notifications SET read_at = coalesce(read_at, now()) WHERE id = ${body.id} AND user_id = ${user.id}`;
  else return NextResponse.json({ error: "Invalid notification" }, { status: 400 });
  return NextResponse.json({ updated: true });
}
