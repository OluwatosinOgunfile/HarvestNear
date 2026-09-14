-- Sessions had one clock: a flat seven-day expiry for everyone, never extended. An active person was
-- signed out every seven days for no security gain, while a session abandoned on a shared computer
-- stayed valid for seven days of doing nothing. This adds the second clock, an inactivity window
-- carried on the session itself so a session issued under one policy keeps its own terms.
ALTER TABLE user_sessions
  ADD COLUMN IF NOT EXISTS idle_timeout_minutes integer;
-- statement-breakpoint
-- Existing sessions keep no inactivity limit and simply age out under the seven-day expiry they were
-- issued with, so nobody is signed out by this migration. Staff are the exception: an eight-hour cap
-- and a thirty-minute idle window apply to the sessions already open, because those accounts can
-- release payouts and read personal data, and a week-long staff session is the risk worth closing
-- today rather than next week.
UPDATE user_sessions session
SET idle_timeout_minutes = 30,
  expires_at = least(session.expires_at, now() + interval '8 hours')
FROM users
WHERE users.id = session.user_id
  AND users.role IN ('admin', 'support')
  AND session.idle_timeout_minutes IS NULL;
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS user_sessions_activity_idx
  ON user_sessions (token_hash, expires_at, last_seen_at);
