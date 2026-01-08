-- Belt Testing Fees table
CREATE TABLE IF NOT EXISTS belt_test_fees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  from_belt_id UUID REFERENCES belt_ranks(id) ON DELETE SET NULL,
  to_belt_id UUID REFERENCES belt_ranks(id) ON DELETE SET NULL,
  fee INTEGER NOT NULL, -- in cents
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Belt Test Payments table
CREATE TABLE IF NOT EXISTS belt_test_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  student_profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  belt_test_fee_id UUID REFERENCES belt_test_fees(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL, -- in cents
  status payment_status NOT NULL DEFAULT 'pending',
  payment_intent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

-- Add payment notification types to enum (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'payment_success' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')) THEN
    ALTER TYPE notification_type ADD VALUE 'payment_success';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'payment_failed' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')) THEN
    ALTER TYPE notification_type ADD VALUE 'payment_failed';
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_belt_test_fees_school ON belt_test_fees(school_id);
CREATE INDEX IF NOT EXISTS idx_belt_test_payments_school ON belt_test_payments(school_id);
CREATE INDEX IF NOT EXISTS idx_belt_test_payments_family ON belt_test_payments(family_id);
CREATE INDEX IF NOT EXISTS idx_belt_test_payments_status ON belt_test_payments(status);

-- RLS Policies
ALTER TABLE belt_test_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE belt_test_payments ENABLE ROW LEVEL SECURITY;

-- Belt test fees: owners can manage, users can view their school's fees
CREATE POLICY "Owners can manage belt test fees" ON belt_test_fees
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM schools s
      WHERE s.id = belt_test_fees.school_id
      AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their school belt test fees" ON belt_test_fees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.school_id = belt_test_fees.school_id
    )
  );

-- Belt test payments: families can view/pay their own
CREATE POLICY "Families can view their belt test payments" ON belt_test_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.family_id = belt_test_payments.family_id
    )
  );

CREATE POLICY "Owners can view all belt test payments" ON belt_test_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM schools s
      WHERE s.id = belt_test_payments.school_id
      AND s.owner_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_belt_test_fees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER belt_test_fees_updated_at
  BEFORE UPDATE ON belt_test_fees
  FOR EACH ROW
  EXECUTE FUNCTION update_belt_test_fees_updated_at();
