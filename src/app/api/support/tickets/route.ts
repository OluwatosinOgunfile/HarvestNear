import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { checkRateLimit, validText } from "@/lib/security";

const categories = new Set(["order", "payment", "delivery", "refund", "account", "farm", "technical", "feedback", "other"]);
const priorities = new Set(["low", "normal", "high", "urgent"]);
const statuses = new Set(["open", "in_progress", "waiting_customer", "resolved", "closed"]);

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const sql = getDatabase();
  const id = request.nextUrl.searchParams.get("id");
  const staff = ["admin", "support"].includes(user.role) && !user.impersonating;
  const tickets = await sql`
    SELECT ticket.*, requester.first_name || ' ' || requester.last_name AS requester_name,
      requester.email AS requester_email,
      assignee.first_name || ' ' || assignee.last_name AS assignee_name,
      orders.order_number,
      coalesce((SELECT json_agg(json_build_object(
        'id', message.id, 'body', message.body, 'is_internal', message.is_internal,
        'created_at', message.created_at, 'author_name', author.first_name || ' ' || author.last_name,
        'author_role', author.role
      ) ORDER BY message.created_at)
      FROM support_ticket_messages message JOIN users author ON author.id = message.author_id
      WHERE message.ticket_id = ticket.id AND (${staff} OR NOT message.is_internal)), '[]') AS messages
    FROM support_tickets ticket
    JOIN users requester ON requester.id = ticket.requester_id
    LEFT JOIN users assignee ON assignee.id = ticket.assigned_to
    LEFT JOIN orders ON orders.id = ticket.order_id
    WHERE (${staff} OR ticket.requester_id = ${user.id})
      AND (${id}::uuid IS NULL OR ticket.id = ${id}::uuid)
    ORDER BY CASE ticket.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
      CASE WHEN ticket.status IN ('open','in_progress','waiting_customer') THEN 0 ELSE 1 END,
      ticket.updated_at DESC
    LIMIT 100
  `;
  const agents = staff ? await sql`SELECT id, first_name || ' ' || last_name AS name FROM users WHERE role IN ('admin','support') AND is_active ORDER BY first_name` : [];
  return NextResponse.json({ tickets, agents, staff });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (!await checkRateLimit(request, "support.ticket", 20, 60 * 60)) return NextResponse.json({ error: "Too many support requests. Try again later." }, { status: 429 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const sql = getDatabase();
  const staff = ["admin", "support"].includes(user.role) && !user.impersonating;

  if (body.ticketId) {
    const message = String(body.message || "").trim();
    if (!validText(message, 4000)) return NextResponse.json({ error: "Enter a reply of up to 4,000 characters" }, { status: 400 });
    const [ticket] = await sql`SELECT id, requester_id, ticket_number FROM support_tickets WHERE id = ${String(body.ticketId)} AND (${staff} OR requester_id = ${user.id}) LIMIT 1`;
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    const internal = staff && Boolean(body.internal);
    await sql.transaction([
      sql`INSERT INTO support_ticket_messages (ticket_id, author_id, body, is_internal) VALUES (${ticket.id}, ${user.id}, ${message}, ${internal})`,
      sql`UPDATE support_tickets SET status = ${staff ? "waiting_customer" : "open"}, updated_at = now() WHERE id = ${ticket.id}`,
      ...(!internal && String(ticket.requester_id) !== user.id ? [sql`INSERT INTO notifications (user_id, type, title, message, action_url, metadata) VALUES (${ticket.requester_id}, 'account', 'Support replied', ${`There is a new reply on ticket ${ticket.ticket_number}.`}, '/help', ${JSON.stringify({ ticketId: String(ticket.id) })}::jsonb)`] : []),
    ]);
    return NextResponse.json({ success: true });
  }

  const subject = String(body.subject || "").trim();
  const message = String(body.message || "").trim();
  const category = String(body.category || "");
  const orderId = body.orderId ? String(body.orderId) : null;
  if (!validText(subject, 180) || !validText(message, 4000) || !categories.has(category)) return NextResponse.json({ error: "Complete the ticket subject, category, and message" }, { status: 400 });
  if (orderId) {
    const [order] = await sql`SELECT id FROM orders WHERE id = ${orderId} AND customer_id = ${user.id} LIMIT 1`;
    if (!order) return NextResponse.json({ error: "That order does not belong to this account" }, { status: 403 });
  }
  const ticketNumber = `HN-${new Date().getFullYear()}-${randomBytes(3).toString("hex").toUpperCase()}`;
  const [ticket] = await sql`INSERT INTO support_tickets (ticket_number, requester_id, subject, category, order_id) VALUES (${ticketNumber}, ${user.id}, ${subject}, ${category}, ${orderId}) RETURNING id, ticket_number`;
  await sql.transaction([
    sql`INSERT INTO support_ticket_messages (ticket_id, author_id, body) VALUES (${ticket.id}, ${user.id}, ${message})`,
    sql`INSERT INTO notifications (user_id, type, title, message, action_url, metadata) SELECT id, 'account', 'New support ticket', ${`${ticketNumber}: ${subject}`}, '/help', ${JSON.stringify({ ticketId: String(ticket.id) })}::jsonb FROM users WHERE role IN ('admin','support') AND is_active`,
  ]);
  return NextResponse.json({ ticket }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || !["admin", "support"].includes(user.role) || user.impersonating) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const id = String(body?.ticketId || "");
  const status = String(body?.status || "");
  const priority = String(body?.priority || "");
  const assigneeId = body?.assigneeId ? String(body.assigneeId) : null;
  if (!id || !statuses.has(status) || !priorities.has(priority)) return NextResponse.json({ error: "Invalid ticket update" }, { status: 400 });
  const sql = getDatabase();
  const [ticket] = await sql`UPDATE support_tickets SET status = ${status}, priority = ${priority}, assigned_to = ${assigneeId}, resolved_at = CASE WHEN ${status} IN ('resolved','closed') THEN coalesce(resolved_at, now()) ELSE NULL END, updated_at = now() WHERE id = ${id} RETURNING id, requester_id, ticket_number`;
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  await sql`INSERT INTO notifications (user_id, type, title, message, action_url, metadata) VALUES (${ticket.requester_id}, 'account', 'Support ticket updated', ${`Ticket ${ticket.ticket_number} is now ${status.replaceAll("_", " ")}.`}, '/help', ${JSON.stringify({ ticketId: id, status })}::jsonb)`;
  return NextResponse.json({ success: true });
}
