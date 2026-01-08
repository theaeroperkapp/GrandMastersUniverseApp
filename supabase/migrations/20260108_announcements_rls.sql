-- RLS Policies for Announcements
-- Fix announcements not showing for owners

-- First ensure the helper function exists
CREATE OR REPLACE FUNCTION get_user_school_id()
RETURNS UUID AS $$
  SELECT school_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- =============================================
-- ANNOUNCEMENTS - Owner policies (CRUD)
-- =============================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Owners can view school announcements" ON announcements;
DROP POLICY IF EXISTS "Owners can insert announcements" ON announcements;
DROP POLICY IF EXISTS "Owners can update announcements" ON announcements;
DROP POLICY IF EXISTS "Owners can delete announcements" ON announcements;
DROP POLICY IF EXISTS "Service role has full access to announcements" ON announcements;

-- Owners/Admins can view all announcements in their school
CREATE POLICY "Owners can view school announcements" ON announcements FOR SELECT USING (
  school_id IN (
    SELECT school_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- Owners/Admins can create announcements
CREATE POLICY "Owners can insert announcements" ON announcements FOR INSERT WITH CHECK (
  school_id IN (
    SELECT school_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')
  ) AND author_id = auth.uid()
);

-- Owners/Admins can update announcements in their school
CREATE POLICY "Owners can update announcements" ON announcements FOR UPDATE USING (
  school_id IN (
    SELECT school_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- Owners/Admins can delete announcements in their school
CREATE POLICY "Owners can delete announcements" ON announcements FOR DELETE USING (
  school_id IN (
    SELECT school_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- Service role bypass
CREATE POLICY "Service role has full access to announcements" ON announcements
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- =============================================
-- ANNOUNCEMENTS - Member policies (read published only)
-- =============================================

-- Students/Parents can only view published announcements in their school
DROP POLICY IF EXISTS "Members can view published announcements" ON announcements;
CREATE POLICY "Members can view published announcements" ON announcements FOR SELECT USING (
  is_published = true AND
  school_id IN (
    SELECT school_id FROM profiles WHERE id = auth.uid()
  )
);
