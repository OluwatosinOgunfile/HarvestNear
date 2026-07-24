ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS status order_status,
  ADD COLUMN IF NOT EXISTS preparing_at timestamptz,
  ADD COLUMN IF NOT EXISTS ready_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispatched_at timestamptz,
  ADD COLUMN IF NOT EXISTS received_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
-- statement-breakpoint
UPDATE order_items item
SET status = farm_order.status,
    preparing_at = CASE WHEN farm_order.status IN ('preparing','ready','dispatched','delivered','collected') THEN coalesce(item.preparing_at, farm_order.updated_at) ELSE item.preparing_at END,
    ready_at = CASE WHEN farm_order.status IN ('ready','dispatched','delivered','collected') THEN coalesce(item.ready_at, farm_order.ready_at, farm_order.updated_at) ELSE item.ready_at END,
    dispatched_at = CASE WHEN farm_order.status IN ('dispatched','delivered') THEN coalesce(item.dispatched_at, farm_order.updated_at) ELSE item.dispatched_at END,
    received_at = CASE WHEN farm_order.status IN ('delivered','collected') THEN coalesce(item.received_at, farm_order.updated_at) ELSE item.received_at END,
    updated_at = farm_order.updated_at
FROM farm_orders farm_order
WHERE farm_order.id = item.farm_order_id
  AND item.status IS NULL;
-- statement-breakpoint
ALTER TABLE order_items
  ALTER COLUMN status SET DEFAULT 'pending_payment',
  ALTER COLUMN status SET NOT NULL;
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS order_items_farm_order_status_idx ON order_items(farm_order_id, status);
