import "server-only";

import { randomUUID } from "node:crypto";

import { getDatabase } from "@/lib/db";

const PAYSTACK_API = "https://api.paystack.co";

export type PaystackTransaction = {
  id: number;
  status: string;
  reference: string;
  amount: number;
  currency: string;
  paid_at: string | null;
  channel: string | null;
  fees: number | null;
  gateway_response?: string;
};

function secretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("Paystack is not configured");
  return key;
}

export function paystackEnabled() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

export async function initializePaystackTransaction(input: { email: string; amount: number; reference: string; callbackUrl: string; orderId: string; orderNumber: string }) {
  const response = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secretKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email,
      amount: String(input.amount),
      currency: "NGN",
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: JSON.stringify({ order_id: input.orderId, order_number: input.orderNumber }),
    }),
    cache: "no-store",
  });
  const result = await response.json().catch(() => null) as { status?: boolean; message?: string; data?: { authorization_url?: string; access_code?: string; reference?: string } } | null;
  if (!response.ok || !result?.status || !result.data?.authorization_url) throw new Error(result?.message || "Paystack could not start the payment");
  return result.data;
}

export async function verifyPaystackTransaction(reference: string) {
  const response = await fetch(`${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
    cache: "no-store",
  });
  const result = await response.json().catch(() => null) as { status?: boolean; message?: string; data?: PaystackTransaction } | null;
  if (!response.ok || !result?.status || !result.data) throw new Error(result?.message || "Paystack could not verify the payment");
  return result.data;
}

export async function confirmPaystackPayment(transaction: PaystackTransaction) {
  const sql = getDatabase();
  const [record] = await sql`
    SELECT payment.id AS payment_id, payment.order_id, payment.amount_kobo, payment.status AS payment_status,
      orders.order_number, orders.customer_id, orders.status AS order_status, orders.fulfilment_method
    FROM payments payment JOIN orders ON orders.id = payment.order_id
    WHERE payment.provider = 'paystack' AND payment.provider_reference = ${transaction.reference}
    LIMIT 1
  `;
  if (!record) throw new Error("Payment reference was not found");
  if (transaction.status !== "success") throw new Error("Payment has not been completed");
  if (transaction.currency !== "NGN" || Number(transaction.amount) !== Number(record.amount_kobo)) throw new Error("Payment amount verification failed");
  if (record.payment_status === "successful" && record.order_status !== "pending_payment") return { orderId: String(record.order_id), orderNumber: String(record.order_number), alreadyConfirmed: true };

  const responseSnapshot = JSON.stringify(transaction);
  const queries = [
    sql`UPDATE payments SET status = 'successful', paid_at = ${transaction.paid_at || new Date().toISOString()}, payment_channel = ${transaction.channel || null}, provider_fee_kobo = ${transaction.fees ?? null}, provider_response = ${responseSnapshot}::jsonb, updated_at = now() WHERE id = ${record.payment_id}`,
    sql`UPDATE orders SET status = 'confirmed', paid_at = coalesce(paid_at, ${transaction.paid_at || new Date().toISOString()}), updated_at = now() WHERE id = ${record.order_id} AND status = 'pending_payment'`,
    sql`UPDATE farm_orders SET status = 'confirmed', confirmed_at = coalesce(confirmed_at, now()), updated_at = now() WHERE order_id = ${record.order_id} AND status = 'pending_payment'`,
    sql`UPDATE order_items SET status = 'confirmed', updated_at = now() WHERE order_id = ${record.order_id} AND status = 'pending_payment'`,
    sql`INSERT INTO notifications (user_id, type, title, message, action_url, metadata) SELECT ${record.customer_id}, 'order', 'Paystack payment confirmed', ${`Your payment for order ${record.order_number} has been confirmed.`}, '/orders', ${JSON.stringify({ orderId: String(record.order_id), orderNumber: String(record.order_number), provider: "paystack" })}::jsonb WHERE ${record.order_status} = 'pending_payment'`,
    sql`INSERT INTO notifications (user_id, type, title, message, action_url, metadata) SELECT DISTINCT farm.owner_id, 'order', 'New order to fulfil', ${`Order ${record.order_number} is paid and ready for fulfilment.`}, '/farmer', ${JSON.stringify({ orderId: String(record.order_id), orderNumber: String(record.order_number) })}::jsonb FROM farm_orders farm_order JOIN farms farm ON farm.id = farm_order.farm_id WHERE farm_order.order_id = ${record.order_id} AND ${record.order_status} = 'pending_payment'`,
    sql`INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_data) VALUES (${record.customer_id}, 'payment.paystack_confirmed', 'order', ${record.order_id}, ${JSON.stringify({ reference: transaction.reference, amountKobo: transaction.amount, channel: transaction.channel })}::jsonb)`,
  ];
  if (["doorstep", "farmer_delivery"].includes(String(record.fulfilment_method))) {
    const deliveryId = randomUUID();
    const trackingCode = `TRK-${String(record.order_number).replace(/^HN-/, "")}`;
    queries.push(sql`INSERT INTO deliveries (id, order_id, status, tracking_code, notes) VALUES (${deliveryId}, ${record.order_id}, 'scheduled', ${trackingCode}, 'Paystack payment confirmed; awaiting farm preparation') ON CONFLICT (order_id) DO NOTHING`);
    queries.push(sql`INSERT INTO delivery_events (delivery_id, status, message) SELECT id, 'scheduled', 'Paystack payment confirmed; delivery scheduled' FROM deliveries WHERE order_id = ${record.order_id} AND NOT EXISTS (SELECT 1 FROM delivery_events WHERE delivery_id = deliveries.id AND message = 'Paystack payment confirmed; delivery scheduled')`);
  }
  await sql.transaction(queries);
  return { orderId: String(record.order_id), orderNumber: String(record.order_number), alreadyConfirmed: false };
}
