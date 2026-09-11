INSERT INTO produce_categories (name, slug, description) VALUES
  ('Legumes & Pulses', 'legumes-pulses', 'Cowpea, brown and honey beans, soybean, bambara nut, and other pulses sold fresh or dried.'),
  ('Nuts & Seeds', 'nuts-seeds', 'Groundnut, cashew, tigernut, sesame, melon seed, and other farm-dried nuts and seeds.'),
  ('Herbs & Spices', 'herbs-spices', 'Ginger, garlic, turmeric, scent leaf, uziza, ehuru, and other fresh or dried seasonings.'),
  ('Leafy Greens', 'leafy-greens', 'Ugwu, spinach, bitter leaf, waterleaf, and other harvested leaf vegetables.'),
  ('Peppers & Chillies', 'peppers-chillies', 'Scotch bonnet, tatashe, shombo, and other fresh or dried peppers.'),
  ('Mushrooms', 'mushrooms', 'Cultivated oyster, button, and other edible mushrooms.'),
  ('Oils & Palm Produce', 'oils-palm-produce', 'Red palm oil, palm kernel, coconut, shea, and cold-pressed groundnut oil.'),
  ('Fish & Aquaculture', 'fish-aquaculture', 'Farmed catfish, tilapia, and other pond-raised or smoked fish.'),
  ('Livestock & Meat', 'livestock-meat', 'Goat, ram, cattle, and other live animals or dressed meat from verified farms.'),
  ('Dairy Products', 'dairy-products', 'Fresh milk, wara, nono, yoghurt, and other farm dairy.'),
  ('Honey & Bee Products', 'honey-bee-products', 'Raw honey, comb honey, beeswax, and other apiary produce.'),
  ('Seedlings & Planting Material', 'seedlings-planting-material', 'Seed yam, cassava cuttings, cereal seed, and nursery-raised vegetable seedlings.')
ON CONFLICT DO NOTHING;
