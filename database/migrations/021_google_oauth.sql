CREATE TABLE IF NOT EXISTS oauth_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_account_id text NOT NULL,
  provider_email text,
  picture_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT oauth_accounts_provider_not_blank CHECK (length(trim(provider)) > 0),
  CONSTRAINT oauth_accounts_provider_id_not_blank CHECK (length(trim(provider_account_id)) > 0),
  UNIQUE (provider, provider_account_id),
  UNIQUE (user_id, provider)
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS oauth_accounts_user_id_idx ON oauth_accounts(user_id);
