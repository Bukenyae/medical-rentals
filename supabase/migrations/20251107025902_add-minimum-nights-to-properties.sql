alter table public.properties
  add column if not exists minimum_nights integer not null default 1;

update public.properties
   set minimum_nights = 1
 where minimum_nights is null;
