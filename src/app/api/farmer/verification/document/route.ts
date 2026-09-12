import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import {
  ALLOWED_DOCUMENT_TYPES,
  DOCUMENT_TYPES,
  MAX_DOCUMENT_BYTES,
  recordVerificationAudit,
} from "@/lib/farm-verification";
import { mobileCorsHeaders, mobileOptions } from "@/lib/mobile-cors";
import { canMutateAs, checkRateLimit, validImageFile } from "@/lib/security";

export const dynamic = "force-dynamic";
export const OPTIONS = mobileOptions;

async function validDocument(file: File) {
  if (file.type !== "application/pdf") return validImageFile(file);
  const bytes = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  return String.fromCharCode(...bytes) === "%PDF-";
}

export async function POST(request: Request) {
  const headers = mobileCorsHeaders(request);
  const user = await getSessionUser();
  if (!user || user.role !== "farmer" || !canMutateAs(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers });
  if (!await checkRateLimit(request, "farmer.verification.document", 30, 60 * 60, user.id)) {
    return NextResponse.json({ error: "Too many document uploads. Try again later." }, { status: 429, headers });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: "Document storage is not configured" }, { status: 503, headers });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const submissionId = String(form?.get("submissionId") || "");
  const documentType = String(form?.get("documentType") || "");
  if (!(file instanceof File) || !submissionId || !DOCUMENT_TYPES.includes(documentType as (typeof DOCUMENT_TYPES)[number])) {
    return NextResponse.json({ error: "Choose a document type and file" }, { status: 400, headers });
  }
  if (file.size > MAX_DOCUMENT_BYTES) return NextResponse.json({ error: "Each document must be 6 MB or smaller" }, { status: 400, headers });
  if (!ALLOWED_DOCUMENT_TYPES.has(file.type)) return NextResponse.json({ error: "Upload a JPG, PNG, WebP, or PDF document" }, { status: 400, headers });
  if (!await validDocument(file)) return NextResponse.json({ error: "That file is not a readable image or PDF" }, { status: 400, headers });

  const sql = getDatabase();
  const [submission] = await sql`
    SELECT submission.id, submission.status, farm.id AS farm_id
    FROM farm_verification_submissions submission JOIN farms farm ON farm.id = submission.farm_id
    WHERE submission.id = ${submissionId} AND farm.owner_id = ${user.id} LIMIT 1
  `;
  if (!submission) return NextResponse.json({ error: "Verification not found" }, { status: 404, headers });
  if (["approved", "rejected"].includes(String(submission.status))) {
    return NextResponse.json({ error: "This verification has already been decided" }, { status: 409, headers });
  }

  const extension = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1];
  // Identity documents are the most sensitive objects the platform holds, so they go to private
  // Blob storage under an unguessable path and are only ever served through the authorised route.
  const blob = await put(`farm-verification/${submission.farm_id}/${submissionId}/${documentType}-${randomUUID()}.${extension}`, file, {
    access: "private",
    addRandomSuffix: false,
  });

  const [previous] = await sql`SELECT blob_url FROM farm_verification_documents WHERE submission_id = ${submissionId} AND document_type = ${documentType}`;
  await sql`
    INSERT INTO farm_verification_documents (submission_id, document_type, blob_url, content_type, byte_size, uploaded_by)
    VALUES (${submissionId}, ${documentType}, ${blob.url}, ${file.type}, ${file.size}, ${user.id})
    ON CONFLICT (submission_id, document_type) DO UPDATE SET
      blob_url = excluded.blob_url, content_type = excluded.content_type,
      byte_size = excluded.byte_size, uploaded_by = excluded.uploaded_by, uploaded_at = now()
  `;
  if (previous?.blob_url && previous.blob_url !== blob.url) {
    await del(String(previous.blob_url)).catch((error) => console.error("Replaced verification document cleanup failed", error));
  }
  await recordVerificationAudit(user.id, "farm_verification.document_uploaded", submissionId, { documentType, byteSize: file.size, contentType: file.type });

  return NextResponse.json({ documentType, uploaded: true }, { status: 201, headers });
}
