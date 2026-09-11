CREATE TABLE IF NOT EXISTS restock_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES produce_listings(id) ON DELETE CASCADE,
  notify_email boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz,
  UNIQUE (user_id, listing_id)
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS restock_alerts_pending_idx ON restock_alerts (listing_id) WHERE notified_at IS NULL;
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS restock_alerts_user_idx ON restock_alerts (user_id, created_at DESC);
