import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/db";
import { mobileCorsHeaders, mobileOptions } from "@/lib/mobile-cors";
import { checkRateLimit } from "@/lib/security";
import { isSuperAdminAccount } from "@/lib/super-admin";

export const OPTIONS = mobileOptions;

export async function POST(request: Request) {
  const headers = mobileCorsHeaders(request);
  const body = await request.json().catch(() => null) as { email?: string; code?: string; password?: string; confirmPassword?: string } | null;
  const email = body?.email?.trim().toLowerCase() || "";
  const code = body?.code?.trim() || "";
  if (!await checkRateLimit(request, "auth.reset-password", 10, 60 * 60, email)) return NextResponse.json({ error: "Too many attempts. Request a new code later." }, { status: 429, headers });
  if (!email.includes("@") || !/^\d{6}$/.test(code)) return NextResponse.json({ error: "Enter your email and six-digit code" }, { status: 400, headers });
  if (!body?.password || body.password.length < 8 || body.password.length > 128) return NextResponse.json({ error: "Password must contain between 8 and 128 characters" }, { status: 400, headers });
  if (body.password !== body.confirmPassword) return NextResponse.json({ error: "Passwords do not match" }, { status: 400, headers });

  const sql = getDatabase();
  const [user] = await sql`SELECT id, email, role FROM users WHERE lower(email) = ${email} AND is_active LIMIT 1`;
  if (!user) return NextResponse.json({ error: "The code is invalid or has expired" }, { status: 400, headers });
  if (isSuperAdminAccount(user)) return NextResponse.json({ error: "The super administrator password can only be changed through the SUPER_ADMIN_PASSWORD environment variable" }, { status: 403, headers });
  const hash = createHash("sha256").update(`${user.id}:${code}`).digest("hex");
  const [reset] = await sql`SELECT id FROM password_reset_codes WHERE user_id = ${user.id} AND code_hash = ${hash} AND used_at IS NULL AND expires_at > now() ORDER BY created_at DESC LIMIT 1`;
  if (!reset) return NextResponse.json({ error: "The code is invalid or has expired" }, { status: 400, headers });

  await sql.transaction([
    sql`UPDATE users SET password_hash = crypt(${body.password}, gen_salt('bf', 12)), updated_at = now() WHERE id = ${user.id}`,
    sql`UPDATE password_reset_codes SET used_at = now() WHERE user_id = ${user.id} AND used_at IS NULL`,
    sql`DELETE FROM user_sessions WHERE user_id = ${user.id}`,
  ]);
  return NextResponse.json({ message: "Password updated. You can now sign in." }, { headers });
}
