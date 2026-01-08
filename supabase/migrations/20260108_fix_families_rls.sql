-- Fix families RLS policy to allow owners to view families in their school
-- The current policy only allows users with role='admin' via is_user_admin()
-- but owners also need to see families

-- Add policy for owners to view families in their school
DROP POLICY IF EXISTS "Owners can view school families" ON families;
CREATE POLICY "Owners can view school families" ON families FOR SELECT USING (
  school_id = get_user_school_id() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

-- Also add policies for owners to manage families (insert, update, delete)
DROP POLICY IF EXISTS "Owners can insert families" ON families;
CREATE POLICY "Owners can insert families" ON families FOR INSERT WITH CHECK (
  school_id = get_user_school_id() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

DROP POLICY IF EXISTS "Owners can update families" ON families;
CREATE POLICY "Owners can update families" ON families FOR UPDATE USING (
  school_id = get_user_school_id() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

DROP POLICY IF EXISTS "Owners can delete families" ON families;
CREATE POLICY "Owners can delete families" ON families FOR DELETE USING (
  school_id = get_user_school_id() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

-- Fix student_profiles RLS policy to allow owners to view/manage student profiles
-- The current policy only allows users with role='admin' via is_user_admin()
-- but owners also need to see and manage student profiles (for belt assignments, PINs, etc.)

DROP POLICY IF EXISTS "Owners can view school student_profiles" ON student_profiles;
CREATE POLICY "Owners can view school student_profiles" ON student_profiles FOR SELECT USING (
  school_id = get_user_school_id() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

DROP POLICY IF EXISTS "Owners can insert student_profiles" ON student_profiles;
CREATE POLICY "Owners can insert student_profiles" ON student_profiles FOR INSERT WITH CHECK (
  school_id = get_user_school_id() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

DROP POLICY IF EXISTS "Owners can update student_profiles" ON student_profiles;
CREATE POLICY "Owners can update student_profiles" ON student_profiles FOR UPDATE USING (
  school_id = get_user_school_id() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

DROP POLICY IF EXISTS "Owners can delete student_profiles" ON student_profiles;
CREATE POLICY "Owners can delete student_profiles" ON student_profiles FOR DELETE USING (
  school_id = get_user_school_id() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

-- Fix events RLS policy to allow owners to view/manage all events (including unpublished)
-- The current policy only allows published events or admin users

DROP POLICY IF EXISTS "Owners can view school events" ON events;
CREATE POLICY "Owners can view school events" ON events FOR SELECT USING (
  school_id = get_user_school_id() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

DROP POLICY IF EXISTS "Owners can insert events" ON events;
CREATE POLICY "Owners can insert events" ON events FOR INSERT WITH CHECK (
  school_id = get_user_school_id() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

DROP POLICY IF EXISTS "Owners can update events" ON events;
CREATE POLICY "Owners can update events" ON events FOR UPDATE USING (
  school_id = get_user_school_id() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

DROP POLICY IF EXISTS "Owners can delete events" ON events;
CREATE POLICY "Owners can delete events" ON events FOR DELETE USING (
  school_id = get_user_school_id() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

-- Fix event_registrations RLS policy to allow owners to manage registrations
-- Need to join through events table to check school_id

DROP POLICY IF EXISTS "Owners can view school event_registrations" ON event_registrations;
CREATE POLICY "Owners can view school event_registrations" ON event_registrations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = event_registrations.event_id
    AND e.school_id = get_user_school_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  )
);

DROP POLICY IF EXISTS "Owners can insert event_registrations" ON event_registrations;
CREATE POLICY "Owners can insert event_registrations" ON event_registrations FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = event_registrations.event_id
    AND e.school_id = get_user_school_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  )
);

DROP POLICY IF EXISTS "Owners can update event_registrations" ON event_registrations;
CREATE POLICY "Owners can update event_registrations" ON event_registrations FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = event_registrations.event_id
    AND e.school_id = get_user_school_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  )
);

DROP POLICY IF EXISTS "Owners can delete event_registrations" ON event_registrations;
CREATE POLICY "Owners can delete event_registrations" ON event_registrations FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = event_registrations.event_id
    AND e.school_id = get_user_school_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  )
);

-- Allow students/parents to view their own event registrations
DROP POLICY IF EXISTS "Users can view own event_registrations" ON event_registrations;
CREATE POLICY "Users can view own event_registrations" ON event_registrations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM student_profiles sp
    WHERE sp.id = event_registrations.student_profile_id
    AND sp.profile_id = auth.uid()
  )
);

-- Allow students/parents to insert registrations for themselves
DROP POLICY IF EXISTS "Users can insert own event_registrations" ON event_registrations;
CREATE POLICY "Users can insert own event_registrations" ON event_registrations FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM student_profiles sp
    WHERE sp.id = event_registrations.student_profile_id
    AND sp.profile_id = auth.uid()
  )
);

-- Allow students to view their own student_profiles (needed for registration)
DROP POLICY IF EXISTS "Users can view own student_profiles" ON student_profiles;
CREATE POLICY "Users can view own student_profiles" ON student_profiles FOR SELECT USING (
  profile_id = auth.uid()
);

-- =============================================
-- ANNOUNCEMENTS - Owner policies
-- =============================================
DROP POLICY IF EXISTS "Owners can view school announcements" ON announcements;
CREATE POLICY "Owners can view school announcements" ON announcements FOR SELECT USING (
  school_id = get_user_school_id() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

DROP POLICY IF EXISTS "Owners can insert announcements" ON announcements;
CREATE POLICY "Owners can insert announcements" ON announcements FOR INSERT WITH CHECK (
  school_id = get_user_school_id() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

DROP POLICY IF EXISTS "Owners can update announcements" ON announcements;
CREATE POLICY "Owners can update announcements" ON announcements FOR UPDATE USING (
  school_id = get_user_school_id() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

DROP POLICY IF EXISTS "Owners can delete announcements" ON announcements;
CREATE POLICY "Owners can delete announcements" ON announcements FOR DELETE USING (
  school_id = get_user_school_id() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

-- =============================================
-- MEMBERSHIPS - Owner policies
-- =============================================
DROP POLICY IF EXISTS "Owners can view school memberships" ON memberships;
CREATE POLICY "Owners can view school memberships" ON memberships FOR SELECT USING (
  school_id = get_user_school_id() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

DROP POLICY IF EXISTS "Owners can insert memberships" ON memberships;
CREATE POLICY "Owners can insert memberships" ON memberships FOR INSERT WITH CHECK (
  school_id = get_user_school_id() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

DROP POLICY IF EXISTS "Owners can update memberships" ON memberships;
CREATE POLICY "Owners can update memberships" ON memberships FOR UPDATE USING (
  school_id = get_user_school_id() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

DROP POLICY IF EXISTS "Owners can delete memberships" ON memberships;
CREATE POLICY "Owners can delete memberships" ON memberships FOR DELETE USING (
  school_id = get_user_school_id() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

-- =============================================
-- CUSTOM_CHARGES - Owner policies
-- =============================================
DROP POLICY IF EXISTS "Owners can view school custom_charges" ON custom_charges;
CREATE POLICY "Owners can view school custom_charges" ON custom_charges FOR SELECT USING (
  school_id = get_user_school_id() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

DROP POLICY IF EXISTS "Owners can insert custom_charges" ON custom_charges;
CREATE POLICY "Owners can insert custom_charges" ON custom_charges FOR INSERT WITH CHECK (
  school_id = get_user_school_id() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

DROP POLICY IF EXISTS "Owners can update custom_charges" ON custom_charges;
CREATE POLICY "Owners can update custom_charges" ON custom_charges FOR UPDATE USING (
  school_id = get_user_school_id() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

DROP POLICY IF EXISTS "Owners can delete custom_charges" ON custom_charges;
CREATE POLICY "Owners can delete custom_charges" ON custom_charges FOR DELETE USING (
  school_id = get_user_school_id() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

-- =============================================
-- CONTRACT_TEMPLATES - Owner policies
-- =============================================
DROP POLICY IF EXISTS "Owners can view school contract_templates" ON contract_templates;
CREATE POLICY "Owners can view school contract_templates" ON contract_templates FOR SELECT USING (
  school_id = get_user_school_id() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

DROP POLICY IF EXISTS "Owners can insert contract_templates" ON contract_templates;
CREATE POLICY "Owners can insert contract_templates" ON contract_templates FOR INSERT WITH CHECK (
  school_id = get_user_school_id() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

DROP POLICY IF EXISTS "Owners can update contract_templates" ON contract_templates;
CREATE POLICY "Owners can update contract_templates" ON contract_templates FOR UPDATE USING (
  school_id = get_user_school_id() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

DROP POLICY IF EXISTS "Owners can delete contract_templates" ON contract_templates;
CREATE POLICY "Owners can delete contract_templates" ON contract_templates FOR DELETE USING (
  school_id = get_user_school_id() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

-- =============================================
-- SIGNED_CONTRACTS - Owner policies
-- =============================================
DROP POLICY IF EXISTS "Owners can view school signed_contracts" ON signed_contracts;
CREATE POLICY "Owners can view school signed_contracts" ON signed_contracts FOR SELECT USING (
  school_id = get_user_school_id() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

DROP POLICY IF EXISTS "Owners can insert signed_contracts" ON signed_contracts;
CREATE POLICY "Owners can insert signed_contracts" ON signed_contracts FOR INSERT WITH CHECK (
  school_id = get_user_school_id() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

DROP POLICY IF EXISTS "Owners can update signed_contracts" ON signed_contracts;
CREATE POLICY "Owners can update signed_contracts" ON signed_contracts FOR UPDATE USING (
  school_id = get_user_school_id() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

DROP POLICY IF EXISTS "Owners can delete signed_contracts" ON signed_contracts;
CREATE POLICY "Owners can delete signed_contracts" ON signed_contracts FOR DELETE USING (
  school_id = get_user_school_id() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);
