-- Create profile_memberships table for individual (non-family) subscriptions
CREATE TABLE IF NOT EXISTS profile_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES memberships(id),
  status membership_status NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id) -- One subscription per profile
);

-- Add index for lookups
CREATE INDEX IF NOT EXISTS idx_profile_memberships_profile ON profile_memberships(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_memberships_membership ON profile_memberships(membership_id);

-- Enable RLS
ALTER TABLE profile_memberships ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Service role has full access to profile_memberships"
  ON profile_memberships FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users can view their own membership"
  ON profile_memberships FOR SELECT
  USING (profile_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_profile_memberships_updated_at
  BEFORE UPDATE ON profile_memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
