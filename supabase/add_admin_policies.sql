-- Run this in Supabase SQL Editor to add admin RLS policies

-- Admin policies for waitlist
DROP POLICY IF EXISTS "Admin can view all waitlist" ON waitlist;
DROP POLICY IF EXISTS "Admin can update waitlist" ON waitlist;
DROP POLICY IF EXISTS "Admin can delete waitlist" ON waitlist;

CREATE POLICY "Admin can view all waitlist" ON waitlist FOR SELECT USING (is_user_admin());
CREATE POLICY "Admin can update waitlist" ON waitlist FOR UPDATE USING (is_user_admin());
CREATE POLICY "Admin can delete waitlist" ON waitlist FOR DELETE USING (is_user_admin());

-- Admin policies for contact_submissions
DROP POLICY IF EXISTS "Admin can view all contact_submissions" ON contact_submissions;
DROP POLICY IF EXISTS "Admin can update contact_submissions" ON contact_submissions;

CREATE POLICY "Admin can view all contact_submissions" ON contact_submissions FOR SELECT USING (is_user_admin());
CREATE POLICY "Admin can update contact_submissions" ON contact_submissions FOR UPDATE USING (is_user_admin());

-- Admin policies for profiles (to see all users in analytics)
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
CREATE POLICY "Admin can view all profiles" ON profiles FOR SELECT USING (is_user_admin());

-- Admin policies for student_profiles
DROP POLICY IF EXISTS "Admin can view all student_profiles" ON student_profiles;
CREATE POLICY "Admin can view all student_profiles" ON student_profiles FOR SELECT USING (is_user_admin());

-- Admin policies for families
DROP POLICY IF EXISTS "Admin can view all families" ON families;
CREATE POLICY "Admin can view all families" ON families FOR SELECT USING (is_user_admin());

-- Admin policies for schools (already has public SELECT, but explicit admin policy)
DROP POLICY IF EXISTS "Admin can view all schools" ON schools;
CREATE POLICY "Admin can view all schools" ON schools FOR SELECT USING (is_user_admin());

-- Admin policies for platform_payments
DROP POLICY IF EXISTS "Admin can view platform_payments" ON platform_payments;
CREATE POLICY "Admin can view platform_payments" ON platform_payments FOR SELECT USING (is_user_admin());

-- Admin policies for user_sessions
DROP POLICY IF EXISTS "Admin can view user_sessions" ON user_sessions;
CREATE POLICY "Admin can view user_sessions" ON user_sessions FOR SELECT USING (is_user_admin());

-- Admin policies for visitor_sessions
DROP POLICY IF EXISTS "Admin can view visitor_sessions" ON visitor_sessions;
CREATE POLICY "Admin can view visitor_sessions" ON visitor_sessions FOR SELECT USING (is_user_admin());
