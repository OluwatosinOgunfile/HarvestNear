import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSession } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { GOOGLE_OAUTH_MOBILE_COOKIE, GOOGLE_OAUTH_RETURN_COOKIE, GOOGLE_OAUTH_STATE_COOKIE, GOOGLE_OAUTH_VERIFIER_COOKIE, googleAuthConfigured, validReturnPath } from "@/lib/google-auth";
import { dispatchNotificationEmails } from "@/lib/notification-email";

type GoogleUser = { sub?: string; email?: string; email_verified?: boolean; given_name?: string; family_name?: string; name?: string; picture?: string };

function errorRedirect(request: Request, reason: string) {
  return NextResponse.redirect(new URL(`/?authError=${encodeURIComponent(reason)}`, request.url));
}

function mobileRedirect(reason: string, token?: string, created = false) {
  const target = new URL("harvestnearu://auth");
  if (token) target.searchParams.set("token", token);
  if (created) target.searchParams.set("newAccount", "1");
  if (reason) target.searchParams.set("error", reason);
  return NextResponse.redirect(target);
}

export async function GET(request: Request) {
  if (!googleAuthConfigured()) return errorRedirect(request, "google_not_configured");
  const url = new URL(request.url);
  const cookieStore = await cookies();
  const state = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  const verifier = cookieStore.get(GOOGLE_OAUTH_VERIFIER_COOKIE)?.value;
  const returnTo = validReturnPath(cookieStore.get(GOOGLE_OAUTH_RETURN_COOKIE)?.value || null);
  const mobile = cookieStore.get(GOOGLE_OAUTH_MOBILE_COOKIE)?.value === "1";
  const suppliedState = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  cookieStore.delete(GOOGLE_OAUTH_STATE_COOKIE);
  cookieStore.delete(GOOGLE_OAUTH_VERIFIER_COOKIE);
  cookieStore.delete(GOOGLE_OAUTH_RETURN_COOKIE);
  cookieStore.delete(GOOGLE_OAUTH_MOBILE_COOKIE);
  if (!state || !verifier || !code || suppliedState !== state) return mobile ? mobileRedirect("invalid_google_request") : errorRedirect(request, "invalid_google_request");

  try {
    const callbackUrl = new URL("/api/auth/google/callback", url.origin).toString();
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: callbackUrl, grant_type: "authorization_code", code_verifier: verifier }),
      cache: "no-store",
    });
    const tokens = await tokenResponse.json().catch(() => null) as { access_token?: string; token_type?: string; error?: string } | null;
    if (!tokenResponse.ok || !tokens?.access_token) throw new Error(tokens?.error || "token_exchange_failed");

    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      cache: "no-store",
    });
    const profile = await profileResponse.json().catch(() => null) as GoogleUser | null;
    const email = profile?.email?.trim().toLowerCase();
    if (!profileResponse.ok || !profile?.sub || !email || !profile.email_verified) throw new Error("unverified_google_account");

    const sql = getDatabase();
    let created = false;
    let [user] = await sql`
      SELECT users.id, users.is_active, users.role
      FROM oauth_accounts account JOIN users ON users.id = account.user_id
      WHERE account.provider = 'google' AND account.provider_account_id = ${profile.sub}
      LIMIT 1
    `;

    if (!user) {
      [user] = await sql`SELECT id, is_active, role FROM users WHERE lower(email) = ${email} LIMIT 1`;
      if (!user) {
        created = true;
        const fullName = (profile.name || "Google User").trim().split(/\s+/);
        const firstName = (profile.given_name || fullName[0] || "Google").slice(0, 80);
        const lastName = (profile.family_name || fullName.slice(1).join(" ") || "User").slice(0, 80);
        [user] = await sql`
          WITH new_user AS (
            INSERT INTO users (email, first_name, last_name, role, email_verified_at, last_login_at)
            VALUES (${email}, ${firstName}, ${lastName}, 'consumer', now(), now())
            RETURNING id, is_active
          ), new_profile AS (
            INSERT INTO consumer_profiles (user_id) SELECT id FROM new_user
          )
          SELECT id, is_active FROM new_user
        `;
      }
      await sql`
        INSERT INTO oauth_accounts (user_id, provider, provider_account_id, provider_email, picture_url)
        VALUES (${user.id}, 'google', ${profile.sub}, ${email}, ${profile.picture || null})
        ON CONFLICT (user_id, provider) DO UPDATE SET provider_account_id = EXCLUDED.provider_account_id, provider_email = EXCLUDED.provider_email, picture_url = EXCLUDED.picture_url, updated_at = now()
      `;
      if (created) {
        await sql`INSERT INTO notifications (user_id, type, title, message, action_url, metadata)
          VALUES (${user.id}, 'account', 'Welcome to HarvestNearU', 'Your account is ready. Set your delivery location to discover fresh produce from verified farms near you.', '/profile', ${JSON.stringify({ lifecycle: "welcome", role: "consumer", provider: "google" })}::jsonb)`;
        await dispatchNotificationEmails(5, String(user.id)).catch((error) => console.error("Welcome email dispatch failed", error));
      }
    } else {
      await sql`UPDATE oauth_accounts SET provider_email = ${email}, picture_url = ${profile.picture || null}, updated_at = now() WHERE user_id = ${user.id} AND provider = 'google'`;
    }

    if (!user.is_active) return mobile ? mobileRedirect("account_disabled") : errorRedirect(request, "account_disabled");
    if (["admin", "support"].includes(String(user.role))) return mobile ? mobileRedirect("staff_password_required") : errorRedirect(request, "staff_password_required");
    await sql.transaction([
      sql`UPDATE users SET email_verified_at = COALESCE(email_verified_at, now()), last_login_at = now(), updated_at = now() WHERE id = ${user.id}`,
      sql`INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_data) VALUES (${user.id}, 'user.google_signed_in', 'user', ${user.id}, ${JSON.stringify({ email })}::jsonb)`,
    ]);
    const session = await createSession(String(user.id));
    if (mobile) return mobileRedirect("", session.token, created);
    return NextResponse.redirect(new URL(returnTo, url.origin));
  } catch (error) {
    console.error("Google authentication failed", error);
    return mobile ? mobileRedirect("google_signin_failed") : errorRedirect(request, "google_signin_failed");
  }
}
