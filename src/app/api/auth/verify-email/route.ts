import { createHash, randomInt } from "node:crypto";
import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { sendEmailVerificationCode } from "@/lib/email";
import { mobileCorsHeaders, mobileOptions } from "@/lib/mobile-cors";
import { checkRateLimit } from "@/lib/security";

export const OPTIONS = mobileOptions;

const hashCode = (code: string) => createHash("sha256").update(code).digest("hex");

export async function POST(request: Request) {
  const headers = mobileCorsHeaders(request);
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to verify your email" }, { status: 401, headers });
  if (!await checkRateLimit(request, "auth.verify-email.request", 5, 60 * 60, user.id)) return NextResponse.json({ error: "Too many verification requests. Try again later." }, { status: 429, headers });

  const sql = getDatabase();
  const [account] = await sql`SELECT email, first_name, email_verified_at FROM users WHERE id = ${user.id} AND is_active`;
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404, headers });
  if (account.email_verified_at) return NextResponse.json({ verified: true }, { headers });

  const code = String(randomInt(100000, 1000000));
  await sql.transaction([
    sql`UPDATE email_verification_codes SET used_at = now() WHERE user_id = ${user.id} AND used_at IS NULL`,
    sql`INSERT INTO email_verification_codes (user_id, code_hash, expires_at) VALUES (${user.id}, ${hashCode(code)}, now() + interval '15 minutes')`,
  ]);
  try {
    await sendEmailVerificationCode(String(account.email), String(account.first_name), code);
  } catch (error) {
    console.error("Email verification delivery failed", error);
    return NextResponse.json({ error: "We could not send the verification email. Try again shortly." }, { status: 503, headers });
  }
  return NextResponse.json({ sent: true, expiresInSeconds: 900 }, { headers });
}

export async function PATCH(request: Request) {
  const headers = mobileCorsHeaders(request);
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to verify your email" }, { status: 401, headers });
  if (!await checkRateLimit(request, "auth.verify-email.confirm", 10, 15 * 60, user.id)) return NextResponse.json({ error: "Too many incorrect attempts. Request a new code." }, { status: 429, headers });
  const body = await request.json().catch(() => null) as { code?: string } | null;
  const code = body?.code?.trim() || "";
  if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: "Enter the 6-digit code" }, { status: 400, headers });

  const sql = getDatabase();
  const [match] = await sql`SELECT id FROM email_verification_codes WHERE user_id = ${user.id} AND code_hash = ${hashCode(code)} AND used_at IS NULL AND expires_at > now() ORDER BY created_at DESC LIMIT 1`;
  if (!match) return NextResponse.json({ error: "That code is incorrect or has expired" }, { status: 400, headers });
  await sql.transaction([
    sql`UPDATE email_verification_codes SET used_at = now() WHERE user_id = ${user.id} AND used_at IS NULL`,
    sql`UPDATE users SET email_verified_at = COALESCE(email_verified_at, now()), updated_at = now() WHERE id = ${user.id}`,
  ]);
  return NextResponse.json({ verified: true }, { headers });
}
