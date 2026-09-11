ALTER TABLE payout_requests
  ADD COLUMN IF NOT EXISTS approval_mode text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS eligible_at timestamptz,
  ADD COLUMN IF NOT EXISTS transfer_reference text,
  ADD COLUMN IF NOT EXISTS transfer_code text,
  ADD COLUMN IF NOT EXISTS transfer_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS transfer_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failure_reason text;
-- statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payout_requests_approval_mode_check') THEN
    ALTER TABLE payout_requests ADD CONSTRAINT payout_requests_approval_mode_check CHECK (approval_mode IN ('manual', 'automatic'));
  END IF;
END $$;
-- statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS payout_requests_transfer_reference_unique
  ON payout_requests (transfer_reference) WHERE transfer_reference IS NOT NULL;
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS payout_requests_automation_idx
  ON payout_requests (status, approval_mode, eligible_at);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS payout_requests_transfer_progress_idx
  ON payout_requests (status, transfer_started_at) WHERE status = 'processing';
