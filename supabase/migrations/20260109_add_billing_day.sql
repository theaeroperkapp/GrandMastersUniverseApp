-- Add billing_day column to schools table
-- This allows admins to set which day of the month billing occurs
-- Values: 1-28 (avoiding 29-31 which don't exist in all months)

ALTER TABLE schools
ADD COLUMN IF NOT EXISTS billing_day INTEGER DEFAULT NULL;

-- Add constraint to ensure billing_day is between 1 and 28
ALTER TABLE schools
ADD CONSTRAINT billing_day_range CHECK (billing_day IS NULL OR (billing_day >= 1 AND billing_day <= 28));

-- Set default billing_day based on school's created_at date
-- This defaults to the day the school joined
UPDATE schools
SET billing_day = EXTRACT(DAY FROM created_at)::INTEGER
WHERE billing_day IS NULL
  AND created_at IS NOT NULL
  AND EXTRACT(DAY FROM created_at)::INTEGER <= 28;

-- For schools created on 29-31, default to 28
UPDATE schools
SET billing_day = 28
WHERE billing_day IS NULL
  AND created_at IS NOT NULL
  AND EXTRACT(DAY FROM created_at)::INTEGER > 28;

COMMENT ON COLUMN schools.billing_day IS 'Day of month for subscription billing (1-28). Defaults to join date.';
