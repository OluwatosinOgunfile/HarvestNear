ALTER TABLE produce_listings
  ADD COLUMN IF NOT EXISTS last_restock_total numeric(12,3),
  ADD COLUMN IF NOT EXISTS last_restocked_at timestamptz;

-- statement-breakpoint
UPDATE produce_listings
SET
  last_restock_total = greatest(quantity_available + quantity_sold, quantity_available, 1),
  last_restocked_at = coalesce(updated_at, created_at, now())
WHERE last_restock_total IS NULL OR last_restocked_at IS NULL;

-- statement-breakpoint
ALTER TABLE produce_listings
  ALTER COLUMN last_restock_total SET NOT NULL,
  ALTER COLUMN last_restock_total SET DEFAULT 1,
  ALTER COLUMN last_restocked_at SET NOT NULL,
  ALTER COLUMN last_restocked_at SET DEFAULT now();

-- statement-breakpoint
ALTER TABLE produce_listings
  DROP CONSTRAINT IF EXISTS listing_last_restock_total_positive;

-- statement-breakpoint
ALTER TABLE produce_listings
  ADD CONSTRAINT listing_last_restock_total_positive CHECK (last_restock_total > 0);
