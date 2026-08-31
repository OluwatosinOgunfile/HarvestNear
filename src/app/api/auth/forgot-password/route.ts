import { createHash, randomInt } from "node:crypto";
import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/db";
import { sendPasswordResetCode } from "@/lib/email";
import { mobileCorsHeaders, mobileOptions } from "@/lib/mobile-cors";
import { checkRateLimit, validText } from "@/lib/security";
import { isSuperAdminAccount } from "@/lib/super-admin";

export const OPTIONS = mobileOptions;

export async function POST(request: Request) {
  const headers = mobileCorsHeaders(request);
  const body = await request.json().catch(() => null) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase() || "";
  if (!validText(email, 254, 3) || !email.includes("@")) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400, headers });
  if (!await checkRateLimit(request, "auth.forgot-password", 5, 60 * 60, email)) return NextResponse.json({ error: "Too many reset requests. Try again later." }, { status: 429, headers });

  const sql = getDatabase();
  const [user] = await sql`SELECT id, first_name, email, role FROM users WHERE lower(email) = ${email} AND is_active LIMIT 1`;
  if (user && !isSuperAdminAccount(user)) {
    const code = String(randomInt(100000, 1000000));
    const hash = createHash("sha256").update(`${user.id}:${code}`).digest("hex");
    await sql.transaction([
      sql`UPDATE password_reset_codes SET used_at = now() WHERE user_id = ${user.id} AND used_at IS NULL`,
      sql`INSERT INTO password_reset_codes (user_id, code_hash, expires_at) VALUES (${user.id}, ${hash}, now() + interval '15 minutes')`,
    ]);
    try { await sendPasswordResetCode(String(user.email), String(user.first_name), code); }
    catch (error) { console.error("Password reset email failed", error); }
  }
  return NextResponse.json({ message: "If that address belongs to an account, a six-digit reset code has been sent." }, { headers });
}
