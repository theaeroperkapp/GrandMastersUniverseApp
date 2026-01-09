-- Add missing columns to platform_payments table
ALTER TABLE platform_payments ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'subscription' CHECK (payment_type IN ('subscription', 'manual', 'refund'));
ALTER TABLE platform_payments ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE platform_payments ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE platform_payments ADD COLUMN IF NOT EXISTS period_start TIMESTAMPTZ;
ALTER TABLE platform_payments ADD COLUMN IF NOT EXISTS period_end TIMESTAMPTZ;
ALTER TABLE platform_payments ADD COLUMN IF NOT EXISTS recorded_by UUID REFERENCES profiles(id);
ALTER TABLE platform_payments ADD COLUMN IF NOT EXISTS notes TEXT;
