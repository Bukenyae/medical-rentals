-- Cleanup legacy social URL metadata from Supabase auth users
-- Run this once in the Supabase SQL Editor (recommended) or via psql with service role privileges.
-- SAFETY: Review the SELECT previews before running the UPDATE.

-- 1) Preview users that contain any legacy social url keys
SELECT id,
       raw_user_meta_data
FROM auth.users
WHERE raw_user_meta_data ?| array['facebook_url','linkedin_url','instagram_url','tiktok_url'];

-- 2) (Optional) Backup current metadata to a table in your public schema
-- Note: Requires appropriate privileges. You may drop this table after verifying results.
-- CREATE TABLE IF NOT EXISTS public.backup_auth_users_meta AS
-- SELECT id, raw_user_meta_data, now() AS backed_up_at FROM auth.users;

-- 3) Perform cleanup: remove the keys from raw_user_meta_data
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
                           - 'facebook_url'
                           - 'linkedin_url'
                           - 'instagram_url'
                           - 'tiktok_url'
WHERE raw_user_meta_data ?| array['facebook_url','linkedin_url','instagram_url','tiktok_url'];

-- 4) Verify cleanup
SELECT id,
       raw_user_meta_data
FROM auth.users
WHERE raw_user_meta_data ?| array['facebook_url','linkedin_url','instagram_url','tiktok_url'];
