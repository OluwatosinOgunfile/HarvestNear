import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { canMutateAs, checkRateLimit, validImageFile } from "@/lib/security";

const MAX_IMAGE_SIZE = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function isBlobUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(".blob.vercel-storage.com");
  } catch { return false; }
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "farmer" || !canMutateAs(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!await checkRateLimit(request, "upload.listing", 30, 60 * 60, user.id)) return NextResponse.json({ error: "Upload limit reached. Try again later." }, { status: 429 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || !file.size) return NextResponse.json({ error: "Select a produce picture" }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: "Upload a JPG, PNG, or WebP image" }, { status: 400 });
  if (file.size > MAX_IMAGE_SIZE) return NextResponse.json({ error: "Listing images must be 4 MB or smaller" }, { status: 413 });
  if (!await validImageFile(file)) return NextResponse.json({ error: "The file content does not match a supported image format" }, { status: 400 });
  const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const blob = await put(`listing-images/${user.id}/${crypto.randomUUID()}.${extension}`, file, { access: "private", addRandomSuffix: false });
  return NextResponse.json({ url: blob.url });
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "farmer" || !canMutateAs(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null) as { url?: string } | null;
  if (!body?.url || !isBlobUrl(body.url)) return NextResponse.json({ error: "Invalid Blob URL" }, { status: 400 });
  const pathname = decodeURIComponent(new URL(body.url).pathname).replace(/^\/+/, "");
  if (!pathname.startsWith(`listing-images/${user.id}/`)) return NextResponse.json({ error: "You do not own this image" }, { status: 403 });
  await del(body.url);
  return NextResponse.json({ deleted: true });
}
