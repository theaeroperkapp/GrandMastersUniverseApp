-- Run this in Supabase SQL Editor to add status columns to waitlist

-- Add new columns to waitlist table
ALTER TABLE waitlist
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES profiles(id);

-- Update existing entries to have 'pending' status
UPDATE waitlist SET status = 'pending' WHERE status IS NULL;
