import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { recordVerificationAudit } from "@/lib/farm-verification";
import { dispatchNotificationEmailsAfterResponse } from "@/lib/notification-email";
import { canMutateAs, validText } from "@/lib/security";

export const dynamic = "force-dynamic";

const REVIEWABLE = new Set(["submitted", "under_review"]);

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user || !["admin", "support"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const status = new URL(request.url).searchParams.get("status") || "open";
  const sql = getDatabase();

  const submissions = await sql`
    SELECT submission.id, submission.status, submission.legal_first_name, submission.legal_last_name,
      submission.date_of_birth, submission.identity_type, submission.identity_number_last4, submission.identity_expires_on,
      submission.business_type, submission.cac_number, submission.bank_account_name, submission.bank_matched,
      submission.bank_match_note, submission.review_note, submission.submitted_at, submission.reviewed_at,
      farm.id AS farm_id, farm.name AS farm_name, farm.city, farm.state, farm.verification_status,
      owner.first_name AS owner_first_name, owner.last_name AS owner_last_name, owner.email AS owner_email,
      reviewer.first_name AS reviewer_first_name, reviewer.last_name AS reviewer_last_name,
      (SELECT count(*)::int FROM farm_verification_submissions other
        WHERE other.identity_number_hash = submission.identity_number_hash
          AND other.farm_id <> submission.farm_id
          AND other.status IN ('submitted', 'under_review', 'approved')) AS duplicate_identity_count,
      coalesce((SELECT json_agg(json_build_object('id', document.id, 'type', document.document_type, 'contentType', document.content_type, 'bytes', document.byte_size) ORDER BY document.uploaded_at)
        FROM farm_verification_documents document WHERE document.submission_id = submission.id), '[]') AS documents
    FROM farm_verification_submissions submission
    JOIN farms farm ON farm.id = submission.farm_id
    JOIN users owner ON owner.id = farm.owner_id
    LEFT JOIN users reviewer ON reviewer.id = submission.reviewed_by
    WHERE (${status} = 'all' OR (${status} = 'open' AND submission.status IN ('submitted', 'under_review')) OR submission.status = ${status})
    ORDER BY submission.submitted_at DESC NULLS LAST, submission.created_at DESC
    LIMIT 100
  `;
  return NextResponse.json({ submissions });
}

export async function PATCH(request: Request) {
  dispatchNotificationEmailsAfterResponse();
  const user = await getSessionUser();
  if (!user || user.role !== "admin" || !canMutateAs(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null) as { id?: string; decision?: string; note?: string } | null;
  if (!body?.id || !["under_review", "approved", "rejected"].includes(String(body.decision))) {
    return NextResponse.json({ error: "Choose a valid decision" }, { status: 400 });
  }
  if (body.decision === "rejected" && !validText(body.note, 500, 5)) {
    return NextResponse.json({ error: "Explain why the verification was rejected so the farmer can correct it" }, { status: 400 });
  }

  const sql = getDatabase();
  const [submission] = await sql`
    SELECT submission.id, submission.status, submission.farm_id, submission.submitted_by, farm.name AS farm_name
    FROM farm_verification_submissions submission JOIN farms farm ON farm.id = submission.farm_id
    WHERE submission.id = ${body.id} LIMIT 1
  `;
  if (!submission) return NextResponse.json({ error: "Verification not found" }, { status: 404 });
  if (!REVIEWABLE.has(String(submission.status))) return NextResponse.json({ error: "This verification has already been decided" }, { status: 409 });

  const decision = String(body.decision);
  const note = body.note?.trim() || null;
  const queries = [
    sql`UPDATE farm_verification_submissions SET status = ${decision}, review_note = ${note},
      reviewed_by = ${user.id}, reviewed_at = CASE WHEN ${decision} = 'under_review' THEN reviewed_at ELSE now() END,
      updated_at = now() WHERE id = ${submission.id}`,
  ];
  if (decision === "approved") {
    queries.push(sql`UPDATE farms SET verification_status = 'verified', verified_at = coalesce(verified_at, now()), updated_at = now() WHERE id = ${submission.farm_id}`);
  }
  if (decision === "rejected") {
    queries.push(sql`UPDATE farms SET verification_status = 'rejected', verified_at = NULL, updated_at = now() WHERE id = ${submission.farm_id} AND NOT verification_exempt`);
  }
  if (decision !== "under_review") {
    queries.push(sql`INSERT INTO notifications (user_id, type, title, message, action_url, metadata) VALUES
      (${submission.submitted_by}, 'farm', ${decision === "approved" ? "Farm verified" : "Verification needs attention"},
      ${decision === "approved"
        ? `${String(submission.farm_name)} is verified. You can list produce and receive payouts.`
        : `Verification for ${String(submission.farm_name)} could not be approved: ${note}`},
      '/farmer', ${JSON.stringify({ submissionId: String(submission.id), farmId: String(submission.farm_id), decision })}::jsonb)`);
  }
  await sql.transaction(queries);
  await recordVerificationAudit(user.id, `farm_verification.${decision}`, String(submission.id), {
    farmId: String(submission.farm_id), decision, note,
  });

  return NextResponse.json({ id: String(submission.id), status: decision });
}
