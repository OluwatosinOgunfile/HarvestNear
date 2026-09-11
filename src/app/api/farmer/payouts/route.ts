import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { dispatchNotificationEmailsAfterResponse } from "@/lib/notification-email";
import { AUTO_APPROVAL_LIMIT_KOBO, DISPUTE_WINDOW_MINUTES, payoutPolicy, qualifiesForAutomaticPayout } from "@/lib/payouts";
import { canMutateAs, checkRateLimit } from "@/lib/security";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "farmer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const farmId = new URL(request.url).searchParams.get("farmId");
  const requestId = new URL(request.url).searchParams.get("id");
  const sql = getDatabase();
  if (requestId) {
    const rows = await sql`SELECT request.*, farm.name AS farm_name, account.bank_name, account.account_name, account.account_last4,
      count(link.farm_order_id)::int AS order_count,
      coalesce(json_agg(json_build_object('order_number', orders.order_number, 'gross_kobo', farm_order.subtotal_kobo, 'fee_kobo', farm_order.platform_fee_kobo, 'net_kobo', farm_order.farmer_net_kobo) ORDER BY orders.placed_at) FILTER (WHERE farm_order.id IS NOT NULL), '[]') AS orders
      FROM payout_requests request JOIN farms farm ON farm.id=request.farm_id
      LEFT JOIN farmer_payout_accounts account ON account.farm_id=farm.id AND account.is_default
      LEFT JOIN payout_request_orders link ON link.payout_request_id=request.id LEFT JOIN farm_orders farm_order ON farm_order.id=link.farm_order_id LEFT JOIN orders ON orders.id=farm_order.order_id
      WHERE request.id=${requestId} AND farm.owner_id=${user.id} GROUP BY request.id, farm.name, account.bank_name, account.account_name, account.account_last4 LIMIT 1`;
    if (!rows[0]) return NextResponse.json({ error: "Payout request not found" }, { status: 404 });
    return NextResponse.json({ request: rows[0] });
  }
  const requests = await sql`SELECT request.id, request.farm_id, request.gross_amount_kobo, request.platform_fee_kobo, request.net_amount_kobo, request.status, request.approval_mode, request.eligible_at, request.failure_reason, request.review_note, request.requested_at, request.reviewed_at, request.paid_at, count(link.farm_order_id)::int AS order_count
    FROM payout_requests request JOIN farms farm ON farm.id=request.farm_id LEFT JOIN payout_request_orders link ON link.payout_request_id=request.id
    WHERE farm.owner_id=${user.id} AND (${farmId}::uuid IS NULL OR request.farm_id=${farmId}::uuid)
    GROUP BY request.id ORDER BY request.requested_at DESC LIMIT 25`;
  return NextResponse.json({ requests, policy: payoutPolicy() });
}

export async function POST(request: Request) {
  dispatchNotificationEmailsAfterResponse();
  const user = await getSessionUser();
  if (!user || user.role !== "farmer" || !canMutateAs(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!await checkRateLimit(request, "farmer.payout", 5, 60 * 60, user.id)) return NextResponse.json({ error: "Too many payout requests. Try again later." }, { status: 429 });
  const body = await request.json().catch(() => null) as { farmId?: string } | null;
  if (!body?.farmId) return NextResponse.json({ error: "Select a farm" }, { status: 400 });
  const sql = getDatabase();
  const [farm] = await sql`SELECT id, name FROM farms WHERE id=${body.farmId} AND owner_id=${user.id}`;
  if (!farm) return NextResponse.json({ error: "Farm not found" }, { status: 404 });
  const orders = await sql`SELECT farm_order.id, farm_order.subtotal_kobo, farm_order.platform_fee_kobo, farm_order.farmer_net_kobo,
      coalesce((SELECT max(item.received_at) FROM order_items item WHERE item.farm_order_id = farm_order.id), farm_order.updated_at) AS acknowledged_at
    FROM farm_orders farm_order
    WHERE farm_order.farm_id=${farm.id} AND farm_order.status IN ('delivered','collected')
      AND NOT EXISTS (SELECT 1 FROM payouts payout WHERE payout.farm_order_id=farm_order.id)
      AND NOT EXISTS (SELECT 1 FROM payout_request_orders link JOIN payout_requests request ON request.id=link.payout_request_id WHERE link.farm_order_id=farm_order.id AND request.status IN ('requested','processing','paid'))
    ORDER BY farm_order.created_at FOR UPDATE`;
  if (!orders.length) return NextResponse.json({ error: "No fulfilled earnings are currently available for payout" }, { status: 409 });
  const requestId = randomUUID();
  const gross = orders.reduce((sum, order) => sum + Number(order.subtotal_kobo), 0);
  const fee = orders.reduce((sum, order) => sum + Number(order.platform_fee_kobo), 0);
  const net = orders.reduce((sum, order) => sum + Number(order.farmer_net_kobo), 0);
  // Small payouts clear automatically once the dispute window after the last receipt
  // acknowledgement has passed; larger ones still wait for an administrator.
  const automatic = qualifiesForAutomaticPayout(net);
  const acknowledgedAt = orders.reduce((latest, order) => {
    const time = new Date(String(order.acknowledged_at)).getTime();
    return Number.isFinite(time) && time > latest ? time : latest;
  }, 0);
  const eligibleAt = automatic && acknowledgedAt
    ? new Date(acknowledgedAt + DISPUTE_WINDOW_MINUTES * 60_000).toISOString()
    : null;
  const farmerMessage = automatic
    ? `Your payout of NGN ${(net / 100).toLocaleString("en-NG")} for ${farm.name} is scheduled to pay out automatically.`
    : `Your payout request for ${farm.name} is above the NGN ${(AUTO_APPROVAL_LIMIT_KOBO / 100).toLocaleString("en-NG")} automatic limit and has been sent for approval.`;
  try {
    await sql.transaction([
      sql`INSERT INTO payout_requests (id, farm_id, requested_by, gross_amount_kobo, platform_fee_kobo, net_amount_kobo, approval_mode, eligible_at) VALUES (${requestId}, ${farm.id}, ${user.id}, ${gross}, ${fee}, ${net}, ${automatic ? "automatic" : "manual"}, ${eligibleAt})`,
      ...orders.map((order) => sql`INSERT INTO payout_request_orders (payout_request_id, farm_order_id) VALUES (${requestId}, ${order.id})`),
      ...(automatic ? [] : [sql`INSERT INTO notifications (user_id, type, title, message, action_url, metadata) SELECT id, 'payment', 'Payout request needs approval', ${`${farm.name} requested a payout of NGN ${(net/100).toLocaleString("en-NG")}, above the automatic limit.`}, '/admin', ${JSON.stringify({ payoutRequestId: requestId, farmId: String(farm.id), netAmountKobo: net, requiresApproval: true })}::jsonb FROM users WHERE role='admin'`]),
      sql`INSERT INTO notifications (user_id, type, title, message, action_url, metadata) VALUES (${user.id}, 'payment', ${automatic ? "Payout scheduled" : "Payout request submitted"}, ${farmerMessage}, '/farmer', ${JSON.stringify({ payoutRequestId: requestId, farmId: String(farm.id), netAmountKobo: net, automatic })}::jsonb)`,
    ]);
  } catch (error) {
    console.error("Could not create payout request", error);
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (code === "23505") return NextResponse.json({ error: "These earnings are already included in a payout request" }, { status: 409 });
    return NextResponse.json({ error: "Could not submit the payout request. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ request: { id: requestId, status: "requested", approval_mode: automatic ? "automatic" : "manual", eligible_at: eligibleAt, gross_amount_kobo: gross, platform_fee_kobo: fee, net_amount_kobo: net, order_count: orders.length }, policy: payoutPolicy() }, { status: 201 });
}
