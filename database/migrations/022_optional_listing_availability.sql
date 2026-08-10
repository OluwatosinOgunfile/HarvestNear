DO $$
BEGIN
  ALTER TABLE produce_listings
    ALTER COLUMN available_from DROP NOT NULL,
    ALTER COLUMN available_until DROP NOT NULL;

  -- Existing windows were prepopulated seed values rather than farmer choices.
  UPDATE produce_listings SET available_from = NULL, available_until = NULL;
END
$$;
