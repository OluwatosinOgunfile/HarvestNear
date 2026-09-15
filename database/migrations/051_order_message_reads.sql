-- Nothing recorded whether a conversation had been read, so neither side could be told a reply was
-- waiting without opening the thread. One row per participant per thread, holding the moment they
-- last saw it, is enough: unread is then any message in the thread from somebody else after that
-- moment, which needs no per-message state and no backfill.
--
-- Threads nobody has opened have no row at all. That reads as "everything is unread", which is the
-- right answer for a conversation you have never looked at.
CREATE TABLE IF NOT EXISTS order_farm_message_reads (
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (order_id, farm_id, user_id)
);
-- statement-breakpoint
-- The unread count is always asked per viewer, across the threads of the orders on their screen.
CREATE INDEX IF NOT EXISTS order_farm_message_reads_user_idx
  ON order_farm_message_reads (user_id, order_id, farm_id);
