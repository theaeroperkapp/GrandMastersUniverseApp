-- Add phone column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS phone TEXT;

COMMENT ON COLUMN profiles.phone IS 'User phone number';
