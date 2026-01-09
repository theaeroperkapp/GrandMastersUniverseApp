-- Add policy for owners/admins to view profile_memberships for their school's students
CREATE POLICY "Owners can view school member subscriptions"
  ON profile_memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles owner_profile
      WHERE owner_profile.id = auth.uid()
      AND owner_profile.role IN ('owner', 'admin')
      AND owner_profile.school_id = (
        SELECT school_id FROM profiles WHERE id = profile_memberships.profile_id
      )
    )
  );
