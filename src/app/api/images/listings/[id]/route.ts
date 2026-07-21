import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/db";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const sql = getDatabase();
  const [image] = await sql`SELECT url FROM listing_images WHERE listing_id = ${id} ORDER BY sort_order LIMIT 1`;
  if (!image || !String(image.url).includes(".blob.vercel-storage.com")) return NextResponse.json({ error: "Image not found" }, { status: 404 });
  const result = await get(String(image.url), { access: "private" });
  if (!result || result.statusCode !== 200) return NextResponse.json({ error: "Image not found" }, { status: 404 });
  return new Response(result.stream, { headers: { "Content-Type": result.blob.contentType, "Content-Length": String(result.blob.size), "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400", ETag: result.blob.etag } });
}
