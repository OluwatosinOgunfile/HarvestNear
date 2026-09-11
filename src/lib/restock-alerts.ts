import "server-only";

import { getDatabase } from "@/lib/db";
import { dispatchNotificationEmails } from "@/lib/notification-email";

/**
 * Clears the waiting list for a listing that has come back into stock. Each watcher is notified
 * once; re-watching after the alert fires is a deliberate new request rather than a standing
 * subscription, so a restocked listing cannot notify the same customer repeatedly.
 */
export async function notifyRestockWatchers(input: { listingId: string; listingTitle: string; farmId: string; farmName: string }) {
  const sql = getDatabase();
  const metadata = JSON.stringify({ emailCategory: "restock_alert", farmId: input.farmId, listingId: input.listingId, update: "restocked" });
  const recipients = await sql`
    WITH watchers AS (
      UPDATE restock_alerts alert SET notified_at = now()
      WHERE alert.listing_id = ${input.listingId} AND alert.notified_at IS NULL
      RETURNING alert.user_id
    )
    INSERT INTO notifications (user_id, type, title, message, action_url, metadata)
    SELECT users.id, 'farm',
      ${`${input.listingTitle} is back in stock`},
      ${`${input.farmName} has restocked ${input.listingTitle}. You asked to be told when it returned.`},
      ${`/farms/${input.farmId}`}, ${metadata}::jsonb
    FROM watchers watcher JOIN users ON users.id = watcher.user_id AND users.is_active
    RETURNING user_id
  `;
  if (recipients.length) await dispatchNotificationEmails(Math.max(25, recipients.length));
  return recipients.length;
}

/** Called wherever stock is raised; resolves the listing details the notification needs. */
export async function notifyRestockIfWatched(listingId: string) {
  const sql = getDatabase();
  const [listing] = await sql`
    SELECT listing.id, listing.title, farm.id AS farm_id, farm.name AS farm_name,
      (listing.quantity_available - listing.quantity_reserved) AS stock, listing.status
    FROM produce_listings listing JOIN farms farm ON farm.id = listing.farm_id
    WHERE listing.id = ${listingId} LIMIT 1
  `;
  if (!listing || listing.status !== "active" || Number(listing.stock) <= 0) return 0;
  return notifyRestockWatchers({
    listingId: String(listing.id),
    listingTitle: String(listing.title),
    farmId: String(listing.farm_id),
    farmName: String(listing.farm_name),
  });
}
