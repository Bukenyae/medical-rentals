# Events Flow Execution Spec (Dual-Rail Booking)

## Understanding
This project will support two income rails per property:
- Stay bookings (`stay`) for overnight guests
- Event bookings (`event`) for receptions, productions, and corporate/private events

The booking experience, pricing, risk gating, admin review, and calendar blocking will be unified in one booking system with rail-specific detail tables.

## Execution Tasks

### 1. Product + UX Scope (BelleRouge UI)
- Add dual pricing to property cards:
  - Primary: `From $X/night`
  - Secondary chip: `Events from $Y/hr`
  - Optional text: `Events up to 20 · Request to book`
- Add booking rail switcher on property details:
  - Tabs: `[Stay] [Event]`
- Keep existing stay flow as Rail A:
  - Check-in/out, guest count, stay add-ons, reserve CTA
- Build event flow as Rail B:
  - Counter: date, start/end time, guest count (max 20), vehicles, live quote
  - Step 1: event logistics add-ons
  - Step 2: event details + risk questions
  - Step 3: submit in `request` or `instant` mode based on policy

### 2. Database Foundation (Supabase)
- Create enums:
  - `booking_kind`, `booking_mode`, `booking_status`, `event_type`, `doc_type`, `payment_status`
- Create/extend tables:
  - `properties` (stay/event capacity fields)
  - `stay_rate_plans`, `event_rate_plans`
  - `bookings` (unified canonical booking table)
  - `stay_booking_details`, `event_booking_details`
  - `addons`, `booking_addons`
  - `booking_risk_flags`, `booking_documents`, `payments`
- Add indexes and guest count base checks.

### 3. Calendar Blocking + Availability Safety
- Add `blocks_calendar boolean` to `bookings`.
- Add generated `time_range tstzrange`.
- Add exclusion constraint (`btree_gist`) to prevent overlap races for blocking bookings.
- Add `is_property_available(...)` SQL function for server-side checks.

### 4. Pricing + Mode Logic
- Implement unified quote service `getQuote(kind, input)`:
  - Stay quote: nights * nightly + cleaning + stay add-ons
  - Event quote: duration/min-hours/day-rate + cleaning + add-ons + deposit
- Implement event mode decision:
  - default `request`
  - `instant` only when all policy flags are safe

### 5. Booking Lifecycle APIs
- `createDraftBooking(kind, property_id, user/contact)`
- `submitBookingRequest(booking_id)`
  - validates availability
  - computes risk flags
  - sets status/mode + blocks calendar policy
- `approveBooking(booking_id)`
  - sets approved
  - creates payment intent when needed
- `capturePayment(booking_id)`
  - sets paid/confirmed
- Implement deposit authorization flow.

### 6. Admin Event Queue
- Build admin filter/view for `kind=event`, `status=requested`.
- Show risk flags, event details, pricing snapshot, docs.
- Actions:
  - Approve
  - Decline
  - Request info

### 7. QA + Rollout
- Add test coverage for:
  - overlap conflicts
  - guest limit enforcement
  - mode gating
  - risk flag creation
  - status transitions + payment state updates
- Add migration and rollback notes.

## Build Checklist (One Task at a Time)
- [x] Task 1: Add dual pricing on property cards (`night` + `event/hour`).
- [x] Task 2: Add `[Stay] [Event]` tabs in booking widget on property details page.
- [x] Task 3: Keep stay rail fully functional in tabbed layout.
- [x] Task 4: Build event counter form with date/time/guests/vehicles + live price preview.
- [x] Task 5: Build event Step 1 add-ons screen (logistics packs).
- [x] Task 6: Build event Step 2 details + risk questions + conditional production inputs.
- [x] Task 7: Build event Step 3 submit flow (`request`/`instant`) with CTA switching.
- [x] Task 8: Add Supabase enums and unified booking tables + subtype tables + payments/docs/risk/add-ons.
- [x] Task 9: Add overlap protection (`blocks_calendar`, `time_range`, exclusion constraint, availability function).
- [x] Task 10: Implement quote engine and event mode gating logic.
- [x] Task 11: Implement booking lifecycle endpoints/functions (`draft`, `submit`, `approve`, `capture`).
- [x] Task 12: Implement deposit hold/authorization flow.
- [x] Task 13: Build admin queue for requested event bookings with approve/decline/request-info.
- [x] Task 14: Add tests for overlap, gating, risk, and status/payment transitions.
