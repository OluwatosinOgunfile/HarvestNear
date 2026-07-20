INSERT INTO farms (
  owner_id, name, slug, description, phone, email, address_text, city, state,
  latitude, longitude, verification_status, offers_pickup
)
SELECT
  users.id,
  users.first_name || ' ' || users.last_name || ' Farm',
  lower(regexp_replace(users.first_name || '-' || users.last_name || '-farm-' || left(users.id::text, 8), '[^a-zA-Z0-9]+', '-', 'g')),
  'Farm profile created automatically. Complete the farm information before requesting verification.',
  coalesce(users.phone, 'Not provided'),
  users.email,
  'Location not provided',
  'Abuja',
  'FCT',
  9.0765,
  7.3986,
  'pending',
  true
FROM users
WHERE users.role = 'farmer'
  AND NOT EXISTS (SELECT 1 FROM farms WHERE farms.owner_id = users.id);
