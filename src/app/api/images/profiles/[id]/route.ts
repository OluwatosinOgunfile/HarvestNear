import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/db";

const PRODUCTION_ORIGIN = "https://www.harvestnearu.com";

async function developmentImageFallback(request: Request) {
  if (process.env.NODE_ENV !== "development") return null;
  const requested = new URL(request.url);
  const response = await fetch(new URL(`${requested.pathname}${requested.search}`, PRODUCTION_ORIGIN), { cache: "no-store" });
  if (!response.ok || !response.body) return null;
  return new Response(response.body, { headers: { "Content-Type": response.headers.get("Content-Type") || "image/webp", "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } });
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const sql = getDatabase();
  const [user] = await sql`SELECT avatar_url FROM users WHERE id = ${id} AND is_active`;
  if (!user?.avatar_url || !String(user.avatar_url).includes(".blob.vercel-storage.com")) return NextResponse.json({ error: "Image not found" }, { status: 404 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return (await developmentImageFallback(request)) ?? NextResponse.json({ error: "Blob storage is not configured" }, { status: 503 });
  try {
    const result = await get(String(user.avatar_url), { access: "private" });
    if (!result || result.statusCode !== 200) return NextResponse.json({ error: "Image not found" }, { status: 404 });
    return new Response(result.stream, { headers: { "Content-Type": result.blob.contentType, "Content-Length": String(result.blob.size), "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400", ETag: result.blob.etag } });
  } catch (error) {
    console.error("Could not read profile image", error);
    return (await developmentImageFallback(request)) ?? NextResponse.json({ error: "Could not load image" }, { status: 502 });
  }
}
