-- Adds narrative fields for property listings and ensures host metadata sources reference user_profiles for avatars/bios.

BEGIN;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS about_space text,
  ADD COLUMN IF NOT EXISTS indoor_outdoor_experiences text;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS host_bio text,
  ADD COLUMN IF NOT EXISTS host_avatar_url text;

COMMIT;
