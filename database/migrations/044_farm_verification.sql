CREATE TABLE IF NOT EXISTS farm_verification_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected')),
  legal_first_name text,
  legal_last_name text,
  date_of_birth date,
  identity_type text CHECK (identity_type IN ('nin', 'voters_card', 'drivers_licence', 'passport')),
  identity_number_hash text,
  identity_number_last4 text,
  identity_expires_on date,
  business_type text NOT NULL DEFAULT 'individual' CHECK (business_type IN ('individual', 'business_name', 'limited_company', 'cooperative')),
  cac_number text,
  bank_account_name text,
  bank_matched boolean,
  bank_match_note text,
  provider text,
  provider_reference text,
  provider_result jsonb,
  review_note text,
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS farm_verification_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES farm_verification_submissions(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('identity_front', 'identity_back', 'selfie', 'cac_certificate', 'address_proof')),
  blob_url text NOT NULL,
  content_type text NOT NULL,
  byte_size integer NOT NULL CHECK (byte_size > 0),
  uploaded_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, document_type)
);
-- statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS farm_verification_open_submission_idx
  ON farm_verification_submissions (farm_id) WHERE status IN ('draft', 'submitted', 'under_review');
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS farm_verification_queue_idx
  ON farm_verification_submissions (status, submitted_at);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS farm_verification_identity_idx
  ON farm_verification_submissions (identity_number_hash) WHERE identity_number_hash IS NOT NULL;
-- statement-breakpoint
ALTER TABLE farms ADD COLUMN IF NOT EXISTS verification_exempt boolean NOT NULL DEFAULT false;
-- statement-breakpoint
-- Farms already trading keep their standing; only farms onboarded from here are held to the
-- documented check. Recording the exemption explicitly keeps the audit trail honest about which
-- badges rest on evidence and which predate it.
UPDATE farms SET verification_exempt = true WHERE verification_status = 'verified' AND NOT verification_exempt;
