-- Add parent_belt_id to belt_ranks for grouping stripe belts with their base belt
-- e.g., "Blue Belt I stripe" would have parent_belt_id pointing to "Blue Belt"
ALTER TABLE belt_ranks ADD COLUMN IF NOT EXISTS parent_belt_id UUID REFERENCES belt_ranks(id) ON DELETE SET NULL;

-- Add index for parent lookups
CREATE INDEX IF NOT EXISTS idx_belt_ranks_parent ON belt_ranks(parent_belt_id);
