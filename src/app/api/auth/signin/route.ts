import { NextResponse } from "next/server";

import { createSession } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { profileImageUrl } from "@/lib/images";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { identifier?: string; password?: string } | null;
  const identifier = body?.identifier?.trim().toLowerCase();
  if (!identifier || !body?.password) return NextResponse.json({ error: "Email and password are required" }, { status: 400 });

  const sql = getDatabase();
  const [user] = await sql`
    SELECT id, email, first_name, last_name, role, avatar_url, updated_at
    FROM users
    WHERE (lower(email) = ${identifier} OR phone = ${identifier})
      AND is_active
      AND password_hash IS NOT NULL
      AND password_hash = crypt(${body.password}, password_hash)
    LIMIT 1
  `;
  if (!user) return NextResponse.json({ error: "Invalid email, phone number, or password" }, { status: 401 });

  await createSession(String(user.id));
  return NextResponse.json({ user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, role: user.role, avatarUrl: user.avatar_url ? `${profileImageUrl(String(user.id), String(user.avatar_url))}?v=${new Date(String(user.updated_at)).getTime()}` : null } });
}
