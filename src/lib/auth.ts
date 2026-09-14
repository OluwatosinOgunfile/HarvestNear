import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";

import { getDatabase } from "@/lib/db";
import { profileImageUrl } from "@/lib/images";
import { IDLE_TOUCH_THROTTLE_MINUTES, type SessionClient, sessionPolicyFor } from "@/lib/session-policy";
import { isSuperAdminAccount, superAdminCredentialVersion } from "@/lib/super-admin";

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "consumer" | "farmer" | "admin" | "support";
  avatarUrl: string | null;
  impersonating?: boolean;
  administrator?: { id: string; firstName: string; lastName: string };
};

const COOKIE_NAME = process.env.NODE_ENV === "production" ? "__Host-harvestnearu_session" : "harvestnearu_session";

/** The native client announces itself on every request, so no caller has to remember to say so. */
async function requestClient(): Promise<SessionClient> {
  const requestHeaders = await headers();
  return requestHeaders.get("x-harvestnearu-client")?.toLowerCase() === "mobile" ? "mobile" : "web";
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Creates a session and, by default, installs it as the browser cookie. Pass `setCookie: false`
 * when the token is being handed to another client: the native app's Google sign-in completes
 * inside a browser, and leaving the cookie behind would give the browser and the app one shared
 * session, so signing out of the browser would end the app's session too.
 */
export async function createSession(userId: string, options?: { maxAgeMinutes?: number; credentialVersion?: string | null; setCookie?: boolean; remember?: boolean }) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const requestHeaders = await headers();
  const sql = getDatabase();

  // The lifetime follows the account's role and the client it signed in from, so a staff session
  // cannot quietly inherit a shopper's. The role is read here rather than passed in, because a
  // caller that forgets would hand out the wrong lifetime silently.
  const [account] = await sql`SELECT role FROM users WHERE id = ${userId} LIMIT 1`;
  const policy = sessionPolicyFor(account?.role as string | undefined, await requestClient());
  // A caller asking for a shorter life gets it, and its idle window shrinks to match; the mobile
  // hand-off uses this for a token that must be redeemed within minutes.
  const absoluteMinutes = options?.maxAgeMinutes ?? policy.absoluteMinutes;
  const idleMinutes = Math.min(policy.idleMinutes, absoluteMinutes);
  const expiresAt = new Date(Date.now() + absoluteMinutes * 60_000);

  await sql`
    INSERT INTO user_sessions (user_id, token_hash, expires_at, user_agent, credential_version, idle_timeout_minutes, last_seen_at)
    VALUES (${userId}, ${tokenHash}, ${expiresAt.toISOString()}, ${requestHeaders.get("user-agent")}, ${options?.credentialVersion || null}, ${idleMinutes}, now())
  `;

  if (options?.setCookie !== false) {
    const cookieStore = await cookies();
    // Without an expiry the browser keeps the cookie only until it closes. That is what someone who
    // did not ask to be remembered gets, which matters on a shared or public computer. The session
    // row keeps its own expiry either way, so this changes how long the browser holds the token, not
    // how long the server honours it.
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      priority: "high",
      ...(options?.remember === false ? {} : { expires: expiresAt }),
    });
  }
  return { token, expiresAt };
}

async function requestSessionToken() {
  const requestHeaders = await headers();
  const authorization = requestHeaders.get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) return authorization.slice(7).trim();
  return (await cookies()).get(COOKIE_NAME)?.value;
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const token = await requestSessionToken();
  if (token) {
    const sql = getDatabase();
    await sql`DELETE FROM user_sessions WHERE token_hash = ${hashToken(token)}`;
  }
  cookieStore.delete(COOKIE_NAME);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = await requestSessionToken();
  if (!token) return null;

  const sql = getDatabase();
  // Both clocks are checked here, and using the session pushes the inactivity clock forward in the
  // same statement. The touch is throttled, so an active client costs one write every couple of
  // minutes rather than one per API call. A session past its idle window is not touched, so it
  // cannot revive itself; sessions issued before idle windows existed carry NULL and are governed by
  // their expiry alone.
  const [user] = await sql`
    WITH touched AS (
      UPDATE user_sessions
      SET last_seen_at = now()
      WHERE token_hash = ${hashToken(token)}
        AND expires_at > now()
        AND (idle_timeout_minutes IS NULL OR last_seen_at IS NULL
          OR last_seen_at > now() - (idle_timeout_minutes * interval '1 minute'))
        AND (last_seen_at IS NULL OR last_seen_at < now() - (${IDLE_TOUCH_THROTTLE_MINUTES} * interval '1 minute'))
      RETURNING id
    )
    SELECT users.id, users.email, users.first_name, users.last_name, users.role, users.avatar_url, users.updated_at, session.credential_version,
      administrator.id AS administrator_id, administrator.first_name AS administrator_first_name, administrator.last_name AS administrator_last_name
    FROM user_sessions session
    JOIN users ON users.id = session.user_id
    LEFT JOIN users administrator ON administrator.id = session.impersonator_user_id
    WHERE session.token_hash = ${hashToken(token)}
      AND session.expires_at > now()
      AND (session.idle_timeout_minutes IS NULL OR session.last_seen_at IS NULL
        OR session.last_seen_at > now() - (session.idle_timeout_minutes * interval '1 minute'))
      AND users.is_active
    LIMIT 1
  `;

  if (!user) return null;
  if (isSuperAdminAccount(user) && (!superAdminCredentialVersion() || user.credential_version !== superAdminCredentialVersion())) return null;
  return {
    id: String(user.id), email: String(user.email),
    firstName: String(user.first_name), lastName: String(user.last_name),
    role: user.role as SessionUser["role"],
    avatarUrl: user.avatar_url ? `${profileImageUrl(String(user.id), String(user.avatar_url))}?v=${new Date(String(user.updated_at)).getTime()}` : null,
    impersonating: Boolean(user.administrator_id),
    administrator: user.administrator_id ? { id: String(user.administrator_id), firstName: String(user.administrator_first_name), lastName: String(user.administrator_last_name) } : undefined,
  };
}

export async function startImpersonation(targetUserId: string) {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const sql = getDatabase();
  const [session] = await sql`
    SELECT session.id, session.user_id, users.role, users.email
    FROM user_sessions session JOIN users ON users.id = session.user_id
    WHERE session.token_hash = ${hashToken(token)} AND session.expires_at > now()
      AND session.impersonator_user_id IS NULL
    LIMIT 1
  `;
  if (!session || session.role !== "admin" || String(session.user_id) === targetUserId) return null;
  const [target] = await sql`SELECT id, first_name, last_name, role, email FROM users WHERE id = ${targetUserId} AND is_active LIMIT 1`;
  if (!target) return null;
  if (isSuperAdminAccount(target) || (["admin", "support"].includes(String(target.role)) && !isSuperAdminAccount(session))) return null;
  await sql.transaction([
    sql`UPDATE user_sessions SET impersonator_user_id = ${session.user_id}, user_id = ${target.id}, impersonation_started_at = now(), last_seen_at = now() WHERE id = ${session.id}`,
    sql`INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_data) VALUES (${session.user_id}, 'user.impersonation_started', 'user', ${targetUserId}, ${JSON.stringify({ targetRole: target.role, sessionId: String(session.id) })}::jsonb)`,
  ]);
  return target;
}

export async function stopImpersonation() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const sql = getDatabase();
  const [session] = await sql`
    SELECT id, user_id AS target_user_id, impersonator_user_id
    FROM user_sessions WHERE token_hash = ${hashToken(token)} AND expires_at > now()
      AND impersonator_user_id IS NOT NULL LIMIT 1
  `;
  if (!session) return null;
  await sql.transaction([
    sql`UPDATE user_sessions SET user_id = ${session.impersonator_user_id}, impersonator_user_id = NULL, impersonation_started_at = NULL, last_seen_at = now() WHERE id = ${session.id}`,
    sql`INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_data) VALUES (${session.impersonator_user_id}, 'user.impersonation_ended', 'user', ${session.target_user_id}, ${JSON.stringify({ sessionId: String(session.id) })}::jsonb)`,
  ]);
  return { administratorId: String(session.impersonator_user_id) };
}
