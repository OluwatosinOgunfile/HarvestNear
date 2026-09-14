import "server-only";

import { del } from "@vercel/blob";

import { getDatabase } from "@/lib/db";
import { RETENTION } from "@/lib/legal";

/**
 * Deletes personal data once the reason for holding it has passed. Verification evidence is
 * destroyed after the review it existed for, leaving the decision and its audit trail intact, and
 * traffic rows are dropped once they are older than the reporting window. Keeping either
 * indefinitely would be holding personal data with no purpose left to justify it.
 */
export async function runRetention() {
  const sql = getDatabase();
  const summary = { documentsDeleted: 0, documentsFailed: 0, analyticsRowsDeleted: 0 };

  // Decided submissions get a destruction date, counted from the decision.
  await sql`
    UPDATE farm_verification_submissions
    SET documents_purge_after = coalesce(reviewed_at, updated_at) + (${RETENTION.verificationDocumentDays} * interval '1 day')
    WHERE status IN ('approved', 'rejected') AND documents_purge_after IS NULL
  `;

  const expired = await sql`
    SELECT document.id, document.blob_url
    FROM farm_verification_documents document
    JOIN farm_verification_submissions submission ON submission.id = document.submission_id
    WHERE document.purged_at IS NULL
      AND submission.documents_purge_after IS NOT NULL
      AND submission.documents_purge_after <= now()
    LIMIT 200
  `;

  for (const row of expired) {
    try {
      if (process.env.BLOB_READ_WRITE_TOKEN) await del(String(row.blob_url));
      // The row is kept, emptied, so the audit trail still shows what was supplied and when it went.
      await sql`UPDATE farm_verification_documents SET blob_url = '', purged_at = now() WHERE id = ${row.id}`;
      summary.documentsDeleted += 1;
    } catch (error) {
      summary.documentsFailed += 1;
      console.error("Could not delete expired verification document", error);
    }
  }

  const [analytics] = await sql`
    WITH removed AS (
      DELETE FROM web_page_views WHERE created_at < now() - (${RETENTION.analyticsDays} * interval '1 day') RETURNING 1
    ) SELECT count(*)::int AS removed FROM removed
  `;
  summary.analyticsRowsDeleted = Number(analytics?.removed || 0);

  return summary;
}
