import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { canMutateAs, checkRateLimit } from "@/lib/security";

const CANCELLATION_FEE_KOBO = 50_000;

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !["consumer", "farmer"].includes(user.role) || !canMutateAs(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!await checkRateLimit(request, "orders.cancel", 10, 60 * 60, user.id)) return NextResponse.json({ error: "Cancellation limit reached. Try again later." }, { status: 429 });
  const body = await request.json().catch(() => null) as { orderId?: string; resolutionMethod?: string; bankName?: string; accountName?: string; accountNumber?: string } | null;
  if (!body?.orderId || !/^[0-9a-f-]{36}$/i.test(body.orderId) || !["bank_refund", "store_credit"].includes(body.resolutionMethod || "")) return NextResponse.json({ error: "Choose a valid cancellation option" }, { status: 400 });
  const sql = getDatabase();
  const [order] = await sql`
    SELECT orders.id, orders.order_number, orders.total_kobo, orders.discount_kobo, orders.status, payments.id AS payment_id,
      EXISTS (SELECT 1 FROM manual_payment_receipts receipt WHERE receipt.order_id = orders.id) AS receipt_submitted
    FROM orders LEFT JOIN LATERAL (SELECT id FROM payments WHERE order_id = orders.id ORDER BY created_at DESC LIMIT 1) payments ON true
    WHERE orders.id = ${body.orderId} AND orders.customer_id = ${user.id}
  `;
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "pending_payment" || !order.receipt_submitted) return NextResponse.json({ error: "Only a paid order awaiting administrator review can be cancelled here" }, { status: 409 });
  const storeCredit = body.resolutionMethod === "store_credit";
  if (!storeCredit && (!body.bankName?.trim() || body.bankName.length > 120 || !body.accountName?.trim() || body.accountName.length > 160 || !body.accountNumber?.trim() || !/^[0-9 -]{6,30}$/.test(body.accountNumber))) return NextResponse.json({ error: "Enter valid bank refund details" }, { status: 400 });
  if (!storeCredit && Number(order.total_kobo) <= CANCELLATION_FEE_KOBO) return NextResponse.json({ error: "This order is not eligible for a bank refund after the cancellation fee. Choose account credit instead." }, { status: 409 });
  const feeKobo = storeCredit ? 0 : CANCELLATION_FEE_KOBO;
  const amountKobo = Number(order.total_kobo) - feeKobo;
  const refundDestination = storeCredit ? null : JSON.stringify({ bankName: body.bankName!.trim(), accountName: body.accountName!.trim(), accountNumber: body.accountNumber!.replaceAll(" ", "").replaceAll("-", "") });
  const refundId = crypto.randomUUID();
  const metadata = JSON.stringify({ orderId: body.orderId, orderNumber: order.order_number, resolutionMethod: body.resolutionMethod, amountKobo, cancellationFeeKobo: feeKobo });
  const queries = [
    sql`UPDATE orders SET status = 'cancelled', cancelled_at = now(), updated_at = now() WHERE id = ${body.orderId} AND status = 'pending_payment'`,
    sql`UPDATE farm_orders SET status = 'cancelled', updated_at = now() WHERE order_id = ${body.orderId}`,
    sql`UPDATE produce_listings listing SET quantity_available = listing.quantity_available + restored.quantity, quantity_sold = greatest(0, listing.quantity_sold - restored.quantity), status = CASE WHEN listing.status = 'sold_out' THEN 'active'::listing_status ELSE listing.status END, version = version + 1, updated_at = now() FROM (SELECT listing_id, sum(quantity) AS quantity FROM order_items WHERE order_id = ${body.orderId} AND listing_id IS NOT NULL GROUP BY listing_id) restored WHERE listing.id = restored.listing_id`,
    sql`INSERT INTO refunds (id, order_id, payment_id, requested_by, status, reason, amount_kobo, resolution_method, cancellation_fee_kobo, refund_destination) VALUES (${refundId}, ${body.orderId}, ${order.payment_id || null}, ${user.id}, 'requested', 'Customer cancelled before manual payment review', ${amountKobo}, ${body.resolutionMethod}, ${feeKobo}, ${refundDestination}::jsonb)`,
    sql`INSERT INTO notifications (user_id, type, title, message, action_url, metadata) VALUES (${user.id}, 'order', 'Cancellation submitted', ${storeCredit ? `Order ${order.order_number} was cancelled. Your full payment will become account credit after review.` : `Order ${order.order_number} was cancelled. Your bank refund request is ${amountKobo / 100} NGN after the 500 NGN cancellation fee.`}, '/orders', ${metadata}::jsonb)`,
    sql`INSERT INTO notifications (user_id, type, title, message, action_url, metadata) SELECT id, 'account', 'Cancelled payment needs review', ${`Review the receipt and ${storeCredit ? "issue account credit" : "process the bank refund"} for order ${order.order_number}.`}, '/admin', ${metadata}::jsonb FROM users WHERE role = 'admin' AND is_active`,
    sql`INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_data) VALUES (${user.id}, 'order.cancelled_before_payment_review', 'order', ${body.orderId}, ${metadata}::jsonb)`,
  ];
  if (Number(order.discount_kobo) > 0) queries.push(sql`INSERT INTO store_credit_accounts (user_id, balance_kobo) VALUES (${user.id}, ${order.discount_kobo}) ON CONFLICT (user_id) DO UPDATE SET balance_kobo = store_credit_accounts.balance_kobo + excluded.balance_kobo, updated_at = now()`);
  if (Number(order.discount_kobo) > 0) queries.push(sql`INSERT INTO store_credit_transactions (user_id, amount_kobo, transaction_type, reference_type, reference_id, description) VALUES (${user.id}, ${order.discount_kobo}, 'adjustment', 'order', ${body.orderId}, 'Account credit restored after order cancellation')`);
  await sql.transaction(queries);
  return NextResponse.json({ cancelled: true, refundId, resolutionMethod: body.resolutionMethod, amountKobo, cancellationFeeKobo: feeKobo });
}
