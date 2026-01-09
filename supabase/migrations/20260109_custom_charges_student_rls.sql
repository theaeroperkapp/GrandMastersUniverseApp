-- Allow users to view their own custom charges (by family_id or profile_id)
DROP POLICY IF EXISTS "Users can view their own charges" ON custom_charges;
CREATE POLICY "Users can view their own charges" ON custom_charges
  FOR SELECT
  USING (
    -- User can see charges assigned to their family
    family_id IN (
      SELECT family_id FROM profiles WHERE id = auth.uid() AND family_id IS NOT NULL
    )
    OR
    -- User can see charges assigned directly to them
    profile_id = auth.uid()
  );
