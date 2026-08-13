import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { canMutateAs, checkRateLimit } from "@/lib/security";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "farmer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const farmId = new URL(request.url).searchParams.get("farmId");
  const sql = getDatabase();
  const requests = await sql`SELECT request.id, request.farm_id, request.gross_amount_kobo, request.platform_fee_kobo, request.net_amount_kobo, request.status, request.review_note, request.requested_at, request.reviewed_at, request.paid_at, count(link.farm_order_id)::int AS order_count
    FROM payout_requests request JOIN farms farm ON farm.id=request.farm_id LEFT JOIN payout_request_orders link ON link.payout_request_id=request.id
    WHERE farm.owner_id=${user.id} AND (${farmId}::uuid IS NULL OR request.farm_id=${farmId}::uuid)
    GROUP BY request.id ORDER BY request.requested_at DESC LIMIT 25`;
  return NextResponse.json({ requests });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "farmer" || !canMutateAs(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!await checkRateLimit(request, "farmer.payout", 5, 60 * 60, user.id)) return NextResponse.json({ error: "Too many payout requests. Try again later." }, { status: 429 });
  const body = await request.json().catch(() => null) as { farmId?: string } | null;
  if (!body?.farmId) return NextResponse.json({ error: "Select a farm" }, { status: 400 });
  const sql = getDatabase();
  const [farm] = await sql`SELECT id, name FROM farms WHERE id=${body.farmId} AND owner_id=${user.id}`;
  if (!farm) return NextResponse.json({ error: "Farm not found" }, { status: 404 });
  const orders = await sql`SELECT farm_order.id, farm_order.subtotal_kobo, farm_order.platform_fee_kobo, farm_order.farmer_net_kobo FROM farm_orders farm_order
    WHERE farm_order.farm_id=${farm.id} AND farm_order.status IN ('delivered','collected')
      AND NOT EXISTS (SELECT 1 FROM payouts payout WHERE payout.farm_order_id=farm_order.id)
      AND NOT EXISTS (SELECT 1 FROM payout_request_orders link JOIN payout_requests request ON request.id=link.payout_request_id WHERE link.farm_order_id=farm_order.id AND request.status IN ('requested','processing','paid'))
    ORDER BY farm_order.created_at FOR UPDATE`;
  if (!orders.length) return NextResponse.json({ error: "No fulfilled earnings are currently available for payout" }, { status: 409 });
  const requestId = randomUUID();
  const gross = orders.reduce((sum, order) => sum + Number(order.subtotal_kobo), 0);
  const fee = orders.reduce((sum, order) => sum + Number(order.platform_fee_kobo), 0);
  const net = orders.reduce((sum, order) => sum + Number(order.farmer_net_kobo), 0);
  await sql.transaction([
    sql`INSERT INTO payout_requests (id, farm_id, requested_by, gross_amount_kobo, platform_fee_kobo, net_amount_kobo) VALUES (${requestId}, ${farm.id}, ${user.id}, ${gross}, ${fee}, ${net})`,
    ...orders.map((order) => sql`INSERT INTO payout_request_orders (payout_request_id, farm_order_id) VALUES (${requestId}, ${order.id})`),
    sql`INSERT INTO notifications (user_id, type, title, message, action_url, metadata) SELECT id, 'payment', 'New farmer payout request', ${`${farm.name} requested a payout of NGN ${(net/100).toLocaleString("en-NG")}.`}, '/admin', ${JSON.stringify({ payoutRequestId: requestId, farmId: String(farm.id), netAmountKobo: net })}::jsonb FROM users WHERE role='admin' AND status='active'`,
    sql`INSERT INTO notifications (user_id, type, title, message, action_url, metadata) VALUES (${user.id}, 'payment', 'Payout request submitted', ${`Your payout request for ${farm.name} has been submitted for review.`}, '/farmer', ${JSON.stringify({ payoutRequestId: requestId, farmId: String(farm.id), netAmountKobo: net })}::jsonb)`,
  ]);
  return NextResponse.json({ request: { id: requestId, status: "requested", gross_amount_kobo: gross, platform_fee_kobo: fee, net_amount_kobo: net, order_count: orders.length } }, { status: 201 });
}
