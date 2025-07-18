-- Row Level Security (RLS) Policies
-- Run this after the initial schema to set up security policies

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
  FOR UPDATE USING (auth.uid() = id);