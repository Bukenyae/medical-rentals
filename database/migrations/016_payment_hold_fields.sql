BEGIN;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'booking_total'
    CHECK (purpose IN ('booking_total', 'deposit_hold')),
  ADD COLUMN IF NOT EXISTS capture_method text NOT NULL DEFAULT 'automatic'
    CHECK (capture_method IN ('automatic', 'manual')),
  ADD COLUMN IF NOT EXISTS authorized_at timestamptz,
  ADD COLUMN IF NOT EXISTS released_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_payments_booking_purpose ON payments(booking_id, purpose);

COMMIT;
