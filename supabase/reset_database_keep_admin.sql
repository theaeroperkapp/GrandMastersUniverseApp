-- =====================================================
-- DATABASE RESET SCRIPT - Keeps Admin Account Only
-- =====================================================
-- Run this in Supabase SQL Editor
-- This will DELETE ALL DATA except the admin profile
-- =====================================================

-- First, let's identify the admin user(s) we want to keep
-- Run this SELECT first to verify which admin(s) will be preserved:
-- SELECT id, email, full_name, role FROM profiles WHERE role = 'admin';

BEGIN;

-- =====================================================
-- PHASE 1: Delete leaf tables (no other tables depend on these)
-- =====================================================

-- Analytics/Sessions (no dependencies)
TRUNCATE TABLE visitor_sessions CASCADE;
TRUNCATE TABLE user_sessions CASCADE;

-- Contact/Waitlist
TRUNCATE TABLE contact_submissions CASCADE;
TRUNCATE TABLE waitlist CASCADE;

-- Notifications
DELETE FROM notifications WHERE user_id NOT IN (SELECT id FROM profiles WHERE role = 'admin');

-- User settings
DELETE FROM user_settings WHERE user_id NOT IN (SELECT id FROM profiles WHERE role = 'admin');

-- =====================================================
-- PHASE 2: Delete social/messaging tables
-- =====================================================

-- Message reactions (depends on messages)
TRUNCATE TABLE message_reactions CASCADE;

-- Messages (depends on conversations)
TRUNCATE TABLE messages CASCADE;

-- Conversations (depends on profiles)
DELETE FROM conversations
WHERE participant_one NOT IN (SELECT id FROM profiles WHERE role = 'admin')
   OR participant_two NOT IN (SELECT id FROM profiles WHERE role = 'admin');

-- Comment likes (depends on comments)
TRUNCATE TABLE comment_likes CASCADE;

-- Comments (depends on posts)
TRUNCATE TABLE comments CASCADE;

-- Post likes (depends on posts)
TRUNCATE TABLE likes CASCADE;

-- Post counts
TRUNCATE TABLE post_counts CASCADE;

-- Announcement reads (depends on announcements)
TRUNCATE TABLE announcement_reads CASCADE;

-- Announcements (depends on schools)
TRUNCATE TABLE announcements CASCADE;

-- Posts (depends on schools)
TRUNCATE TABLE posts CASCADE;

-- =====================================================
-- PHASE 3: Delete attendance & class tables
-- =====================================================

-- Attendance records (depends on class_sessions, student_profiles)
TRUNCATE TABLE attendance_records CASCADE;

-- Class sessions (depends on class_schedules)
TRUNCATE TABLE class_sessions CASCADE;

-- Class enrollments (depends on class_schedules, student_profiles)
TRUNCATE TABLE class_enrollments CASCADE;

-- Class schedules (depends on schools, belt_ranks)
TRUNCATE TABLE class_schedules CASCADE;

-- =====================================================
-- PHASE 4: Delete event tables
-- =====================================================

-- Event registrations (depends on events, student_profiles, families)
TRUNCATE TABLE event_registrations CASCADE;

-- Events (depends on schools)
TRUNCATE TABLE events CASCADE;

-- =====================================================
-- PHASE 5: Delete contract tables
-- =====================================================

-- Signed contracts (depends on contracts, families)
TRUNCATE TABLE signed_contracts CASCADE;

-- Contracts (depends on schools)
TRUNCATE TABLE contracts CASCADE;

-- =====================================================
-- PHASE 6: Delete billing/payment tables
-- =====================================================

-- Belt test payments
TRUNCATE TABLE belt_test_payments CASCADE;

-- Belt test fees
TRUNCATE TABLE belt_test_fees CASCADE;

-- Custom charges (depends on schools, families)
TRUNCATE TABLE custom_charges CASCADE;

-- Platform payments (depends on schools)
TRUNCATE TABLE platform_payments CASCADE;

-- Profile memberships
TRUNCATE TABLE profile_memberships CASCADE;

-- Family memberships (depends on families, memberships)
TRUNCATE TABLE family_memberships CASCADE;

-- Memberships (depends on schools)
TRUNCATE TABLE memberships CASCADE;

-- School feature subscriptions
TRUNCATE TABLE school_feature_subscriptions CASCADE;

-- Platform features (reference data - optional to keep)
-- TRUNCATE TABLE platform_features CASCADE;

-- =====================================================
-- PHASE 7: Delete student/family tables
-- =====================================================

-- Rank history (depends on student_profiles, belt_ranks)
TRUNCATE TABLE rank_history CASCADE;

-- Student profiles (depends on profiles, schools, belt_ranks)
TRUNCATE TABLE student_profiles CASCADE;

-- Family members (depends on families, profiles)
TRUNCATE TABLE family_members CASCADE;

-- Families (depends on schools, profiles)
TRUNCATE TABLE families CASCADE;

-- =====================================================
-- PHASE 8: Delete belt ranks (keep defaults if needed)
-- =====================================================

-- Delete custom belt ranks (those with school_id set)
DELETE FROM belt_ranks WHERE school_id IS NOT NULL;

-- If you want to delete ALL belt ranks including defaults:
-- TRUNCATE TABLE belt_ranks CASCADE;

-- =====================================================
-- PHASE 9: Delete schools
-- =====================================================

TRUNCATE TABLE schools CASCADE;

-- =====================================================
-- PHASE 10: Delete non-admin profiles
-- =====================================================

-- Clear school_id and family_id from admin profiles first
UPDATE profiles
SET school_id = NULL, family_id = NULL
WHERE role = 'admin';

-- Delete all non-admin profiles
DELETE FROM profiles WHERE role != 'admin';

-- =====================================================
-- PHASE 11: Clean up auth.users (non-admin)
-- =====================================================

-- Delete from auth.users where the profile is not admin
-- NOTE: This requires elevated permissions (service role)
DELETE FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles WHERE role = 'admin');

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Run these after the script to verify:

-- Check remaining profiles (should only be admin)
SELECT id, email, full_name, role FROM profiles;

-- Check all tables are empty or only have admin-related data
SELECT 'schools' as table_name, COUNT(*) as count FROM schools
UNION ALL SELECT 'families', COUNT(*) FROM families
UNION ALL SELECT 'student_profiles', COUNT(*) FROM student_profiles
UNION ALL SELECT 'posts', COUNT(*) FROM posts
UNION ALL SELECT 'events', COUNT(*) FROM events
UNION ALL SELECT 'classes', COUNT(*) FROM class_schedules
UNION ALL SELECT 'belt_ranks', COUNT(*) FROM belt_ranks;
