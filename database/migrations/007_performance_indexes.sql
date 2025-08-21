-- Performance indexes for bookings lookups used in PropertyCard metrics and repeat bookings
-- Note: Avoid CONCURRENTLY to stay compatible with transactional migration runners.

CREATE INDEX IF NOT EXISTS idx_bookings_property_checkin_status
  ON public.bookings (property_id, check_in, status);

CREATE INDEX IF NOT EXISTS idx_bookings_property_guest_checkin_status
  ON public.bookings (property_id, guest_id, check_in, status);
