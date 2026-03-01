-- Run in Supabase SQL editor after migrations are applied.
BEGIN;

DO $$
DECLARE
  p_id uuid;
  u_id uuid;
  b1 uuid;
BEGIN
  SELECT id INTO u_id FROM auth.users LIMIT 1;
  IF u_id IS NULL THEN
    RAISE NOTICE 'Skipping SQL test: no auth.users rows available.';
    RETURN;
  END IF;

  INSERT INTO properties (
    id, owner_id, title, description, address, amenities, base_price,
    max_guests, bedrooms, bathrooms, images, hospital_distances,
    is_active, slug, timezone, max_stay_guests, max_event_guests
  ) VALUES (
    gen_random_uuid(), u_id, 'Test Dual Rail Property', 'tmp', '{"city":"Baton Rouge"}'::jsonb,
    '{}', 100.00, 20, 2, 1, '{}', '{}', true,
    'dual-rail-test-' || extract(epoch from now())::bigint,
    'America/Chicago', 5, 20
  ) RETURNING id INTO p_id;

  INSERT INTO bookings (
    id, property_id, guest_id, user_id, kind, mode, status,
    check_in, check_out, start_at, end_at, guest_count,
    total_amount, currency, subtotal_cents, fees_cents, addons_total_cents,
    total_cents, deposit_cents, blocks_calendar
  ) VALUES (
    gen_random_uuid(), p_id, u_id, u_id, 'event', 'request', 'requested',
    '2026-03-10', '2026-03-10', '2026-03-10T16:00:00Z', '2026-03-10T20:00:00Z',
    10, 100.00, 'usd', 10000, 0, 0, 10000, 0, true
  ) RETURNING id INTO b1;

  ASSERT is_property_available(p_id, '2026-03-10T17:00:00Z', '2026-03-10T19:00:00Z') = false,
    'Expected overlap to make property unavailable';

  ASSERT is_property_available(p_id, '2026-03-11T10:00:00Z', '2026-03-11T11:00:00Z') = true,
    'Expected non-overlap to remain available';

  BEGIN
    INSERT INTO bookings (
      property_id, guest_id, user_id, kind, mode, status,
      check_in, check_out, start_at, end_at, guest_count,
      total_amount, currency, subtotal_cents, fees_cents, addons_total_cents,
      total_cents, deposit_cents, blocks_calendar
    ) VALUES (
      p_id, u_id, u_id, 'stay', 'instant', 'draft',
      '2026-03-12', '2026-03-13', '2026-03-12T18:00:00Z', '2026-03-13T10:00:00Z',
      6, 100.00, 'usd', 10000, 0, 0, 10000, 0, false
    );
    RAISE EXCEPTION 'Expected guest limit violation for stay booking';
  EXCEPTION WHEN OTHERS THEN
    IF position('max_stay_guests' in SQLERRM) = 0 THEN
      RAISE;
    END IF;
  END;

  DELETE FROM bookings WHERE property_id = p_id;
  DELETE FROM properties WHERE id = p_id;
END $$;

ROLLBACK;
