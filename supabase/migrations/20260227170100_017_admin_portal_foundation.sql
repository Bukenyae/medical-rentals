BEGIN;

ALTER TYPE booking_kind ADD VALUE IF NOT EXISTS 'film';

ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('guest', 'owner', 'host', 'admin', 'ops'));

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'));

CREATE TABLE IF NOT EXISTS property_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES property_units(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS organizer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS party_size integer,
  ADD COLUMN IF NOT EXISTS notes text;

CREATE TABLE IF NOT EXISTS booking_financials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  currency text NOT NULL DEFAULT 'USD',
  gmv_subtotal numeric(12,2) NOT NULL DEFAULT 0,
  cleaning_fee numeric(12,2) NOT NULL DEFAULT 0,
  platform_fee numeric(12,2) NOT NULL DEFAULT 0,
  processing_fee numeric(12,2) NOT NULL DEFAULT 0,
  taxes numeric(12,2) NOT NULL DEFAULT 0,
  security_deposit numeric(12,2) NOT NULL DEFAULT 0,
  discounts numeric(12,2) NOT NULL DEFAULT 0,
  total_charged numeric(12,2) NOT NULL DEFAULT 0,
  owner_earnings numeric(12,2) NOT NULL DEFAULT 0,
  platform_revenue numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'failed')),
  amount numeric(12,2) NOT NULL,
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payout_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id uuid NOT NULL REFERENCES payouts(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  owner_earnings numeric(12,2) NOT NULL,
  adjustments numeric(12,2) NOT NULL DEFAULT 0,
  net_amount numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS scope text,
  ADD COLUMN IF NOT EXISTS vendor text,
  ADD COLUMN IF NOT EXISTS incurred_at date,
  ADD COLUMN IF NOT EXISTS paid_at date,
  ADD COLUMN IF NOT EXISTS payment_status text,
  ADD COLUMN IF NOT EXISTS notes text;

UPDATE expenses
SET
  scope = COALESCE(scope, 'property'),
  incurred_at = COALESCE(incurred_at, expense_date),
  payment_status = COALESCE(payment_status, CASE WHEN paid_at IS NULL THEN 'unpaid' ELSE 'paid' END);

ALTER TABLE expenses ALTER COLUMN property_id DROP NOT NULL;
ALTER TABLE expenses ALTER COLUMN scope SET DEFAULT 'property';
ALTER TABLE expenses ALTER COLUMN scope SET NOT NULL;
ALTER TABLE expenses ALTER COLUMN payment_status SET DEFAULT 'unpaid';
ALTER TABLE expenses ALTER COLUMN payment_status SET NOT NULL;

ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_scope_check;
ALTER TABLE expenses
  ADD CONSTRAINT expenses_scope_check CHECK (scope IN ('platform', 'property'));

ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_payment_status_check;
ALTER TABLE expenses
  ADD CONSTRAINT expenses_payment_status_check CHECK (payment_status IN ('unpaid', 'paid'));

CREATE TABLE IF NOT EXISTS calendar_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  block_type text NOT NULL DEFAULT 'other' CHECK (block_type IN ('owner_hold', 'maintenance', 'cleaning_buffer', 'event_buffer', 'other')),
  reason text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_at > start_at)
);

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS from_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS body text;

UPDATE messages
SET
  from_user_id = COALESCE(from_user_id, sender_id),
  to_user_id = COALESCE(to_user_id, recipient_id),
  body = COALESCE(body, content)
WHERE from_user_id IS NULL OR to_user_id IS NULL OR body IS NULL;

UPDATE messages m
SET property_id = b.property_id
FROM bookings b
WHERE m.booking_id = b.id
  AND m.property_id IS NULL;

CREATE TABLE IF NOT EXISTS disputes_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  opened_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  "before" jsonb,
  "after" jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_property_start ON bookings(property_id, start_at);
CREATE INDEX IF NOT EXISTS idx_bookings_end_at ON bookings(end_at);
CREATE INDEX IF NOT EXISTS idx_bookings_status_kind ON bookings(status, kind);
CREATE INDEX IF NOT EXISTS idx_bookings_organizer_id ON bookings(organizer_id);
CREATE INDEX IF NOT EXISTS idx_booking_financials_booking_id ON booking_financials(booking_id);
CREATE INDEX IF NOT EXISTS idx_payouts_property_id ON payouts(property_id);
CREATE INDEX IF NOT EXISTS idx_payouts_owner_id ON payouts(owner_id);
CREATE INDEX IF NOT EXISTS idx_payout_items_payout_id ON payout_items(payout_id);
CREATE INDEX IF NOT EXISTS idx_expenses_scope_property ON expenses(scope, property_id);
CREATE INDEX IF NOT EXISTS idx_expenses_incurred_at ON expenses(incurred_at);
CREATE INDEX IF NOT EXISTS idx_calendar_blocks_property_range ON calendar_blocks(property_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_messages_property_id ON messages(property_id);
CREATE INDEX IF NOT EXISTS idx_disputes_property_id ON disputes_incidents(property_id);
CREATE INDEX IF NOT EXISTS idx_disputes_booking_id ON disputes_incidents(booking_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

CREATE OR REPLACE FUNCTION is_admin_or_ops()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'ops')
  );
$$;

ALTER TABLE property_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read/write property_units" ON property_units;
CREATE POLICY "Admin read/write property_units" ON property_units
  FOR ALL USING (is_admin_or_ops()) WITH CHECK (is_admin_or_ops());
DROP POLICY IF EXISTS "Admin read/write booking_financials" ON booking_financials;
CREATE POLICY "Admin read/write booking_financials" ON booking_financials
  FOR ALL USING (is_admin_or_ops()) WITH CHECK (is_admin_or_ops());
DROP POLICY IF EXISTS "Admin read/write payouts" ON payouts;
CREATE POLICY "Admin read/write payouts" ON payouts
  FOR ALL USING (is_admin_or_ops()) WITH CHECK (is_admin_or_ops());
DROP POLICY IF EXISTS "Admin read/write payout_items" ON payout_items;
CREATE POLICY "Admin read/write payout_items" ON payout_items
  FOR ALL USING (is_admin_or_ops()) WITH CHECK (is_admin_or_ops());
DROP POLICY IF EXISTS "Admin read/write calendar_blocks" ON calendar_blocks;
CREATE POLICY "Admin read/write calendar_blocks" ON calendar_blocks
  FOR ALL USING (is_admin_or_ops()) WITH CHECK (is_admin_or_ops());
DROP POLICY IF EXISTS "Admin read/write disputes_incidents" ON disputes_incidents;
CREATE POLICY "Admin read/write disputes_incidents" ON disputes_incidents
  FOR ALL USING (is_admin_or_ops()) WITH CHECK (is_admin_or_ops());
DROP POLICY IF EXISTS "Admin read/write audit_log" ON audit_log;
CREATE POLICY "Admin read/write audit_log" ON audit_log
  FOR ALL USING (is_admin_or_ops()) WITH CHECK (is_admin_or_ops());

COMMIT;
