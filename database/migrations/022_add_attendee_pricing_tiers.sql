ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS attendee_pricing_tiers jsonb;

UPDATE public.properties
SET attendee_pricing_tiers = jsonb_build_array(
  jsonb_build_object('minAttendees', 1, 'maxAttendees', 9, 'extraHourlyCents', 0),
  jsonb_build_object('minAttendees', 10, 'maxAttendees', 15, 'extraHourlyCents', 2500),
  jsonb_build_object('minAttendees', 16, 'maxAttendees', 20, 'extraHourlyCents', 4500),
  jsonb_build_object('minAttendees', 21, 'maxAttendees', 25, 'extraHourlyCents', 6500),
  jsonb_build_object('minAttendees', 26, 'maxAttendees', 30, 'extraHourlyCents', 8500),
  jsonb_build_object('minAttendees', 31, 'maxAttendees', 35, 'extraHourlyCents', 9500),
  jsonb_build_object('minAttendees', 36, 'maxAttendees', 40, 'extraHourlyCents', 11500),
  jsonb_build_object('minAttendees', 41, 'maxAttendees', 45, 'extraHourlyCents', 13500),
  jsonb_build_object('minAttendees', 46, 'maxAttendees', 50, 'extraHourlyCents', 15500)
)
WHERE attendee_pricing_tiers IS NULL;
