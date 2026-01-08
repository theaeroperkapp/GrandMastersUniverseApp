-- Add subscription_plan column to schools table
-- Values: 'founding_partner', 'standard', 'trial'

ALTER TABLE schools
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'trial';

-- Update existing schools based on their subscription_status
UPDATE schools
SET subscription_plan = 'trial'
WHERE subscription_plan IS NULL;

COMMENT ON COLUMN schools.subscription_plan IS 'Subscription tier: founding_partner (free lifetime), standard ($99/mo), trial (30 days free)';
