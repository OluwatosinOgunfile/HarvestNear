# Support and Administration Operations

## Support tickets

Signed-in customers and farmers create tickets from the Help Centre. Ask them to include the order number, supplying farm, affected item, expected outcome, and a clear description. The ticket system currently stores text conversations; if photographs are required, provide an approved email or evidence channel in the reply.

Support staff can prioritise, assign, reply, add internal notes, and resolve tickets. Internal notes must never contain secrets, full payment credentials, or unnecessary personal information.

## Payment issues

- Paystack orders should be checked by order number and provider reference.
- Manual-transfer orders remain pending until an administrator opens and verifies the receipt.
- Never confirm a transfer based only on a screenshot; reconcile it with the company account.
- Confirmed manual receipts are deleted from storage automatically.
- Account credit and its transaction history are visible on the user profile and administrator records.

## Cancellations and refunds

Customers can cancel before payment review completes. Full store credit has no cancellation fee. Bank refunds deduct the displayed NGN 500 fee and require valid bank details plus administrator review. Administrators track requests in Refunds and can follow the linked farm and order-item breakdown.

For post-fulfilment quality or missing-item complaints, create or use a support ticket. Do not promise a bank settlement date before approval; provider processing times vary.

## Fulfilment and ratings

Each product has independent tracking because different farms may fulfil the same order. Farmers advance only their items. Customers confirm each item after delivery or pickup and can rate that farm immediately. The order completes after all items have been acknowledged.

Customers choose one of three fulfilment methods before payment: distance-priced doorstep delivery when eligible, free farm pickup, or delivery arranged directly with the farmer. For map or pickup questions, confirm that both the customer's saved location and the farm coordinates are current. Farm storefronts use OpenStreetMap and can launch routed directions from the customer's current or saved location.

Administrators manage shared collection locations under **Pickup centres**. Capture the coordinates while physically at the centre or enter verified coordinates, record clear opening hours, and deactivate a location that is temporarily or permanently unavailable. Active centres appear in Delivery Areas on web and mobile. Deactivate rather than deleting records so historical order references remain intact.

## Farm directory and restock alerts

Customers can browse every farm rather than only the produce that happens to be in stock. A farm's page shows both its available and its sold-out listings, so a sold-out item is visible instead of disappearing. In-stock items go straight to the basket; a sold-out item offers to notify the customer when it returns.

A restock alert is recorded against the specific listing and fires once, when the farmer puts stock back. Two things follow from that. A customer who asks why they were not told about a restock may have registered against a different listing of the same produce, so check the listing, not just the product name. And an alert already sent will not fire again, so a customer wanting ongoing notice should be pointed at the nearby-produce email option in their profile instead.

## Produce categories

Produce is filed under eighteen categories. Twelve of them cover ground the original six did not: legumes and pulses, nuts and seeds, herbs and spices, leafy greens, peppers and chillies, mushrooms, oils and palm produce, fish and aquaculture, livestock and meat, dairy, honey and bee products, and seedlings and planting material.

The catalogue that predated those categories has been refiled onto them, so a farmer may notice their listing under a more specific heading than the one they chose. That move is recorded in the audit log with the previous category and can be reversed on request. A category with nothing listed in it is shown as coming soon rather than hidden.

## Farmer payouts

Each farm has its own payout account, and the account number must be resolved against the bank and confirmed by the farmer before it can be saved. Fulfilled, unsettled farm orders become available for a payout request.

**Every payout starts with the farmer asking for it, whatever the amount.** Nothing in the system creates a payout request on a farmer's behalf, so a farmer who has not submitted a request has nothing pending and should be walked through requesting it from the farm workspace.

What is automatic is the money movement afterwards. A request whose net amount is at or below **NGN 50,000** is transferred without an administrator once a short dispute window has passed; the window runs from the moment the customer acknowledges receipt and defaults to **60 minutes**. Anything above NGN 50,000 waits in **Payouts** for an administrator to press **Approve and send**, which hands it to the same automatic transfer. The threshold and the window are environment-tunable, so confirm the live values before quoting them to a farmer. Fast payout is a product promise: if automatic transfers appear stalled, treat it as an incident rather than a routine delay.

Automatic transfer also waits until the farm's default payout account has been unchanged for **24 hours**. A farmer who has just added or changed their bank details will therefore not be paid automatically, because redirected bank details are what an account takeover looks like. An administrator approval overrides the wait, so a genuinely new farm is paid as soon as someone reviews its first request. A farmer chasing a first payout, or one chasing a payout right after changing banks, is usually waiting on this and should be told an administrator will review it rather than that something has failed.

**Approve and send** is the normal way to complete a large payout. **Record manual payment** is a bookkeeping entry only: it marks the request paid without sending anything, and exists for money already settled outside Paystack. It is recorded in the audit log as a manual override. Never use it to make a farmer's dashboard look right while a transfer is outstanding, because it closes the request and the real transfer will then never be sent.

Transfers that Paystack has not settled are retried up to three times, and a transfer left in flight is reconciled automatically rather than being abandoned. When the retries are exhausted the administrator's approval is cleared too, so the request returns to **Payouts** for a fresh decision rather than retrying forever.

Farmers can view and print their payout history and settlement statements. Never request a full bank account number through a ticket; direct the farmer to the protected payout-account form. A payout notification alone does not prove settlement: confirm the request status and paid timestamp.

## Platform fee

A platform and processing fee is deducted from each sale and is disclosed to farmers at the point where they set a price. The rate is **10%** by default and is configurable, so check the live rate before answering a fee question. The fee and the farmer's net are calculated so that the two always add back to the exact sale amount, with the remainder going to the farmer rather than being lost to rounding.

A farmer asking why a payout is smaller than the listed price is usually asking about this fee. Point them at the fee note on the pricing form and the payout statement, which itemises gross sale, platform fee, and net payout.

## Farm verification

Every new farm is reviewed by a person before it can publish. The farmer submits an individual identity document, and the name on it must match the name on the farm's payout account; a mismatch is a rejection reason, not something to wave through. A CAC registration number is optional and is not required from a smallholder. Administrators review ownership and farm details, and the decision creates a notification for the farmer.

Farms that existed before this review was introduced are permanently exempt and keep publishing without resubmitting anything. If such a farmer is prompted to verify, that is a defect worth escalating rather than a request to comply with.

Identity numbers are never stored in readable form: only a salted hash and the last four digits are kept, so neither support nor an administrator can read one back. Never ask a farmer for a full identity number in a ticket, and never repeat one a farmer volunteers. Uploaded verification documents are deleted automatically after **90 days**.

A verified farm can publish listings; rejected or suspended farms must not appear in public marketplace results.

## Notifications

Notifications cover accounts, farm verification, payments, payouts, orders, deliveries, ratings, support, and harvest activity. The web client receives in-app updates, and the native app receives actionable Expo push notifications with sound when the device has granted permission. Branded email notifications are dispatched immediately and follow the categories selected in the user profile; essential security, payment, refund, and active-order messages remain enabled. Users who opt into nearby produce announcements receive new-listing and restock emails only when the farm falls within their saved preferred distance and the configured safety cap. Viewed notifications are marked read and later cleaned up.

## Data requests, retention, and agreements

Customers and farmers accept a versioned set of terms and a privacy notice, and the acceptance is recorded against the account with its version. When either document is reissued, users are asked to accept the new version; a user reporting a repeated prompt has probably not completed that acceptance.

A user can export their own data from their profile. Treat an emailed or ticketed request for a copy of someone's data as a request to use that export, not as a reason to assemble records by hand, and never send personal data to an address that is not the one on the account.

Retention is enforced rather than advisory: verification documents are deleted after 90 days, analytics records after 365 days, and financial records are kept for six years because tax and accounting rules require it. A request to delete an account therefore does not remove the order and payment history that the six-year rule covers, and it is better to say so plainly than to imply a complete erasure.

Escalate any suspected personal-data exposure immediately. Nigerian data protection rules oblige notification within 72 hours of becoming aware of a breach, so the clock starts when support learns of it, not when it is confirmed.

## Escalation checklist

Escalate when there is suspected account takeover, payment mismatch, repeated stock manipulation, unsafe produce, harassment, fraudulent documentation, personal-data exposure, or a system-wide delivery/payment incident. Preserve order numbers and audit references, not raw internal UUIDs, in user-facing communication.
