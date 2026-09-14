import "server-only";

import { createHash } from "node:crypto";

import { getDatabase } from "@/lib/db";

/**
 * Bump a version when the wording changes in a way a user would want to see. The version is stored
 * with each acceptance, so a dispute can be answered with which text that person agreed to and
 * when, rather than with whatever the page says today.
 */
export const TERMS_VERSION = "2026-09-14";
export const PRIVACY_VERSION = "2026-09-14";

/** How long each kind of record is kept, and why it cannot simply be kept forever. */
export const RETENTION = {
  /** Identity evidence is needed to make and defend the verification decision, not indefinitely. */
  verificationDocumentDays: 90,
  /** Traffic counts stop being useful long before they stop being personal data. */
  analyticsDays: 365,
  /** Financial and audit records are kept for the statutory accounting period. */
  financialRecordYears: 6,
} as const;

function addressHash(request: Request) {
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "";
  if (!address) return null;
  // Enough to evidence that a specific device accepted, without retaining the address itself.
  return createHash("sha256").update(`${process.env.IDENTITY_HASH_PEPPER || ""}:${address}`).digest("hex");
}

/** Records that a user accepted the current terms and privacy policy. */
export async function recordAgreements(userId: string, request: Request) {
  const sql = getDatabase();
  const agent = request.headers.get("user-agent")?.slice(0, 400) || null;
  const hash = addressHash(request);
  await sql`
    INSERT INTO user_agreements (user_id, document, version, address_hash, user_agent)
    VALUES (${userId}, 'terms', ${TERMS_VERSION}, ${hash}, ${agent}),
           (${userId}, 'privacy', ${PRIVACY_VERSION}, ${hash}, ${agent})
    ON CONFLICT (user_id, document, version) DO NOTHING
  `;
}

export async function outstandingAgreements(userId: string) {
  const sql = getDatabase();
  const rows = await sql`
    SELECT document, version FROM user_agreements
    WHERE user_id = ${userId} AND ((document = 'terms' AND version = ${TERMS_VERSION}) OR (document = 'privacy' AND version = ${PRIVACY_VERSION}))
  `;
  const accepted = new Set(rows.map((row) => String(row.document)));
  return {
    terms: accepted.has("terms") ? null : TERMS_VERSION,
    privacy: accepted.has("privacy") ? null : PRIVACY_VERSION,
  };
}
