-- Fix user profile creation trigger to handle errors more gracefully
-- Run this migration to improve error handling

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
DROP FUNCTION IF EXISTS create_user_profile();

-- Improved function to create user profile with better error handling
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $
DECLARE
  profile_exists BOOLEAN;
BEGIN
  -- Check if profile already exists
  SELECT EXISTS(SELECT 1 FROM user_profiles WHERE id = NEW.id) INTO profile_exists;
  
  -- Only create profile if it doesn't exist
  IF NOT profile_exists THEN
    INSERT INTO user_profiles (id, first_name, last_name, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'role', 'guest')
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't prevent user creation
    RAISE WARNING 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$ language 'plpgsql';

-- Recreate trigger
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Also create a function to manually fix any users without profiles
CREATE OR REPLACE FUNCTION fix_missing_user_profiles()
RETURNS INTEGER AS $
DECLARE
  fixed_count INTEGER := 0;
  user_record RECORD;
BEGIN
  -- Find users without profiles and create them
  FOR user_record IN 
    SELECT u.id, u.raw_user_meta_data, u.email
    FROM auth.users u
    LEFT JOIN user_profiles up ON u.id = up.id
    WHERE up.id IS NULL
  LOOP
    INSERT INTO user_profiles (id, first_name, last_name, role)
    VALUES (
      user_record.id,
      COALESCE(user_record.raw_user_meta_data->>'first_name', ''),
      COALESCE(user_record.raw_user_meta_data->>'last_name', ''),
      COALESCE(user_record.raw_user_meta_data->>'role', 'guest')
    );
    fixed_count := fixed_count + 1;
  END LOOP;
  
  RETURN fixed_count;
END;
$ language 'plpgsql';