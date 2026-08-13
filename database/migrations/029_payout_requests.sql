CREATE TABLE IF NOT EXISTS payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE RESTRICT,
  requested_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  gross_amount_kobo bigint NOT NULL CHECK (gross_amount_kobo > 0),
  platform_fee_kobo bigint NOT NULL CHECK (platform_fee_kobo >= 0),
  net_amount_kobo bigint NOT NULL CHECK (net_amount_kobo > 0),
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','processing','paid','rejected','cancelled')),
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  review_note text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  paid_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS payout_request_orders (
  payout_request_id uuid NOT NULL REFERENCES payout_requests(id) ON DELETE CASCADE,
  farm_order_id uuid NOT NULL UNIQUE REFERENCES farm_orders(id) ON DELETE RESTRICT,
  PRIMARY KEY (payout_request_id, farm_order_id)
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS payout_requests_farm_status_idx ON payout_requests(farm_id, status, requested_at DESC);
