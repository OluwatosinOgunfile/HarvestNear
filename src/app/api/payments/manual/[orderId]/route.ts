import { randomUUID } from "node:crypto";

import { del, get, put } from "@vercel/blob";
import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { canMutateAs, checkRateLimit, validImageFile } from "@/lib/security";

const MAX_RECEIPT_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

async function validReceipt(file: File) {
  if (file.type !== "application/pdf") return validImageFile(file);
  const bytes = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  return String.fromCharCode(...bytes) === "%PDF-";
}

export async function GET(_: Request, context: { params: Promise<{ orderId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { orderId } = await context.params;
  const sql = getDatabase();
  const [receipt] = await sql`
    SELECT receipt.blob_url, receipt.mime_type, receipt.original_name
    FROM manual_payment_receipts receipt JOIN orders ON orders.id = receipt.order_id
    WHERE receipt.order_id = ${orderId} AND (${user.role === "admin"} OR orders.customer_id = ${user.id})
  `;
  if (!receipt) return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  const result = await get(String(receipt.blob_url), { access: "private" });
  if (!result || result.statusCode !== 200) return NextResponse.json({ error: "Receipt file not found" }, { status: 404 });
  return new Response(result.stream, { headers: {
    "Content-Type": String(receipt.mime_type),
    "Content-Length": String(result.blob.size),
    "Content-Disposition": `inline; filename="${String(receipt.original_name).replace(/["\r\n]/g, "")}"`,
    "Cache-Control": "private, no-store",
  } });
}

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const user = await getSessionUser();
  if (!user || !["consumer", "farmer"].includes(user.role) || !canMutateAs(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!await checkRateLimit(request, "payment.receipt", 12, 60 * 60, user.id)) return NextResponse.json({ error: "Receipt upload limit reached. Try again later." }, { status: 429 });
  const { orderId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  const sql = getDatabase();
  const [order] = await sql`SELECT id, order_number, status FROM orders WHERE id = ${orderId} AND customer_id = ${user.id}`;
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "pending_payment") return NextResponse.json({ error: "This order is no longer awaiting payment" }, { status: 409 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("receipt");
  if (!(file instanceof File) || !file.size) return NextResponse.json({ error: "Select a payment receipt" }, { status: 400 });
  if (file.size > MAX_RECEIPT_SIZE) return NextResponse.json({ error: "Payment receipts must be 5 MB or smaller" }, { status: 413 });
  if (!ALLOWED_TYPES.has(file.type) || !await validReceipt(file)) return NextResponse.json({ error: "Upload a valid JPG, PNG, WebP, or PDF receipt" }, { status: 400 });
  const extension = file.type === "application/pdf" ? "pdf" : file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const blob = await put(`payment-receipts/${user.id}/${orderId}/${randomUUID()}.${extension}`, file, { access: "private", addRandomSuffix: false });
  try {
    const [previous] = await sql`SELECT blob_url FROM manual_payment_receipts WHERE order_id = ${orderId}`;
    await sql`
      INSERT INTO manual_payment_receipts (order_id, submitted_by, blob_url, original_name, mime_type, size_bytes)
      VALUES (${orderId}, ${user.id}, ${blob.url}, ${file.name.slice(0, 180)}, ${file.type}, ${file.size})
      ON CONFLICT (order_id) DO UPDATE SET blob_url = excluded.blob_url, original_name = excluded.original_name,
        mime_type = excluded.mime_type, size_bytes = excluded.size_bytes, submitted_at = now(), updated_at = now()
    `;
    if (previous?.blob_url && previous.blob_url !== blob.url) await del(String(previous.blob_url)).catch(() => undefined);
    await sql.transaction([
      sql`UPDATE payments SET status = 'pending', payment_channel = 'manual_transfer', provider_response = ${JSON.stringify({ receiptSubmitted: true })}::jsonb, updated_at = now() WHERE order_id = ${orderId}`,
      sql`INSERT INTO notifications (user_id, type, title, message, action_url, metadata) SELECT id, 'account', 'Payment receipt awaiting review', ${`Receipt submitted for order ${order.order_number}. Confirm the bank transfer before releasing the order.`}, '/admin', ${JSON.stringify({ orderId, orderNumber: order.order_number })}::jsonb FROM users WHERE role = 'admin' AND is_active`,
      sql`INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_data) VALUES (${user.id}, 'payment.receipt_submitted', 'order', ${orderId}, ${JSON.stringify({ fileName: file.name, size: file.size })}::jsonb)`,
    ]);
    return NextResponse.json({ submitted: true });
  } catch (error) {
    await del(blob.url).catch(() => undefined);
    console.error("Payment receipt submission failed", error);
    return NextResponse.json({ error: "Could not save the payment receipt" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const administrator = await getSessionUser();
  if (!administrator || administrator.role !== "admin" || !canMutateAs(administrator)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null) as { action?: string } | null;
  if (body?.action !== "confirm") return NextResponse.json({ error: "Invalid payment action" }, { status: 400 });
  const { orderId } = await context.params;
  const sql = getDatabase();
  const [record] = await sql`
    SELECT receipt.blob_url, orders.id, orders.order_number, orders.customer_id, orders.status,
      orders.fulfilment_method, orders.total_kobo
    FROM manual_payment_receipts receipt JOIN orders ON orders.id = receipt.order_id
    WHERE receipt.order_id = ${orderId}
  `;
  if (!record) return NextResponse.json({ error: "No pending receipt was found" }, { status: 404 });
  if (record.status !== "pending_payment") return NextResponse.json({ error: "This order is not awaiting payment" }, { status: 409 });

  const queries = [
    sql`UPDATE orders SET status = 'confirmed', paid_at = now(), updated_at = now() WHERE id = ${orderId} AND status = 'pending_payment'`,
    sql`UPDATE farm_orders SET status = 'confirmed', confirmed_at = now(), updated_at = now() WHERE order_id = ${orderId}`,
    sql`UPDATE order_items SET status = 'confirmed', updated_at = now() WHERE order_id = ${orderId}`,
    sql`UPDATE payments SET status = 'successful', paid_at = now(), provider_response = ${JSON.stringify({ mode: "manual", confirmedBy: administrator.id })}::jsonb, updated_at = now() WHERE order_id = ${orderId}`,
    sql`INSERT INTO notifications (user_id, type, title, message, action_url, metadata) VALUES (${record.customer_id}, 'order', 'Payment confirmed', ${`Your payment for order ${record.order_number} has been confirmed.`}, '/orders', ${JSON.stringify({ orderId, orderNumber: record.order_number })}::jsonb)`,
    sql`INSERT INTO notifications (user_id, type, title, message, action_url, metadata) SELECT DISTINCT farm.owner_id, 'order', 'New order to fulfil', ${`Order ${record.order_number} is paid and ready for fulfilment.`}, '/farmer', ${JSON.stringify({ orderId, orderNumber: record.order_number })}::jsonb FROM farm_orders farm_order JOIN farms farm ON farm.id = farm_order.farm_id WHERE farm_order.order_id = ${orderId}`,
    sql`DELETE FROM manual_payment_receipts WHERE order_id = ${orderId}`,
    sql`INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_data) VALUES (${administrator.id}, 'payment.manually_confirmed', 'order', ${orderId}, ${JSON.stringify({ amountKobo: Number(record.total_kobo) })}::jsonb)`,
  ];
  if (record.fulfilment_method === "doorstep") {
    const deliveryId = randomUUID();
    const trackingCode = `TRK-${String(record.order_number).replace(/^HN-/, "")}`;
    queries.push(sql`INSERT INTO deliveries (id, order_id, status, tracking_code, scheduled_date, window_start, window_end, notes) VALUES (${deliveryId}, ${orderId}, 'scheduled', ${trackingCode}, current_date + 1, '09:00', '13:00', 'Awaiting farm preparation') ON CONFLICT (order_id) DO NOTHING`);
    queries.push(sql`INSERT INTO delivery_events (delivery_id, status, message) SELECT id, 'scheduled', 'Payment confirmed; delivery scheduled' FROM deliveries WHERE order_id = ${orderId}`);
  }
  await sql.transaction(queries);
  await del(String(record.blob_url)).catch((error) => console.error("Confirmed receipt Blob cleanup failed", error));
  return NextResponse.json({ confirmed: true, status: "confirmed" });
}
