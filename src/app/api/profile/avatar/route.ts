import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { canMutateAs, checkRateLimit, validImageFile } from "@/lib/security";
import { optimizeUploadedImage } from "@/lib/image-processing";

export async function POST(request: Request) {
  const session = await getSessionUser().catch((error) => {
    console.error("Avatar authentication failed", error);
    return null;
  });
  if (!session || !["consumer", "farmer", "admin", "support"].includes(session.role) || !canMutateAs(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!await checkRateLimit(request, "upload.avatar", 10, 60 * 60, session.id)) return NextResponse.json({ error: "Upload limit reached. Try again later." }, { status: 429 });
  const contentType = request.headers.get("content-type") || "";
  let file: FormDataEntryValue | null = null;
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => null) as { imageBase64?: string; mimeType?: string; fileName?: string } | null;
    if (body?.imageBase64 && body.mimeType) {
      const bytes = Buffer.from(body.imageBase64, "base64");
      if (bytes.length && bytes.length <= 3 * 1024 * 1024) {
        file = new File([bytes], body.fileName || "profile-picture", { type: body.mimeType });
      }
    }
  } else {
    const form = await request.formData().catch(() => null);
    file = form?.get("file") || null;
  }
  if (!(file instanceof File) || !file.size) return NextResponse.json({ error: "Select a profile picture" }, { status: 400 });
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return NextResponse.json({ error: "Upload a JPG, PNG, or WebP image" }, { status: 400 });
  if (file.size > 3 * 1024 * 1024) return NextResponse.json({ error: "Profile pictures must be 3 MB or smaller" }, { status: 413 });
  if (!await validImageFile(file)) return NextResponse.json({ error: "The file content does not match a supported image format" }, { status: 400 });
  const optimized = await optimizeUploadedImage(file, "profile").catch((error) => {
    console.error("Profile image optimization failed", error);
    return null;
  });
  if (!optimized) return NextResponse.json({ error: "The profile picture could not be optimized" }, { status: 422 });
  const sql = getDatabase();
  let blobUrl: string | null = null;
  try {
    const [current] = await sql`SELECT avatar_url FROM users WHERE id = ${session.id}`;
    const blob = await put(`profile-images/${session.id}/${crypto.randomUUID()}.${optimized.extension}`, optimized.body, {
      access: "private",
      addRandomSuffix: false,
      contentType: optimized.contentType,
    });
    blobUrl = blob.url;
    await sql`UPDATE users SET avatar_url = ${blob.url}, updated_at = now() WHERE id = ${session.id}`;
    if (current?.avatar_url && String(current.avatar_url).includes(".blob.vercel-storage.com")) {
      await del(String(current.avatar_url)).catch((error) => console.error("Old avatar cleanup failed", error));
    }
    const version = encodeURIComponent(blob.pathname.split("/").pop() || crypto.randomUUID());
    return NextResponse.json({ avatarUrl: `/api/images/profiles/${session.id}?v=${version}`, optimized: true, bytes: optimized.optimizedBytes });
  } catch (error) {
    if (blobUrl) await del(blobUrl).catch((cleanupError) => console.error("Failed avatar cleanup", cleanupError));
    console.error("Profile picture persistence failed", error);
    const message = error instanceof Error && /blob|token|store/i.test(error.message)
      ? "Profile picture storage is unavailable. Check the Blob storage connection and try again."
      : "The profile picture could not be saved. Please try again.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
