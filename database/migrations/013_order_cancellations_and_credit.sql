ALTER TABLE refunds ADD COLUMN IF NOT EXISTS resolution_method text NOT NULL DEFAULT 'bank_refund'
  CHECK (resolution_method IN ('bank_refund', 'store_credit'));
-- statement-breakpoint
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS cancellation_fee_kobo bigint NOT NULL DEFAULT 0 CHECK (cancellation_fee_kobo >= 0);
-- statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS refunds_one_pre_review_cancellation_per_order
  ON refunds(order_id) WHERE reason = 'Customer cancelled before manual payment review';
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS store_credit_accounts (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance_kobo bigint NOT NULL DEFAULT 0 CHECK (balance_kobo >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS store_credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_kobo bigint NOT NULL CHECK (amount_kobo <> 0),
  transaction_type text NOT NULL CHECK (transaction_type IN ('refund_credit', 'order_debit', 'adjustment')),
  reference_type text NOT NULL,
  reference_id uuid NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, transaction_type, reference_type, reference_id)
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS store_credit_transactions_user_idx ON store_credit_transactions(user_id, created_at DESC);
