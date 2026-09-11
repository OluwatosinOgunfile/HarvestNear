import "server-only";

import { getDatabase } from "@/lib/db";
import { initiatePaystackTransfer, paystackEnabled, paystackNairaBalanceKobo, verifyPaystackTransfer } from "@/lib/paystack";

// Payouts at or below this net amount are transferred without an administrator; anything larger
// waits for approval. Fast payout is a product promise, so the dispute window after the customer
// acknowledges receipt is deliberately short rather than the multi-day hold a marketplace
// typically uses. Both are environment-tunable without a deploy.
export const AUTO_APPROVAL_LIMIT_KOBO = Math.max(0, Number(process.env.PAYOUT_AUTO_APPROVAL_LIMIT_KOBO || 5_000_000));
export const DISPUTE_WINDOW_MINUTES = Math.max(0, Number(process.env.PAYOUT_DISPUTE_WINDOW_MINUTES || 60));
const STALE_TRANSFER_MINUTES = 15;
const MAX_TRANSFER_ATTEMPTS = 3;

export function payoutPolicy() {
  return {
    autoApprovalLimitKobo: AUTO_APPROVAL_LIMIT_KOBO,
    disputeWindowMinutes: DISPUTE_WINDOW_MINUTES,
    automaticPaymentAvailable: paystackEnabled(),
  };
}

export function qualifiesForAutomaticPayout(netAmountKobo: number) {
  return paystackEnabled() && netAmountKobo > 0 && netAmountKobo <= AUTO_APPROVAL_LIMIT_KOBO;
}

type ClaimedRequest = {
  id: string;
  farm_id: string;
  requested_by: string;
  net_amount_kobo: string | number;
  transfer_reference: string;
  recipient_code: string;
  payout_account_id: string;
  farm_name: string;
};

async function releaseClaim(requestId: string, reason: string) {
  const sql = getDatabase();
  await sql`
    UPDATE payout_requests
    SET status = 'requested', transfer_reference = NULL, transfer_code = NULL, transfer_started_at = NULL,
      failure_reason = ${reason.slice(0, 500)}, updated_at = now()
    WHERE id = ${requestId} AND status = 'processing'
  `;
}

/**
 * Claims one eligible request by flipping it to processing in a single statement, so two
 * overlapping runs can never pay the same farm twice. The reference carries the attempt count
 * because Paystack rejects a reused transfer reference after a failure.
 */
async function claimNextRequest(): Promise<ClaimedRequest | null> {
  const sql = getDatabase();
  const [claimed] = await sql`
    UPDATE payout_requests request
    SET status = 'processing',
      approval_mode = 'automatic',
      transfer_attempts = request.transfer_attempts + 1,
      transfer_reference = 'PAYOUT-' || replace(request.id::text, '-', '') || '-' || (request.transfer_attempts + 1),
      transfer_started_at = now(),
      failure_reason = NULL,
      updated_at = now()
    FROM farms farm, farmer_payout_accounts account
    WHERE request.id = (
      SELECT candidate.id
      FROM payout_requests candidate
      JOIN farms candidate_farm ON candidate_farm.id = candidate.farm_id
      JOIN farmer_payout_accounts candidate_account ON candidate_account.farm_id = candidate.farm_id AND candidate_account.is_default
      WHERE candidate.status = 'requested'
        AND candidate.net_amount_kobo <= ${AUTO_APPROVAL_LIMIT_KOBO}
        AND candidate.transfer_attempts < ${MAX_TRANSFER_ATTEMPTS}
        AND candidate.eligible_at IS NOT NULL
        AND candidate.eligible_at <= now()
        AND candidate_farm.verification_status = 'verified'
        AND candidate_account.recipient_code <> ''
        AND NOT EXISTS (
          SELECT 1 FROM payout_request_orders link
          JOIN farm_orders farm_order ON farm_order.id = link.farm_order_id
          JOIN orders ON orders.id = farm_order.order_id
          WHERE link.payout_request_id = candidate.id
            AND (
              farm_order.status NOT IN ('delivered', 'collected')
              OR orders.status IN ('cancelled', 'refunded')
              OR EXISTS (SELECT 1 FROM refunds refund WHERE refund.order_id = orders.id AND refund.status IN ('requested', 'under_review', 'approved', 'processing'))
              OR EXISTS (SELECT 1 FROM support_tickets ticket WHERE ticket.order_id = orders.id AND ticket.status NOT IN ('resolved', 'closed'))
            )
        )
      ORDER BY candidate.eligible_at
      LIMIT 1
      FOR UPDATE OF candidate SKIP LOCKED
    )
      AND request.status = 'requested'
      AND farm.id = request.farm_id
      AND account.farm_id = request.farm_id AND account.is_default
    RETURNING request.id, request.farm_id, request.requested_by, request.net_amount_kobo,
      request.transfer_reference, account.recipient_code, account.id AS payout_account_id, farm.name AS farm_name
  `;
  return (claimed as ClaimedRequest | undefined) || null;
}

/** Recovers requests left in processing when a run died between claiming and confirmation. */
async function reconcileStaleTransfers() {
  const sql = getDatabase();
  const stale = await sql`
    SELECT id, transfer_reference FROM payout_requests
    WHERE status = 'processing' AND approval_mode = 'automatic' AND transfer_reference IS NOT NULL
      AND transfer_started_at < now() - (${STALE_TRANSFER_MINUTES} * interval '1 minute')
    LIMIT 10
  `;
  let recovered = 0;
  for (const request of stale) {
    try {
      const transfer = await verifyPaystackTransfer(String(request.transfer_reference));
      if (transfer.status === "success") { await completePayout(String(request.transfer_reference), transfer.transfer_code); recovered += 1; }
      else if (["failed", "reversed", "abandoned"].includes(transfer.status)) { await failPayout(String(request.transfer_reference), `Transfer ${transfer.status}`); recovered += 1; }
    } catch (error) {
      // A transfer Paystack has never seen was claimed but never sent, so it can be retried.
      if (String((error as Error).message).toLowerCase().includes("not found")) { await releaseClaim(String(request.id), "Transfer was never submitted"); recovered += 1; }
    }
  }
  return recovered;
}

/** Mirrors the administrator "paid" transition so both paths leave the same audit trail. */
export async function completePayout(transferReference: string, transferCode?: string | null) {
  const sql = getDatabase();
  const [request] = await sql`
    SELECT request.id, request.farm_id, request.requested_by, request.net_amount_kobo, request.status,
      account.id AS payout_account_id, farm.name AS farm_name
    FROM payout_requests request
    JOIN farms farm ON farm.id = request.farm_id
    LEFT JOIN farmer_payout_accounts account ON account.farm_id = request.farm_id AND account.is_default
    WHERE request.transfer_reference = ${transferReference} LIMIT 1
  `;
  if (!request) return { applied: false, reason: "unknown_reference" as const };
  if (request.status === "paid") return { applied: false, reason: "already_paid" as const };
  if (!request.payout_account_id) return { applied: false, reason: "no_payout_account" as const };

  await sql.transaction([
    sql`UPDATE payout_requests SET status = 'paid', transfer_code = coalesce(${transferCode || null}, transfer_code),
      reviewed_at = coalesce(reviewed_at, now()), paid_at = coalesce(paid_at, now()), failure_reason = NULL, updated_at = now()
      WHERE id = ${request.id} AND status <> 'paid'`,
    sql`INSERT INTO payouts (farm_order_id, payout_account_id, provider_reference, amount_kobo, status, paid_at)
      SELECT link.farm_order_id, ${request.payout_account_id}, ${transferReference} || '-' || row_number() OVER (ORDER BY link.farm_order_id),
        farm_order.farmer_net_kobo, 'successful', now()
      FROM payout_request_orders link JOIN farm_orders farm_order ON farm_order.id = link.farm_order_id
      WHERE link.payout_request_id = ${request.id} ON CONFLICT (farm_order_id) DO NOTHING`,
    sql`INSERT INTO notifications (user_id, type, title, message, action_url, metadata) VALUES
      (${request.requested_by}, 'payment', 'Payout paid',
      ${`NGN ${(Number(request.net_amount_kobo) / 100).toLocaleString("en-NG")} has been sent to the ${String(request.farm_name)} payout account.`}, '/farmer',
      ${JSON.stringify({ payoutRequestId: String(request.id), status: "paid", automatic: true, transferReference })}::jsonb)`,
    sql`INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_data) VALUES
      (${request.requested_by}, 'payout.auto_paid', 'payout', ${request.id},
      ${JSON.stringify({ status: "paid", transferReference, netAmountKobo: Number(request.net_amount_kobo) })}::jsonb)`,
  ]);
  return { applied: true, requestId: String(request.id) };
}

/** Returns a failed transfer to the queue, or to administrators once retries are exhausted. */
export async function failPayout(transferReference: string, reason: string) {
  const sql = getDatabase();
  const [request] = await sql`
    SELECT request.id, request.requested_by, request.transfer_attempts, request.status, farm.name AS farm_name
    FROM payout_requests request JOIN farms farm ON farm.id = request.farm_id
    WHERE request.transfer_reference = ${transferReference} LIMIT 1
  `;
  if (!request || request.status === "paid") return { applied: false };
  const exhausted = Number(request.transfer_attempts) >= MAX_TRANSFER_ATTEMPTS;
  await sql.transaction([
    sql`UPDATE payout_requests SET status = 'requested', approval_mode = ${exhausted ? "manual" : "automatic"},
      transfer_reference = NULL, transfer_code = NULL, transfer_started_at = NULL,
      failure_reason = ${reason.slice(0, 500)}, updated_at = now()
      WHERE id = ${request.id} AND status <> 'paid'`,
    sql`INSERT INTO notifications (user_id, type, title, message, action_url, metadata) VALUES
      (${request.requested_by}, 'payment', 'Payout could not be sent',
      ${`The payout for ${String(request.farm_name)} could not be completed: ${reason}. ${exhausted ? "Our team is reviewing it." : "It will be retried shortly."}`}, '/farmer',
      ${JSON.stringify({ payoutRequestId: String(request.id), status: "requested", reason })}::jsonb)`,
    ...(exhausted ? [sql`INSERT INTO notifications (user_id, type, title, message, action_url, metadata)
      SELECT id, 'payment', 'Automatic payout failed',
      ${`${String(request.farm_name)} could not be paid automatically after ${MAX_TRANSFER_ATTEMPTS} attempts: ${reason}`}, '/admin',
      ${JSON.stringify({ payoutRequestId: String(request.id), reason })}::jsonb FROM users WHERE role = 'admin'`] : []),
    sql`INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_data) VALUES
      (${request.requested_by}, 'payout.auto_failed', 'payout', ${request.id},
      ${JSON.stringify({ reason, attempts: Number(request.transfer_attempts), exhausted })}::jsonb)`,
  ]);
  return { applied: true, exhausted };
}

export async function applyPaystackTransferEvent(eventName: string, data: { reference?: string; transfer_code?: string; status?: string; message?: string }) {
  const reference = data.reference;
  if (!reference) return;
  if (eventName === "transfer.success") { await completePayout(reference, data.transfer_code); return; }
  if (eventName === "transfer.failed" || eventName === "transfer.reversed") {
    await failPayout(reference, data.message || `Paystack reported the transfer as ${eventName.replace("transfer.", "")}`);
  }
}

export async function runAutomaticPayouts(options?: { maxTransfers?: number }) {
  const summary = { claimed: 0, submitted: 0, skipped: 0, recovered: 0, failures: [] as string[], balanceKobo: 0 };
  if (!paystackEnabled()) return { ...summary, skippedReason: "paystack_not_configured" as const };

  summary.recovered = await reconcileStaleTransfers();

  try {
    summary.balanceKobo = await paystackNairaBalanceKobo();
  } catch (error) {
    return { ...summary, skippedReason: "balance_unavailable" as const, failures: [(error as Error).message] };
  }

  const ceiling = Math.max(1, Math.min(options?.maxTransfers ?? 25, 50));
  let remainingBalance = summary.balanceKobo;

  for (let index = 0; index < ceiling; index += 1) {
    const request = await claimNextRequest();
    if (!request) break;
    summary.claimed += 1;
    const amount = Number(request.net_amount_kobo);
    if (amount > remainingBalance) {
      await releaseClaim(request.id, "Insufficient platform balance for this payout");
      summary.skipped += 1;
      break;
    }
    try {
      const transfer = await initiatePaystackTransfer({
        amountKobo: amount,
        recipientCode: request.recipient_code,
        reference: request.transfer_reference,
        reason: `HarvestNearU payout for ${request.farm_name}`,
      });
      const sql = getDatabase();
      await sql`UPDATE payout_requests SET transfer_code = ${transfer.transfer_code}, updated_at = now() WHERE id = ${request.id}`;
      // Paystack can settle instantly; the webhook is still the authority for terminal state.
      if (transfer.status === "success") await completePayout(request.transfer_reference, transfer.transfer_code);
      remainingBalance -= amount;
      summary.submitted += 1;
    } catch (error) {
      const message = (error as Error).message || "Transfer failed";
      await failPayout(request.transfer_reference, message);
      summary.failures.push(`${request.farm_name}: ${message}`);
    }
  }
  return summary;
}
