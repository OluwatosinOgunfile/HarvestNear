ALTER TABLE user_sessions
ADD COLUMN IF NOT EXISTS impersonator_user_id uuid REFERENCES users(id) ON DELETE CASCADE;
-- statement-breakpoint
ALTER TABLE user_sessions
ADD COLUMN IF NOT EXISTS impersonation_started_at timestamptz;
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS user_sessions_impersonator_idx ON user_sessions(impersonator_user_id) WHERE impersonator_user_id IS NOT NULL;
