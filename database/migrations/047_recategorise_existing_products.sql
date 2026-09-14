-- Migration 041 split produce into twelve finer categories, but the catalogue that already existed
-- stayed on the five broad ones it was entered under. Each move below is the category that 041's own
-- description names for that produce: honey beans under "cowpea, brown and honey beans", ginger under
-- "ginger, garlic, turmeric", spinach and ugwu under "ugwu, spinach, bitter leaf", scotch bonnet
-- under "scotch bonnet, tatashe, shombo", yoghurt under "fresh milk, wara, nono, yoghurt".
--
-- Two of these were plain data-entry mistakes rather than coarse classification: cassava was filed
-- under Poultry, and two yoghurt listings under Fruits.
--
-- Each row only moves a product that is still sitting in the category it was entered under, so this
-- is safe to re-run and will not overwrite a correction made by hand afterwards. Products not listed
-- here keep their category: carrots, cucumbers, sweet corn, onions, okra and tomatoes are field
-- vegetables, and "Test produce" carries no produce name to reclassify on.
WITH moves (product_slug, from_slug, to_slug) AS (
  VALUES
    ('brown-honey-beans', 'grains', 'legumes-pulses'),
    ('aromatic-ginger', 'tubers', 'herbs-spices'),
    ('garden-fresh-spinach', 'vegetables', 'leafy-greens'),
    ('ugwu-leaves', 'vegetables', 'leafy-greens'),
    ('red-scotch-bonnet', 'vegetables', 'peppers-chillies'),
    ('fresh-batch-of-yogurt', 'fruits', 'dairy-products'),
    ('fresh-homemade-yogurt', 'fruits', 'dairy-products'),
    ('cassava', 'poultry', 'tubers')
), resolved AS (
  SELECT product.id AS product_id, product.name, moves.from_slug, moves.to_slug, target.id AS target_id
  FROM moves
  JOIN products product ON product.slug = moves.product_slug
  JOIN produce_categories held ON held.id = product.category_id AND held.slug = moves.from_slug
  JOIN produce_categories target ON target.slug = moves.to_slug
), moved AS (
  UPDATE products
  SET category_id = resolved.target_id, updated_at = now()
  FROM resolved
  WHERE products.id = resolved.product_id
  RETURNING products.id, resolved.name, resolved.from_slug, resolved.to_slug
)
INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, before_data, after_data)
SELECT NULL, 'product.recategorised', 'product', moved.id::text,
  jsonb_build_object('category_slug', moved.from_slug, 'product_name', moved.name),
  jsonb_build_object('category_slug', moved.to_slug, 'migration', '047_recategorise_existing_products')
FROM moved;
