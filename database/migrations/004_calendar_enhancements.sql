-- Migration for calendar enhancements including recurring patterns

-- Create recurring patterns table
CREATE TABLE recurring_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  days_of_week INTEGER[] NOT NULL, -- Array of days (0 = Sunday, 6 = Saturday)
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_available BOOLEAN DEFAULT true,
  custom_price DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure end_date is after start_date
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Create index for recurring patterns
CREATE INDEX idx_recurring_patterns_property_id ON recurring_patterns(property_id);

-- Enable RLS on recurring patterns table
ALTER TABLE recurring_patterns ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for recurring patterns
CREATE POLICY "Property owners can manage recurring patterns for their properties" ON recurring_patterns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = recurring_patterns.property_id 
      AND properties.owner_id = auth.uid()
    )
  );

-- Add trigger for updated_at column
CREATE TRIGGER update_recurring_patterns_updated_at 
  BEFORE UPDATE ON recurring_patterns 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to apply recurring patterns
CREATE OR REPLACE FUNCTION apply_recurring_pattern(
  pattern_id UUID
)
RETURNS SETOF calendar_availability AS $$
DECLARE
  pattern recurring_patterns;
  curr_date DATE;
  day_of_week INTEGER;
BEGIN
  -- Get pattern details
  SELECT * INTO pattern FROM recurring_patterns WHERE id = pattern_id;
  
  -- Loop through each date in the range
  curr_date := pattern.start_date;
  WHILE curr_date <= pattern.end_date LOOP
    -- Get day of week (0-6, Sunday-Saturday)
    day_of_week := EXTRACT(DOW FROM curr_date);
    
    -- Check if this day of week is included in the pattern
    IF day_of_week = ANY(pattern.days_of_week) THEN
      -- Insert or update calendar_availability
      RETURN QUERY
      INSERT INTO calendar_availability (
        property_id, 
        date, 
        is_available, 
        custom_price, 
        notes
      )
      VALUES (
        pattern.property_id,
        curr_date,
        pattern.is_available,
        pattern.custom_price,
        pattern.notes
      )
      ON CONFLICT (property_id, date) 
      DO UPDATE SET
        is_available = pattern.is_available,
        custom_price = pattern.custom_price,
        notes = pattern.notes,
        updated_at = NOW()
      RETURNING *;
    END IF;
    
    -- Move to next day
    curr_date := curr_date + INTERVAL '1 day';
  END LOOP;
  
  RETURN;
END;
$$ language 'plpgsql';

-- Create function to calculate seasonal pricing factors
CREATE OR REPLACE FUNCTION get_seasonal_pricing_factor(
  date_to_check DATE
)
RETURNS DECIMAL(4,2) AS $$
DECLARE
  month INTEGER;
  day_of_week INTEGER;
  seasonal_factor DECIMAL(4,2) := 1.0;
  weekend_factor DECIMAL(4,2) := 1.0;
BEGIN
  -- Get month (1-12) and day of week (0-6, Sunday-Saturday)
  month := EXTRACT(MONTH FROM date_to_check);
  day_of_week := EXTRACT(DOW FROM date_to_check);
  
  -- Apply seasonal factors
  IF month BETWEEN 5 AND 8 THEN
    -- Summer months (May-August)
    seasonal_factor := 1.2;
  ELSIF month = 12 THEN
    -- December (holidays)
    seasonal_factor := 1.3;
  ELSIF month BETWEEN 3 AND 4 OR month BETWEEN 9 AND 10 THEN
    -- Spring and fall shoulder seasons
    seasonal_factor := 1.1;
  END IF;
  
  -- Apply weekend factors (Friday and Saturday)
  IF day_of_week IN (5, 6) THEN
    weekend_factor := 1.15;
  END IF;
  
  -- Return combined factor
  RETURN seasonal_factor * weekend_factor;
END;
$$ language 'plpgsql';

-- Create function to generate dynamic pricing
CREATE OR REPLACE FUNCTION generate_dynamic_pricing(
  property_uuid UUID,
  start_date DATE,
  end_date DATE,
  demand_factor DECIMAL(4,2) DEFAULT 1.0
)
RETURNS SETOF calendar_availability AS $$
DECLARE
  base_price DECIMAL(10,2);
  curr_date DATE;
  seasonal_factor DECIMAL(4,2);
  dynamic_price DECIMAL(10,2);
BEGIN
  -- Get property base price
  SELECT properties.base_price INTO base_price 
  FROM properties 
  WHERE id = property_uuid;
  
  -- Loop through each date in the range
  curr_date := start_date;
  WHILE curr_date <= end_date LOOP
    -- Get seasonal factor
    seasonal_factor := get_seasonal_pricing_factor(curr_date);
    
    -- Calculate dynamic price
    dynamic_price := ROUND(base_price * seasonal_factor * demand_factor);
    
    -- Insert or update calendar_availability
    RETURN QUERY
    INSERT INTO calendar_availability (
      property_id, 
      date, 
      is_available, 
      custom_price
    )
    VALUES (
      property_uuid,
      curr_date,
      true,
      dynamic_price
    )
    ON CONFLICT (property_id, date) 
    DO UPDATE SET
      custom_price = dynamic_price,
      updated_at = NOW()
    RETURNING *;
    
    -- Move to next day
    curr_date := curr_date + INTERVAL '1 day';
  END LOOP;
  
  RETURN;
END;
$$ language 'plpgsql';