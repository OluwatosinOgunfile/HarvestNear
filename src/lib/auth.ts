import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";

import { getDatabase } from "@/lib/db";
import { profileImageUrl } from "@/lib/images";

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
const SESSION_DAYS = 7;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const requestHeaders = await headers();
  const sql = getDatabase();

  await sql`
    INSERT INTO user_sessions (user_id, token_hash, expires_at, user_agent)
    VALUES (${userId}, ${tokenHash}, ${expiresAt.toISOString()}, ${requestHeaders.get("user-agent")})
  `;

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    priority: "high",
    expires: expiresAt,
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    const sql = getDatabase();
    await sql`DELETE FROM user_sessions WHERE token_hash = ${hashToken(token)}`;
  }
  cookieStore.delete(COOKIE_NAME);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  const sql = getDatabase();
  const [user] = await sql`
    SELECT users.id, users.email, users.first_name, users.last_name, users.role, users.avatar_url, users.updated_at,
      administrator.id AS administrator_id, administrator.first_name AS administrator_first_name, administrator.last_name AS administrator_last_name
    FROM user_sessions session
    JOIN users ON users.id = session.user_id
    LEFT JOIN users administrator ON administrator.id = session.impersonator_user_id
    WHERE session.token_hash = ${hashToken(token)}
      AND session.expires_at > now()
      AND users.is_active
    LIMIT 1
  `;

  if (!user) return null;
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
    SELECT session.id, session.user_id, users.role
    FROM user_sessions session JOIN users ON users.id = session.user_id
    WHERE session.token_hash = ${hashToken(token)} AND session.expires_at > now()
      AND session.impersonator_user_id IS NULL
    LIMIT 1
  `;
  if (!session || session.role !== "admin" || String(session.user_id) === targetUserId) return null;
  const [target] = await sql`SELECT id, first_name, last_name, role FROM users WHERE id = ${targetUserId} AND is_active LIMIT 1`;
  if (!target) return null;
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
