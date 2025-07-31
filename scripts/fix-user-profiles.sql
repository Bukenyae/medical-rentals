-- Fix user profile creation issues
-- Run this in your Supabase SQL Editor

-- First, check if the trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'create_user_profile_trigger';

-- Drop and recreate the user profile creation function
DROP FUNCTION IF EXISTS create_user_profile() CASCADE;

CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, first_name, last_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'guest')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;

CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Verify the user_profiles table exists and has correct structure
CREATE TABLE IF NOT EXISTS public.user_profiles (
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

-- Enable RLS on user_profiles if not already enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies for user_profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;

CREATE POLICY "Users can view their own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Test the setup
SELECT 'User profile setup completed successfully' as status;