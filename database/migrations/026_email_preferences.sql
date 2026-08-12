CREATE TABLE IF NOT EXISTS user_email_preferences (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  delivery_updates boolean NOT NULL DEFAULT true,
  support_updates boolean NOT NULL DEFAULT true,
  farm_updates boolean NOT NULL DEFAULT true,
  rating_updates boolean NOT NULL DEFAULT true,
  nearby_produce boolean NOT NULL DEFAULT false,
  offers_and_promotions boolean NOT NULL DEFAULT false,
  weekly_digest boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- statement-breakpoint
INSERT INTO user_email_preferences (user_id)
SELECT id FROM users ON CONFLICT (user_id) DO NOTHING;
