import "server-only";

import { createHash } from "node:crypto";

import type { SessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";

function requestAddress(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "unknown";
}

function bucket(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function checkRateLimit(request: Request, action: string, limit: number, windowSeconds: number, discriminator = "") {
  const key = bucket(`${requestAddress(request)}:${discriminator.trim().toLowerCase()}`);
  const sql = getDatabase();
  const [result] = await sql`
    INSERT INTO security_rate_limits (bucket_key, action, attempts)
    VALUES (${key}, ${action}, 1)
    ON CONFLICT (bucket_key, action) DO UPDATE SET
      attempts = CASE
        WHEN security_rate_limits.window_started_at <= now() - (${windowSeconds} * interval '1 second') THEN 1
        ELSE security_rate_limits.attempts + 1
      END,
      window_started_at = CASE
        WHEN security_rate_limits.window_started_at <= now() - (${windowSeconds} * interval '1 second') THEN now()
        ELSE security_rate_limits.window_started_at
      END,
      updated_at = now()
    RETURNING attempts
  `;
  return Number(result.attempts) <= limit;
}

export function canMutateAs(user: SessionUser | null): user is SessionUser {
  return Boolean(user && !user.impersonating);
}

export function validText(value: unknown, maximum: number, minimum = 1) {
  return typeof value === "string" && value.trim().length >= minimum && value.trim().length <= maximum;
}

export async function validImageFile(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (file.type === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.type === "image/png") return bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value);
  if (file.type === "image/webp") return bytes.length >= 12
    && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}
