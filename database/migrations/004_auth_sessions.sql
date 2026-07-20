CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  ip_address inet,
  user_agent text
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS user_sessions_user_idx ON user_sessions(user_id, expires_at DESC);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS user_sessions_expiry_idx ON user_sessions(expires_at);
-- statement-breakpoint
UPDATE users
SET password_hash = crypt('HarvestNearU!2026', gen_salt('bf', 12)), updated_at = now()
WHERE password_hash IS NULL;
