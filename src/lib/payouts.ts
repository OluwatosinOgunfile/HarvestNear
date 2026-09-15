import "server-only";

import { getDatabase } from "@/lib/db";
import { initiatePaystackTransfer, paystackEnabled, paystackNairaBalanceKobo, verifyPaystackTransfer } from "@/lib/paystack";

// Every payout starts with the farmer asking for it; nothing here creates a request. What these
// control is the money movement afterwards. A request at or below the automatic limit is transferred
// without an administrator once the dispute window has passed; anything larger is transferred only
// after an administrator releases it, and then travels the same audited path rather than being
// settled by hand. Fast payout is a product promise, so the dispute window after the customer
// acknowledges receipt is deliberately short rather than the multi-day hold a marketplace typically
// uses. All of these are environment-tunable without a deploy: raising the automatic limit above the
// largest payout you expect makes every amount automatic, and lowering it to 0 sends every payout
// through a person.
export const AUTO_APPROVAL_LIMIT_KOBO = Math.max(0, Number(process.env.PAYOUT_AUTO_APPROVAL_LIMIT_KOBO || 5_000_000));
export const DISPUTE_WINDOW_MINUTES = Math.max(0, Number(process.env.PAYOUT_DISPUTE_WINDOW_MINUTES || 60));

// Money is being moved without a person watching, so three limits bound what a single mistake or a
// stolen farmer login can achieve.
//
// A destination account that has just been added or changed is the shape an account takeover takes:
// the earnings are real, but the bank details are the attacker's. Automatic transfer therefore waits
// until the default payout account has been in place this long. An administrator release bypasses
// the wait, because that release *is* the human check, so a genuinely new farm is paid as soon as
// someone looks at its first request rather than being stuck for a day.
const ACCOUNT_SETTLED_HOURS = Math.max(0, Number(process.env.PAYOUT_ACCOUNT_SETTLED_HOURS || 24));
// A floor the automation will not spend below. Transfers draw on the Paystack NGN balance with
// source: "balance", and Paystack's own transfer fee comes out of it too, so a balance exactly equal
// to a payout is not enough to send it. Bank refunds are settled by a person from the same account
// and nothing in the code sets money aside for them. Zero by default, which is the behaviour before
// this existed; set it once there is a float worth protecting.
const BALANCE_RESERVE_KOBO = Math.max(0, Number(process.env.PAYOUT_BALANCE_RESERVE_KOBO || 0));
// A ceiling on the total value one run may move, so a runaway loop cannot empty the balance. The
// first transfer of a run is always allowed through, or a single large release could never send.
const RUN_VALUE_CEILING_KOBO = Math.max(0, Number(process.env.PAYOUT_RUN_CEILING_KOBO || 100_000_000));

const STALE_TRANSFER_MINUTES = 15;
const MAX_TRANSFER_ATTEMPTS = 3;

export function payoutPolicy() {
  return {
    autoApprovalLimitKobo: AUTO_APPROVAL_LIMIT_KOBO,
    disputeWindowMinutes: DISPUTE_WINDOW_MINUTES,
    accountSettledHours: ACCOUNT_SETTLED_HOURS,
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
 *
 * This only ever claims a request a farmer already submitted: nothing in this file creates one. A
 * request must additionally still be clean at the moment of transfer, not merely when it was
 * approved, so the checks below re-test the farm's verification, the destination account, and every
 * linked order for cancellation, refund, or an open ticket.
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
        -- Either the amount is small enough to send unattended and the destination account has been
        -- settled long enough to trust, or an administrator has released this specific request.
        AND (
          (
            candidate.net_amount_kobo <= ${AUTO_APPROVAL_LIMIT_KOBO}
            AND candidate_account.updated_at <= now() - (${ACCOUNT_SETTLED_HOURS} * interval '1 hour')
          )
          OR candidate.admin_released_at IS NOT NULL
        )
        AND candidate.transfer_attempts < ${MAX_TRANSFER_ATTEMPTS}
        AND candidate.eligible_at IS NOT NULL
        AND candidate.eligible_at <= now()
        AND candidate_farm.verification_status = 'verified'
        AND (candidate_farm.verification_exempt OR EXISTS (
          SELECT 1 FROM farm_verification_submissions approved
          WHERE approved.farm_id = candidate.farm_id AND approved.status = 'approved'
        ))
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

  // A request in processing with no reference at all never reached Paystack: the reference is written
  // in the same statement that claims the row, so its absence means no transfer was ever submitted
  // and none can be verified. The pass below cannot help these, because it asks Paystack about a
  // reference, and the claim path only ever sets approval_mode 'automatic' - so a row left this way
  // by the administrator override matched neither condition and stayed stuck indefinitely, with its
  // farm orders locked out of any new request by the UNIQUE on payout_request_orders.farm_order_id.
  // One such row froze a farm's earnings for a month before it was found.
  const orphaned = await sql`
    UPDATE payout_requests
    SET status = 'requested', transfer_started_at = NULL,
      failure_reason = 'Returned to requested: left processing with no transfer reference, so nothing was ever submitted',
      updated_at = now()
    WHERE status = 'processing' AND transfer_reference IS NULL
      AND updated_at < now() - (${STALE_TRANSFER_MINUTES} * interval '1 minute')
    RETURNING id
  `;

  const stale = await sql`
    SELECT id, transfer_reference FROM payout_requests
    WHERE status = 'processing' AND approval_mode = 'automatic' AND transfer_reference IS NOT NULL
      AND transfer_started_at < now() - (${STALE_TRANSFER_MINUTES} * interval '1 minute')
    LIMIT 10
  `;
  let recovered = orphaned.length;
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
    // Exhausting the retries drops the administrator's release as well, so a repeatedly failing
    // transfer needs a fresh human decision rather than retrying forever on the old one.
    sql`UPDATE payout_requests SET status = 'requested', approval_mode = ${exhausted ? "manual" : "automatic"},
      transfer_reference = NULL, transfer_code = NULL, transfer_started_at = NULL,
      admin_released_by = CASE WHEN ${exhausted} THEN NULL ELSE admin_released_by END,
      admin_released_at = CASE WHEN ${exhausted} THEN NULL ELSE admin_released_at END,
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
  // The reserve is not available to payouts, so a run sees the balance less that floor. If the
  // reserve is set above the current balance this goes negative and nothing is sent, which is the
  // intended fail-safe; the run reports it as skipped rather than failing the request.
  let remainingBalance = summary.balanceKobo - BALANCE_RESERVE_KOBO;
  let movedKobo = 0;

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
    // Bound the value one run can move. The first transfer always goes, so a single large release
    // is never stuck behind its own ceiling; the rest wait for the next run.
    if (summary.submitted > 0 && movedKobo + amount > RUN_VALUE_CEILING_KOBO) {
      await releaseClaim(request.id, "Run value ceiling reached; queued for the next run");
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
      movedKobo += amount;
      summary.submitted += 1;
    } catch (error) {
      const message = (error as Error).message || "Transfer failed";
      await failPayout(request.transfer_reference, message);
      summary.failures.push(`${request.farm_name}: ${message}`);
    }
  }
  return summary;
}
