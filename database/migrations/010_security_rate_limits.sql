CREATE TABLE IF NOT EXISTS security_rate_limits (
  bucket_key text NOT NULL,
  action text NOT NULL,
  attempts integer NOT NULL DEFAULT 1 CHECK (attempts > 0),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bucket_key, action)
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS security_rate_limits_updated_at_idx ON security_rate_limits(updated_at);

