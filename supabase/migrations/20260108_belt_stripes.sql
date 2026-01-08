-- Add stripe support to belt_ranks table
-- This allows schools to create belts with stripes (e.g., Blue Belt with 1 black stripe)

ALTER TABLE belt_ranks ADD COLUMN IF NOT EXISTS stripe_count INTEGER DEFAULT 0;
ALTER TABLE belt_ranks ADD COLUMN IF NOT EXISTS stripe_color TEXT DEFAULT '#000000';

-- Add comments for documentation
COMMENT ON COLUMN belt_ranks.stripe_count IS 'Number of stripes on the belt (0-4)';
COMMENT ON COLUMN belt_ranks.stripe_color IS 'Color of the stripes (hex code)';
