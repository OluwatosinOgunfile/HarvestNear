CREATE TABLE IF NOT EXISTS notification_email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL UNIQUE REFERENCES notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS notification_email_outbox_pending_idx
  ON notification_email_outbox (next_attempt_at, created_at)
  WHERE sent_at IS NULL;
-- statement-breakpoint
CREATE OR REPLACE FUNCTION queue_notification_email() RETURNS trigger AS $$
BEGIN
  INSERT INTO notification_email_outbox (notification_id, user_id)
  VALUES (NEW.id, NEW.user_id)
  ON CONFLICT (notification_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- statement-breakpoint
DROP TRIGGER IF EXISTS notifications_queue_email ON notifications;
-- statement-breakpoint
CREATE TRIGGER notifications_queue_email
AFTER INSERT ON notifications
FOR EACH ROW EXECUTE FUNCTION queue_notification_email();
