# BelleRouge Properties — Build Notes

This document summarizes what has been built in the `medical-rentals/` repository and how the system is structured today.

## Repo / Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: Tailwind CSS + shadcn/ui (generated components live under `components/ui/*`)
- **Auth + DB**: Supabase (Postgres + Auth + Storage)
- **Payments**: Stripe (PaymentIntents + webhook)
- **Primary focus**: dual-rail property monetization
  - **Rail A**: stays (nightly)
  - **Rail B**: events (hourly) with host approval + deposit authorization

## Responsive UX (mobile + desktop)

Significant UX work has focused on improving the **mobile experience** while preserving a strong **desktop layout**.

- **Mobile-first improvements**
  - Property details supports a more touch-friendly flow (full-bleed hero imagery, swipe-first gallery interactions, sticky reserve footer, and a compact mobile booking sheet).
  - Calendar selection overlays correctly above the mobile booking sheet during check-in/check-out selection.
  - Event booking now supports session-based multi-day ranges with a global time window, per-day overrides (e.g., night shoots), overnight equipment hold toggle, and live pricing breakdown updates.
  - Property cards and pricing hierarchy have been tuned for small screens to improve legibility and reduce layout crowding.

- **Desktop experience preserved**
  - Desktop layouts keep the richer, wider-screen composition (larger imagery, more breathing room, and the standard booking panel layout) while reusing the same underlying booking and pricing logic.

- **Host pricing controls expanded**
  - Hosts can configure event hourly rate, multi-day discount percentage, overnight holding percentage, base parking capacity, and base power capability details from the property editor.

## High-level product surface

### Public website

- **Home page** (`app/page.tsx`)
  - Sticky header + hero section
  - Loads **published properties** from Supabase (`fetchPublishedProperties`)
  - Renders property cards with:
    - Stay pricing (nightly)
    - Event pricing (hourly)
    - Minimum nights / minimum event hours

- **Property details page** (`app/property/[id]/page.tsx`)
  - Loads property data + images from Supabase
  - Booking widget supports **Stay** and **Event** rails (tabs)
  - Calendar/date selection + guest controls
  - Mobile UX enhancements:
    - Full-bleed hero image
    - Sticky reserve footer
    - Compact booking sheet (mobile)

### Guest portal (authenticated)

- **Guest portal**: `app/portal/guest/page.tsx`
  - Guides the guest through reservation completion
  - Integrates inline checkout for stay bookings
  - Shows event booking “approved → pay now” CTA when host approves an event request

- **Guest payment page**: `app/portal/guest/payment/page.tsx`
  - Loads one or more payment sessions for a booking
  - Supports:
    - booking total payment
    - deposit authorization hold

- **Confirmation page**: `app/portal/guest/confirmation/*`

### Host portal (authenticated)

- **Host portal**: `app/portal/host/page.tsx`
  - Property switcher with persisted selection (URL + localStorage)
  - Host modules surfaced via components in `components/portal/*`, including:
    - property checklist/publish controls
    - event booking queue (requested event bookings)
    - payments list
    - tenants list
    - media manager
    - property form/editor

### Admin portal (server-side role-gated)

- **Admin routes** live under `app/admin/*`.
- **Role gating** is enforced in `app/admin/layout.tsx`:
  - Requires Supabase auth
  - Resolves role via metadata and/or profile tables
  - Redirects non-admin users to `/portal/guest`

- Implemented module shells/routes include:
  - `/admin` overview
  - `/admin/calendar`
  - `/admin/reservations`
  - `/admin/requests`
  - `/admin/properties`
  - `/admin/users`
  - `/admin/inbox`
  - `/admin/ops`
  - `/admin/disputes`
  - `/admin/finance`
  - `/admin/settings`
  - `/admin/ui-kit` (shadcn verification page)

- Data access helpers are centralized in `lib/admin/*` (overview, finance, requests, reservations, etc.).

## Dual-rail bookings (Stay + Event)

### Booking lifecycle concepts

- A **unified** `bookings` table models both stays and events with discriminators (per specs).
- The event rail behaves like a pipeline:
  - draft → requested → approved → awaiting payment / deposit → confirmed

### Booking API endpoints (Next.js Route Handlers)

Under `app/api/bookings/*`:

- **Quote**
  - `POST /api/bookings/quote`
  - Uses `lib/bookings/quote` (stay + event quote engines)

- **Availability**
  - `POST /api/bookings/availability`
  - Server-side conflict check against blocking statuses

- **Draft creation (dual-rail)**
  - `POST /api/bookings/draft`
  - Uses `createDraftBooking` in `lib/bookings/lifecycle`

- **Legacy stay draft creation** (used by earlier UI flows)
  - `POST /api/bookings/create-draft`
  - Creates pending booking rows using normalized ISO date strings

- **Submit booking request**
  - `POST /api/bookings/submit-request`
  - Calls `submitBookingRequest` (validates ownership + transitions)

- **Approve booking**
  - `POST /api/bookings/approve`
  - Calls `approveBooking` (used for event approvals)

- **Capture payment**
  - `POST /api/bookings/capture`
  - Calls `capturePayment`

- **Payment sessions**
  - `GET /api/bookings/payment-session?bookingId=...`
  - Returns the payment intents/sessions needed to complete a booking

- **Deposit hold release**
  - `POST /api/bookings/deposit/release`
  - Owner/host-only authorization enforced in handler

- **Event request queue management**
  - `GET /api/bookings/event-requests` (list requests for properties you manage)
  - `PATCH /api/bookings/event-requests` with actions like `decline` and `request_info`

Core booking logic lives under:

- `lib/bookings/lifecycle.ts`
- `lib/bookings/lifecycle-payments.ts`
- `lib/bookings/types.ts`
- `lib/bookings/route-core/*` (shared route handler logic)

## Stripe payments

### Stripe API routes

- `POST /api/stripe/create-payment-intent`
  - Validates booking ownership and status (`pending` only)
  - Enforces **amount consistency** (server computed vs client)
  - Implements PaymentIntent **idempotency / reuse** when possible

- `POST /api/stripe/webhook`
  - Handles `payment_intent.succeeded` and `payment_intent.payment_failed`
  - Updates `payments` table and booking status transitions
  - Supports payment purposes:
    - `booking_total`
    - `deposit_hold`
    - `legacy`

### Local payment flow test harness

- `scripts/run-payment-flow.mjs` (documented in `README.md`)
- Uses Stripe CLI webhook forwarding to validate end-to-end lifecycle updates.

## Properties data

- Properties can be loaded from Supabase and/or shared data constants.
- Key helpers and constants live under:
  - `lib/properties.ts`
  - `lib/images.ts`
  - `lib/data/*`

## Database + migrations

### Source of truth

- **Canonical migration path**: `supabase/migrations/*` (to be applied via Supabase CLI `supabase db push`).
- `database/migrations/*` is maintained as reference/history.
  - `database/migrations/015-020` are explicitly marked as reference-only when matching Supabase migrations.

### Major schema milestones (by migration theme)

- Core schema + RLS policies + functions/triggers
- Calendar / availability enhancements
- Financial functions and performance indexes
- Dual-rail bookings:
  - stay + event subtype tables
  - add-ons, risk flags, documents, payments
  - overlap protection / blocking behavior
- Payment hold / deposit fields
- Admin portal foundation tables + RLS for admin/ops
- Event pipeline stage support
- Ops tasks and user flags

See:
- `database/README.md`
- `database/migrations/*`
- `supabase/migrations/*`

## Testing

- Node test suite targets booking correctness:
  - `tests/bookings.routes.test.mjs`
  - `tests/bookings.quote.test.mjs`
  - `tests/bookings.submission.test.mjs`
  - `tests/bookings.payment-lifecycle.test.mjs`

Run:

```bash
npm run test:bookings
```

## Deployment + environment

- Deployment guide: `deployment-guide.md`
- OAuth setup: `OAUTH_SETUP.md`

Key environment variables commonly required:

- **Supabase**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server only)

- **Stripe**
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`

## Notable recent milestones (commit log)

Recent commits (2026-02-28 → 2026-03-01) focused on:

- Property cards dual pricing clarity (stay vs event)
- Minimum event hours support
- Mobile property details improvements:
  - swipe-first gallery
  - sticky reserve footer
  - compact booking sheet
  - full-bleed hero image + back button overlay

Use:

```bash
git log --oneline --decorate
```

for the authoritative project timeline.

## Known follow-ups / gaps

- Admin portal modules include scaffolding and centralized queries; some routes may still be read-only or incomplete depending on the module.
- Host portal UX has a note to improve success toast feedback in the host property form (to revisit in a dedicated portal sprint).

---

**Owner note:** If you want this document to be “since X date/commit”, tell me the baseline (commit hash or date) and I’ll generate a *delta-only* version (what changed between baseline and `HEAD`).
