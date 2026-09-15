-- Removes the payout records created while testing the admin settlement override.
--
-- Eight `payouts` rows totalling NGN 194,400 carried `admin-payout-%` references, which that override
-- writes instead of a Paystack transfer reference. No transfer stood behind any of them: the account
-- is still on a test key and has never been activated for transfers, so nothing left the balance.
-- Their farm orders were nevertheless treated as settled, and one request sat in `processing` with no
-- reference and no attempts since 13 August, which the stale-transfer reconciler cannot heal because
-- it only looks at rows that have a reference. That froze NGN 9,000 of Integrapoint Ltd's earnings:
-- the farmer could not re-request them, because payout_request_orders.farm_order_id is UNIQUE and the
-- link survived alongside a request still counted as live.
--
-- Deleting the requests cascades those links, so all nine farm orders become payable again and the
-- farmer-facing balance reflects what is genuinely owed before the account goes live. The rows as
-- they stood were dumped to payout-records-backup-2026-09-15.json first.
--
-- Scoped to the three request ids and the admin-written references, so a genuine manual settlement
-- made later is not caught by a re-run.

INSERT INTO audit_logs (action, entity_type, entity_id, before_data)
SELECT
  'payout.void_test_records',
  'payout_request',
  request.id::text,
  jsonb_build_object(
    'status', request.status,
    'net_amount_kobo', request.net_amount_kobo,
    'requested_at', request.requested_at,
    'transfer_reference', request.transfer_reference,
    'linked_farm_orders', (SELECT count(*) FROM payout_request_orders link WHERE link.payout_request_id = request.id),
    'payout_rows', (SELECT count(*) FROM payouts p WHERE p.provider_reference LIKE 'admin-payout-' || request.id::text || '-%'),
    'reason', 'Settlement override used during testing; no Paystack transfer was made and no money moved.'
  )
FROM payout_requests request
WHERE request.id IN (
  '9593e290-0b36-432a-8bac-025fdfa3858b',
  '7bc66509-6bfb-46f4-8b1c-96a8d008af0a',
  '436a20de-9ff7-482c-a503-5e6fd730871f'
);
-- statement-breakpoint

DELETE FROM payouts
WHERE provider_reference LIKE 'admin-payout-9593e290-0b36-432a-8bac-025fdfa3858b-%'
   OR provider_reference LIKE 'admin-payout-7bc66509-6bfb-46f4-8b1c-96a8d008af0a-%'
   OR provider_reference LIKE 'admin-payout-436a20de-9ff7-482c-a503-5e6fd730871f-%';
-- statement-breakpoint

-- Cascades payout_request_orders, which is what returns the farm orders to payable.
DELETE FROM payout_requests
WHERE id IN (
  '9593e290-0b36-432a-8bac-025fdfa3858b',
  '7bc66509-6bfb-46f4-8b1c-96a8d008af0a',
  '436a20de-9ff7-482c-a503-5e6fd730871f'
);
