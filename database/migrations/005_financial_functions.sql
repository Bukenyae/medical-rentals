-- Financial tracking and reporting functions

-- Function to get revenue summary
CREATE OR REPLACE FUNCTION get_revenue_summary(
  start_date DATE,
  end_date DATE,
  property_filter TEXT DEFAULT ''
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  WITH filtered_bookings AS (
    SELECT 
      b.id,
      b.property_id,
      b.total_amount,
      p.title as property_title
    FROM bookings b
    JOIN properties p ON b.property_id = p.id
    WHERE 
      b.status IN ('confirmed', 'checked_in', 'checked_out')
      AND (
        (b.check_in >= start_date AND b.check_in <= end_date)
        OR (b.check_out >= start_date AND b.check_out <= end_date)
        OR (b.check_in <= start_date AND b.check_out >= end_date)
      )
      AND (property_filter = '' OR b.property_id::text = ANY(string_to_array(replace(replace(property_filter, 'AND property_id IN (', ''), ')', ''), ',')))
  ),
  revenue_by_property AS (
    SELECT
      property_id,
      property_title,
      SUM(total_amount) as amount
    FROM filtered_bookings
    GROUP BY property_id, property_title
  )
  SELECT 
    json_build_object(
      'total', COALESCE((SELECT SUM(total_amount) FROM filtered_bookings), 0),
      'by_property', COALESCE(
        (SELECT 
          json_object_agg(property_id, amount)
        FROM revenue_by_property),
        '{}'::json
      )
    ) INTO result;
    
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get expense summary
CREATE OR REPLACE FUNCTION get_expense_summary(
  start_date DATE,
  end_date DATE,
  property_filter TEXT DEFAULT ''
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  WITH filtered_expenses AS (
    SELECT 
      e.id,
      e.property_id,
      e.category,
      e.amount,
      p.title as property_title
    FROM expenses e
    JOIN properties p ON e.property_id = p.id
    WHERE 
      e.expense_date >= start_date 
      AND e.expense_date <= end_date
      AND (property_filter = '' OR e.property_id::text = ANY(string_to_array(replace(replace(property_filter, 'AND property_id IN (', ''), ')', ''), ',')))
  ),
  expenses_by_category AS (
    SELECT
      category,
      SUM(amount) as amount
    FROM filtered_expenses
    GROUP BY category
  ),
  expenses_by_property AS (
    SELECT
      property_id,
      property_title,
      SUM(amount) as amount
    FROM filtered_expenses
    GROUP BY property_id, property_title
  )
  SELECT 
    json_build_object(
      'total', COALESCE((SELECT SUM(amount) FROM filtered_expenses), 0),
      'by_category', COALESCE(
        (SELECT 
          json_object_agg(category, amount)
        FROM expenses_by_category),
        '{}'::json
      ),
      'by_property', COALESCE(
        (SELECT 
          json_object_agg(property_id, amount)
        FROM expenses_by_property),
        '{}'::json
      )
    ) INTO result;
    
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get occupancy summary
CREATE OR REPLACE FUNCTION get_occupancy_summary(
  start_date DATE,
  end_date DATE,
  property_filter TEXT DEFAULT ''
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  total_days INTEGER;
  total_properties INTEGER;
  occupied_days NUMERIC;
  total_revenue NUMERIC;
BEGIN
  -- Calculate total days in range
  total_days := end_date - start_date + 1;
  
  -- Get count of properties
  IF property_filter = '' THEN
    SELECT COUNT(*) INTO total_properties FROM properties WHERE is_active = true;
  ELSE
    SELECT COUNT(*) INTO total_properties 
    FROM properties 
    WHERE is_active = true
    AND id::text = ANY(string_to_array(replace(replace(property_filter, 'AND property_id IN (', ''), ')', ''), ','));
  END IF;
  
  -- Calculate total available days
  total_days := total_days * total_properties;
  
  -- Calculate occupied days and revenue
  WITH date_series AS (
    SELECT generate_series(start_date, end_date, '1 day'::interval)::date AS day
  ),
  property_days AS (
    SELECT 
      p.id as property_id,
      ds.day
    FROM properties p
    CROSS JOIN date_series ds
    WHERE p.is_active = true
    AND (property_filter = '' OR p.id::text = ANY(string_to_array(replace(replace(property_filter, 'AND property_id IN (', ''), ')', ''), ',')))
  ),
  occupied_property_days AS (
    SELECT 
      pd.property_id,
      pd.day,
      CASE WHEN EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.property_id = pd.property_id
        AND b.status IN ('confirmed', 'checked_in', 'checked_out')
        AND pd.day >= b.check_in
        AND pd.day < b.check_out
      ) THEN 1 ELSE 0 END as is_occupied
    FROM property_days pd
  ),
  booking_revenue AS (
    SELECT 
      b.id,
      b.property_id,
      b.total_amount,
      b.check_out - b.check_in as stay_days
    FROM bookings b
    WHERE 
      b.status IN ('confirmed', 'checked_in', 'checked_out')
      AND (
        (b.check_in >= start_date AND b.check_in <= end_date)
        OR (b.check_out >= start_date AND b.check_out <= end_date)
        OR (b.check_in <= start_date AND b.check_out >= end_date)
      )
      AND (property_filter = '' OR b.property_id::text = ANY(string_to_array(replace(replace(property_filter, 'AND property_id IN (', ''), ')', ''), ',')))
  )
  SELECT 
    SUM(is_occupied)::numeric INTO occupied_days
  FROM occupied_property_days;
  
  SELECT COALESCE(SUM(total_amount), 0) INTO total_revenue FROM booking_revenue;
  
  -- Calculate metrics
  SELECT 
    json_build_object(
      'occupancy_rate', CASE WHEN total_days > 0 THEN (occupied_days / total_days) * 100 ELSE 0 END,
      'average_daily_rate', CASE WHEN occupied_days > 0 THEN total_revenue / occupied_days ELSE 0 END
    ) INTO result;
    
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to generate time series
CREATE OR REPLACE FUNCTION generate_time_series(
  start_date DATE,
  end_date DATE,
  group_by TEXT DEFAULT 'month'
)
RETURNS TABLE (
  date_group TEXT
) AS $$
BEGIN
  IF group_by = 'day' THEN
    RETURN QUERY
    SELECT to_char(day, 'YYYY-MM-DD') as date_group
    FROM generate_series(start_date, end_date, '1 day'::interval) as day
    ORDER BY day;
  ELSIF group_by = 'week' THEN
    RETURN QUERY
    SELECT DISTINCT to_char(day, 'IYYY-IW') as date_group
    FROM generate_series(start_date, end_date, '1 day'::interval) as day
    ORDER BY date_group;
  ELSIF group_by = 'month' THEN
    RETURN QUERY
    SELECT DISTINCT to_char(day, 'YYYY-MM') as date_group
    FROM generate_series(start_date, end_date, '1 day'::interval) as day
    ORDER BY date_group;
  ELSIF group_by = 'year' THEN
    RETURN QUERY
    SELECT DISTINCT to_char(day, 'YYYY') as date_group
    FROM generate_series(start_date, end_date, '1 day'::interval) as day
    ORDER BY date_group;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get revenue time series
CREATE OR REPLACE FUNCTION get_revenue_time_series(
  start_date DATE,
  end_date DATE,
  group_by TEXT DEFAULT 'month',
  property_filter TEXT DEFAULT ''
)
RETURNS TABLE (
  date_group TEXT,
  amount NUMERIC
) AS $$
BEGIN
  IF group_by = 'day' THEN
    RETURN QUERY
    SELECT 
      to_char(b.check_in, 'YYYY-MM-DD') as date_group,
      SUM(b.total_amount / (b.check_out - b.check_in)) as amount
    FROM bookings b
    WHERE 
      b.status IN ('confirmed', 'checked_in', 'checked_out')
      AND (
        (b.check_in >= start_date AND b.check_in <= end_date)
        OR (b.check_out >= start_date AND b.check_out <= end_date)
        OR (b.check_in <= start_date AND b.check_out >= end_date)
      )
      AND (property_filter = '' OR b.property_id::text = ANY(string_to_array(replace(replace(property_filter, 'AND property_id IN (', ''), ')', ''), ',')))
    GROUP BY date_group
    ORDER BY date_group;
  ELSIF group_by = 'week' THEN
    RETURN QUERY
    SELECT 
      to_char(b.check_in, 'IYYY-IW') as date_group,
      SUM(b.total_amount / (b.check_out - b.check_in)) as amount
    FROM bookings b
    WHERE 
      b.status IN ('confirmed', 'checked_in', 'checked_out')
      AND (
        (b.check_in >= start_date AND b.check_in <= end_date)
        OR (b.check_out >= start_date AND b.check_out <= end_date)
        OR (b.check_in <= start_date AND b.check_out >= end_date)
      )
      AND (property_filter = '' OR b.property_id::text = ANY(string_to_array(replace(replace(property_filter, 'AND property_id IN (', ''), ')', ''), ',')))
    GROUP BY date_group
    ORDER BY date_group;
  ELSIF group_by = 'month' THEN
    RETURN QUERY
    SELECT 
      to_char(b.check_in, 'YYYY-MM') as date_group,
      SUM(b.total_amount / (b.check_out - b.check_in)) as amount
    FROM bookings b
    WHERE 
      b.status IN ('confirmed', 'checked_in', 'checked_out')
      AND (
        (b.check_in >= start_date AND b.check_in <= end_date)
        OR (b.check_out >= start_date AND b.check_out <= end_date)
        OR (b.check_in <= start_date AND b.check_out >= end_date)
      )
      AND (property_filter = '' OR b.property_id::text = ANY(string_to_array(replace(replace(property_filter, 'AND property_id IN (', ''), ')', ''), ',')))
    GROUP BY date_group
    ORDER BY date_group;
  ELSIF group_by = 'year' THEN
    RETURN QUERY
    SELECT 
      to_char(b.check_in, 'YYYY') as date_group,
      SUM(b.total_amount / (b.check_out - b.check_in)) as amount
    FROM bookings b
    WHERE 
      b.status IN ('confirmed', 'checked_in', 'checked_out')
      AND (
        (b.check_in >= start_date AND b.check_in <= end_date)
        OR (b.check_out >= start_date AND b.check_out <= end_date)
        OR (b.check_in <= start_date AND b.check_out >= end_date)
      )
      AND (property_filter = '' OR b.property_id::text = ANY(string_to_array(replace(replace(property_filter, 'AND property_id IN (', ''), ')', ''), ',')))
    GROUP BY date_group
    ORDER BY date_group;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get expense time series
CREATE OR REPLACE FUNCTION get_expense_time_series(
  start_date DATE,
  end_date DATE,
  group_by TEXT DEFAULT 'month',
  property_filter TEXT DEFAULT '',
  category_filter TEXT DEFAULT ''
)
RETURNS TABLE (
  date_group TEXT,
  amount NUMERIC
) AS $$
BEGIN
  IF group_by = 'day' THEN
    RETURN QUERY
    SELECT 
      to_char(e.expense_date, 'YYYY-MM-DD') as date_group,
      SUM(e.amount) as amount
    FROM expenses e
    WHERE 
      e.expense_date >= start_date 
      AND e.expense_date <= end_date
      AND (property_filter = '' OR e.property_id::text = ANY(string_to_array(replace(replace(property_filter, 'AND property_id IN (', ''), ')', ''), ',')))
      AND (category_filter = '' OR e.category::text = ANY(string_to_array(replace(replace(category_filter, 'AND category IN (', ''), ')', ''), ',')))
    GROUP BY date_group
    ORDER BY date_group;
  ELSIF group_by = 'week' THEN
    RETURN QUERY
    SELECT 
      to_char(e.expense_date, 'IYYY-IW') as date_group,
      SUM(e.amount) as amount
    FROM expenses e
    WHERE 
      e.expense_date >= start_date 
      AND e.expense_date <= end_date
      AND (property_filter = '' OR e.property_id::text = ANY(string_to_array(replace(replace(property_filter, 'AND property_id IN (', ''), ')', ''), ',')))
      AND (category_filter = '' OR e.category::text = ANY(string_to_array(replace(replace(category_filter, 'AND category IN (', ''), ')', ''), ',')))
    GROUP BY date_group
    ORDER BY date_group;
  ELSIF group_by = 'month' THEN
    RETURN QUERY
    SELECT 
      to_char(e.expense_date, 'YYYY-MM') as date_group,
      SUM(e.amount) as amount
    FROM expenses e
    WHERE 
      e.expense_date >= start_date 
      AND e.expense_date <= end_date
      AND (property_filter = '' OR e.property_id::text = ANY(string_to_array(replace(replace(property_filter, 'AND property_id IN (', ''), ')', ''), ',')))
      AND (category_filter = '' OR e.category::text = ANY(string_to_array(replace(replace(category_filter, 'AND category IN (', ''), ')', ''), ',')))
    GROUP BY date_group
    ORDER BY date_group;
  ELSIF group_by = 'year' THEN
    RETURN QUERY
    SELECT 
      to_char(e.expense_date, 'YYYY') as date_group,
      SUM(e.amount) as amount
    FROM expenses e
    WHERE 
      e.expense_date >= start_date 
      AND e.expense_date <= end_date
      AND (property_filter = '' OR e.property_id::text = ANY(string_to_array(replace(replace(property_filter, 'AND property_id IN (', ''), ')', ''), ',')))
      AND (category_filter = '' OR e.category::text = ANY(string_to_array(replace(replace(category_filter, 'AND category IN (', ''), ')', ''), ',')))
    GROUP BY date_group
    ORDER BY date_group;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically record revenue when booking status changes to confirmed
CREATE OR REPLACE FUNCTION record_booking_revenue()
RETURNS TRIGGER AS $$
BEGIN
  -- When booking is confirmed, record the revenue
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    -- Revenue is already tracked in the booking itself
    -- This trigger can be extended to create additional revenue records if needed
    NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to record revenue on booking confirmation
CREATE TRIGGER record_booking_revenue_trigger
  AFTER INSERT OR UPDATE OF status ON bookings
  FOR EACH ROW EXECUTE FUNCTION record_booking_revenue();