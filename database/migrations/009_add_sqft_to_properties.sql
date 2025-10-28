-- Add square footage to properties table
-- Run this migration after syncing local schema with Supabase

begin;

alter table properties
  add column if not exists sqft integer check (sqft >= 0);

commit;
