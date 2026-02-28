BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$ BEGIN
  CREATE TYPE booking_kind AS ENUM ('stay', 'event');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE booking_mode AS ENUM ('request', 'instant');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE event_type AS ENUM ('corporate', 'private_celebration', 'intimate_wedding', 'production', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE doc_type AS ENUM ('government_id', 'insurance_coi', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'requires_action', 'succeeded', 'failed', 'refunded', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'draft';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'requested';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'declined';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'expired';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'awaiting_payment';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'paid';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'deposit_released';

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Chicago',
  ADD COLUMN IF NOT EXISTS max_stay_guests int,
  ADD COLUMN IF NOT EXISTS max_event_guests int NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS base_parking_capacity int NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS extended_parking_possible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS event_hourly_from_cents int NOT NULL DEFAULT 12500,
  ADD COLUMN IF NOT EXISTS event_instant_book_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS event_curfew_time time,
  ADD COLUMN IF NOT EXISTS event_requires_coi boolean NOT NULL DEFAULT false;

UPDATE properties
SET max_stay_guests = COALESCE(max_stay_guests, max_guests, 5)
WHERE max_stay_guests IS NULL;

ALTER TABLE properties ALTER COLUMN max_stay_guests SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_slug_unique ON properties(slug) WHERE slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS stay_rate_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  nightly_rate_cents int NOT NULL,
  cleaning_fee_cents int NOT NULL DEFAULT 0,
  min_nights int NOT NULL DEFAULT 2,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(property_id)
);

CREATE TABLE IF NOT EXISTS event_rate_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  event_type event_type NOT NULL,
  hourly_rate_cents int NOT NULL,
  hourly_min_hours int NOT NULL DEFAULT 4,
  day_rate_cents int,
  day_rate_hours int NOT NULL DEFAULT 8,
  cleaning_fee_cents int NOT NULL DEFAULT 25000,
  deposit_cents int NOT NULL DEFAULT 75000,
  curfew_time time,
  requires_coi boolean NOT NULL DEFAULT false,
  allow_instant_book boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(property_id, event_type)
);

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS kind booking_kind NOT NULL DEFAULT 'stay',
  ADD COLUMN IF NOT EXISTS mode booking_mode NOT NULL DEFAULT 'request',
  ADD COLUMN IF NOT EXISTS start_at timestamptz,
  ADD COLUMN IF NOT EXISTS end_at timestamptz,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'usd',
  ADD COLUMN IF NOT EXISTS subtotal_cents int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fees_cents int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS addons_total_cents int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_cents int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_cents int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pricing_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS blocks_calendar boolean NOT NULL DEFAULT false;

UPDATE bookings SET user_id = guest_id WHERE user_id IS NULL;
UPDATE bookings
SET start_at = COALESCE(start_at, check_in::timestamptz), end_at = COALESCE(end_at, check_out::timestamptz)
WHERE start_at IS NULL OR end_at IS NULL;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS time_range tstzrange
  GENERATED ALWAYS AS (tstzrange(COALESCE(start_at, check_in::timestamptz), COALESCE(end_at, check_out::timestamptz), '[)')) STORED;

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS guest_count_positive;
ALTER TABLE bookings ADD CONSTRAINT guest_count_positive CHECK (guest_count >= 1);

CREATE INDEX IF NOT EXISTS idx_bookings_kind ON bookings(kind);
CREATE INDEX IF NOT EXISTS idx_bookings_start_at ON bookings(start_at);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);

CREATE TABLE IF NOT EXISTS stay_booking_details (
  booking_id uuid PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
  adults int,
  children int,
  infants int,
  pets boolean DEFAULT false,
  special_requests text
);

CREATE TABLE IF NOT EXISTS event_booking_details (
  booking_id uuid PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
  event_type event_type NOT NULL,
  estimated_vehicle_count int,
  alcohol boolean,
  amplified_sound boolean,
  event_description text NOT NULL,
  vendors jsonb,
  production_details jsonb
);

CREATE TABLE IF NOT EXISTS addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  title text NOT NULL,
  applies_to booking_kind NOT NULL,
  pricing_model text NOT NULL CHECK (pricing_model in ('flat', 'per_hour', 'per_night')),
  price_cents int NOT NULL
);

CREATE TABLE IF NOT EXISTS booking_addons (
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  addon_id uuid NOT NULL REFERENCES addons(id) ON DELETE RESTRICT,
  quantity int NOT NULL DEFAULT 1,
  line_total_cents int NOT NULL,
  PRIMARY KEY (booking_id, addon_id)
);

CREATE TABLE IF NOT EXISTS booking_risk_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  flag_code text NOT NULL,
  severity int NOT NULL DEFAULT 1 CHECK (severity BETWEEN 1 AND 5),
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS booking_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  doc_type doc_type NOT NULL,
  storage_path text NOT NULL,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  stripe_setup_intent_id text,
  amount_cents int NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  status payment_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION sync_booking_calendar_block()
RETURNS trigger AS $$
BEGIN
  NEW.blocks_calendar := NEW.status IN ('pending', 'confirmed', 'checked_in', 'requested', 'approved', 'awaiting_payment', 'paid', 'in_progress');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enforce_booking_guest_limits()
RETURNS trigger AS $$
DECLARE
  stay_limit int;
  event_limit int;
BEGIN
  SELECT max_stay_guests, max_event_guests INTO stay_limit, event_limit FROM properties WHERE id = NEW.property_id;

  IF NEW.kind = 'stay' AND NEW.guest_count > COALESCE(stay_limit, 5) THEN
    RAISE EXCEPTION 'Stay guest count exceeds property max_stay_guests';
  END IF;

  IF NEW.kind = 'event' AND NEW.guest_count > COALESCE(event_limit, 20) THEN
    RAISE EXCEPTION 'Event guest count exceeds property max_event_guests';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bookings_sync_blocks_calendar ON bookings;
CREATE TRIGGER bookings_sync_blocks_calendar
BEFORE INSERT OR UPDATE OF status ON bookings
FOR EACH ROW EXECUTE FUNCTION sync_booking_calendar_block();

DROP TRIGGER IF EXISTS bookings_enforce_guest_limits ON bookings;
CREATE TRIGGER bookings_enforce_guest_limits
BEFORE INSERT OR UPDATE OF guest_count, kind, property_id ON bookings
FOR EACH ROW EXECUTE FUNCTION enforce_booking_guest_limits();

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap;
ALTER TABLE bookings
ADD CONSTRAINT bookings_no_overlap
EXCLUDE USING gist (property_id WITH =, time_range WITH &&)
WHERE (blocks_calendar = true);

CREATE OR REPLACE FUNCTION is_property_available(
  p_property_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_exclude_booking_id uuid DEFAULT NULL
) RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.property_id = p_property_id
      AND b.blocks_calendar = true
      AND (p_exclude_booking_id IS NULL OR b.id <> p_exclude_booking_id)
      AND b.start_at < p_end_at
      AND b.end_at > p_start_at
  );
$$;

COMMIT;
