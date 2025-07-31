-- Check current auth settings
SELECT 
  raw_app_meta_data,
  raw_user_meta_data,
  email_confirmed_at,
  created_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Also check if there are any auth config settings
SELECT * FROM auth.config;