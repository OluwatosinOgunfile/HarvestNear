UPDATE users
SET first_name = 'Adebayo', last_name = 'Tunde', email = 'adebayo.tunde@harvestnearu.com', updated_at = now()
WHERE id = '10000000-0000-4000-8000-000000000001';
-- statement-breakpoint
INSERT INTO users (id, email, phone, first_name, last_name, role, email_verified_at, phone_verified_at) VALUES
  ('10000000-0000-4000-8000-000000000002','ifeanyi.okoro@harvestnearu.com','+2348000000002','Ifeanyi','Okoro','farmer',now(),now()),
  ('10000000-0000-4000-8000-000000000003','tunde.balogun@harvestnearu.com','+2348000000003','Tunde','Balogun','farmer',now(),now()),
  ('10000000-0000-4000-8000-000000000004','zainab.musa@harvestnearu.com','+2348000000004','Zainab','Musa','farmer',now(),now()),
  ('10000000-0000-4000-8000-000000000005','suleiman.adamu@harvestnearu.com','+2348000000005','Suleiman','Adamu','farmer',now(),now()),
  ('10000000-0000-4000-8000-000000000006','nana.ibrahim@harvestnearu.com','+2348000000006','Nana','Ibrahim','farmer',now(),now()),
  ('11000000-0000-4000-8000-000000000001','tola.adebayo@example.com','+2348012345678','Tola','Adebayo','consumer',now(),now()),
  ('11000000-0000-4000-8000-000000000002','chioma.okafor@example.com','+2348023456789','Chioma','Okafor','consumer',now(),now()),
  ('11000000-0000-4000-8000-000000000003','musa.bello@example.com','+2348034567890','Musa','Bello','consumer',now(),now()),
  ('11000000-0000-4000-8000-000000000004','amara.eze@example.com','+2348045678901','Amara','Eze','consumer',now(),now()),
  ('11000000-0000-4000-8000-000000000005','kunle.adeoti@example.com','+2348056789012','Kunle','Adeoti','consumer',now(),now()),
  ('11000000-0000-4000-8000-000000000006','fatima.yusuf@example.com','+2348067890123','Fatima','Yusuf','consumer',now(),now()),
  ('11000000-0000-4000-8000-000000000007','ngozi.obi@example.com','+2348078901234','Ngozi','Obi','consumer',now(),now()),
  ('11000000-0000-4000-8000-000000000008','david.james@example.com','+2348089012345','David','James','consumer',now(),now()),
  ('11000000-0000-4000-8000-000000000009','aisha.lawal@example.com','+2348090123456','Aisha','Lawal','consumer',now(),now()),
  ('11000000-0000-4000-8000-000000000010','emeka.nwosu@example.com','+2348091234567','Emeka','Nwosu','consumer',now(),now()),
  ('12000000-0000-4000-8000-000000000001','admin@harvestnearu.com','+2348099000001','Marketplace','Admin','admin',now(),now()),
  ('12000000-0000-4000-8000-000000000002','support@harvestnearu.com','+2348099000002','Customer','Support','support',now(),now())
ON CONFLICT (id) DO NOTHING;
-- statement-breakpoint
INSERT INTO consumer_profiles (user_id, preferred_radius_km, dietary_preferences, marketing_consent)
SELECT id, 20, CASE WHEN id = '11000000-0000-4000-8000-000000000001' THEN ARRAY['Vegetables','Fruits'] ELSE '{}'::text[] END, true
FROM users WHERE role = 'consumer'
ON CONFLICT (user_id) DO NOTHING;
-- statement-breakpoint
INSERT INTO addresses (id, user_id, label, recipient_name, recipient_phone, line1, city, state, landmark, latitude, longitude, is_default) VALUES
  ('13000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','Home','Tola Adebayo','+2348012345678','14 Bakori Street','Gudu','FCT','Near Gudu Market',9.0019,7.4534,true),
  ('13000000-0000-4000-8000-000000000002','11000000-0000-4000-8000-000000000002','Home','Chioma Okafor','+2348023456789','22 Aminu Kano Crescent','Wuse 2','FCT',null,9.0765,7.3986,true),
  ('13000000-0000-4000-8000-000000000003','11000000-0000-4000-8000-000000000003','Home','Musa Bello','+2348034567890','8 Lakeview Close','Jabi','FCT',null,9.0649,7.4233,true),
  ('13000000-0000-4000-8000-000000000004','11000000-0000-4000-8000-000000000004','Home','Amara Eze','+2348045678901','31 Yakubu Gowon Way','Asokoro','FCT',null,9.0403,7.5273,true),
  ('13000000-0000-4000-8000-000000000005','11000000-0000-4000-8000-000000000005','Home','Kunle Adeoti','+2348056789012','17 First Avenue','Gwarinpa','FCT',null,9.1099,7.4042,true)
ON CONFLICT (id) DO NOTHING;
-- statement-breakpoint
UPDATE farms SET owner_id = '10000000-0000-4000-8000-000000000002', updated_at = now() WHERE id IN (
  '20000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000005','20000000-0000-4000-8000-000000000010','20000000-0000-4000-8000-000000000014'
);
-- statement-breakpoint
UPDATE farms SET owner_id = '10000000-0000-4000-8000-000000000003', updated_at = now() WHERE id IN (
  '20000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000011','20000000-0000-4000-8000-000000000018'
);
-- statement-breakpoint
UPDATE farms SET owner_id = '10000000-0000-4000-8000-000000000004', updated_at = now() WHERE id IN (
  '20000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000007','20000000-0000-4000-8000-000000000015','20000000-0000-4000-8000-000000000016'
);
-- statement-breakpoint
UPDATE farms SET owner_id = '10000000-0000-4000-8000-000000000005', updated_at = now() WHERE id IN (
  '20000000-0000-4000-8000-000000000008','20000000-0000-4000-8000-000000000009','20000000-0000-4000-8000-000000000019'
);
-- statement-breakpoint
UPDATE farms SET owner_id = '10000000-0000-4000-8000-000000000006', updated_at = now() WHERE id IN (
  '20000000-0000-4000-8000-000000000006','20000000-0000-4000-8000-000000000012','20000000-0000-4000-8000-000000000020'
);
