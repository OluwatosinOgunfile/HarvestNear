# HarvestNearU Architecture

## Application shape

HarvestNearU uses the Next.js App Router. Public and role-specific paths render the shared marketplace application, while farm storefronts and printable receipts use dedicated server-rendered routes. API route handlers own all database, authentication, payment, storage, and administrative mutations.

## Core services

| Service | Responsibility |
| --- | --- |
| Next.js | UI, routing, server rendering, API routes, image optimization |
| Neon Postgres | Marketplace records, sessions, carts, orders, tracking, support and audit data |
| Vercel Blob | Private listing images, profile pictures, and manual-payment receipts |
| Paystack | Hosted payment authorization and transaction verification |
| Google OAuth | Optional Google account authentication |
| Expo / React Native | Separate Android and iOS application sharing this backend API |

## Roles and access

- Consumers browse, purchase, track items, acknowledge receipt, rate farms, manage credit, and contact support.
- Farmers retain purchasing capabilities and additionally manage multiple farms, listings, fulfilment, earnings, and ratings.
- Support staff manage support tickets with restricted administrative access.
- Administrators manage users, farms, listings, orders, payments, refunds, reviews, settings, audit activity, and read-only impersonation.

Server route handlers must enforce roles and `canMutateAs` rules. Client-side navigation is usability logic, not an authorization boundary.

## Marketplace data flow

1. `/api/produce` resolves the signed-in user's default coordinates unless a selected-location override is supplied.
2. The query returns verified-farm listings that are active, in stock, and inside an explicitly supplied availability window.
3. Blank availability dates do not restrict a listing.
4. Results are distance ranked and displayed as estimated walking time.
5. Checkout revalidates status, dates, verification, and stock inside the order flow.

## Orders and payments

An order may contain items from several farms. `farm_orders` separates farmer accounting and `order_items` separates fulfilment state. Customers acknowledge receipt per item and can rate the supplying farm immediately. Overall order feedback can wait until every item is fulfilled.

Paystack is the primary payment provider. Server initialization and callback/webhook handlers verify amount, currency, and reference. Manual transfer is optional and administrator-configured; its receipt is removed after confirmation. Account credit can partially or fully fund checkout.

## Images and caching

Private Blob images are exposed through versioned application routes. Upload routes validate the source and persist a resized, metadata-free WebP canonical asset rather than the original file. Listing cards and storefronts use responsive Next.js images generated from that stored asset. Static legacy PNG listing references resolve to WebP equivalents. Versioned Blob responses use immutable caching; marketplace JSON has a short private cache and checkout remains authoritative.

## Database changes

Add numbered SQL files to `database/migrations`. The migration runner records applied filenames in `schema_migrations`. Migrations must be valid as a single prepared statement; wrap multiple commands in a PostgreSQL `DO` block when needed.

## Security invariants

- Keep database, Blob, Paystack, and OAuth secrets server-only.
- Validate uploaded type, content signature, size, ownership, and deletion scope.
- Treat impersonation as read-only.
- Revalidate inventory during checkout instead of trusting cart state.
- Verify Paystack references and totals on the server.
- Record privileged changes in the audit log.
