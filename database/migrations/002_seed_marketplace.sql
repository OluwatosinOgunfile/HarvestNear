ALTER TABLE produce_listings ADD COLUMN IF NOT EXISTS badge text;
-- statement-breakpoint
INSERT INTO users (id, email, phone, first_name, last_name, role, email_verified_at, phone_verified_at)
VALUES ('10000000-0000-4000-8000-000000000001', 'demo.farmer@harvestnearu.com', '+2348000000001', 'HarvestNearU', 'Farmer', 'farmer', now(), now())
ON CONFLICT (id) DO NOTHING;
-- statement-breakpoint
INSERT INTO farms (id, owner_id, name, slug, description, phone, email, address_text, city, state, latitude, longitude, verification_status, verified_at, offers_pickup, offers_delivery, average_rating, review_count)
VALUES
  ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Adebayo Family Farm','adebayo-family-farm','Family-grown vegetables harvested for nearby homes.','+2348000000101','adebayo@harvestnearu.com','Kuje','Kuje','FCT',8.8795,7.2276,'verified',now(),true,true,4.90,48),
  ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Mama Ifeanyi Farms','mama-ifeanyi-farms','Fresh field crops from Gwagwalada.','+2348000000102','ifeanyi@harvestnearu.com','Gwagwalada','Gwagwalada','FCT',8.9508,7.0767,'verified',now(),true,true,4.80,36),
  ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','Tunde Harvest Co.','tunde-harvest-co','Quality Nigerian root crops.','+2348000000103','tunde@harvestnearu.com','Kwali','Kwali','FCT',8.8392,7.0581,'verified',now(),true,true,4.70,30),
  ('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','Haske Greenfields','haske-greenfields','Peppers and vegetables grown close to Abuja.','+2348000000104','haske@harvestnearu.com','Lugbe','Abuja','FCT',8.9985,7.3771,'verified',now(),true,true,4.90,54),
  ('20000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000001','Olaoluwa Farms','olaoluwa-farms','Seasonal fruit and plantain.','+2348000000105','olaoluwa@harvestnearu.com','Giri','Abuja','FCT',9.0270,7.3260,'verified',now(),true,true,4.60,29),
  ('20000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000001','Nana Grains','nana-grains','Locally sourced grains and beans.','+2348000000106','nana@harvestnearu.com','Zuba','Abuja','FCT',9.1021,7.1987,'verified',now(),true,true,4.80,31),
  ('20000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000001','Green Basket Farms','green-basket-farms','Leafy produce picked daily.','+2348000000107','greenbasket@harvestnearu.com','Jabi','Abuja','FCT',9.0649,7.4233,'verified',now(),true,true,4.70,43),
  ('20000000-0000-4000-8000-000000000008','10000000-0000-4000-8000-000000000001','Dutse Poultry Hub','dutse-poultry-hub','Free-range poultry produce.','+2348000000108','dutse@harvestnearu.com','Dutse','Abuja','FCT',9.1641,7.3465,'verified',now(),true,true,4.90,39),
  ('20000000-0000-4000-8000-000000000009','10000000-0000-4000-8000-000000000001','Suleiman Produce','suleiman-produce','Market vegetables from Dei-Dei.','+2348000000109','suleiman@harvestnearu.com','Dei-Dei','Abuja','FCT',9.1186,7.2555,'verified',now(),true,true,4.60,33),
  ('20000000-0000-4000-8000-000000000010','10000000-0000-4000-8000-000000000001','Sunrise Orchard','sunrise-orchard','Sweet tropical fruit from Bwari.','+2348000000110','sunrise@harvestnearu.com','Bwari','Bwari','FCT',9.2799,7.3809,'verified',now(),true,true,4.80,42),
  ('20000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000001','Unity Root Crops','unity-root-crops','Cassava and root crops for local homes.','+2348000000111','unity@harvestnearu.com','Karu','Karu','Nasarawa',9.0092,7.5680,'verified',now(),true,true,4.50,25),
  ('20000000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000001','Abuja Grain Collective','abuja-grain-collective','Smallholder grain collective.','+2348000000112','grains@harvestnearu.com','Abaji','Abaji','FCT',8.4738,6.9448,'verified',now(),true,true,4.70,35),
  ('20000000-0000-4000-8000-000000000013','10000000-0000-4000-8000-000000000001','Jos Valley Produce','jos-valley-produce','Cool-weather vegetables delivered into Abuja.','+2348000000113','josvalley@harvestnearu.com','Maitama','Abuja','FCT',9.0940,7.4951,'verified',now(),true,true,4.80,34),
  ('20000000-0000-4000-8000-000000000014','10000000-0000-4000-8000-000000000001','Highland Orchard','highland-orchard','Carefully selected orchard fruit.','+2348000000114','highland@harvestnearu.com','Asokoro','Abuja','FCT',9.0403,7.5273,'verified',now(),true,true,4.90,41),
  ('20000000-0000-4000-8000-000000000015','10000000-0000-4000-8000-000000000001','Riverbend Gardens','riverbend-gardens','Fresh garden vegetables.','+2348000000115','riverbend@harvestnearu.com','Wuse','Abuja','FCT',9.0765,7.3986,'verified',now(),true,true,4.60,31),
  ('20000000-0000-4000-8000-000000000016','10000000-0000-4000-8000-000000000001','Zainab Fresh Fields','zainab-fresh-fields','Popular local vegetables from Nyanya.','+2348000000116','zainab@harvestnearu.com','Nyanya','Abuja','FCT',9.0277,7.5682,'verified',now(),true,true,4.70,45),
  ('20000000-0000-4000-8000-000000000017','10000000-0000-4000-8000-000000000001','Gurara Melon Farm','gurara-melon-farm','Juicy seasonal melons.','+2348000000117','gurara@harvestnearu.com','Kubusa','Abuja','FCT',8.9728,7.4122,'verified',now(),true,true,4.80,38),
  ('20000000-0000-4000-8000-000000000018','10000000-0000-4000-8000-000000000001','Roots & Spice Co.','roots-and-spice-co','Fresh roots and aromatic spices.','+2348000000118','roots@harvestnearu.com','Kubwa','Abuja','FCT',9.1538,7.3220,'verified',now(),true,true,4.60,28),
  ('20000000-0000-4000-8000-000000000019','10000000-0000-4000-8000-000000000001','Nasarawa Citrus Farm','nasarawa-citrus-farm','Citrus fruit from nearby Nasarawa.','+2348000000119','citrus@harvestnearu.com','Mararaba','Karu','Nasarawa',9.0327,7.5860,'verified',now(),true,true,4.80,39),
  ('20000000-0000-4000-8000-000000000020','10000000-0000-4000-8000-000000000001','Sahel Grain House','sahel-grain-house','Northern grains supplied locally.','+2348000000120','sahel@harvestnearu.com','Gwagwa','Abuja','FCT',9.1058,7.2372,'verified',now(),true,true,4.50,23)
ON CONFLICT (id) DO NOTHING;
-- statement-breakpoint
INSERT INTO products (id, category_id, name, slug, default_unit)
SELECT source.id::uuid, category.id, source.name, source.slug, source.unit
FROM (VALUES
  ('30000000-0000-4000-8000-000000000001','Vine-ripe tomatoes','vine-ripe-tomatoes','basket','vegetables'),
  ('30000000-0000-4000-8000-000000000002','Fresh sweet corn','fresh-sweet-corn','dozen','vegetables'),
  ('30000000-0000-4000-8000-000000000003','Oyo white yam','oyo-white-yam','tuber','tubers'),
  ('30000000-0000-4000-8000-000000000004','Red scotch bonnet','red-scotch-bonnet','paint bowl','vegetables'),
  ('30000000-0000-4000-8000-000000000005','Sweet ripe plantain','sweet-ripe-plantain','bunch','fruits'),
  ('30000000-0000-4000-8000-000000000006','Brown honey beans','brown-honey-beans','mudu','grains'),
  ('30000000-0000-4000-8000-000000000007','Garden-fresh spinach','garden-fresh-spinach','bundle','vegetables'),
  ('30000000-0000-4000-8000-000000000008','Free-range brown eggs','free-range-brown-eggs','crate','eggs'),
  ('30000000-0000-4000-8000-000000000009','Purple red onions','purple-red-onions','basket','vegetables'),
  ('30000000-0000-4000-8000-000000000010','Golden pineapple','golden-pineapple','piece','fruits'),
  ('30000000-0000-4000-8000-000000000011','Fresh cassava roots','fresh-cassava-roots','bundle','tubers'),
  ('30000000-0000-4000-8000-000000000012','Local ofada rice','local-ofada-rice','5 kg bag','grains'),
  ('30000000-0000-4000-8000-000000000013','Crunchy carrots','crunchy-carrots','bundle','vegetables'),
  ('30000000-0000-4000-8000-000000000014','Creamy avocados','creamy-avocados','set of 4','fruits'),
  ('30000000-0000-4000-8000-000000000015','Fresh cucumbers','fresh-cucumbers','set of 5','vegetables'),
  ('30000000-0000-4000-8000-000000000016','Tender green okra','tender-green-okra','basket','vegetables'),
  ('30000000-0000-4000-8000-000000000017','Sweet watermelon','sweet-watermelon','piece','fruits'),
  ('30000000-0000-4000-8000-000000000018','Aromatic ginger','aromatic-ginger','1 kg','tubers'),
  ('30000000-0000-4000-8000-000000000019','Juicy sweet oranges','juicy-sweet-oranges','dozen','fruits'),
  ('30000000-0000-4000-8000-000000000020','Pearl millet grain','pearl-millet-grain','5 kg bag','grains')
) AS source(id,name,slug,unit,category_slug)
JOIN produce_categories category ON category.slug = source.category_slug
ON CONFLICT (id) DO NOTHING;
-- statement-breakpoint
INSERT INTO produce_listings (id, farm_id, product_id, title, unit, unit_price_kobo, quantity_available, quantity_sold, harvest_date, available_from, available_until, status, badge)
VALUES
 ('40000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Vine-ripe tomatoes','basket',125000,18,72,current_date,now()-interval '2 hours',now()+interval '5 days','active','Selling fast'),
 ('40000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','Fresh sweet corn','dozen',180000,32,48,current_date,now()-interval '2 hours',now()+interval '5 days','active',null),
 ('40000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000003','Oyo white yam','tuber',320000,24,36,current_date+1,now()+interval '1 day',now()+interval '7 days','active','New harvest'),
 ('40000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000004','Red scotch bonnet','paint bowl',95000,11,84,current_date,now()-interval '2 hours',now()+interval '4 days','active','Almost gone'),
 ('40000000-0000-4000-8000-000000000005','20000000-0000-4000-8000-000000000005','30000000-0000-4000-8000-000000000005','Sweet ripe plantain','bunch',260000,27,51,current_date+2,now()+interval '2 days',now()+interval '8 days','active',null),
 ('40000000-0000-4000-8000-000000000006','20000000-0000-4000-8000-000000000006','30000000-0000-4000-8000-000000000006','Brown honey beans','mudu',240000,46,29,current_date,now()-interval '2 hours',now()+interval '8 days','active',null),
 ('40000000-0000-4000-8000-000000000007','20000000-0000-4000-8000-000000000007','30000000-0000-4000-8000-000000000007','Garden-fresh spinach','bundle',70000,21,63,current_date,now()-interval '2 hours',now()+interval '3 days','active','Picked today'),
 ('40000000-0000-4000-8000-000000000008','20000000-0000-4000-8000-000000000008','30000000-0000-4000-8000-000000000008','Free-range brown eggs','crate',580000,16,54,current_date,now()-interval '2 hours',now()+interval '6 days','active',null),
 ('40000000-0000-4000-8000-000000000009','20000000-0000-4000-8000-000000000009','30000000-0000-4000-8000-000000000009','Purple red onions','basket',165000,38,42,current_date+1,now()+interval '1 day',now()+interval '8 days','active',null),
 ('40000000-0000-4000-8000-000000000010','20000000-0000-4000-8000-000000000010','30000000-0000-4000-8000-000000000010','Golden pineapple','piece',140000,29,61,current_date+2,now()+interval '2 days',now()+interval '8 days','active','Sweet pick'),
 ('40000000-0000-4000-8000-000000000011','20000000-0000-4000-8000-000000000011','30000000-0000-4000-8000-000000000011','Fresh cassava roots','bundle',190000,44,26,current_date+1,now()+interval '1 day',now()+interval '8 days','active',null),
 ('40000000-0000-4000-8000-000000000012','20000000-0000-4000-8000-000000000012','30000000-0000-4000-8000-000000000012','Local ofada rice','5 kg bag',420000,52,33,current_date,now()-interval '2 hours',now()+interval '10 days','active',null),
 ('40000000-0000-4000-8000-000000000013','20000000-0000-4000-8000-000000000013','30000000-0000-4000-8000-000000000013','Crunchy carrots','bundle',110000,35,45,current_date,now()-interval '2 hours',now()+interval '5 days','active',null),
 ('40000000-0000-4000-8000-000000000014','20000000-0000-4000-8000-000000000014','30000000-0000-4000-8000-000000000014','Creamy avocados','set of 4',150000,23,57,current_date,now()-interval '2 hours',now()+interval '5 days','active','In season'),
 ('40000000-0000-4000-8000-000000000015','20000000-0000-4000-8000-000000000015','30000000-0000-4000-8000-000000000015','Fresh cucumbers','set of 5',85000,41,39,current_date+1,now()+interval '1 day',now()+interval '7 days','active',null),
 ('40000000-0000-4000-8000-000000000016','20000000-0000-4000-8000-000000000016','30000000-0000-4000-8000-000000000016','Tender green okra','basket',90000,19,66,current_date,now()-interval '2 hours',now()+interval '5 days','active','Popular'),
 ('40000000-0000-4000-8000-000000000017','20000000-0000-4000-8000-000000000017','30000000-0000-4000-8000-000000000017','Sweet watermelon','piece',230000,28,52,current_date+2,now()+interval '2 days',now()+interval '8 days','active',null),
 ('40000000-0000-4000-8000-000000000018','20000000-0000-4000-8000-000000000018','30000000-0000-4000-8000-000000000018','Aromatic ginger','1 kg',130000,34,31,current_date,now()-interval '2 hours',now()+interval '8 days','active',null),
 ('40000000-0000-4000-8000-000000000019','20000000-0000-4000-8000-000000000019','30000000-0000-4000-8000-000000000019','Juicy sweet oranges','dozen',175000,47,53,current_date+1,now()+interval '1 day',now()+interval '8 days','active',null),
 ('40000000-0000-4000-8000-000000000020','20000000-0000-4000-8000-000000000020','30000000-0000-4000-8000-000000000020','Pearl millet grain','5 kg bag',280000,58,22,current_date,now()-interval '2 hours',now()+interval '10 days','active',null)
ON CONFLICT (id) DO NOTHING;
-- statement-breakpoint
INSERT INTO listing_images (listing_id, url, alt_text, sort_order)
SELECT listing.id, '/produce/' || product.slug || '.webp', product.name, 0
FROM produce_listings listing
JOIN products product ON product.id = listing.product_id
WHERE listing.id::text LIKE '40000000-0000-4000-8000-%'
AND NOT EXISTS (SELECT 1 FROM listing_images image WHERE image.listing_id = listing.id);
