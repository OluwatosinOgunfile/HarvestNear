-- A payout above the automatic limit used to end with an administrator setting the request to paid,
-- which wrote settlement rows without any money actually moving through Paystack. The administrator
-- now releases the request instead, and the same audited transfer path that handles small payouts
-- sends it. Recording who released it, and when, is what allows the transfer runner to move an
-- amount above the automatic limit at all.
ALTER TABLE payout_requests
  ADD COLUMN IF NOT EXISTS admin_released_by uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS admin_released_at timestamptz;
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS payout_requests_release_idx
  ON payout_requests (status, admin_released_at) WHERE admin_released_at IS NOT NULL;
