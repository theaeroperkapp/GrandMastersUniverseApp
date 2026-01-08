-- Platform Features - Features that can be enabled/disabled for schools
-- All features are INCLUDED in the subscription (no per-feature pricing)
CREATE TABLE IF NOT EXISTS platform_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feature_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  is_available BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- School Feature Subscriptions - Links schools to enabled features
-- Features are free when subscription is active - this just tracks what's enabled
CREATE TABLE IF NOT EXISTS school_feature_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  feature_code TEXT NOT NULL REFERENCES platform_features(feature_code),
  is_enabled BOOLEAN DEFAULT false,
  enabled_at TIMESTAMPTZ,
  enabled_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, feature_code)
);

-- Platform Payments - Track subscription payments from schools
CREATE TABLE IF NOT EXISTS platform_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_type TEXT DEFAULT 'subscription' CHECK (payment_type IN ('subscription', 'manual', 'refund')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  description TEXT,
  payment_method TEXT,
  stripe_payment_intent_id TEXT,
  paid_at TIMESTAMPTZ,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  recorded_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default platform features (all included in subscription)
INSERT INTO platform_features (feature_code, name, description, category, sort_order) VALUES
  ('social_feed', 'Social Feed', 'Community posts, likes, and interactions', 'community', 1),
  ('announcements', 'Announcements', 'School-wide announcements and notifications', 'communication', 2),
  ('class_schedule', 'Class Schedule', 'Manage class schedules and student enrollment', 'scheduling', 3),
  ('attendance', 'Attendance Tracking', 'Track student attendance for classes', 'attendance', 4),
  ('belt_testing', 'Belt Testing', 'Manage belt tests and student progression', 'student_management', 5),
  ('contracts', 'Digital Contracts', 'Create, send, and track digital contracts and waivers', 'administration', 6),
  ('families', 'Family Management', 'Manage family accounts and student profiles', 'administration', 7),
  ('events', 'Events', 'Create and manage school events and tournaments', 'events', 8),
  ('payments', 'Payment Processing', 'Accept payments for events and custom charges', 'billing', 9),
  ('email_templates', 'Email Templates', 'Custom branded email templates', 'communication', 10),
  ('reports', 'Reports & Analytics', 'Attendance reports, revenue insights', 'reporting', 11)
ON CONFLICT (feature_code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_school_feature_subscriptions_school ON school_feature_subscriptions(school_id);
CREATE INDEX IF NOT EXISTS idx_school_feature_subscriptions_feature ON school_feature_subscriptions(feature_code);
CREATE INDEX IF NOT EXISTS idx_platform_payments_school ON platform_payments(school_id);
CREATE INDEX IF NOT EXISTS idx_platform_payments_status ON platform_payments(status);

-- RLS Policies
ALTER TABLE platform_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_feature_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for clean migration)
DROP POLICY IF EXISTS "Platform features readable by all" ON platform_features;
DROP POLICY IF EXISTS "Admin full access to subscriptions" ON school_feature_subscriptions;
DROP POLICY IF EXISTS "Owners can view their school subscriptions" ON school_feature_subscriptions;
DROP POLICY IF EXISTS "Admin full access to payments" ON platform_payments;
DROP POLICY IF EXISTS "Owners can view their school payments" ON platform_payments;

-- Platform features - readable by all authenticated users
CREATE POLICY "Platform features readable by all" ON platform_features
  FOR SELECT TO authenticated USING (true);

-- School feature subscriptions - admin can do everything, owners can read their school's
CREATE POLICY "Admin full access to subscriptions" ON school_feature_subscriptions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Owners can view their school subscriptions" ON school_feature_subscriptions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'owner'
      AND profiles.school_id = school_feature_subscriptions.school_id
    )
  );

-- Platform payments - admin can do everything, owners can read their school's
CREATE POLICY "Admin full access to payments" ON platform_payments
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Owners can view their school payments" ON platform_payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'owner'
      AND profiles.school_id = platform_payments.school_id
    )
  );
