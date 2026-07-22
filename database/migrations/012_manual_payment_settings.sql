CREATE TABLE IF NOT EXISTS manual_payment_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  bank_name text NOT NULL DEFAULT '',
  account_name text NOT NULL DEFAULT '',
  account_number text NOT NULL DEFAULT '',
  instructions text,
  is_enabled boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- statement-breakpoint
INSERT INTO manual_payment_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
