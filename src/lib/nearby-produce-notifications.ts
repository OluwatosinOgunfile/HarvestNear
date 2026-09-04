import "server-only";

import { getDatabase } from "@/lib/db";
import { dispatchNotificationEmails } from "@/lib/notification-email";

type NearbyProduceUpdate = {
  farmId: string;
  listingId: string;
  listingTitle: string;
  isRestock: boolean;
};

export async function notifyNearbyProduce(update: NearbyProduceUpdate) {
  const sql = getDatabase();
  const configuredLimit = Number(process.env.NEARBY_PRODUCE_MAX_DISTANCE_KM || 25);
  const maximumDistanceKm = Number.isFinite(configuredLimit) ? Math.min(Math.max(configuredLimit, 1), 100) : 25;
  const [farm] = await sql`SELECT id, owner_id, name, latitude, longitude FROM farms WHERE id=${update.farmId} AND verification_status='verified'`;
  if (!farm || farm.latitude == null || farm.longitude == null) return 0;

  const title = update.isRestock ? `${update.listingTitle} is back in stock` : `Fresh ${update.listingTitle} near you`;
  const message = update.isRestock
    ? `${farm.name} has restocked ${update.listingTitle}. It is available within your preferred shopping distance.`
    : `${farm.name} has listed ${update.listingTitle}. It is available within your preferred shopping distance.`;
  const metadata = JSON.stringify({
    emailCategory: "nearby_produce",
    farmId: String(farm.id),
    listingId: update.listingId,
    update: update.isRestock ? "restocked" : "new_listing",
  });

  const recipients = await sql`
    WITH candidates AS (
      SELECT DISTINCT users.id
      FROM users
      JOIN user_email_preferences preference ON preference.user_id=users.id AND preference.nearby_produce
      LEFT JOIN consumer_profiles consumer ON consumer.user_id=users.id
      JOIN LATERAL (
        SELECT latitude, longitude
        FROM addresses
        WHERE user_id=users.id AND latitude IS NOT NULL AND longitude IS NOT NULL
        ORDER BY is_default DESC, updated_at DESC, created_at DESC
        LIMIT 1
      ) address ON true
      WHERE users.is_active AND users.id<>${farm.owner_id}
        AND 6371 * 2 * asin(sqrt(
          power(sin(radians(${Number(farm.latitude)}-address.latitude)/2),2) +
          cos(radians(address.latitude))*cos(radians(${Number(farm.latitude)}))*
          power(sin(radians(${Number(farm.longitude)}-address.longitude)/2),2)
        )) <= least(coalesce(consumer.preferred_radius_km, 20), ${maximumDistanceKm})
    )
    INSERT INTO notifications (user_id, type, title, message, action_url, metadata)
    SELECT id, 'farm', ${title}, ${message}, '/marketplace', ${metadata}::jsonb FROM candidates
    RETURNING user_id
  `;

  if (recipients.length) await dispatchNotificationEmails(Math.max(25, recipients.length));
  return recipients.length;
}
