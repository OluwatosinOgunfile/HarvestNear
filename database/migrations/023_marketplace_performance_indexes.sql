DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS listings_active_stock_idx
    ON produce_listings (farm_id, created_at DESC)
    WHERE status = 'active' AND quantity_available > quantity_reserved;

  CREATE INDEX IF NOT EXISTS reviews_visible_farm_idx
    ON reviews (farm_id, created_at DESC)
    WHERE is_visible;

  CREATE INDEX IF NOT EXISTS addresses_default_user_idx
    ON addresses (user_id, is_default DESC, updated_at DESC);
END
$$;
