# HarvestNearU

HarvestNearU is a Nigerian farm-to-consumer marketplace built with Next.js. Customers browse available produce ranked by proximity, visit verified farm storefronts, order practical quantities from multiple farms, choose available fulfilment options, pay securely, and track each order item through receipt. Farmers can manage multiple farms, inventory, fulfilment, earnings, and verified buyer feedback from one account.

## Current capabilities

- Consumer and farmer signup, password authentication, and Google authentication
- Role-aware customer, farmer, support, and administrator experiences
- Verified farm storefronts with address, ratings, feedback, current listings, and recommendations
- Proximity ranking using saved, selected, or device coordinates and estimated walking time
- Free OpenStreetMap farm maps with routed directions from the customer location
- Persistent carts, favourites, notifications, profile pictures, and account credit
- Multi-farm farmer accounts and consumer-to-farmer account upgrades
- Live stock enforcement, restock baselines, and automatic out-of-stock status
- Optional listing availability windows; blank dates do not restrict visibility
- Three fulfilment choices: distance-priced doorstep delivery, farm pickup, or delivery arranged with the farmer
- Administrator-managed pickup centres with coordinates, opening hours, active status, and shared web/mobile visibility
- Paystack hosted checkout with verified callback and webhook processing
- Optional administrator-configured manual bank transfer with receipt review
- Item-level fulfilment, tracking, customer receipt acknowledgement, farm ratings, and printable order receipts
- Farm-specific payout accounts, farmer payout requests, administrative review, and printable payout statements
- Branded transactional email, configurable email preferences, real-time in-app updates, and native push notifications
- Administrator management, payout processing, audit activity, refunds, moderation, and read-only impersonation
- Support tickets, staff assignment, internal notes, replies, and product feedback
- Responsive web experience plus a separate Expo/React Native mobile application for customers and farmers, with secure web-console handoff for administrators and support staff

## Local development

Requirements: Node.js, npm, a Neon Postgres database, and a Vercel Blob store.

```powershell
npm install
Copy-Item .env.example .env.local
npm run db:migrate
npm run dev
```

Open `http://localhost:3000`. Database health is available at `/api/health/database`.

## Environment variables

```dotenv
DATABASE_URL=postgresql://...
BLOB_READ_WRITE_TOKEN=...
PAYSTACK_SECRET_KEY=sk_test_...
APP_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
RESEND_API_KEY=re_...
NOTIFICATION_FROM_EMAIL=HarvestNearU <notifications@harvestnearu.com>
PUSH_DISPATCH_SECRET=...
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_AI_API_TOKEN=...
CLOUDFLARE_AI_MODEL=@cf/meta/llama-3.1-8b-instruct
```

All values are server secrets except `APP_URL`. Never prefix database, Blob, Paystack, or Google secrets with `NEXT_PUBLIC_`.

## Database

Schema changes live in `database/migrations` and are recorded in `schema_migrations`.

```powershell
npm run db:migrate
npm run db:status
```

The schema covers accounts, addresses and coordinates, farms, products, categories, listings, images, carts, favourites, orders, farm orders, item tracking, payments, refunds, account credit, ratings, notifications, email preferences, push tokens, payout accounts and requests, support tickets, sessions, rate limits, and audit logs.

Seeded development accounts use `HarvestNearU!2026`. Remove or rotate seeded credentials before production.

## Payments

Paystack is the primary payment path. Configure:

- Callback: `${APP_URL}/api/payments/paystack/callback`
- Webhook: `${APP_URL}/api/payments/paystack/webhook`

Checkout initializes payments on the server and verifies provider reference, currency, and amount before confirmation. Manual bank transfer appears only when an administrator enables it and supplies company account details. Uploaded receipts remain pending until administrator review and are deleted after confirmation.

Farmers configure a verified payout destination separately for each farm. Fulfilled earnings can be submitted as a payout request; administrators review, mark paid, or reject the request, and both sides retain a printable settlement statement.

## Maps and fulfilment

HarvestNearU uses free OpenStreetMap data for farm maps and the public OSRM routing service for directions. Marketplace travel-time labels are estimates, while the farm storefront can open turn-by-turn web directions from the customer's current or saved location.

Checkout offers doorstep delivery when the supplying farms and saved destination qualify, with the fee calculated from distance. Farm pickup is free, and Arrange with farmer lets the parties agree timing and any delivery cost directly. Administrators maintain platform pickup centres from **Administration > Pickup centres**; active locations and hours appear on Delivery Areas in both clients.

## Email and notifications

Resend delivers branded welcome, password recovery, payment, order, delivery, support, farm, rating, and payout messages. Users manage optional delivery, support, farm, rating, nearby-produce, promotion, and weekly-digest email categories from their profile; essential security, payment, refund, and active-order messages remain enabled.

Web notifications update in app, while the native client registers Expo push tokens for actionable alerts with sound. Notification dispatch endpoints should be protected with `PUSH_DISPATCH_SECRET` in production.

## AI assistance and evaluation

Cloudflare Workers AI can enhance marketplace intent search, farmer listing suggestions, photo guidance, and grounded Help Centre answers. Support tickets always display their original customer-authored content and are not AI summarized. Every AI-assisted feature retains a deterministic fallback when Cloudflare is unavailable, keeping the core marketplace functional and low cost.

Synthetic expected examples live in `docs/ai-evaluation-data.json`. Run the regression suite after changing prompts, models, FAQ guidance, categories, or fallback rules:

```powershell
npm run ai:evaluate
```

The suite is evaluation data, not customer data and not a production model fine-tune. Add reviewed examples for real failure patterns; do not add personal information, support-ticket contents, or unverified AI answers.

## Storage and images

Listing and profile uploads are validated, auto-oriented, resized for their UI purpose, stripped of unnecessary metadata, and encoded once as WebP before the optimized result is saved to private Vercel Blob storage. Versioned application image routes use immutable browser caching, while Next.js produces cached responsive delivery sizes from that compact canonical asset. Static catalogue assets use WebP variants as well.

Existing Blob originals can be upgraded once with `npm run blob:optimize-images`. The migration skips assets already stored under the optimized path, writes each replacement before changing its database reference, and removes the old object only after the update succeeds.

## Quality checks

```powershell
npm run lint
npm run build
```

Before release, test checkout and all three fulfilment methods, Paystack return handling, manual receipt review, order cancellation/refunds, per-item tracking, receipt confirmation, order and payout printing, ratings, farm switching, payout requests, role access, impersonation, maps and directions, location changes, uploads, email preferences, notifications, support tickets, dark mode, and mobile layouts.

## Mobile packaging

The native application is maintained separately at [HarvestNearU-mobile](https://github.com/OluwatosinOgunfile/HarvestNearU-mobile).
