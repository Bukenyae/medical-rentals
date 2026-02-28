# BelleRouge Admin Portal (Airbnb-like) — Spec.md (v0.2)

## Context
We are building an internal Admin portal for BelleRouge that mirrors the operational capabilities of Airbnb’s host/admin tooling, but optimized for a dual-rail business:
- Rail A: Short-term rental stays (nightly)
- Rail B: Events/Film (hourly/daily; includes weddings, corporate events, indie film shoots, etc.)

BelleRouge starts with a portfolio of 3 properties (internal host accounts), and will normalize operations over 1–2 months, then onboard external independent hosts.

Current stack:
- Next.js 14 + Tailwind
- Supabase (Postgres, Auth, Storage)
- Repo path: `/Users/emmanuelbukenya/Projects/BelleRouge/medical-rentals`
- shadcn/ui must be initialized before any Admin UI module implementation.

Goal:
- Build an Admin portal with strong operational & finance visibility:
  - Platform revenue (take-rate, fees, deposits)
  - Owner distributions/payouts
  - Expense itemization (platform OPEX + property-level COGS)
  - Simple free cash flow metrics (investor-friendly)
- All v1 data comes from Supabase (no Convex yet). Convex migration is deferred.

Non-goals (v1):
- Automated accounting integrations (QuickBooks/Stripe Revenue Recognition)
- Complex forecasting models (basic projections can come later)
- Multi-currency support (assume USD)

---

## Product Principles
1. Dual-rail should share one calendar + one financial ledger (avoid separate systems).
2. Everything important is auditable (who changed what, when).
3. “Requests” (Events/Film) behave like CRM pipeline until confirmed.
4. Default to read-only views first; then add write actions for core ops (blocks, status changes, payouts).
5. Investor/VC metrics should be credible: definitions visible; numbers traceable to records.

---

## MVP Modules (v1)
1. Overview Dashboard
2. Calendar & Availability (unified for stays + events/film + holds + maintenance)
3. Reservations (Stays)
4. Requests Pipeline (Events/Film)
5. Properties & Venues
6. Users & Trust (Guests/Hosts + verification/risk flags)
7. Inbox (Messages/Interactions)
8. Ops Tasks (Turnovers / vendor assignments / checklists) — lightweight
9. Disputes/Incidents
10. Finance (GMV, Platform Revenue, Owner Payouts, Expenses, Free Cash Flow)

If time is tight, modules 8 and 9 can ship read-only.

---

## Top 5 Dashboard Metrics (v1)
1. Occupancy rate (next 14/30/90 days) for stays
2. GMV (stays + events/film)
3. Platform Revenue (take-rate + service fees)
4. Owner Payouts (due/paid)
5. Event request funnel conversion (New -> Deposit Paid/Confirmed)

Secondary (optional):
- Avg response time
- Cancellation rate
- Incident rate per 100 bookings
- Calendar utilization mix (booked vs blocked vs holds)

---

## Core Data Model (Supabase / Postgres)
Use a unified `bookings` table with a type discriminator.

Required tables:
- `properties`
- `property_units` (optional)
- `profiles` / `users`
- `bookings` (unified)
- `booking_financials`
- `payouts`
- `payout_items`
- `expenses`
- `calendar_blocks`
- `messages`
- `disputes_incidents`
- `audit_log`

RLS minimum:
- Admin portal requires `admin` role (optional `ops`).
- Hosts/guests scoped access deferred to future phase.

---

## Finance Definitions (UI must show inline definitions)
- GMV: sum of `booking_financials.total_charged` for confirmed/completed bookings.
- Platform Revenue: sum of `booking_financials.platform_revenue`.
- Effective take-rate: `platform_revenue / GMV`.
- Owner Earnings/Payouts: `booking_financials.owner_earnings` and `payouts.amount` by period.
- Expenses: `expenses.amount` split by platform OPEX and property COGS.
- Contribution Margin (simple): Platform Revenue - Property COGS.
- Free Cash Flow (proxy): Platform Revenue - Platform OPEX - unreimbursed property cash costs.

---

## UI Routes (Next.js App Router)
- `/admin`
- `/admin/calendar`
- `/admin/reservations`
- `/admin/requests`
- `/admin/properties`
- `/admin/users`
- `/admin/inbox`
- `/admin/ops`
- `/admin/disputes`
- `/admin/finance`
- `/admin/settings` (optional)

UI requirements:
- Sidebar + top header + date range + property filter
- Table search/filter/sort
- Detail drawer/detail pages
- Empty states + skeleton loading

---

## Supabase Integration
- Ensure `/lib/supabase/client.ts` and `/lib/supabase/server.ts` exist.
- Use `supabase-js` for reads/writes.
- Mutations through server actions/route handlers.
- Required env vars:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

Auth gate:
- Require Supabase auth + profile role `admin`/`ops` for `/admin` routes.
- Non-admins redirected to `/login`.

---

## Execution Plan (Ordered, Enforced)
Important: Task 1.5 is mandatory and must be completed before any admin module UI implementation.

### Task 0 — Baseline audit
- Confirm app router, Tailwind, Supabase clients, TS config, aliases.
- Deliver current-state summary.

### Task 1 — Admin shell + auth gate
- Create `/app/admin/layout.tsx`.
- Add sidebar/topbar and server-side role guard.

### Task 1.5 — Mandatory shadcn/ui initialization (Gate)
- Run `npx shadcn@latest init` with:
  - Framework Next.js
  - TypeScript Yes
  - Style Default
  - Base color Neutral/Slate
  - CSS variables Yes
  - Components dir `components`
  - Utils dir `lib`
  - Alias `@/*`
- Generate required components:
  - `button`, `card`, `badge`, `input`, `textarea`, `separator`, `tabs`, `dropdown-menu`, `dialog`, `sheet`, `table`, `select`, `popover`, `calendar`, `tooltip`, `toast`, `form`
- Create compile-proof demo page: `/app/admin/ui-kit/page.tsx`.
- Acceptance:
  - `components.json` exists
  - `components/ui/*` exists
  - `lib/utils.ts` exists
  - `/admin/ui-kit` renders

### Task 2 — Database migrations
- Add/verify core admin tables and indexes:
  - `bookings`, `booking_financials`, `payouts`, `payout_items`, `expenses`, `calendar_blocks`, `audit_log`

### Task 3 — Seed data
- Seed 3 properties, mixed bookings, financials, expenses.

### Task 4 — Overview dashboard
- Build top 5 KPI cards + trend support + filters.

### Task 5 — Calendar & availability
- Unified bookings + calendar blocks view with conflict warnings.

### Task 6 — Reservations
- Stays table + detail view with financials/messages/audit.

### Task 7 — Requests pipeline
- Event/film Kanban + stage mutation + audit logging.

### Task 8 — Properties
- Property list/detail + upcoming bookings + recent revenue.

### Task 9 — Users & trust
- User list + risk flags.

### Task 10 — Finance module
- GMV, revenue, payouts, expenses, FCF proxy tabs.

### Task 11 — Ops tasks
- Lightweight assignment and checklist flows.

### Task 12 — Disputes/incidents
- Read-only support view linked to booking/property.

Completion output per task:
- Files changed
- Local run/test steps
- Screenshot description (optional)
- Next-task suggestion

---

## Execution Plan (Plan Mode Task List)
This section is optimized for Plan Mode execution sequencing from first to last.

1. Baseline audit and dependency verification
2. Admin route shell and role-based auth gate
3. shadcn/ui initialization and component generation (mandatory gate)
4. UI kit compile-proof page
5. Supabase schema migrations and indexes
6. Seed dataset for realistic development/testing
7. Overview dashboard KPIs and filters
8. Unified calendar and availability conflict checks
9. Reservations module for stay operations
10. Requests pipeline for events/film lifecycle
11. Properties module with revenue context
12. Users and trust/risk management view
13. Finance module with investor-facing definitions
14. Ops tasks module
15. Disputes/incidents module
16. QA pass (auth, KPI integrity, pipeline transitions, audit coverage)
17. Docs pass (runbook, environment, schema map, known risks)

Definition of done:
- `/admin` secured for admin/ops only
- KPI metrics map exactly to source tables
- Event pipeline mutations emit `audit_log`
- Finance tabs trace numbers to records

---

## Swarm Execution Strategy (Parallel Agents)
Use a gated-parallel model: foundation first, then parallel lanes with explicit dependencies.

### Global dependency gates
- Gate A: Tasks 0, 1, and 1.5 must complete before feature module UI work.
- Gate B: Task 2 must complete before live-data module integration.
- Gate C: Task 3 should complete before KPI validation and UX QA.

### Agent lanes
- Agent A (Platform/Foundation): Tasks 0, 1, 1.5, 2, 3
- Agent B (Core UX): Tasks 4, 5, 6
- Agent C (CRM/Operations): Tasks 7, 8, 9, 11, 12
- Agent D (Finance/Integrity): Task 10 + KPI validation + metric traceability
- Agent E (QA/Docs): Task 16, 17 (runs continuously after Gate B)

### Parallel execution waves
- Wave 1 (sequential foundation): A executes Tasks 0 -> 1 -> 1.5 -> 2 -> 3.
- Wave 2 (parallel build):
  - B executes Tasks 4, 5, 6
  - C executes Tasks 7, 8, 9
  - D executes Task 10
- Wave 3 (parallel completion):
  - C executes Tasks 11, 12
  - E executes Task 16 and 17 with fixes fed back to B/C/D

### Coordination rules
- Every mutation endpoint must include `audit_log` writes.
- Shared query contracts are versioned in `lib/admin/queries/*` to avoid divergence.
- Daily integration checkpoint merges lane branches into a single `codex/admin-portal` branch.
- If cross-lane schema changes occur, Agent A owns migration updates and announces contract version bumps.

---

## Optional Later
- Progressive shadcn refactor across older views once v1 admin core is stable.
- Convex migration can be evaluated after v1 metrics and operations are stable.

END OF SPEC
