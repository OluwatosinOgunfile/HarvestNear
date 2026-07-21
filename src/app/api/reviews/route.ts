import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !["consumer", "farmer"].includes(user.role)) return NextResponse.json({ error: "Sign in to rate a farm" }, { status: 401 });
  const body = await request.json().catch(() => null) as { orderId?: string; farmId?: string; rating?: number; comment?: string } | null;
  const rating = Number(body?.rating);
  if (!body?.orderId || !body.farmId || !Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.json({ error: "Choose a rating from 1 to 5" }, { status: 400 });
  const sql = getDatabase();
  const [eligible] = await sql`
    SELECT fo.id, EXISTS(SELECT 1 FROM reviews WHERE order_id = o.id AND farm_id = fo.farm_id) AS existing_review FROM farm_orders fo JOIN orders o ON o.id = fo.order_id
    WHERE o.id = ${body.orderId} AND o.customer_id = ${user.id} AND fo.farm_id = ${body.farmId}
      AND o.status IN ('delivered','collected') AND fo.status IN ('delivered','collected')
  `;
  if (!eligible) return NextResponse.json({ error: "Only completed purchases can be rated" }, { status: 403 });
  const comment = body.comment?.trim().slice(0, 800) || null;
  try {
    await sql.transaction([
      sql`INSERT INTO reviews (order_id, customer_id, farm_id, rating, comment) VALUES (${body.orderId}, ${user.id}, ${body.farmId}, ${rating}, ${comment}) ON CONFLICT (order_id, farm_id) DO UPDATE SET rating = excluded.rating, comment = excluded.comment, updated_at = now()`,
      sql`UPDATE farms SET average_rating = coalesce((SELECT round(avg(rating)::numeric, 2) FROM reviews WHERE farm_id = ${body.farmId} AND is_visible), 0), review_count = (SELECT count(*) FROM reviews WHERE farm_id = ${body.farmId} AND is_visible), updated_at = now() WHERE id = ${body.farmId}`,
      sql`INSERT INTO notifications (user_id, type, title, message, action_url, metadata) SELECT owner_id, 'account', ${eligible.existing_review ? "A farm rating was updated" : "You received a new farm rating"}, ${`${user.firstName} rated your farm ${rating} out of 5.`}, '/profile', ${JSON.stringify({ orderId: body.orderId, farmId: body.farmId, rating })}::jsonb FROM farms WHERE id = ${body.farmId}`,
    ]);
    const [farm] = await sql`SELECT average_rating, review_count FROM farms WHERE id = ${body.farmId}`;
    return NextResponse.json({ review: { rating, comment }, farm });
  } catch (error) {
    console.error("Rating submission failed", error);
    return NextResponse.json({ error: "Could not save your rating" }, { status: 400 });
  }
}
