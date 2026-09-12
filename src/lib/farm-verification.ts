import "server-only";

import { createHash } from "node:crypto";

import { getDatabase } from "@/lib/db";

export type IdentityType = "nin" | "voters_card" | "drivers_licence" | "passport";
export type BusinessType = "individual" | "business_name" | "limited_company" | "cooperative";

export const IDENTITY_TYPES: { value: IdentityType; label: string; digits?: number; pattern: RegExp }[] = [
  { value: "nin", label: "National Identification Number (NIN)", digits: 11, pattern: /^\d{11}$/ },
  { value: "voters_card", label: "Permanent Voter's Card", pattern: /^[A-Z0-9]{9,20}$/i },
  { value: "drivers_licence", label: "Driver's licence", pattern: /^[A-Z0-9-]{8,20}$/i },
  { value: "passport", label: "International passport", pattern: /^[A-Z][0-9]{8}$/i },
];

export const BUSINESS_TYPES: { value: BusinessType; label: string; requiresCac: boolean }[] = [
  { value: "individual", label: "Individual farmer (not registered)", requiresCac: false },
  { value: "business_name", label: "Registered business name", requiresCac: true },
  { value: "limited_company", label: "Limited company", requiresCac: true },
  { value: "cooperative", label: "Cooperative society", requiresCac: true },
];

export const REQUIRED_DOCUMENTS = ["identity_front", "selfie"] as const;
export const OPTIONAL_DOCUMENTS = ["identity_back", "cac_certificate", "address_proof"] as const;
export const DOCUMENT_TYPES = [...REQUIRED_DOCUMENTS, ...OPTIONAL_DOCUMENTS];
export const MAX_DOCUMENT_BYTES = 6 * 1024 * 1024;
export const ALLOWED_DOCUMENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

/**
 * Identity numbers are never stored in readable form. The hash still supports the checks that
 * matter — spotting the same identity behind several farms, and confirming a resubmission belongs
 * to the same person — while a stolen database row yields nothing usable.
 */
export function hashIdentityNumber(value: string) {
  const normalised = value.replace(/[\s-]/g, "").toUpperCase();
  const pepper = process.env.IDENTITY_HASH_PEPPER || "";
  return createHash("sha256").update(`${pepper}:${normalised}`).digest("hex");
}

export function identityLast4(value: string) {
  return value.replace(/[\s-]/g, "").slice(-4);
}

export function validIdentityNumber(type: IdentityType, value: string) {
  const definition = IDENTITY_TYPES.find((entry) => entry.value === type);
  if (!definition) return false;
  return definition.pattern.test(value.replace(/[\s-]/g, ""));
}

export function verificationPolicy() {
  return {
    identityTypes: IDENTITY_TYPES.map(({ value, label }) => ({ value, label })),
    businessTypes: BUSINESS_TYPES,
    requiredDocuments: REQUIRED_DOCUMENTS,
    optionalDocuments: OPTIONAL_DOCUMENTS,
    maxDocumentBytes: MAX_DOCUMENT_BYTES,
    acceptedFileTypes: [...ALLOWED_DOCUMENT_TYPES],
    automatedProvider: process.env.IDENTITY_VERIFICATION_PROVIDER || null,
  };
}

/**
 * Compares the declared legal name against the account name Paystack resolved for the farm's
 * payout destination. A farmer paying into an account that is not theirs is the failure mode this
 * is here to catch, and the resolved name is already trustworthy because Paystack returned it.
 */
function nameTokens(value: string) {
  return value.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((token) => token.length > 1);
}

export function compareAccountName(legalName: string, accountName: string) {
  const declared = nameTokens(legalName);
  const resolved = nameTokens(accountName);
  if (!declared.length || !resolved.length) return { matched: false, note: "No payout account name to compare" };
  const overlap = declared.filter((token) => resolved.includes(token));
  if (overlap.length >= 2 || (declared.length === 1 && overlap.length === 1)) {
    return { matched: true, note: `Payout account name matches on ${overlap.join(", ")}` };
  }
  return { matched: false, note: `Payout account is held by ${accountName}, which does not match the declared name` };
}

/**
 * The single place that decides whether a farm has cleared verification. Farms trading before the
 * documented check was introduced are exempt; everything else needs an approved submission.
 */
export async function farmVerificationState(farmId: string) {
  const sql = getDatabase();
  const [farm] = await sql`
    SELECT farm.id, farm.verification_status, farm.verification_exempt,
      submission.id AS submission_id, submission.status AS submission_status, submission.review_note, submission.submitted_at, submission.reviewed_at
    FROM farms farm
    LEFT JOIN LATERAL (
      SELECT id, status, review_note, submitted_at, reviewed_at
      FROM farm_verification_submissions
      WHERE farm_id = farm.id ORDER BY created_at DESC LIMIT 1
    ) submission ON true
    WHERE farm.id = ${farmId} LIMIT 1
  `;
  if (!farm) return null;
  const exempt = Boolean(farm.verification_exempt);
  const approved = farm.submission_status === "approved";
  return {
    farmId: String(farm.id),
    verificationStatus: String(farm.verification_status),
    exempt,
    cleared: exempt || approved,
    submissionId: farm.submission_id ? String(farm.submission_id) : null,
    submissionStatus: farm.submission_status ? String(farm.submission_status) : null,
    reviewNote: farm.review_note ? String(farm.review_note) : null,
    submittedAt: farm.submitted_at || null,
    reviewedAt: farm.reviewed_at || null,
  };
}

export async function recordVerificationAudit(actorId: string, action: string, submissionId: string, detail: Record<string, unknown>) {
  const sql = getDatabase();
  await sql`
    INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_data)
    VALUES (${actorId}, ${action}, 'farm_verification', ${submissionId}, ${JSON.stringify(detail)}::jsonb)
  `;
}
