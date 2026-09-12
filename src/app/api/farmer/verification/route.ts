import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import {
  BUSINESS_TYPES,
  REQUIRED_DOCUMENTS,
  compareAccountName,
  hashIdentityNumber,
  identityLast4,
  recordVerificationAudit,
  validIdentityNumber,
  verificationPolicy,
  type BusinessType,
  type IdentityType,
} from "@/lib/farm-verification";
import { mobileCorsHeaders, mobileOptions } from "@/lib/mobile-cors";
import { dispatchNotificationEmailsAfterResponse } from "@/lib/notification-email";
import { canMutateAs, checkRateLimit, validText } from "@/lib/security";

export const dynamic = "force-dynamic";
export const OPTIONS = mobileOptions;

async function ownedFarm(userId: string, farmId: string) {
  const sql = getDatabase();
  const [farm] = await sql`SELECT id, name, verification_status, verification_exempt FROM farms WHERE id = ${farmId} AND owner_id = ${userId} LIMIT 1`;
  return farm || null;
}

export async function GET(request: Request) {
  const headers = mobileCorsHeaders(request);
  const user = await getSessionUser();
  if (!user || user.role !== "farmer") return NextResponse.json({ error: "Forbidden" }, { status: 403, headers });
  const farmId = new URL(request.url).searchParams.get("farmId");
  if (!farmId) return NextResponse.json({ error: "Select a farm" }, { status: 400, headers });
  const farm = await ownedFarm(user.id, farmId);
  if (!farm) return NextResponse.json({ error: "Farm not found" }, { status: 404, headers });

  const sql = getDatabase();
  const [submission] = await sql`
    SELECT id, status, legal_first_name, legal_last_name, date_of_birth, identity_type, identity_number_last4,
      identity_expires_on, business_type, cac_number, bank_matched, bank_match_note, review_note,
      submitted_at, reviewed_at
    FROM farm_verification_submissions WHERE farm_id = ${farmId} ORDER BY created_at DESC LIMIT 1
  `;
  const documents = submission ? await sql`
    SELECT document_type, content_type, byte_size, uploaded_at FROM farm_verification_documents
    WHERE submission_id = ${submission.id} ORDER BY uploaded_at
  ` : [];
  const [payoutAccount] = await sql`SELECT account_name, bank_name FROM farmer_payout_accounts WHERE farm_id = ${farmId} AND is_default LIMIT 1`;

  return NextResponse.json({
    farm: { id: String(farm.id), name: String(farm.name), verificationStatus: String(farm.verification_status), exempt: Boolean(farm.verification_exempt) },
    submission: submission || null,
    documents,
    payoutAccountName: payoutAccount?.account_name ? String(payoutAccount.account_name) : null,
    policy: verificationPolicy(),
  }, { headers });
}

export async function POST(request: Request) {
  dispatchNotificationEmailsAfterResponse();
  const headers = mobileCorsHeaders(request);
  const user = await getSessionUser();
  if (!user || user.role !== "farmer" || !canMutateAs(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers });
  if (!await checkRateLimit(request, "farmer.verification", 10, 60 * 60, user.id)) {
    return NextResponse.json({ error: "Too many verification attempts. Try again later." }, { status: 429, headers });
  }

  const body = await request.json().catch(() => null) as {
    farmId?: string; legalFirstName?: string; legalLastName?: string; dateOfBirth?: string;
    identityType?: IdentityType; identityNumber?: string; identityExpiresOn?: string;
    businessType?: BusinessType; cacNumber?: string; submit?: boolean;
  } | null;
  if (!body?.farmId) return NextResponse.json({ error: "Select a farm" }, { status: 400, headers });
  const farm = await ownedFarm(user.id, body.farmId);
  if (!farm) return NextResponse.json({ error: "Farm not found" }, { status: 404, headers });

  if (!validText(body.legalFirstName, 60, 2) || !validText(body.legalLastName, 60, 2)) {
    return NextResponse.json({ error: "Enter the first and last name exactly as they appear on the identity document" }, { status: 400, headers });
  }
  const identityType = body.identityType as IdentityType;
  const identityNumber = String(body.identityNumber || "").trim();
  if (!identityType || !validIdentityNumber(identityType, identityNumber)) {
    return NextResponse.json({ error: "Enter a valid identity number for the document type selected" }, { status: 400, headers });
  }
  const businessType = (body.businessType || "individual") as BusinessType;
  const businessDefinition = BUSINESS_TYPES.find((entry) => entry.value === businessType);
  if (!businessDefinition) return NextResponse.json({ error: "Select how the farm is registered" }, { status: 400, headers });
  const cacNumber = String(body.cacNumber || "").trim();
  if (businessDefinition.requiresCac && !/^(RC|BN|IT)?[- ]?\d{5,10}$/i.test(cacNumber)) {
    return NextResponse.json({ error: "Enter the CAC registration number for a registered business" }, { status: 400, headers });
  }
  const dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
  if (!dateOfBirth || Number.isNaN(dateOfBirth.getTime())) return NextResponse.json({ error: "Enter the date of birth on the identity document" }, { status: 400, headers });
  const age = (Date.now() - dateOfBirth.getTime()) / (365.25 * 86_400_000);
  if (age < 18 || age > 110) return NextResponse.json({ error: "The account holder must be at least 18 years old" }, { status: 400, headers });

  const sql = getDatabase();
  const identityHash = hashIdentityNumber(identityNumber);

  // The same identity behind several farms is the clearest fraud signal available here.
  const [duplicate] = await sql`
    SELECT submission.farm_id FROM farm_verification_submissions submission
    WHERE submission.identity_number_hash = ${identityHash} AND submission.farm_id <> ${body.farmId}
      AND submission.status IN ('submitted', 'under_review', 'approved') LIMIT 1
  `;

  const [payoutAccount] = await sql`SELECT account_name FROM farmer_payout_accounts WHERE farm_id = ${body.farmId} AND is_default LIMIT 1`;
  const bankComparison = payoutAccount?.account_name
    ? compareAccountName(`${body.legalFirstName} ${body.legalLastName}`, String(payoutAccount.account_name))
    : { matched: null as boolean | null, note: "No payout account has been configured yet" };

  const [existing] = await sql`
    SELECT id, status FROM farm_verification_submissions
    WHERE farm_id = ${body.farmId} AND status IN ('draft', 'submitted', 'under_review') ORDER BY created_at DESC LIMIT 1
  `;
  if (existing && ["submitted", "under_review"].includes(String(existing.status)) && body.submit) {
    return NextResponse.json({ error: "This farm already has a verification under review" }, { status: 409, headers });
  }

  const submissionId = existing ? String(existing.id) : randomUUID();
  const wantsSubmit = Boolean(body.submit);

  if (wantsSubmit) {
    const provided = await sql`SELECT document_type FROM farm_verification_documents WHERE submission_id = ${submissionId}`;
    const uploaded = new Set(provided.map((row) => String(row.document_type)));
    const missing = REQUIRED_DOCUMENTS.filter((type) => !uploaded.has(type));
    if (missing.length) return NextResponse.json({ error: `Upload the required documents before submitting: ${missing.join(", ")}`, missing }, { status: 400, headers });
  }

  const status = wantsSubmit ? "submitted" : "draft";
  await sql`
    INSERT INTO farm_verification_submissions (
      id, farm_id, submitted_by, status, legal_first_name, legal_last_name, date_of_birth,
      identity_type, identity_number_hash, identity_number_last4, identity_expires_on,
      business_type, cac_number, bank_account_name, bank_matched, bank_match_note, submitted_at, updated_at
    ) VALUES (
      ${submissionId}, ${body.farmId}, ${user.id}, ${status}, ${body.legalFirstName!.trim()}, ${body.legalLastName!.trim()}, ${dateOfBirth.toISOString().slice(0, 10)},
      ${identityType}, ${identityHash}, ${identityLast4(identityNumber)}, ${body.identityExpiresOn || null},
      ${businessType}, ${businessDefinition.requiresCac ? cacNumber : null},
      ${payoutAccount?.account_name || null}, ${bankComparison.matched}, ${bankComparison.note},
      ${wantsSubmit ? new Date().toISOString() : null}, now()
    )
    ON CONFLICT (id) DO UPDATE SET
      status = excluded.status, legal_first_name = excluded.legal_first_name, legal_last_name = excluded.legal_last_name,
      date_of_birth = excluded.date_of_birth, identity_type = excluded.identity_type,
      identity_number_hash = excluded.identity_number_hash, identity_number_last4 = excluded.identity_number_last4,
      identity_expires_on = excluded.identity_expires_on, business_type = excluded.business_type,
      cac_number = excluded.cac_number, bank_account_name = excluded.bank_account_name,
      bank_matched = excluded.bank_matched, bank_match_note = excluded.bank_match_note,
      submitted_at = coalesce(excluded.submitted_at, farm_verification_submissions.submitted_at), updated_at = now()
  `;

  await recordVerificationAudit(user.id, wantsSubmit ? "farm_verification.submitted" : "farm_verification.saved", submissionId, {
    farmId: String(body.farmId), identityType, businessType,
    bankMatched: bankComparison.matched, duplicateIdentity: Boolean(duplicate),
  });

  if (wantsSubmit) {
    await sql`
      INSERT INTO notifications (user_id, type, title, message, action_url, metadata)
      SELECT id, 'farm', 'Farm verification to review',
        ${`${String(farm.name)} submitted verification documents for review.`}, '/admin',
        ${JSON.stringify({ submissionId, farmId: String(body.farmId), duplicateIdentity: Boolean(duplicate), bankMatched: bankComparison.matched })}::jsonb
      FROM users WHERE role IN ('admin', 'support')
    `;
    await sql`
      INSERT INTO notifications (user_id, type, title, message, action_url, metadata) VALUES
      (${user.id}, 'farm', 'Verification submitted',
      ${`We received the verification documents for ${String(farm.name)} and will review them shortly.`}, '/farmer',
      ${JSON.stringify({ submissionId, farmId: String(body.farmId) })}::jsonb)
    `;
  }

  return NextResponse.json({
    submissionId,
    status,
    bankMatched: bankComparison.matched,
    bankMatchNote: bankComparison.note,
  }, { status: existing ? 200 : 201, headers });
}
