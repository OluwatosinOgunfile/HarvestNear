import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { isMobileClient, mobileCorsHeaders, mobileOptions } from "@/lib/mobile-cors";

export const dynamic = "force-dynamic";
export const OPTIONS = mobileOptions;

const MAX_PATH = 180;

function requestAddress(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "unknown";
}

function deviceFrom(userAgent: string) {
  const value = userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(value)) return "tablet";
  if (/mobi|iphone|ipod|android|blackberry|windows phone/.test(value)) return "mobile";
  if (!value) return "unknown";
  return "desktop";
}

/**
 * Identifies a visit without keeping anything that identifies a person. The address and user agent
 * are hashed together with a salt that changes every day, so the same reader is countable within a
 * day, is not linkable across days, and cannot be recovered from the stored value.
 */
function visitorHashes(request: Request) {
  const salt = process.env.ANALYTICS_HASH_SALT || process.env.IDENTITY_HASH_PEPPER || "harvestnearu";
  const day = new Date().toISOString().slice(0, 10);
  const hour = new Date().toISOString().slice(0, 13);
  const fingerprint = `${requestAddress(request)}:${request.headers.get("user-agent") || ""}`;
  return {
    visitor: createHash("sha256").update(`${salt}:${day}:${fingerprint}`).digest("hex"),
    // A session is a visitor within the same hour, which is close enough for traffic reporting
    // without storing a durable identifier.
    session: createHash("sha256").update(`${salt}:${hour}:${fingerprint}`).digest("hex"),
  };
}

function tidyPath(value: string) {
  try {
    const path = value.startsWith("http") ? new URL(value).pathname : value.split("?")[0];
    if (!path.startsWith("/")) return null;
    // Collapse identifiers so a page is one row in the report rather than thousands.
    const normalised = path
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "/:id")
      .replace(/\/\d{3,}/g, "/:id")
      .replace(/\/+$/, "") || "/";
    return normalised.slice(0, MAX_PATH);
  } catch { return null; }
}

function referrerHost(value: string | undefined, ownHost: string) {
  if (!value) return null;
  try {
    const host = new URL(value).hostname.replace(/^www\./, "");
    return host && host !== ownHost.replace(/^www\./, "") ? host.slice(0, 120) : null;
  } catch { return null; }
}

export async function POST(request: Request) {
  const headers = mobileCorsHeaders(request);
  // Reporting must never get in the way of the page that triggered it, so every failure is silent.
  try {
    const body = await request.json().catch(() => null) as { path?: string; referrer?: string } | null;
    const path = tidyPath(String(body?.path || ""));
    if (!path) return NextResponse.json({ recorded: false }, { headers });

    const user = await getSessionUser().catch(() => null);
    const { visitor, session } = visitorHashes(request);
    const sql = getDatabase();
    await sql`
      INSERT INTO web_page_views (path, referrer_host, device, client, visitor_hash, session_hash, role)
      VALUES (
        ${path},
        ${referrerHost(body?.referrer, new URL(request.url).hostname)},
        ${deviceFrom(request.headers.get("user-agent") || "")},
        ${isMobileClient(request) ? "mobile" : "web"},
        ${visitor}, ${session}, ${user?.role || null}
      )
    `;
    return NextResponse.json({ recorded: true }, { headers });
  } catch (error) {
    console.error("Could not record a page view", error);
    return NextResponse.json({ recorded: false }, { headers });
  }
}
