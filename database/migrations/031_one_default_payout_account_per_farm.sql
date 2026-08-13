DO $$
BEGIN
  WITH ranked_accounts AS (
    SELECT id, row_number() OVER (PARTITION BY farm_id ORDER BY updated_at DESC, created_at DESC, id DESC) AS position
    FROM farmer_payout_accounts
    WHERE is_default
  )
  UPDATE farmer_payout_accounts account
  SET is_default = false, updated_at = now()
  FROM ranked_accounts ranked
  WHERE account.id = ranked.id AND ranked.position > 1;

  CREATE UNIQUE INDEX IF NOT EXISTS farmer_payout_accounts_one_default_per_farm
    ON farmer_payout_accounts (farm_id)
    WHERE is_default;
END $$;
