import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";

import { getDatabase } from "@/lib/db";

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "consumer" | "farmer" | "admin" | "support";
};

const COOKIE_NAME = "harvestnearu_session";
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
    SELECT users.id, users.email, users.first_name, users.last_name, users.role
    FROM user_sessions session
    JOIN users ON users.id = session.user_id
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
  };
}
