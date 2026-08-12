# HarvestNearU

HarvestNearU is a Nigerian farm-to-consumer marketplace built with Next.js. Customers browse available produce ranked by proximity, visit verified farm storefronts, order practical quantities from multiple farms, choose available fulfilment options, pay securely, and track each order item through receipt. Farmers can manage multiple farms, inventory, fulfilment, earnings, and verified buyer feedback from one account.

## Current capabilities

- Consumer and farmer signup, password authentication, and Google authentication
- Role-aware customer, farmer, support, and administrator experiences
- Verified farm storefronts with address, ratings, feedback, current listings, and recommendations
- Proximity ranking using saved or selected coordinates and estimated walking time
- Persistent carts, favourites, notifications, profile pictures, and account credit
- Multi-farm farmer accounts and consumer-to-farmer account upgrades
- Live stock enforcement, restock baselines, and automatic out-of-stock status
- Optional listing availability windows; blank dates do not restrict visibility
- Paystack hosted checkout with verified callback and webhook processing
- Optional administrator-configured manual bank transfer with receipt review
- Item-level fulfilment, tracking, customer receipt acknowledgement, and farm ratings
- Administrator management, audit activity, refunds, moderation, and read-only impersonation
- Support tickets, staff assignment, internal notes, replies, and product feedback
- Responsive web experience plus a separate Expo/React Native mobile application

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
```

All values are server secrets except `APP_URL`. Never prefix database, Blob, Paystack, or Google secrets with `NEXT_PUBLIC_`.

## Database

Schema changes live in `database/migrations` and are recorded in `schema_migrations`.

```powershell
npm run db:migrate
npm run db:status
```

The schema covers accounts, addresses, farms, products, listings, images, carts, favourites, orders, farm orders, item tracking, payments, refunds, account credit, ratings, notifications, support tickets, sessions, rate limits, and audit logs.

Seeded development accounts use `HarvestNearU!2026`. Remove or rotate seeded credentials before production.

## Payments

Paystack is the primary payment path. Configure:

- Callback: `${APP_URL}/api/payments/paystack/callback`
- Webhook: `${APP_URL}/api/payments/paystack/webhook`

Checkout initializes payments on the server and verifies provider reference, currency, and amount before confirmation. Manual bank transfer appears only when an administrator enables it and supplies company account details. Uploaded receipts remain pending until administrator review and are deleted after confirmation.

## Storage and images

Listing and profile uploads are validated, auto-oriented, resized for their UI purpose, stripped of unnecessary metadata, and encoded once as WebP before the optimized result is saved to private Vercel Blob storage. Versioned application image routes use immutable browser caching, while Next.js produces cached responsive delivery sizes from that compact canonical asset. Static catalogue assets use WebP variants as well.

Existing Blob originals can be upgraded once with `npm run blob:optimize-images`. The migration skips assets already stored under the optimized path, writes each replacement before changing its database reference, and removes the old object only after the update succeeds.

## Quality checks

```powershell
npm run lint
npm run build
```

Before release, test checkout, Paystack return handling, manual receipt review, order cancellation/refunds, per-item tracking, receipt confirmation, ratings, farm switching, role access, impersonation, location changes, uploads, notifications, support tickets, dark mode, and mobile layouts.

## Mobile packaging

The native application is maintained separately at [HarvestNearU-mobile](https://github.com/OluwatosinOgunfile/HarvestNearU-mobile).
