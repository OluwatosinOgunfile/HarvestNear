import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { mobileCorsHeaders, mobileOptions } from "@/lib/mobile-cors";

export const dynamic = "force-dynamic";
export const OPTIONS = mobileOptions;

/**
 * Just the unread counts, so a screen showing conversations can keep its badges current without
 * re-fetching the order lists those badges sit on. Re-fetching an order list every few seconds to
 * learn a number would pull items, tracking, refunds and reviews along with it; this returns one row
 * per thread that has something waiting, and nothing at all when everything is read.
 *
 * One query covers both roles: the viewer is a party to a thread when they placed the order or they
 * own the farm, which is the same test the conversation itself applies.
 */
export async function GET(request: Request) {
  const headers = mobileCorsHeaders(request);
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to see your conversations" }, { status: 401, headers });

  const sql = getDatabase();
  const threads = await sql`
    SELECT message.order_id, message.farm_id, count(*)::int AS unread
    FROM order_farm_messages message
    JOIN orders ON orders.id = message.order_id
    JOIN farms farm ON farm.id = message.farm_id
    WHERE message.sender_id <> ${user.id}
      AND (orders.customer_id = ${user.id} OR farm.owner_id = ${user.id})
      AND message.created_at > coalesce((
        SELECT read.last_read_at FROM order_farm_message_reads read
        WHERE read.order_id = message.order_id AND read.farm_id = message.farm_id AND read.user_id = ${user.id}
      ), 'epoch'::timestamptz)
    GROUP BY message.order_id, message.farm_id
  `;

  return NextResponse.json({
    threads: threads.map((row) => ({ orderId: String(row.order_id), farmId: String(row.farm_id), unread: Number(row.unread) })),
    total: threads.reduce((sum, row) => sum + Number(row.unread), 0),
  }, { headers });
}
