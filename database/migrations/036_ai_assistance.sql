ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS ai_summary_updated_at timestamptz;

-- statement-breakpoint

CREATE TABLE IF NOT EXISTS ai_response_cache (
  cache_key varchar(64) PRIMARY KEY,
  feature varchar(40) NOT NULL,
  response jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- statement-breakpoint

CREATE INDEX IF NOT EXISTS ai_response_cache_expiry_idx ON ai_response_cache(expires_at);
