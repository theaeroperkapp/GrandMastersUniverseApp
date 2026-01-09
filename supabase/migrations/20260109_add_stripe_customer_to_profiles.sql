-- Add stripe_customer_id to profiles for individual payments
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
