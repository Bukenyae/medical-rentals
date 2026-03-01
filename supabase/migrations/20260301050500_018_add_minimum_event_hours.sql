ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS minimum_event_hours integer NOT NULL DEFAULT 4;

UPDATE public.properties
SET minimum_event_hours = 4
WHERE minimum_event_hours IS NULL OR minimum_event_hours < 1;
