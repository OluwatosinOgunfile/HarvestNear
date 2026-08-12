CREATE TABLE IF NOT EXISTS mobile_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expo_push_token text NOT NULL UNIQUE,
  platform text NOT NULL CHECK (platform IN ('android', 'ios')),
  device_name text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS mobile_push_tokens_user_idx ON mobile_push_tokens(user_id, last_seen_at DESC);
-- statement-breakpoint
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS push_sent_at timestamptz;
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS notifications_push_pending_idx ON notifications(created_at) WHERE read_at IS NULL AND push_sent_at IS NULL;
