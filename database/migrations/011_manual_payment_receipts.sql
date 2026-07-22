CREATE TABLE IF NOT EXISTS manual_payment_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  blob_url text NOT NULL,
  original_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 5242880),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS manual_payment_receipts_submitted_at_idx ON manual_payment_receipts(submitted_at DESC);
