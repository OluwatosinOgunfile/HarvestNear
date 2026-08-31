import { NextResponse } from "next/server";

import { createSession } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { profileImageUrl } from "@/lib/images";
import { checkRateLimit } from "@/lib/security";
import { isMobileClient, mobileCorsHeaders, mobileOptions } from "@/lib/mobile-cors";
import { isSuperAdminAccount, superAdminCredentialVersion, verifySuperAdminPassword } from "@/lib/super-admin";

export const OPTIONS = mobileOptions;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { identifier?: string; password?: string } | null;
  const identifier = body?.identifier?.trim().toLowerCase();
  const headers = mobileCorsHeaders(request);
  if (!identifier || !body?.password) return NextResponse.json({ error: "Email and password are required" }, { status: 400, headers });
  if (!await checkRateLimit(request, "auth.signin", 8, 15 * 60, identifier)) return NextResponse.json({ error: "Too many sign-in attempts. Try again later." }, { status: 429, headers });

  const sql = getDatabase();
  const [user] = await sql`
    SELECT id, email, first_name, last_name, role, avatar_url, updated_at,
      password_hash IS NOT NULL AND password_hash = crypt(${body.password}, password_hash) AS password_valid
    FROM users
    WHERE (lower(email) = ${identifier} OR phone = ${identifier})
      AND is_active
    LIMIT 1
  `;
  const validPassword = user && (isSuperAdminAccount(user) ? verifySuperAdminPassword(body.password) : Boolean(user.password_valid));
  if (!validPassword) return NextResponse.json({ error: "Invalid email, phone number, or password" }, { status: 401, headers });

  const session = await createSession(String(user.id), { credentialVersion: isSuperAdminAccount(user) ? superAdminCredentialVersion() : null });
  return NextResponse.json({ ...(isMobileClient(request) ? { sessionToken: session.token } : {}), user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, role: user.role, avatarUrl: user.avatar_url ? `${profileImageUrl(String(user.id), String(user.avatar_url))}?v=${new Date(String(user.updated_at)).getTime()}` : null } }, { headers });
}
