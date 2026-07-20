CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS schema_migrations (
  name text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
-- statement-breakpoint
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('consumer', 'farmer', 'admin', 'support'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- statement-breakpoint
DO $$ BEGIN CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected', 'suspended'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- statement-breakpoint
DO $$ BEGIN CREATE TYPE listing_status AS ENUM ('draft', 'active', 'sold_out', 'expired', 'paused'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- statement-breakpoint
DO $$ BEGIN CREATE TYPE reservation_status AS ENUM ('active', 'converted', 'released', 'expired'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- statement-breakpoint
DO $$ BEGIN CREATE TYPE order_status AS ENUM ('pending_payment', 'paid', 'confirmed', 'preparing', 'ready', 'dispatched', 'delivered', 'collected', 'cancelled', 'refunded'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- statement-breakpoint
DO $$ BEGIN CREATE TYPE payment_status AS ENUM ('initialized', 'pending', 'successful', 'failed', 'abandoned', 'refunded', 'partially_refunded'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- statement-breakpoint
DO $$ BEGIN CREATE TYPE fulfilment_method AS ENUM ('doorstep', 'farmer_delivery', 'collection_hub', 'farm_pickup'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- statement-breakpoint
DO $$ BEGIN CREATE TYPE delivery_status AS ENUM ('scheduled', 'assigned', 'picked_up', 'in_transit', 'delivered', 'failed', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- statement-breakpoint
DO $$ BEGIN CREATE TYPE refund_status AS ENUM ('requested', 'under_review', 'approved', 'rejected', 'processing', 'completed', 'failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- statement-breakpoint
DO $$ BEGIN CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'sms', 'whatsapp', 'push'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  phone text,
  password_hash text,
  first_name text NOT NULL,
  last_name text NOT NULL,
  avatar_url text,
  role user_role NOT NULL DEFAULT 'consumer',
  email_verified_at timestamptz,
  phone_verified_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_not_blank CHECK (length(trim(email)) > 3)
);
-- statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (lower(email));
-- statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique ON users (phone) WHERE phone IS NOT NULL;
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS consumer_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferred_radius_km numeric(6,2) NOT NULL DEFAULT 20 CHECK (preferred_radius_km > 0),
  dietary_preferences text[] NOT NULL DEFAULT '{}',
  marketing_consent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Home',
  recipient_name text NOT NULL,
  recipient_phone text NOT NULL,
  line1 text NOT NULL,
  line2 text,
  city text NOT NULL,
  state text NOT NULL,
  postal_code text,
  landmark text,
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS addresses_user_id_idx ON addresses(user_id);
-- statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS addresses_one_default_per_user ON addresses(user_id) WHERE is_default;
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS farms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  phone text NOT NULL,
  email text,
  address_text text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  logo_url text,
  cover_image_url text,
  verification_status verification_status NOT NULL DEFAULT 'pending',
  verified_at timestamptz,
  delivery_radius_km numeric(6,2) NOT NULL DEFAULT 20 CHECK (delivery_radius_km >= 0),
  offers_pickup boolean NOT NULL DEFAULT true,
  offers_delivery boolean NOT NULL DEFAULT false,
  average_rating numeric(3,2) NOT NULL DEFAULT 0 CHECK (average_rating BETWEEN 0 AND 5),
  review_count integer NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS farms_owner_id_idx ON farms(owner_id);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS farms_location_idx ON farms(latitude, longitude);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS farmer_payout_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'paystack',
  bank_code text NOT NULL,
  account_last4 text NOT NULL,
  account_name text NOT NULL,
  recipient_code text NOT NULL,
  is_default boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, recipient_code)
);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS produce_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES produce_categories(id) ON DELETE RESTRICT,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  default_unit text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS products_category_id_idx ON products(category_id);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS produce_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text,
  unit text NOT NULL,
  unit_price_kobo bigint NOT NULL CHECK (unit_price_kobo > 0),
  minimum_quantity numeric(12,3) NOT NULL DEFAULT 1 CHECK (minimum_quantity > 0),
  quantity_available numeric(12,3) NOT NULL CHECK (quantity_available >= 0),
  quantity_reserved numeric(12,3) NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
  quantity_sold numeric(12,3) NOT NULL DEFAULT 0 CHECK (quantity_sold >= 0),
  harvest_date date NOT NULL,
  available_from timestamptz NOT NULL,
  available_until timestamptz NOT NULL,
  status listing_status NOT NULL DEFAULT 'draft',
  is_organic boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listing_availability_window CHECK (available_until > available_from),
  CONSTRAINT listing_reserved_within_stock CHECK (quantity_reserved <= quantity_available)
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS listings_marketplace_idx ON produce_listings(status, available_from, available_until);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS listings_farm_id_idx ON produce_listings(farm_id);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS listings_product_id_idx ON produce_listings(product_id);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS listing_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES produce_listings(id) ON DELETE CASCADE,
  url text NOT NULL,
  alt_text text NOT NULL,
  sort_order smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS listing_images_listing_idx ON listing_images(listing_id, sort_order);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS collection_hubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address_text text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  opening_hours jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  state text NOT NULL,
  areas text[] NOT NULL DEFAULT '{}',
  fee_kobo bigint NOT NULL DEFAULT 0 CHECK (fee_kobo >= 0),
  free_delivery_threshold_kobo bigint CHECK (free_delivery_threshold_kobo >= 0),
  estimated_min_hours integer NOT NULL CHECK (estimated_min_hours > 0),
  estimated_max_hours integer NOT NULL CHECK (estimated_max_hours >= estimated_min_hours),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  session_id text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cart_has_owner CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);
-- statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS carts_active_user_unique ON carts(user_id) WHERE user_id IS NOT NULL;
-- statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS carts_session_unique ON carts(session_id) WHERE session_id IS NOT NULL;
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS inventory_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES produce_listings(id) ON DELETE CASCADE,
  quantity numeric(12,3) NOT NULL CHECK (quantity > 0),
  unit_price_kobo bigint NOT NULL CHECK (unit_price_kobo > 0),
  status reservation_status NOT NULL DEFAULT 'active',
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cart_id, listing_id)
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS reservations_expiry_idx ON inventory_reservations(status, expires_at);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status order_status NOT NULL DEFAULT 'pending_payment',
  currency char(3) NOT NULL DEFAULT 'NGN',
  subtotal_kobo bigint NOT NULL CHECK (subtotal_kobo >= 0),
  delivery_fee_kobo bigint NOT NULL DEFAULT 0 CHECK (delivery_fee_kobo >= 0),
  service_fee_kobo bigint NOT NULL DEFAULT 0 CHECK (service_fee_kobo >= 0),
  discount_kobo bigint NOT NULL DEFAULT 0 CHECK (discount_kobo >= 0),
  total_kobo bigint NOT NULL CHECK (total_kobo >= 0),
  fulfilment_method fulfilment_method NOT NULL,
  delivery_address_snapshot jsonb,
  collection_hub_id uuid REFERENCES collection_hubs(id) ON DELETE SET NULL,
  customer_note text,
  placed_at timestamptz,
  paid_at timestamptz,
  cancelled_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS orders_customer_created_idx ON orders(customer_id, created_at DESC);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status, created_at DESC);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS farm_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE RESTRICT,
  status order_status NOT NULL DEFAULT 'pending_payment',
  subtotal_kobo bigint NOT NULL CHECK (subtotal_kobo >= 0),
  platform_fee_kobo bigint NOT NULL DEFAULT 0 CHECK (platform_fee_kobo >= 0),
  farmer_net_kobo bigint NOT NULL CHECK (farmer_net_kobo >= 0),
  confirmed_at timestamptz,
  ready_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id, farm_id)
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS farm_orders_farm_status_idx ON farm_orders(farm_id, status, created_at DESC);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  farm_order_id uuid NOT NULL REFERENCES farm_orders(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES produce_listings(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  farm_name text NOT NULL,
  unit text NOT NULL,
  quantity numeric(12,3) NOT NULL CHECK (quantity > 0),
  unit_price_kobo bigint NOT NULL CHECK (unit_price_kobo > 0),
  line_total_kobo bigint NOT NULL CHECK (line_total_kobo >= 0),
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  provider text NOT NULL DEFAULT 'paystack',
  provider_reference text NOT NULL,
  authorization_url text,
  status payment_status NOT NULL DEFAULT 'initialized',
  amount_kobo bigint NOT NULL CHECK (amount_kobo > 0),
  currency char(3) NOT NULL DEFAULT 'NGN',
  payment_channel text,
  provider_fee_kobo bigint CHECK (provider_fee_kobo >= 0),
  paid_at timestamptz,
  provider_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_reference)
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS payments_order_id_idx ON payments(order_id);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_key text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz,
  processing_error text,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, event_key)
);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
  delivery_zone_id uuid REFERENCES delivery_zones(id) ON DELETE SET NULL,
  status delivery_status NOT NULL DEFAULT 'scheduled',
  courier_name text,
  courier_phone text,
  tracking_code text UNIQUE,
  scheduled_date date,
  window_start time,
  window_end time,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  proof_url text,
  recipient_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS delivery_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  status delivery_status NOT NULL,
  message text,
  latitude double precision CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision CHECK (longitude BETWEEN -180 AND 180),
  occurred_at timestamptz NOT NULL DEFAULT now()
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS delivery_events_delivery_idx ON delivery_events(delivery_id, occurred_at DESC);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_order_id uuid NOT NULL UNIQUE REFERENCES farm_orders(id) ON DELETE RESTRICT,
  payout_account_id uuid NOT NULL REFERENCES farmer_payout_accounts(id) ON DELETE RESTRICT,
  provider_reference text UNIQUE,
  amount_kobo bigint NOT NULL CHECK (amount_kobo > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'successful', 'failed', 'reversed')),
  paid_at timestamptz,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  payment_id uuid REFERENCES payments(id) ON DELETE RESTRICT,
  requested_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status refund_status NOT NULL DEFAULT 'requested',
  reason text NOT NULL,
  evidence_urls text[] NOT NULL DEFAULT '{}',
  amount_kobo bigint NOT NULL CHECK (amount_kobo > 0),
  provider_reference text,
  resolution_note text,
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS refunds_order_id_idx ON refunds(order_id);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  is_visible boolean NOT NULL DEFAULT true,
  farmer_reply text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id, farm_id)
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS reviews_farm_id_idx ON reviews(farm_id, created_at DESC);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS favourites (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES produce_listings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, listing_id)
);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  action_url text,
  metadata jsonb NOT NULL DEFAULT '{}',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  channel notification_channel NOT NULL,
  provider_message_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  sent_at timestamptz,
  delivered_at timestamptz,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS audit_logs (
  id bigserial PRIMARY KEY,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  before_data jsonb,
  after_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs(entity_type, entity_id, created_at DESC);
-- statement-breakpoint
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
-- statement-breakpoint
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'users', 'consumer_profiles', 'addresses', 'farms', 'farmer_payout_accounts',
    'products', 'produce_listings', 'collection_hubs', 'delivery_zones', 'carts',
    'inventory_reservations', 'orders', 'farm_orders', 'payments', 'deliveries',
    'payouts', 'refunds', 'reviews'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at_trigger ON %I', table_name);
    EXECUTE format('CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', table_name);
  END LOOP;
END $$;
-- statement-breakpoint
CREATE OR REPLACE FUNCTION distance_km(lat1 double precision, lon1 double precision, lat2 double precision, lon2 double precision)
RETURNS double precision LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT 6371 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lon2 - lon1) / 2), 2)
  ));
$$;
-- statement-breakpoint
INSERT INTO produce_categories (name, slug, description) VALUES
  ('Vegetables', 'vegetables', 'Fresh leafy greens and field vegetables'),
  ('Fruits', 'fruits', 'Fresh seasonal fruit'),
  ('Tubers', 'tubers', 'Yam, cassava and other root crops'),
  ('Grains', 'grains', 'Locally grown grains and pulses'),
  ('Eggs', 'eggs', 'Farm-fresh eggs')
ON CONFLICT (slug) DO NOTHING;
