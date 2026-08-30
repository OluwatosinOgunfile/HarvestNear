import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { canMutateAs, checkRateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

async function conversation(userId: string, orderId: string, farmId: string) {
  const sql = getDatabase();
  const [thread] = await sql`
    SELECT orders.id AS order_id, orders.order_number, orders.customer_id, orders.fulfilment_method,
      farm.id AS farm_id, farm.name AS farm_name, farm.owner_id
    FROM orders
    JOIN farm_orders farm_order ON farm_order.order_id = orders.id
    JOIN farms farm ON farm.id = farm_order.farm_id
    WHERE orders.id = ${orderId} AND farm.id = ${farmId}
      AND orders.fulfilment_method = 'farmer_delivery'
      AND (${userId} = orders.customer_id OR ${userId} = farm.owner_id)
  `;
  return thread;
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to open this conversation" }, { status: 401 });
  const url = new URL(request.url);
  const orderId = url.searchParams.get("orderId") || "";
  const farmId = url.searchParams.get("farmId") || "";
  const thread = await conversation(user.id, orderId, farmId);
  if (!thread) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  const sql = getDatabase();
  const messages = await sql`
    SELECT message.id, message.body, message.created_at, message.sender_id,
      trim(author.first_name || ' ' || author.last_name) AS sender_name
    FROM order_farm_messages message
    JOIN users author ON author.id = message.sender_id
    WHERE message.order_id = ${orderId} AND message.farm_id = ${farmId}
    ORDER BY message.created_at ASC
  `;
  return NextResponse.json({ thread, messages });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !canMutateAs(user)) return NextResponse.json({ error: "Sign in to send a message" }, { status: 401 });
  if (!await checkRateLimit(request, "orders.messages", 60, 60 * 60, user.id)) return NextResponse.json({ error: "Message limit reached. Try again later." }, { status: 429 });
  const body = await request.json().catch(() => null) as { orderId?: string; farmId?: string; message?: string } | null;
  const orderId = String(body?.orderId || "");
  const farmId = String(body?.farmId || "");
  const message = String(body?.message || "").trim();
  if (!message || message.length > 2000) return NextResponse.json({ error: "Enter a message of up to 2,000 characters" }, { status: 400 });
  const thread = await conversation(user.id, orderId, farmId);
  if (!thread) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  const sql = getDatabase();
  const [created] = await sql`INSERT INTO order_farm_messages (order_id, farm_id, sender_id, body) VALUES (${orderId}, ${farmId}, ${user.id}, ${message}) RETURNING id, body, sender_id, created_at`;
  const recipientId = String(thread.customer_id) === user.id ? String(thread.owner_id) : String(thread.customer_id);
  await sql`INSERT INTO notifications (user_id, type, title, message, action_url, metadata)
    VALUES (${recipientId}, 'order', ${`New message about order ${thread.order_number}`}, ${`${user.firstName} sent a fulfilment message.`}, '/orders', ${JSON.stringify({ orderId, farmId, messageId: String(created.id) })}::jsonb)`;
  return NextResponse.json({ message: { ...created, sender_name: `${user.firstName} ${user.lastName}` } }, { status: 201 });
}
