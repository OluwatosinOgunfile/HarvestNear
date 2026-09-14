-- A listing titled "Turkey" hangs off a product named "Cassava " with the slug cassava, and the
-- category shown to shoppers comes from the product, so the turkey was displayed as a tuber.
--
-- Migration 047 made this worse rather than causing it. That migration read product names, saw
-- "Cassava" sitting in Poultry, and moved it to Tubers. The name was the wrong thing to trust here:
-- the product's only listing is a turkey, and Poultry had been right for it by accident.
--
-- The order history is safe either way, because order_items snapshots the name at purchase time.
-- Those snapshots record one sale as "Cassava " on 9 August and seven as "Turkey" from 11 August, so
-- renaming the product to match what it actually sells does not rewrite what any buyer was charged
-- for.
--
-- Guarded so it cannot touch a genuine cassava product: it acts only on the product with the slug
-- cassava whose single listing is titled Turkey, and only when the slug turkey is still free. After
-- it runs the slug no longer matches, so re-running does nothing.
WITH target AS (
  SELECT product.id, product.name AS old_name, product.slug AS old_slug, held.slug AS old_category
  FROM products product
  JOIN produce_categories held ON held.id = product.category_id
  WHERE product.slug = 'cassava'
    AND NOT EXISTS (SELECT 1 FROM products other WHERE other.slug = 'turkey')
    AND (SELECT count(*) FROM produce_listings listing WHERE listing.product_id = product.id) = 1
    AND EXISTS (
      SELECT 1 FROM produce_listings listing
      WHERE listing.product_id = product.id AND btrim(lower(listing.title)) = 'turkey'
    )
), moved AS (
  UPDATE products
  SET name = 'Turkey', slug = 'turkey',
    category_id = (SELECT id FROM produce_categories WHERE slug = 'poultry'),
    updated_at = now()
  FROM target
  WHERE products.id = target.id
    AND (SELECT id FROM produce_categories WHERE slug = 'poultry') IS NOT NULL
  RETURNING products.id, target.old_name, target.old_slug, target.old_category
)
INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, before_data, after_data)
SELECT NULL, 'product.recategorised', 'product', moved.id::text,
  jsonb_build_object('product_name', moved.old_name, 'slug', moved.old_slug, 'category_slug', moved.old_category),
  jsonb_build_object('product_name', 'Turkey', 'slug', 'turkey', 'category_slug', 'poultry',
    'migration', '049_turkey_is_poultry', 'reason', 'the only listing on this product is a turkey')
FROM moved;
