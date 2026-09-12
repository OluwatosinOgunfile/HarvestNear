import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { recordVerificationAudit } from "@/lib/farm-verification";

export const dynamic = "force-dynamic";

/**
 * Identity documents are readable only by a reviewer or by the farmer who uploaded them, and every
 * read is written to the audit log. Impersonating administrators are refused outright: reading
 * somebody's identity document while wearing their account is exactly what the audit trail exists
 * to prevent.
 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sql = getDatabase();
  const [document] = await sql`
    SELECT document.blob_url, document.content_type, document.document_type, document.submission_id,
      farm.owner_id, farm.id AS farm_id
    FROM farm_verification_documents document
    JOIN farm_verification_submissions submission ON submission.id = document.submission_id
    JOIN farms farm ON farm.id = submission.farm_id
    WHERE document.id = ${id} LIMIT 1
  `;
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const reviewer = ["admin", "support"].includes(user.role) && !user.impersonating;
  const owner = String(document.owner_id) === user.id;
  if (!reviewer && !owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: "Document storage is not configured" }, { status: 503 });

  try {
    const result = await get(String(document.blob_url), { access: "private" });
    if (!result || result.statusCode !== 200) return NextResponse.json({ error: "Document not found" }, { status: 404 });
    if (reviewer) {
      await recordVerificationAudit(user.id, "farm_verification.document_viewed", String(document.submission_id), {
        documentId: id, documentType: String(document.document_type), farmId: String(document.farm_id),
      });
    }
    return new Response(result.stream, {
      headers: {
        "Content-Type": String(document.content_type),
        "Cache-Control": "private, no-store",
        "Content-Disposition": `inline; filename="${String(document.document_type)}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Could not read verification document", error);
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
}
