-- Database Functions and Triggers
-- Run this after setting up RLS policies

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at columns
CREATE TRIGGER update_properties_updated_at 
  BEFORE UPDATE ON properties 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at 
  BEFORE UPDATE ON bookings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at 
  BEFORE UPDATE ON expenses 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_tasks_updated_at 
  BEFORE UPDATE ON maintenance_tasks 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_availability_updated_at 
  BEFORE UPDATE ON calendar_availability 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check booking conflicts
CREATE OR REPLACE FUNCTION check_booking_conflicts()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for overlapping bookings on the same property
  IF EXISTS (
    SELECT 1 FROM bookings 
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
  
  -- Check if guest count exceeds property max_guests
  IF EXISTS (
    SELECT 1 FROM properties 
    WHERE id = NEW.property_id 
    AND max_guests < NEW.guest_count
  ) THEN
    RAISE EXCEPTION 'Guest count exceeds property maximum capacity';
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to check booking conflicts
CREATE TRIGGER check_booking_conflicts_trigger
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION check_booking_conflicts();

-- Function to automatically create user profile
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, first_name, last_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'guest')
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, ignore
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to create user profile on user creation
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Function to get property availability for date range
CREATE OR REPLACE FUNCTION get_property_availability(
  property_uuid UUID,
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  date DATE,
  is_available BOOLEAN,
  price DECIMAL(10,2),
  is_booked BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(start_date, end_date - 1, '1 day'::interval)::date AS date
  ),
  property_info AS (
    SELECT base_price FROM properties WHERE id = property_uuid
  ),
  availability_info AS (
    SELECT 
      ds.date,
      COALESCE(ca.is_available, true) AS is_available,
      COALESCE(ca.custom_price, pi.base_price) AS price,
      EXISTS(
        SELECT 1 FROM bookings b 
        WHERE b.property_id = property_uuid 
        AND b.status NOT IN ('cancelled')
        AND ds.date >= b.check_in 
        AND ds.date < b.check_out
      ) AS is_booked
    FROM date_series ds
    CROSS JOIN property_info pi
    LEFT JOIN calendar_availability ca ON ca.property_id = property_uuid AND ca.date = ds.date
  )
  SELECT 
    ai.date,
    ai.is_available AND NOT ai.is_booked AS is_available,
    ai.price,
    ai.is_booked
  FROM availability_info ai
  ORDER BY ai.date;
END;
$$ language 'plpgsql';

-- Function to calculate booking total amount
CREATE OR REPLACE FUNCTION calculate_booking_total(
  property_uuid UUID,
  start_date DATE,
  end_date DATE
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  total_amount DECIMAL(10,2) := 0;
  availability_record RECORD;
BEGIN
  FOR availability_record IN 
    SELECT * FROM get_property_availability(property_uuid, start_date, end_date)
  LOOP
    IF NOT availability_record.is_available THEN
      RAISE EXCEPTION 'Property not available for selected dates';
    END IF;
    
    total_amount := total_amount + availability_record.price;
  END LOOP;
  
  RETURN total_amount;
END;
$$ language 'plpgsql';

-- Function to get property revenue summary
CREATE OR REPLACE FUNCTION get_property_revenue_summary(
  property_uuid UUID,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  total_revenue DECIMAL(10,2),
  total_bookings INTEGER,
  total_nights INTEGER,
  average_nightly_rate DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(b.total_amount), 0) as total_revenue,
    COUNT(b.id)::INTEGER as total_bookings,
    COALESCE(SUM(b.check_out - b.check_in), 0)::INTEGER as total_nights,
    CASE 
      WHEN SUM(b.check_out - b.check_in) > 0 
      THEN COALESCE(SUM(b.total_amount) / SUM(b.check_out - b.check_in), 0)
      ELSE 0 
    END as average_nightly_rate
  FROM bookings b
  WHERE b.property_id = property_uuid
    AND b.status IN ('confirmed', 'checked_in', 'checked_out')
    AND (start_date IS NULL OR b.check_in >= start_date)
    AND (end_date IS NULL OR b.check_out <= end_date);
END;
$$ language 'plpgsql';