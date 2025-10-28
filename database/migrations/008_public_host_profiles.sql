-- Allow guests to read basic host profile details when a property is published
-- Run this migration in Supabase to expose limited host info for property detail pages.

begin;

drop policy if exists "Public can view host profiles for published properties" on user_profiles;

create policy "Public can view host profiles for published properties"
  on user_profiles
  for select
  using (
    exists (
      select 1
      from properties
      where properties.owner_id = user_profiles.id
        and coalesce(properties.is_published, false) = true
    )
    or exists (
      select 1
      from properties
      where properties.created_by = user_profiles.id
        and coalesce(properties.is_published, false) = true
    )
  );

commit;
