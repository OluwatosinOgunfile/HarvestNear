import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session || !["consumer", "farmer"].includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || !file.size) return NextResponse.json({ error: "Select a profile picture" }, { status: 400 });
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return NextResponse.json({ error: "Upload a JPG, PNG, or WebP image" }, { status: 400 });
  if (file.size > 3 * 1024 * 1024) return NextResponse.json({ error: "Profile pictures must be 3 MB or smaller" }, { status: 413 });
  const sql = getDatabase();
  const [current] = await sql`SELECT avatar_url FROM users WHERE id = ${session.id}`;
  const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const blob = await put(`profile-images/${session.id}/${crypto.randomUUID()}.${extension}`, file, { access: "private", addRandomSuffix: false });
  await sql`UPDATE users SET avatar_url = ${blob.url}, updated_at = now() WHERE id = ${session.id}`;
  if (current?.avatar_url && String(current.avatar_url).includes(".blob.vercel-storage.com")) await del(String(current.avatar_url)).catch((error) => console.error("Old avatar cleanup failed", error));
  return NextResponse.json({ avatarUrl: `/api/images/profiles/${session.id}` });
}
