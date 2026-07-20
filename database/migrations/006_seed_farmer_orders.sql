INSERT INTO orders (id, order_number, customer_id, status, subtotal_kobo, delivery_fee_kobo, total_kobo, fulfilment_method, delivery_address_snapshot, placed_at, paid_at)
VALUES
  ('50000000-0000-4000-8000-000000000001','HN-3001','11000000-0000-4000-8000-000000000002','confirmed',375000,180000,555000,'doorstep','{"city":"Wuse 2","state":"FCT"}',now()-interval '12 minutes',now()-interval '11 minutes'),
  ('50000000-0000-4000-8000-000000000002','HN-3002','11000000-0000-4000-8000-000000000003','preparing',250000,0,250000,'farm_pickup',null,now()-interval '34 minutes',now()-interval '33 minutes'),
  ('50000000-0000-4000-8000-000000000003','HN-3003','11000000-0000-4000-8000-000000000001','ready',125000,0,125000,'collection_hub',null,now()-interval '1 hour',now()-interval '59 minutes')
ON CONFLICT (id) DO NOTHING;
-- statement-breakpoint
INSERT INTO farm_orders (id, order_id, farm_id, status, subtotal_kobo, platform_fee_kobo, farmer_net_kobo, confirmed_at, ready_at)
VALUES
  ('51000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','confirmed',375000,37500,337500,now()-interval '10 minutes',null),
  ('51000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','preparing',250000,25000,225000,now()-interval '31 minutes',null),
  ('51000000-0000-4000-8000-000000000003','50000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001','ready',125000,12500,112500,now()-interval '55 minutes',now()-interval '5 minutes')
ON CONFLICT (id) DO NOTHING;
-- statement-breakpoint
INSERT INTO order_items (id, order_id, farm_order_id, listing_id, product_name, farm_name, unit, quantity, unit_price_kobo, line_total_kobo, image_url)
VALUES
  ('52000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','51000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','Vine-ripe tomatoes','Adebayo Family Farm','basket',3,125000,375000,'/produce/vine-ripe-tomatoes.webp'),
  ('52000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000002','51000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000001','Vine-ripe tomatoes','Adebayo Family Farm','basket',2,125000,250000,'/produce/vine-ripe-tomatoes.webp'),
  ('52000000-0000-4000-8000-000000000003','50000000-0000-4000-8000-000000000003','51000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000001','Vine-ripe tomatoes','Adebayo Family Farm','basket',1,125000,125000,'/produce/vine-ripe-tomatoes.webp')
ON CONFLICT (id) DO NOTHING;
