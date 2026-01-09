-- Add profile_id to custom_charges for individual charges
-- Make family_id nullable (charge can go to either family OR individual)
ALTER TABLE custom_charges ALTER COLUMN family_id DROP NOT NULL;
ALTER TABLE custom_charges ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Add check constraint: either family_id or profile_id must be set
-- Drop first if exists to avoid error
ALTER TABLE custom_charges DROP CONSTRAINT IF EXISTS charge_recipient_check;
ALTER TABLE custom_charges ADD CONSTRAINT charge_recipient_check
  CHECK (family_id IS NOT NULL OR profile_id IS NOT NULL);

-- Add index for profile_id lookups
CREATE INDEX IF NOT EXISTS idx_custom_charges_profile ON custom_charges(profile_id);
