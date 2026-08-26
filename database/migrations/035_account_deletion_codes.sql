CREATE TABLE IF NOT EXISTS account_deletion_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS account_deletion_codes_user_active_idx
  ON account_deletion_codes (user_id, created_at DESC)
  WHERE used_at IS NULL;
