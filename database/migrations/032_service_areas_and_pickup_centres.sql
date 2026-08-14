CREATE TABLE IF NOT EXISTS service_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, city, state)
);
-- statement-breakpoint
INSERT INTO service_areas (name, city, state, latitude, longitude) VALUES
  ('Gudu', 'Abuja', 'FCT', 9.0019, 7.4534),
  ('Wuse 2', 'Abuja', 'FCT', 9.0765, 7.4651),
  ('Maitama', 'Abuja', 'FCT', 9.0962, 7.4923),
  ('Gwarinpa', 'Abuja', 'FCT', 9.1099, 7.4042),
  ('Lugbe', 'Abuja', 'FCT', 8.9672, 7.3679),
  ('Kuje', 'Abuja', 'FCT', 8.8795, 7.2276)
ON CONFLICT (name, city, state) DO NOTHING;
-- statement-breakpoint
ALTER TABLE collection_hubs ADD COLUMN IF NOT EXISTS area_id uuid REFERENCES service_areas(id) ON DELETE RESTRICT;
-- statement-breakpoint
UPDATE collection_hubs hub
SET area_id = area.id
FROM service_areas area
WHERE hub.area_id IS NULL
  AND (hub.address_text ILIKE '%' || area.name || '%' OR hub.name ILIKE '%' || area.name || '%');
-- statement-breakpoint
UPDATE collection_hubs
SET area_id = (SELECT id FROM service_areas WHERE is_active ORDER BY name LIMIT 1)
WHERE area_id IS NULL;
-- statement-breakpoint
ALTER TABLE collection_hubs ALTER COLUMN area_id SET NOT NULL;
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS collection_hubs_area_idx ON collection_hubs(area_id, is_active);
