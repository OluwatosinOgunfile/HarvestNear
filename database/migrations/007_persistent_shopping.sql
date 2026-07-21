CREATE TABLE IF NOT EXISTS cart_items (
  cart_id uuid NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES produce_listings(id) ON DELETE CASCADE,
  quantity numeric(12,3) NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cart_id, listing_id)
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS cart_items_listing_idx ON cart_items(listing_id);
