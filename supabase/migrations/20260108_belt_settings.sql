-- Add disabled_default_belts column to schools table
-- This allows schools to selectively disable default belts they don't use
ALTER TABLE schools ADD COLUMN IF NOT EXISTS disabled_default_belts UUID[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN schools.disabled_default_belts IS 'Array of default belt_rank IDs that this school has disabled';
