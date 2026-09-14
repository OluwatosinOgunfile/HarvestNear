CREATE TABLE IF NOT EXISTS user_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document text NOT NULL CHECK (document IN ('terms', 'privacy')),
  version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  address_hash text,
  user_agent text,
  UNIQUE (user_id, document, version)
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS user_agreements_user_idx ON user_agreements (user_id, accepted_at DESC);
-- statement-breakpoint
-- Verification evidence is reviewed once and then only has to be provable, not readable, so each
-- submission carries the date its documents may be destroyed.
ALTER TABLE farm_verification_submissions ADD COLUMN IF NOT EXISTS documents_purge_after timestamptz;
-- statement-breakpoint
ALTER TABLE farm_verification_documents ADD COLUMN IF NOT EXISTS purged_at timestamptz;
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS farm_verification_purge_idx ON farm_verification_submissions (documents_purge_after)
  WHERE documents_purge_after IS NOT NULL;
