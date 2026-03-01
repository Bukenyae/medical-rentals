-- Refine booking conflict trigger so non-date updates (e.g., payment assignment)
-- do not re-run availability checks while capacity constraints remain enforced

BEGIN;

CREATE OR REPLACE FUNCTION check_booking_conflicts()
RETURNS TRIGGER AS $$
BEGIN
  -- Only evaluate overlap conflicts when property or stay dates change
  IF NOT (
    TG_OP = 'UPDATE'
    AND NEW.property_id IS NOT DISTINCT FROM OLD.property_id
    AND NEW.check_in IS NOT DISTINCT FROM OLD.check_in
    AND NEW.check_out IS NOT DISTINCT FROM OLD.check_out
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM bookings
      WHERE property_id = NEW.property_id
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND status NOT IN ('cancelled')
        AND (
          (NEW.check_in >= check_in AND NEW.check_in < check_out) OR
          (NEW.check_out > check_in AND NEW.check_out <= check_out) OR
          (NEW.check_in <= check_in AND NEW.check_out >= check_out)
        )
    ) THEN
      RAISE EXCEPTION 'Booking conflicts with existing reservation';
    END IF;
  END IF;
  
  -- Still enforce property capacity limits on every change
  IF EXISTS (
    SELECT 1 FROM properties
    WHERE id = NEW.property_id
      AND max_guests < NEW.guest_count
  ) THEN
    RAISE EXCEPTION 'Guest count exceeds property maximum capacity';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

COMMIT;
