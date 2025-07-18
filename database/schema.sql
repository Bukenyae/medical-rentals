-- Database Schema for Rental Property Platform
-- This file contains the complete database schema including tables, types, and indexes

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Custom Types
CREATE TYPE booking_status AS ENUM (
  'pending',
  'confirmed', 
  'checked_in',
  'checked_out',
  'cancelled'
);

CREATE TYPE message_type AS ENUM (
  'user',
  'system',
  'chatbot'
);

CREATE TYPE expense_category AS ENUM (
  'maintenance',
  'cleaning',
  'utilities',
  'supplies',
  'marketing',
  'other'
);

CREATE TYPE task_priority AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

CREATE TYPE task_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'cancelled'
);

-- Properties table
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  address JSONB NOT NULL,
  amenities TEXT[] DEFAULT '{}',
  base_price DECIMAL(10,2) NOT NULL CHECK (base_price > 0),
  max_guests INTEGER NOT NULL CHECK (max_guests > 0),
  bedrooms INTEGER CHECK (bedrooms >= 0),
  bathrooms DECIMAL(3,1) CHECK (bathrooms >= 0),
  images TEXT[] DEFAULT '{}',
  hospital_distances JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bookings table
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guest_count INTEGER NOT NULL CHECK (guest_count > 0),
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  status booking_status NOT NULL DEFAULT 'pending',
  guest_details JSONB,
  special_requests TEXT,
  payment_intent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure check_out is after check_in
  CONSTRAINT valid_date_range CHECK (check_out > check_in),
  -- Ensure guest_count doesn't exceed property max_guests (enforced by trigger)
  CONSTRAINT future_checkin CHECK (check_in >= CURRENT_DATE)
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type message_type DEFAULT 'user',
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Either booking_id or both sender_id and recipient_id must be provided
  CONSTRAINT message_context CHECK (
    booking_id IS NOT NULL OR (sender_id IS NOT NULL AND recipient_id IS NOT NULL)
  )
);

-- Expenses table
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  category expense_category NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  receipt_url TEXT,
  expense_date DATE NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Maintenance tasks table
CREATE TABLE maintenance_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority task_priority DEFAULT 'medium',
  status task_status DEFAULT 'pending',
  assigned_to TEXT,
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- If status is completed, completed_at should be set
  CONSTRAINT completed_task_has_date CHECK (
    (status = 'completed' AND completed_at IS NOT NULL) OR 
    (status != 'completed')
  )
);

-- Calendar availability table (for blocking dates and custom pricing)
CREATE TABLE calendar_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_available BOOLEAN DEFAULT true,
  custom_price DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicate entries for same property and date
  UNIQUE(property_id, date)
);

-- User profiles table (extends auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'guest' CHECK (role IN ('guest', 'owner', 'admin')),
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Ind
exes for optimal query performance

-- Properties indexes
CREATE INDEX idx_properties_owner_id ON properties(owner_id);
CREATE INDEX idx_properties_is_active ON properties(is_active);
CREATE INDEX idx_properties_base_price ON properties(base_price);
CREATE INDEX idx_properties_max_guests ON properties(max_guests);
CREATE INDEX idx_properties_created_at ON properties(created_at);

-- Bookings indexes
CREATE INDEX idx_bookings_property_id ON bookings(property_id);
CREATE INDEX idx_bookings_guest_id ON bookings(guest_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_check_in ON bookings(check_in);
CREATE INDEX idx_bookings_check_out ON bookings(check_out);
CREATE INDEX idx_bookings_date_range ON bookings(check_in, check_out);
CREATE INDEX idx_bookings_created_at ON bookings(created_at);

-- Messages indexes
CREATE INDEX idx_messages_booking_id ON messages(booking_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_read_at ON messages(read_at);

-- Expenses indexes
CREATE INDEX idx_expenses_property_id ON expenses(property_id);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX idx_expenses_created_by ON expenses(created_by);

-- Maintenance tasks indexes
CREATE INDEX idx_maintenance_tasks_property_id ON maintenance_tasks(property_id);
CREATE INDEX idx_maintenance_tasks_status ON maintenance_tasks(status);
CREATE INDEX idx_maintenance_tasks_priority ON maintenance_tasks(priority);
CREATE INDEX idx_maintenance_tasks_due_date ON maintenance_tasks(due_date);
CREATE INDEX idx_maintenance_tasks_created_by ON maintenance_tasks(created_by);

-- Calendar availability indexes
CREATE INDEX idx_calendar_availability_property_id ON calendar_availability(property_id);
CREATE INDEX idx_calendar_availability_date ON calendar_availability(date);
CREATE INDEX idx_calendar_availability_is_available ON calendar_availability(is_available);

-- User profiles indexes
CREATE INDEX idx_user_profiles_role ON user_profiles(role);-- Row Leve
l Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Properties RLS Policies
-- Property owners can manage their own properties
CREATE POLICY "Property owners can view their own properties" ON properties
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Property owners can insert their own properties" ON properties
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Property owners can update their own properties" ON properties
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Property owners can delete their own properties" ON properties
  FOR DELETE USING (auth.uid() = owner_id);

-- Guests can view active properties for booking
CREATE POLICY "Guests can view active properties" ON properties
  FOR SELECT USING (is_active = true);

-- Bookings RLS Policies
-- Property owners can view bookings for their properties
CREATE POLICY "Property owners can view bookings for their properties" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = bookings.property_id 
      AND properties.owner_id = auth.uid()
    )
  );

-- Guests can view their own bookings
CREATE POLICY "Guests can view their own bookings" ON bookings
  FOR SELECT USING (auth.uid() = guest_id);

-- Guests can create bookings
CREATE POLICY "Guests can create bookings" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = guest_id);

-- Property owners can update bookings for their properties
CREATE POLICY "Property owners can update bookings for their properties" ON bookings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = bookings.property_id 
      AND properties.owner_id = auth.uid()
    )
  );

-- Guests can update their own pending bookings
CREATE POLICY "Guests can update their own pending bookings" ON bookings
  FOR UPDATE USING (auth.uid() = guest_id AND status = 'pending');

-- Messages RLS Policies
-- Users can view messages where they are sender or recipient
CREATE POLICY "Users can view their own messages" ON messages
  FOR SELECT USING (
    auth.uid() = sender_id OR 
    auth.uid() = recipient_id OR
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = messages.booking_id 
      AND (bookings.guest_id = auth.uid() OR 
           EXISTS (
             SELECT 1 FROM properties 
             WHERE properties.id = bookings.property_id 
             AND properties.owner_id = auth.uid()
           ))
    )
  );

-- Users can send messages
CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Expenses RLS Policies
-- Property owners can manage expenses for their properties
CREATE POLICY "Property owners can view expenses for their properties" ON expenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = expenses.property_id 
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Property owners can insert expenses for their properties" ON expenses
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = expenses.property_id 
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Property owners can update expenses for their properties" ON expenses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = expenses.property_id 
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Property owners can delete expenses for their properties" ON expenses
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = expenses.property_id 
      AND properties.owner_id = auth.uid()
    )
  );

-- Maintenance tasks RLS Policies
-- Property owners can manage maintenance tasks for their properties
CREATE POLICY "Property owners can view maintenance tasks for their properties" ON maintenance_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = maintenance_tasks.property_id 
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Property owners can insert maintenance tasks for their properties" ON maintenance_tasks
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = maintenance_tasks.property_id 
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Property owners can update maintenance tasks for their properties" ON maintenance_tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = maintenance_tasks.property_id 
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Property owners can delete maintenance tasks for their properties" ON maintenance_tasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = maintenance_tasks.property_id 
      AND properties.owner_id = auth.uid()
    )
  );

-- Calendar availability RLS Policies
-- Property owners can manage calendar availability for their properties
CREATE POLICY "Property owners can view calendar availability for their properties" ON calendar_availability
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = calendar_availability.property_id 
      AND properties.owner_id = auth.uid()
    )
  );

-- Guests can view availability for active properties
CREATE POLICY "Guests can view availability for active properties" ON calendar_availability
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = calendar_availability.property_id 
      AND properties.is_active = true
    )
  );

CREATE POLICY "Property owners can manage calendar availability for their properties" ON calendar_availability
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = calendar_availability.property_id 
      AND properties.owner_id = auth.uid()
    )
  );

-- User profiles RLS Policies
-- Users can view and update their own profile
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);--
 Database Functions and Triggers

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