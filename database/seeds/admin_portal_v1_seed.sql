BEGIN;

DO $$
DECLARE
  admin_id uuid;
  owner_ids uuid[];
  guest_ids uuid[];
  property_ids uuid[];
  created_booking_ids uuid[] := ARRAY[]::uuid[];
  booking_id uuid;
  i int;
  booking_kind_value booking_kind;
  booking_status_value booking_status;
  start_ts timestamptz;
  end_ts timestamptz;
  subtotal numeric(12,2);
  platform_fee numeric(12,2);
  cleaning_fee numeric(12,2);
  total numeric(12,2);
  property_ref uuid;
  guest_ref uuid;
  organizer_ref uuid;
BEGIN
  SELECT id INTO admin_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  SELECT array_agg(id ORDER BY created_at ASC) INTO owner_ids FROM (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 3) s;
  SELECT array_agg(id ORDER BY created_at DESC) INTO guest_ids FROM (SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 6) s;

  IF admin_id IS NULL OR owner_ids IS NULL OR array_length(owner_ids, 1) < 3 OR guest_ids IS NULL OR array_length(guest_ids, 1) < 3 THEN
    RAISE NOTICE 'Skipping seed: not enough auth.users. Need at least 3 users.';
    RETURN;
  END IF;

  INSERT INTO user_profiles (id, first_name, last_name, role)
  SELECT admin_id, 'Admin', 'Operator', 'admin'
  ON CONFLICT (id) DO UPDATE SET role = 'admin';

  FOR i IN 1..3 LOOP
    INSERT INTO user_profiles (id, first_name, last_name, role)
    VALUES (owner_ids[i], 'Owner', i::text, 'owner')
    ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;
  END LOOP;

  DELETE FROM properties WHERE title IN ('BelleRouge - Leighton Estate', 'BelleRouge - Lexington Hall', 'BelleRouge - Riverfront Studio');

  INSERT INTO properties (owner_id, title, description, address, base_price, max_guests, is_active, status, max_stay_guests, max_event_guests, event_hourly_from_cents)
  VALUES
    (owner_ids[1], 'BelleRouge - Leighton Estate', 'Large home for stays and events.', '{"city":"Baton Rouge","state":"LA"}'::jsonb, 235.00, 8, true, 'active', 8, 20, 14500),
    (owner_ids[2], 'BelleRouge - Lexington Hall', 'Event-first venue with overnight suites.', '{"city":"Baton Rouge","state":"LA"}'::jsonb, 310.00, 10, true, 'active', 10, 20, 17500),
    (owner_ids[3], 'BelleRouge - Riverfront Studio', 'Boutique space for film and intimate receptions.', '{"city":"Baton Rouge","state":"LA"}'::jsonb, 190.00, 6, true, 'active', 6, 20, 12500);

  SELECT array_agg(id ORDER BY title ASC)
  INTO property_ids
  FROM properties
  WHERE title IN ('BelleRouge - Leighton Estate', 'BelleRouge - Lexington Hall', 'BelleRouge - Riverfront Studio');

  FOR i IN 1..20 LOOP
    property_ref := property_ids[((i - 1) % 3) + 1];
    guest_ref := guest_ids[((i - 1) % array_length(guest_ids, 1)) + 1];
    organizer_ref := guest_ids[((i + 1) % array_length(guest_ids, 1)) + 1];

    booking_kind_value := CASE
      WHEN i % 5 = 0 THEN 'film'::booking_kind
      WHEN i % 2 = 0 THEN 'event'::booking_kind
      ELSE 'stay'::booking_kind
    END;

    booking_status_value := CASE
      WHEN i % 6 = 0 THEN 'requested'::booking_status
      WHEN i % 4 = 0 THEN 'approved'::booking_status
      WHEN i % 3 = 0 THEN 'completed'::booking_status
      ELSE 'confirmed'::booking_status
    END;

    start_ts := now() + ((i + 1) * interval '2 day');
    end_ts := CASE
      WHEN booking_kind_value = 'stay' THEN start_ts + interval '3 day'
      ELSE start_ts + interval '8 hour'
    END;

    subtotal := CASE
      WHEN booking_kind_value = 'stay' THEN 850 + (i * 40)
      WHEN booking_kind_value = 'event' THEN 1600 + (i * 75)
      ELSE 2200 + (i * 90)
    END;

    cleaning_fee := CASE WHEN booking_kind_value = 'stay' THEN 120 ELSE 250 END;
    platform_fee := round(subtotal * 0.14, 2);
    total := subtotal + cleaning_fee + platform_fee;

    INSERT INTO bookings (
      property_id,
      guest_id,
      user_id,
      organizer_id,
      check_in,
      check_out,
      start_at,
      end_at,
      guest_count,
      party_size,
      total_amount,
      total_cents,
      subtotal_cents,
      fees_cents,
      currency,
      kind,
      mode,
      status,
      notes
    ) VALUES (
      property_ref,
      guest_ref,
      guest_ref,
      organizer_ref,
      start_ts::date,
      end_ts::date + 1,
      start_ts,
      end_ts,
      CASE WHEN booking_kind_value = 'stay' THEN 2 + (i % 4) ELSE 12 + (i % 6) END,
      CASE WHEN booking_kind_value = 'stay' THEN 2 + (i % 4) ELSE 12 + (i % 6) END,
      total,
      (total * 100)::int,
      (subtotal * 100)::int,
      ((platform_fee + cleaning_fee) * 100)::int,
      'usd',
      booking_kind_value,
      CASE WHEN booking_kind_value = 'stay' THEN 'instant'::booking_mode ELSE 'request'::booking_mode END,
      booking_status_value,
      'Seeded booking for admin dashboard development.'
    ) RETURNING id INTO booking_id;

    created_booking_ids := array_append(created_booking_ids, booking_id);

    INSERT INTO booking_financials (
      booking_id,
      currency,
      gmv_subtotal,
      cleaning_fee,
      platform_fee,
      processing_fee,
      taxes,
      security_deposit,
      discounts,
      total_charged,
      owner_earnings,
      platform_revenue
    ) VALUES (
      booking_id,
      'USD',
      subtotal,
      cleaning_fee,
      platform_fee,
      0,
      0,
      CASE WHEN booking_kind_value <> 'stay' THEN 500 ELSE 0 END,
      0,
      total,
      subtotal - platform_fee,
      platform_fee
    )
    ON CONFLICT (booking_id) DO UPDATE
    SET total_charged = EXCLUDED.total_charged,
        owner_earnings = EXCLUDED.owner_earnings,
        platform_revenue = EXCLUDED.platform_revenue,
        updated_at = now();
  END LOOP;

  DELETE FROM expenses WHERE notes = 'admin-seed-v1';

  INSERT INTO expenses (property_id, category, amount, description, expense_date, created_by, scope, vendor, incurred_at, payment_status, notes)
  SELECT
    CASE WHEN i % 4 = 0 THEN NULL ELSE property_ids[((i - 1) % 3) + 1] END,
    CASE (i % 6)
      WHEN 0 THEN 'cleaning'::expense_category
      WHEN 1 THEN 'maintenance'::expense_category
      WHEN 2 THEN 'utilities'::expense_category
      WHEN 3 THEN 'marketing'::expense_category
      WHEN 4 THEN 'supplies'::expense_category
      ELSE 'other'::expense_category
    END,
    (120 + i * 35)::numeric(12,2),
    'Seed expense #' || i,
    (current_date - (i || ' day')::interval)::date,
    admin_id,
    CASE WHEN i % 4 = 0 THEN 'platform' ELSE 'property' END,
    'Vendor ' || i,
    (current_date - (i || ' day')::interval)::date,
    CASE WHEN i % 3 = 0 THEN 'paid' ELSE 'unpaid' END,
    'admin-seed-v1'
  FROM generate_series(1, 10) AS i;

  DELETE FROM calendar_blocks WHERE reason = 'admin-seed-v1';

  INSERT INTO calendar_blocks (property_id, start_at, end_at, block_type, reason, created_by)
  SELECT
    property_ids[((i - 1) % 3) + 1],
    now() + ((i + 3) * interval '3 day'),
    now() + ((i + 3) * interval '3 day') + interval '6 hour',
    CASE WHEN i % 2 = 0 THEN 'maintenance' ELSE 'owner_hold' END,
    'admin-seed-v1',
    admin_id
  FROM generate_series(1, 6) AS i;

  DELETE FROM payouts WHERE notes = 'admin-seed-v1';

  INSERT INTO payouts (property_id, owner_id, period_start, period_end, status, amount, notes)
  SELECT
    p.id,
    p.owner_id,
    (current_date - interval '30 day')::date,
    current_date,
    'pending',
    COALESCE(SUM(bf.owner_earnings), 0),
    'admin-seed-v1'
  FROM properties p
  LEFT JOIN bookings b ON b.property_id = p.id AND b.id = ANY(created_booking_ids)
  LEFT JOIN booking_financials bf ON bf.booking_id = b.id
  WHERE p.id = ANY(property_ids)
  GROUP BY p.id, p.owner_id;

  INSERT INTO payout_items (payout_id, booking_id, owner_earnings, adjustments, net_amount)
  SELECT
    po.id,
    b.id,
    bf.owner_earnings,
    0,
    bf.owner_earnings
  FROM payouts po
  JOIN bookings b ON b.property_id = po.property_id
  JOIN booking_financials bf ON bf.booking_id = b.id
  WHERE po.notes = 'admin-seed-v1'
    AND b.id = ANY(created_booking_ids)
  ON CONFLICT DO NOTHING;
END $$;

COMMIT;
