CREATE TABLE IF NOT EXISTS campaign_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  email text NOT NULL,
  source text NOT NULL DEFAULT 'website_footer',
  is_active boolean NOT NULL DEFAULT true,
  consented_at timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS campaign_subscribers_email_unique ON campaign_subscribers (lower(email));
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS campaign_subscribers_active_idx ON campaign_subscribers (is_active, consented_at DESC);
