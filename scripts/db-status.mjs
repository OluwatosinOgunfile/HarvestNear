import process from "node:process";

import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not configured.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const [counts] = await sql.query(`
  SELECT
    (SELECT count(*) FROM users)::int AS users,
    (SELECT count(*) FROM users WHERE role = 'consumer')::int AS consumers,
    (SELECT count(*) FROM users WHERE role = 'farmer')::int AS farmers,
    (SELECT count(*) FROM users WHERE role = 'farmer' AND NOT EXISTS (SELECT 1 FROM farms WHERE farms.owner_id = users.id))::int AS unlinked_farmers,
    (SELECT count(*) FROM addresses)::int AS addresses,
    (SELECT count(*) FROM users WHERE NOT EXISTS (SELECT 1 FROM addresses WHERE addresses.user_id = users.id))::int AS users_without_address,
    (SELECT count(DISTINCT round(latitude::numeric, 5)::text || ',' || round(longitude::numeric, 5)::text) FROM addresses)::int AS distinct_address_coordinates,
    (SELECT count(*) FROM farms)::int AS farms,
    (SELECT count(*) FROM farms WHERE latitude IS NULL OR longitude IS NULL)::int AS farms_without_coordinates,
    (SELECT count(DISTINCT round(latitude::numeric, 5)::text || ',' || round(longitude::numeric, 5)::text) FROM farms)::int AS distinct_farm_coordinates,
    (SELECT count(*) FROM produce_listings)::int AS listings,
    (SELECT count(*) FROM listing_images)::int AS images
`);

console.log(`Users: ${counts.users} (${counts.consumers} consumers, ${counts.farmers} farmers)`);
console.log(`Farmers without a farm: ${counts.unlinked_farmers}`);
console.log(`Saved addresses: ${counts.addresses} (${counts.users_without_address} users without an address, ${counts.distinct_address_coordinates} distinct coordinates)`);
console.log(`Farms: ${counts.farms}`);
console.log(`Farms without coordinates: ${counts.farms_without_coordinates} (${counts.distinct_farm_coordinates} distinct coordinates)`);
console.log(`Produce listings: ${counts.listings}`);
console.log(`Listing images: ${counts.images}`);
