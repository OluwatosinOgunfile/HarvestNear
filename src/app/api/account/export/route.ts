import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { mobileCorsHeaders, mobileOptions } from "@/lib/mobile-cors";
import { checkRateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";
export const OPTIONS = mobileOptions;

/**
 * Gives a person a copy of what is held about them, in a form they can read and take elsewhere.
 * Identity hashes, session tokens and other people's data are deliberately excluded: the right is
 * to one's own information, not to the material that protects it.
 */
export async function GET(request: Request) {
  const headers = mobileCorsHeaders(request);
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to download your information" }, { status: 403, headers });
  if (!await checkRateLimit(request, "account.export", 5, 24 * 60 * 60, user.id)) {
    return NextResponse.json({ error: "You can download your information a few times a day. Try again later." }, { status: 429, headers });
  }

  const sql = getDatabase();
  const [account, addresses, orders, reviews, tickets, preferences, agreements, credit, favourites, alerts, farms] = await Promise.all([
    sql`SELECT id, email, first_name, last_name, phone, role, email_verified_at, created_at, last_login_at FROM users WHERE id = ${user.id}`,
    sql`SELECT label, recipient_name, line1, line2, city, state, landmark, latitude, longitude, is_default, created_at FROM addresses WHERE user_id = ${user.id}`,
    sql`SELECT orders.order_number, orders.status, orders.total_kobo, orders.fulfilment_method, orders.placed_at, orders.paid_at,
          coalesce(json_agg(json_build_object('produce', item.product_name, 'farm', item.farm_name, 'quantity', item.quantity, 'unit', item.unit, 'line_total_kobo', item.line_total_kobo)) FILTER (WHERE item.id IS NOT NULL), '[]') AS items
        FROM orders LEFT JOIN order_items item ON item.order_id = orders.id
        WHERE orders.customer_id = ${user.id} GROUP BY orders.id ORDER BY orders.placed_at DESC`,
    sql`SELECT rating, comment, created_at FROM reviews WHERE customer_id = ${user.id} ORDER BY created_at DESC`,
    sql`SELECT ticket_number, subject, category, status, created_at FROM support_tickets WHERE requester_id = ${user.id} ORDER BY created_at DESC`,
    sql`SELECT * FROM user_email_preferences WHERE user_id = ${user.id}`,
    sql`SELECT document, version, accepted_at FROM user_agreements WHERE user_id = ${user.id} ORDER BY accepted_at`,
    sql`SELECT balance_kobo FROM store_credit_accounts WHERE user_id = ${user.id}`,
    sql`SELECT listing_id, created_at FROM favourites WHERE user_id = ${user.id}`,
    sql`SELECT listing_id, created_at, notified_at FROM restock_alerts WHERE user_id = ${user.id}`,
    sql`SELECT name, city, state, verification_status, created_at FROM farms WHERE owner_id = ${user.id}`,
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    notice: "This file contains the personal information HarvestNearU holds about your account. Security material such as passwords, session tokens and identity-number hashes is deliberately excluded.",
    account: account[0] || null,
    saved_locations: addresses,
    orders,
    reviews,
    support_tickets: tickets,
    email_preferences: preferences[0] || null,
    agreements,
    account_credit: credit[0] || null,
    saved_produce: favourites,
    restock_alerts: alerts,
    farms,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      ...Object.fromEntries(headers),
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="harvestnearu-${user.id.slice(0, 8)}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
