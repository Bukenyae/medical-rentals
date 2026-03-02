BEGIN;

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS event_multi_day_discount_pct numeric(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS event_overnight_holding_pct numeric(5,2) DEFAULT 25,
  ADD COLUMN IF NOT EXISTS base_power_details text,
  ADD COLUMN IF NOT EXISTS base_parking_capacity integer DEFAULT 8;

ALTER TABLE properties
  DROP CONSTRAINT IF EXISTS properties_event_multi_day_discount_pct_check;

ALTER TABLE properties
  ADD CONSTRAINT properties_event_multi_day_discount_pct_check
  CHECK (
    event_multi_day_discount_pct IS NULL
    OR (event_multi_day_discount_pct >= 0 AND event_multi_day_discount_pct <= 100)
  );

ALTER TABLE properties
  DROP CONSTRAINT IF EXISTS properties_event_overnight_holding_pct_check;

ALTER TABLE properties
  ADD CONSTRAINT properties_event_overnight_holding_pct_check
  CHECK (
    event_overnight_holding_pct IS NULL
    OR (event_overnight_holding_pct >= 0 AND event_overnight_holding_pct <= 100)
  );

ALTER TABLE properties
  DROP CONSTRAINT IF EXISTS properties_base_parking_capacity_check;

ALTER TABLE properties
  ADD CONSTRAINT properties_base_parking_capacity_check
  CHECK (
    base_parking_capacity IS NULL
    OR base_parking_capacity >= 0
  );

UPDATE properties
SET
  event_multi_day_discount_pct = COALESCE(event_multi_day_discount_pct, 0),
  event_overnight_holding_pct = COALESCE(event_overnight_holding_pct, 25),
  base_power_details = COALESCE(NULLIF(base_power_details, ''), 'Standard residential supply'),
  base_parking_capacity = COALESCE(base_parking_capacity, 8);

COMMIT;
