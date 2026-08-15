import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/db";
import { mobileCorsHeaders, mobileOptions } from "@/lib/mobile-cors";

const PRODUCTION_ORIGIN = "https://www.harvestnearu.com";

async function developmentImageFallback(request: Request) {
  if (process.env.NODE_ENV !== "development") return null;
  const requested = new URL(request.url);
  const response = await fetch(new URL(`${requested.pathname}${requested.search}`, PRODUCTION_ORIGIN), { cache: "no-store" });
  if (!response.ok || !response.body) return null;
  const headers = mobileCorsHeaders(request);
  headers.set("Content-Type", response.headers.get("Content-Type") || "image/webp");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  return new Response(response.body, { headers });
}

export const OPTIONS = mobileOptions;

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const sql = getDatabase();
  const [image] = await sql`SELECT url FROM listing_images WHERE listing_id = ${id} ORDER BY sort_order LIMIT 1`;
  if (!image || !String(image.url).includes(".blob.vercel-storage.com")) return NextResponse.json({ error: "Image not found" }, { status: 404, headers: mobileCorsHeaders(request) });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return (await developmentImageFallback(request)) ?? NextResponse.json({ error: "Blob storage is not configured" }, { status: 503, headers: mobileCorsHeaders(request) });
  try {
    const result = await get(String(image.url), { access: "private" });
    if (!result || result.statusCode !== 200) return NextResponse.json({ error: "Image not found" }, { status: 404, headers: mobileCorsHeaders(request) });
    const headers = mobileCorsHeaders(request);
    headers.set("Content-Type", result.blob.contentType);
    headers.set("Content-Length", String(result.blob.size));
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("ETag", result.blob.etag);
    return new Response(result.stream, { headers });
  } catch (error) {
    console.error("Could not read listing image", error);
    return (await developmentImageFallback(request)) ?? NextResponse.json({ error: "Could not load image" }, { status: 502, headers: mobileCorsHeaders(request) });
  }
}
