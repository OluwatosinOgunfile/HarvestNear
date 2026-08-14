import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { optimizeUploadedImage } from "@/lib/image-processing";
import { canMutateAs, checkRateLimit, validImageFile } from "@/lib/security";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE = 4 * 1024 * 1024;
const IMAGE_FORMATS: Record<string, { extension: string; contentType: string }> = {
  "image/jpeg": { extension: "jpg", contentType: "image/jpeg" },
  "image/png": { extension: "png", contentType: "image/png" },
  "image/webp": { extension: "webp", contentType: "image/webp" },
};

function isBlobUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(".blob.vercel-storage.com");
  } catch { return false; }
}

export async function POST(request: Request) {
  const user = await getSessionUser().catch((error) => {
    console.error("Listing image authentication failed", error);
    return null;
  });
  if (!user || !["farmer", "admin"].includes(user.role) || !canMutateAs(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!await checkRateLimit(request, "upload.listing", 30, 60 * 60, user.id)) return NextResponse.json({ error: "Upload limit reached. Try again later." }, { status: 429 });
  const contentType = request.headers.get("content-type") || "";
  let file: FormDataEntryValue | null = null;
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => null) as { imageBase64?: string; mimeType?: string; fileName?: string } | null;
    if (body?.imageBase64 && body.mimeType) {
      const bytes = Buffer.from(body.imageBase64, "base64");
      if (bytes.length) file = new File([bytes], body.fileName || "produce-picture", { type: body.mimeType });
    }
  } else {
    const form = await request.formData().catch(() => null);
    file = form?.get("file") || null;
  }
  if (!(file instanceof File) || !file.size) return NextResponse.json({ error: "Select a produce picture" }, { status: 400 });
  const format = IMAGE_FORMATS[file.type];
  if (!format) return NextResponse.json({ error: "Upload a JPG, PNG, or WebP image" }, { status: 400 });
  if (file.size > MAX_IMAGE_SIZE) return NextResponse.json({ error: "Listing images must be 4 MB or smaller" }, { status: 413 });
  if (!await validImageFile(file)) return NextResponse.json({ error: "The file content does not match a supported image format" }, { status: 400 });
  const imageBytes = Buffer.from(await file.arrayBuffer());
  const optimized = await optimizeUploadedImage(file, "listing").catch((error) => {
    console.error("Listing image optimization unavailable; storing validated original", error);
    return null;
  });
  const storedImage = optimized?.body || imageBytes;
  const storedFormat = optimized ? { extension: optimized.extension, contentType: optimized.contentType } : format;
  try {
    const blob = await put(`listing-images/${user.id}/${crypto.randomUUID()}.${storedFormat.extension}`, storedImage, {
      access: "private",
      addRandomSuffix: false,
      contentType: storedFormat.contentType,
    });
    return NextResponse.json({ url: blob.url, optimized: Boolean(optimized), bytes: storedImage.length, originalBytes: imageBytes.length });
  } catch (error) {
    console.error("Listing image persistence failed", error);
    return NextResponse.json({ error: "Produce picture storage is unavailable. Please try again." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user || !["farmer", "admin"].includes(user.role) || !canMutateAs(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null) as { url?: string } | null;
  if (!body?.url || !isBlobUrl(body.url)) return NextResponse.json({ error: "Invalid Blob URL" }, { status: 400 });
  const pathname = decodeURIComponent(new URL(body.url).pathname).replace(/^\/+/, "");
  if (!pathname.startsWith(`listing-images/${user.id}/`)) return NextResponse.json({ error: "You do not own this image" }, { status: 403 });
  await del(body.url);
  return NextResponse.json({ deleted: true });
}
