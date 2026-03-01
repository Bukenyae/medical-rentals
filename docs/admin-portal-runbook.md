# BelleRouge Admin Portal Runbook (v1)

## Scope
Admin portal modules:
- Overview, Calendar, Reservations, Requests, Properties, Users & Trust, Finance, Ops, Disputes

## Required migrations
Apply in order:
1. `017_admin_portal_foundation.sql`
2. `018_event_pipeline_stage.sql`
3. `019_user_flags.sql`
4. `020_ops_tasks.sql`

Optional dev seed:
- `database/seeds/admin_portal_v1_seed.sql`

## Admin gate
`/app/admin/layout.tsx` requires authenticated `admin` or `ops` role.

## Core data contracts
- `bookings.kind`: `stay`, `event`, `film`
- `bookings.pipeline_stage`: request CRM lifecycle
- `booking_financials`, `payouts`, `expenses` power finance tabs
- `user_flags` powers trust queue
- `ops_tasks` powers lightweight operations board
- `disputes_incidents` powers support view
- `audit_log` records mutation events

## Current audit coverage
- Requests stage move writes `pipeline_stage_updated`
- User flag creation writes `user_flag_created`

## QA checklist
1. Admin auth gate blocks non-admin users.
2. Overview renders KPI cards + trend by date/property.
3. Calendar shows bookings + blocks and overlap warnings.
4. Reservations list/detail render including financials/messages/audit.
5. Requests pipeline moves stages and persists updates.
6. Properties list/detail show upcoming activity + revenue context.
7. Users page creates risk flags and updates queue.
8. Finance tabs render KPIs and grouped breakdowns.
9. Ops tasks can be created and filtered.
10. Disputes view renders read-only queue with filters.

## Known warnings
`npm run lint` reports pre-existing warnings in `components/portal/PropertyForm.tsx` unrelated to admin modules.
