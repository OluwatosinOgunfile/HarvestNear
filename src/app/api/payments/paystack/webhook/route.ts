import { createHmac, timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { getDatabase } from "@/lib/db";
import { confirmPaystackPayment, type PaystackTransaction } from "@/lib/paystack";

export async function POST(request: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  const rawBody = await request.text();
  const supplied = request.headers.get("x-paystack-signature") || "";
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  const suppliedBuffer = Buffer.from(supplied, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  const event = JSON.parse(rawBody) as { event?: string; data?: PaystackTransaction };
  const reference = event.data?.reference;
  if (!event.event || !reference) return NextResponse.json({ received: true });
  const sql = getDatabase();
  const eventKey = `${event.event}:${reference}`;
  let [stored] = await sql`INSERT INTO payment_webhook_events (provider, event_key, event_type, payload) VALUES ('paystack', ${eventKey}, ${event.event}, ${rawBody}::jsonb) ON CONFLICT (provider, event_key) DO NOTHING RETURNING id, processed_at`;
  if (!stored) [stored] = await sql`SELECT id, processed_at FROM payment_webhook_events WHERE provider = 'paystack' AND event_key = ${eventKey}`;
  if (stored?.processed_at) return NextResponse.json({ received: true, duplicate: true });
  try {
    if (event.event === "charge.success" && event.data) await confirmPaystackPayment(event.data);
    await sql`UPDATE payment_webhook_events SET processed_at = now() WHERE id = ${stored.id}`;
  } catch (error) {
    await sql`UPDATE payment_webhook_events SET processing_error = ${(error as Error).message || "Processing failed"} WHERE id = ${stored.id}`;
    console.error("Paystack webhook processing failed", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
