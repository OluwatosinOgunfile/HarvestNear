import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { initializePaystackTransaction, paystackEnabled } from "@/lib/paystack";
import { canMutateAs, checkRateLimit } from "@/lib/security";

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || !["consumer", "farmer"].includes(user.role) || !canMutateAs(user)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!paystackEnabled()) return NextResponse.json({ error: "Paystack is not currently available" }, { status: 503 });
  if (!await checkRateLimit(request, "payment.paystack.initialize", 12, 10 * 60, user.id)) return NextResponse.json({ error: "Too many payment attempts. Try again shortly." }, { status: 429 });
  const body = await request.json().catch(() => null) as { orderId?: string; client?: string } | null;
  if (!body?.orderId) return NextResponse.json({ error: "Order is required" }, { status: 400 });
  const returnClient = body.client === "mobile" ? "mobile" : "web";

  const sql = getDatabase();
  const [order] = await sql`
    SELECT orders.id, orders.order_number, orders.total_kobo, orders.status, users.email,
      payment.id AS payment_id, payment.provider_reference, payment.authorization_url, payment.status AS payment_status, payment.provider_response
    FROM orders JOIN users ON users.id = orders.customer_id
    LEFT JOIN LATERAL (SELECT id, provider_reference, authorization_url, status, provider_response FROM payments WHERE order_id = orders.id AND provider = 'paystack' ORDER BY created_at DESC LIMIT 1) payment ON true
    WHERE orders.id = ${body.orderId} AND orders.customer_id = ${user.id}
  `;
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "pending_payment") return NextResponse.json({ error: "This order is not awaiting payment" }, { status: 409 });
  if (Number(order.total_kobo) <= 0) return NextResponse.json({ error: "This order does not require a Paystack payment" }, { status: 409 });
  const previousClient = order.provider_response?.returnClient === "mobile" ? "mobile" : "web";
  const needsNewSession = Boolean(order.authorization_url && previousClient !== returnClient);
  if (order.authorization_url && !["failed", "abandoned"].includes(String(order.payment_status)) && !needsNewSession) return NextResponse.json({ authorizationUrl: order.authorization_url, reference: order.provider_reference, orderNumber: order.order_number });

  const reference = ["failed", "abandoned"].includes(String(order.payment_status)) || !order.provider_reference || needsNewSession
    ? `HNU-${String(order.order_number).replace(/[^a-z0-9]/gi, "")}-${randomUUID().slice(0, 8)}`
    : order.provider_reference;
  if (needsNewSession) await sql`UPDATE payments SET status = 'abandoned', updated_at = now() WHERE id = ${order.payment_id} AND status IN ('initialized', 'pending')`;
  if (!order.payment_id || ["failed", "abandoned"].includes(String(order.payment_status)) || needsNewSession) {
    await sql`INSERT INTO payments (order_id, provider, provider_reference, status, amount_kobo, payment_channel, provider_response) VALUES (${order.id}, 'paystack', ${reference}, 'initialized', ${order.total_kobo}, 'paystack_checkout', '{}'::jsonb)`;
  }
  const siteUrl = process.env.APP_URL || request.nextUrl.origin;
  try {
    const transaction = await initializePaystackTransaction({
      email: String(order.email), amount: Number(order.total_kobo), reference: String(reference),
      callbackUrl: `${siteUrl}/api/payments/paystack/callback?client=${returnClient}`, orderId: String(order.id), orderNumber: String(order.order_number),
    });
    await sql`UPDATE payments SET authorization_url = ${transaction.authorization_url}, provider_response = ${JSON.stringify({ accessCode: transaction.access_code, returnClient })}::jsonb, updated_at = now() WHERE order_id = ${order.id} AND provider = 'paystack' AND provider_reference = ${reference}`;
    return NextResponse.json({ authorizationUrl: transaction.authorization_url, reference, orderNumber: order.order_number });
  } catch (error) {
    await sql`UPDATE payments SET status = 'failed', provider_response = ${JSON.stringify({ initializationError: (error as Error).message })}::jsonb, updated_at = now() WHERE order_id = ${order.id} AND provider = 'paystack' AND provider_reference = ${reference}`;
    return NextResponse.json({ error: (error as Error).message || "Could not start Paystack" }, { status: 502 });
  }
}
