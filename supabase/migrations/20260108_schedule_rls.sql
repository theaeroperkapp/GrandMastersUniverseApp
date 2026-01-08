-- RLS Policies for Class Schedules
-- Allow users to view class schedules for their school

-- Members can view active class schedules in their school
DROP POLICY IF EXISTS "Members can view school class schedules" ON class_schedules;
CREATE POLICY "Members can view school class schedules" ON class_schedules FOR SELECT USING (
  is_active = true AND
  school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid())
);

-- Owners/Admins can view all class schedules (including inactive)
DROP POLICY IF EXISTS "Owners can view all school class schedules" ON class_schedules;
CREATE POLICY "Owners can view all school class schedules" ON class_schedules FOR SELECT USING (
  school_id IN (
    SELECT school_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- Owners/Admins can create class schedules
DROP POLICY IF EXISTS "Owners can create class schedules" ON class_schedules;
CREATE POLICY "Owners can create class schedules" ON class_schedules FOR INSERT WITH CHECK (
  school_id IN (
    SELECT school_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- Owners/Admins can update class schedules
DROP POLICY IF EXISTS "Owners can update class schedules" ON class_schedules;
CREATE POLICY "Owners can update class schedules" ON class_schedules FOR UPDATE USING (
  school_id IN (
    SELECT school_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- Owners/Admins can delete class schedules
DROP POLICY IF EXISTS "Owners can delete class schedules" ON class_schedules;
CREATE POLICY "Owners can delete class schedules" ON class_schedules FOR DELETE USING (
  school_id IN (
    SELECT school_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')
  )
);
