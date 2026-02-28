BEGIN;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS pipeline_stage text;

UPDATE bookings
SET pipeline_stage = CASE
  WHEN status IN ('requested', 'draft') THEN 'new'
  WHEN status IN ('approved') THEN 'qualified'
  WHEN status IN ('awaiting_payment') THEN 'contract_out'
  WHEN status IN ('paid') THEN 'deposit_paid'
  WHEN status IN ('confirmed', 'checked_in') THEN 'confirmed'
  WHEN status IN ('completed', 'checked_out') THEN 'completed'
  WHEN status IN ('declined', 'cancelled', 'expired') THEN 'closed_lost'
  ELSE 'new'
END
WHERE kind IN ('event', 'film')
  AND (pipeline_stage IS NULL OR pipeline_stage = '');

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_pipeline_stage_check;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_pipeline_stage_check
  CHECK (
    pipeline_stage IS NULL OR pipeline_stage IN (
      'new',
      'qualified',
      'quote_sent',
      'contract_out',
      'deposit_paid',
      'confirmed',
      'completed',
      'closed_lost'
    )
  );

CREATE INDEX IF NOT EXISTS idx_bookings_pipeline_stage ON bookings(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_bookings_kind_pipeline_stage ON bookings(kind, pipeline_stage);

DROP POLICY IF EXISTS "Admin can view all bookings" ON bookings;
CREATE POLICY "Admin can view all bookings" ON bookings
  FOR SELECT USING (is_admin_or_ops());

DROP POLICY IF EXISTS "Admin can update all bookings" ON bookings;
CREATE POLICY "Admin can update all bookings" ON bookings
  FOR UPDATE USING (is_admin_or_ops()) WITH CHECK (is_admin_or_ops());

COMMIT;
