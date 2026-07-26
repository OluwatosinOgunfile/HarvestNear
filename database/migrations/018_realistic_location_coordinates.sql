-- Assign plausible coordinates near each stored Abuja-area address while keeping
-- individual records from appearing at the exact same point.
WITH anchors AS (
  SELECT address.id,
    CASE
      WHEN lower(address.city) LIKE '%wuse%' THEN 9.0765
      WHEN lower(address.city) LIKE '%gudu%' THEN 9.0019
      WHEN lower(address.city) LIKE '%jabi%' THEN 9.0649
      WHEN lower(address.city) LIKE '%asokoro%' THEN 9.0403
      WHEN lower(address.city) LIKE '%gwarinpa%' THEN 9.1099
      WHEN lower(address.city) LIKE '%maitama%' THEN 9.0940
      WHEN lower(address.city) LIKE '%lugbe%' THEN 8.9985
      WHEN lower(address.city) LIKE '%kubwa%' THEN 9.1538
      WHEN lower(address.city) LIKE '%kuje%' THEN 8.8795
      WHEN lower(address.city) LIKE '%gwagwalada%' THEN 8.9508
      WHEN lower(address.city) LIKE '%karu%' OR lower(address.city) LIKE '%mararaba%' THEN 9.0327
      ELSE 9.0579
    END AS anchor_latitude,
    CASE
      WHEN lower(address.city) LIKE '%wuse%' THEN 7.4703
      WHEN lower(address.city) LIKE '%gudu%' THEN 7.4534
      WHEN lower(address.city) LIKE '%jabi%' THEN 7.4233
      WHEN lower(address.city) LIKE '%asokoro%' THEN 7.5273
      WHEN lower(address.city) LIKE '%gwarinpa%' THEN 7.4042
      WHEN lower(address.city) LIKE '%maitama%' THEN 7.4951
      WHEN lower(address.city) LIKE '%lugbe%' THEN 7.3771
      WHEN lower(address.city) LIKE '%kubwa%' THEN 7.3220
      WHEN lower(address.city) LIKE '%kuje%' THEN 7.2276
      WHEN lower(address.city) LIKE '%gwagwalada%' THEN 7.0767
      WHEN lower(address.city) LIKE '%karu%' OR lower(address.city) LIKE '%mararaba%' THEN 7.5860
      ELSE 7.4951
    END AS anchor_longitude
  FROM addresses address
)
UPDATE addresses address
SET latitude = anchors.anchor_latitude + (((abs(hashtext(address.id::text))::bigint % 81) - 40)::double precision / 10000),
    longitude = anchors.anchor_longitude + (((abs(hashtext(reverse(address.id::text)))::bigint % 81) - 40)::double precision / 10000),
    updated_at = now()
FROM anchors
WHERE anchors.id = address.id;
-- statement-breakpoint
-- Every account gets a personal Home location. The neighbourhood assignment is
-- deterministic so rerunning seed environments produces stable results.
WITH ranked_users AS (
  SELECT users.*, row_number() OVER (ORDER BY users.created_at, users.id) AS rn
  FROM users
  WHERE NOT EXISTS (SELECT 1 FROM addresses WHERE addresses.user_id = users.id)
),
locations(index, city, state, street, latitude, longitude) AS (
  VALUES
    (1, 'Gudu', 'FCT', 'Gudu Residential District', 9.0019, 7.4534),
    (2, 'Wuse 2', 'FCT', 'Aminu Kano Crescent', 9.0765, 7.4703),
    (3, 'Jabi', 'FCT', 'Jabi Lake District', 9.0649, 7.4233),
    (4, 'Asokoro', 'FCT', 'Yakubu Gowon Crescent', 9.0403, 7.5273),
    (5, 'Gwarinpa', 'FCT', 'First Avenue', 9.1099, 7.4042),
    (6, 'Maitama', 'FCT', 'Gana Street', 9.0940, 7.4951),
    (7, 'Lugbe', 'FCT', 'Airport Road Estate', 8.9985, 7.3771),
    (8, 'Kubwa', 'FCT', 'Kubwa Extension', 9.1538, 7.3220),
    (9, 'Kuje', 'FCT', 'Kuje Residential Area', 8.8795, 7.2276),
    (10, 'Gwagwalada', 'FCT', 'University Road', 8.9508, 7.0767)
)
INSERT INTO addresses (
  user_id, label, recipient_name, recipient_phone, line1, city, state,
  latitude, longitude, is_default
)
SELECT ranked.id, 'Home', trim(ranked.first_name || ' ' || ranked.last_name),
  coalesce(ranked.phone, '+2348000' || lpad(ranked.rn::text, 6, '0')),
  'Plot ' || (10 + ranked.rn)::text || ', ' || location.street,
  location.city, location.state,
  location.latitude + (((ranked.rn * 7) % 31 - 15)::double precision / 10000),
  location.longitude + (((ranked.rn * 11) % 31 - 15)::double precision / 10000),
  true
FROM ranked_users ranked
JOIN locations location ON location.index = ((ranked.rn - 1) % 10) + 1;
-- statement-breakpoint
-- Farm coordinates follow their specific locality/address rather than the farm
-- owner's Home location.
WITH anchors AS (
  SELECT farm.id,
    CASE
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%gwarinpa%' THEN 9.1099
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%gwagwalada%' THEN 8.9508
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%maitama%' THEN 9.0940
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%asokoro%' THEN 9.0403
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%lugbe%' THEN 8.9985
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%gudu%' THEN 9.0019
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%jabi%' THEN 9.0649
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%kubwa%' THEN 9.1538
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%kuje%' THEN 8.8795
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%kwali%' THEN 8.8392
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%abaji%' THEN 8.4738
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%bwari%' THEN 9.2799
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%dutse%' THEN 9.1641
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%dei-dei%' THEN 9.1186
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%zuba%' THEN 9.1021
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%nyanya%' THEN 9.0277
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%mararaba%' OR lower(farm.address_text || ' ' || farm.city) LIKE '%karu%' THEN 9.0327
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%kubusa%' THEN 8.9728
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%giri%' THEN 9.0270
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%gwagwa%' THEN 9.1058
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%wuse%' THEN 9.0765
      ELSE 9.0579
    END AS anchor_latitude,
    CASE
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%gwarinpa%' THEN 7.4042
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%gwagwalada%' THEN 7.0767
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%maitama%' THEN 7.4951
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%asokoro%' THEN 7.5273
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%lugbe%' THEN 7.3771
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%gudu%' THEN 7.4534
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%jabi%' THEN 7.4233
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%kubwa%' THEN 7.3220
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%kuje%' THEN 7.2276
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%kwali%' THEN 7.0581
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%abaji%' THEN 6.9448
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%bwari%' THEN 7.3809
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%dutse%' THEN 7.3465
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%dei-dei%' THEN 7.2555
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%zuba%' THEN 7.1987
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%nyanya%' THEN 7.5682
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%mararaba%' OR lower(farm.address_text || ' ' || farm.city) LIKE '%karu%' THEN 7.5860
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%kubusa%' THEN 7.4122
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%giri%' THEN 7.3260
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%gwagwa%' THEN 7.2372
      WHEN lower(farm.address_text || ' ' || farm.city) LIKE '%wuse%' THEN 7.4703
      ELSE 7.4951
    END AS anchor_longitude
  FROM farms farm
)
UPDATE farms farm
SET latitude = anchors.anchor_latitude + (((abs(hashtext(farm.id::text))::bigint % 101) - 50)::double precision / 10000),
    longitude = anchors.anchor_longitude + (((abs(hashtext(reverse(farm.id::text)))::bigint % 101) - 50)::double precision / 10000),
    updated_at = now()
FROM anchors
WHERE anchors.id = farm.id;
