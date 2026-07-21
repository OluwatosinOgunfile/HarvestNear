import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/db";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const sql = getDatabase();
  const [user] = await sql`SELECT avatar_url FROM users WHERE id = ${id} AND is_active`;
  if (!user?.avatar_url || !String(user.avatar_url).includes(".blob.vercel-storage.com")) return NextResponse.json({ error: "Image not found" }, { status: 404 });
  const result = await get(String(user.avatar_url), { access: "private" });
  if (!result || result.statusCode !== 200) return NextResponse.json({ error: "Image not found" }, { status: 404 });
  return new Response(result.stream, { headers: { "Content-Type": result.blob.contentType, "Content-Length": String(result.blob.size), "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400", ETag: result.blob.etag } });
}
