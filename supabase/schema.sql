-- GrandMastersUniverse Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================
-- ENUMS
-- =====================
CREATE TYPE user_role AS ENUM ('admin', 'owner', 'parent', 'student');
CREATE TYPE sub_role AS ENUM ('community_manager', 'billing_coordinator');
CREATE TYPE account_type AS ENUM ('adult', 'minor');
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'past_due', 'canceled', 'grace_period');
CREATE TYPE family_relationship AS ENUM ('primary', 'spouse', 'child', 'other');
CREATE TYPE class_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE check_in_method AS ENUM ('qr', 'pin', 'manual');
CREATE TYPE event_type AS ENUM ('seminar', 'tournament', 'belt_testing', 'social', 'other');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'refunded', 'succeeded', 'failed');
CREATE TYPE membership_status AS ENUM ('active', 'paused', 'cancelled');
CREATE TYPE billing_period AS ENUM ('monthly', 'quarterly', 'annually');
CREATE TYPE announcement_category AS ENUM ('general', 'schedule', 'event', 'safety', 'billing');
CREATE TYPE announcement_priority AS ENUM ('normal', 'important', 'urgent');
CREATE TYPE notification_type AS ENUM ('comment', 'like', 'mention', 'message', 'announcement', 'approval', 'promotion', 'event');
CREATE TYPE contact_type AS ENUM ('general', 'demo', 'support');
CREATE TYPE contact_status AS ENUM ('new', 'contacted', 'resolved');

-- =====================
-- CORE TABLES
-- =====================

-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'student',
  sub_roles sub_role[] DEFAULT '{}',
  account_type account_type NOT NULL DEFAULT 'adult',
  school_id UUID,
  family_id UUID,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  is_student BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Schools
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_account_id TEXT,
  stripe_customer_id TEXT,
  subscription_status subscription_status NOT NULL DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  monthly_post_limit INTEGER NOT NULL DEFAULT 4,
  announcement_limit INTEGER NOT NULL DEFAULT 20,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key for profiles.school_id
ALTER TABLE profiles ADD CONSTRAINT fk_profiles_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL;

-- Families
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  primary_holder_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  billing_email TEXT,
  billing_address TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key for profiles.family_id
ALTER TABLE profiles ADD CONSTRAINT fk_profiles_family FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE SET NULL;

-- Family Members
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  relationship family_relationship NOT NULL,
  is_student BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(family_id, profile_id)
);

-- =====================
-- BELT SYSTEM
-- =====================

-- Belt Ranks (school_id NULL = default/system belts)
CREATE TABLE belt_ranks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Student Profiles (detailed info for students)
CREATE TABLE student_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  belt_rank_id UUID REFERENCES belt_ranks(id),
  enrollment_date DATE,
  date_of_birth DATE,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  medical_notes TEXT,
  pin_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rank History (belt promotions)
CREATE TABLE rank_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  belt_rank_id UUID NOT NULL REFERENCES belt_ranks(id),
  promoted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  promoted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT
);

-- =====================
-- CLASSES & ATTENDANCE
-- =====================

-- Class Schedules
CREATE TABLE class_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  instructor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  max_capacity INTEGER,
  belt_requirement_id UUID REFERENCES belt_ranks(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Class Sessions (individual occurrences)
CREATE TABLE class_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_schedule_id UUID NOT NULL REFERENCES class_schedules(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status class_status NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(class_schedule_id, date)
);

-- Class Enrollments
CREATE TABLE class_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_schedule_id UUID NOT NULL REFERENCES class_schedules(id) ON DELETE CASCADE,
  student_profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(class_schedule_id, student_profile_id)
);

-- Attendance Records
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  student_profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  check_in_method check_in_method NOT NULL,
  checked_in_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(class_session_id, student_profile_id)
);

-- =====================
-- EVENTS
-- =====================

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_type event_type NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  location TEXT,
  max_capacity INTEGER,
  fee INTEGER, -- in cents
  registration_deadline TIMESTAMPTZ,
  is_published BOOLEAN NOT NULL DEFAULT false,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE event_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  student_profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id),
  payment_status payment_status NOT NULL DEFAULT 'pending',
  payment_intent_id TEXT,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, student_profile_id)
);

-- =====================
-- CONTRACTS & WAIVERS
-- =====================

CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE signed_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  signed_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  signature_data TEXT NOT NULL, -- base64 signature image
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  UNIQUE(contract_id, family_id)
);

-- =====================
-- BILLING & MEMBERSHIPS
-- =====================

CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL, -- in cents
  billing_period billing_period NOT NULL DEFAULT 'monthly',
  family_discount_percent INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE family_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES memberships(id),
  status membership_status NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE custom_charges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL, -- in cents
  due_date DATE,
  status payment_status NOT NULL DEFAULT 'pending',
  payment_intent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================
-- SOCIAL FEATURES
-- =====================

CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  is_announcement BOOLEAN NOT NULL DEFAULT false,
  share_to_facebook BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE post_counts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL, -- format: YYYY-MM
  count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(profile_id, school_id, year_month)
);

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, profile_id)
);

-- =====================
-- ANNOUNCEMENTS
-- =====================

CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category announcement_category NOT NULL DEFAULT 'general',
  priority announcement_priority NOT NULL DEFAULT 'normal',
  is_published BOOLEAN NOT NULL DEFAULT false,
  scheduled_for TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE announcement_reads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(announcement_id, profile_id)
);

-- =====================
-- MESSAGING
-- =====================

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_one UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_two UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(participant_one, participant_two)
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================
-- NOTIFICATIONS
-- =====================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  related_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================
-- PLATFORM ADMIN
-- =====================

CREATE TABLE contact_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  submission_type contact_type NOT NULL DEFAULT 'general',
  status contact_status NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  school_name TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE platform_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- in cents
  status payment_status NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================
-- ANALYTICS
-- =====================

CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  logout_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT,
  city TEXT,
  country TEXT
);

CREATE TABLE visitor_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visitor_id TEXT NOT NULL,
  landing_page TEXT NOT NULL,
  exit_page TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  device_type TEXT,
  browser TEXT,
  country TEXT,
  city TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- =====================
-- INDEXES
-- =====================

CREATE INDEX idx_profiles_school ON profiles(school_id);
CREATE INDEX idx_profiles_family ON profiles(family_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);

CREATE INDEX idx_schools_subdomain ON schools(subdomain);
CREATE INDEX idx_schools_owner ON schools(owner_id);

CREATE INDEX idx_families_school ON families(school_id);
CREATE INDEX idx_families_primary ON families(primary_holder_id);

CREATE INDEX idx_student_profiles_school ON student_profiles(school_id);
CREATE INDEX idx_student_profiles_belt ON student_profiles(belt_rank_id);

CREATE INDEX idx_belt_ranks_school ON belt_ranks(school_id);
CREATE INDEX idx_belt_ranks_default ON belt_ranks(is_default);

CREATE INDEX idx_class_schedules_school ON class_schedules(school_id);
CREATE INDEX idx_class_sessions_schedule ON class_sessions(class_schedule_id);
CREATE INDEX idx_class_sessions_date ON class_sessions(date);

CREATE INDEX idx_attendance_session ON attendance_records(class_session_id);
CREATE INDEX idx_attendance_student ON attendance_records(student_profile_id);

CREATE INDEX idx_events_school ON events(school_id);
CREATE INDEX idx_events_date ON events(start_date);

CREATE INDEX idx_posts_school ON posts(school_id);
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);

CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_likes_post ON likes(post_id);

CREATE INDEX idx_announcements_school ON announcements(school_id);
CREATE INDEX idx_notifications_profile ON notifications(profile_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);

-- =====================
-- DEFAULT BELT RANKS (Insert after creating tables)
-- =====================

INSERT INTO belt_ranks (name, color, display_order, is_default) VALUES
  ('White Belt', '#FFFFFF', 1, true),
  ('Yellow Belt', '#FFD700', 2, true),
  ('Orange Belt', '#FFA500', 3, true),
  ('Green Belt', '#228B22', 4, true),
  ('Blue Belt', '#0000FF', 5, true),
  ('Purple Belt', '#800080', 6, true),
  ('Brown Belt', '#8B4513', 7, true),
  ('Red Belt', '#FF0000', 8, true),
  ('Black Belt 1st Dan', '#000000', 9, true),
  ('Black Belt 2nd Dan', '#000000', 10, true),
  ('Black Belt 3rd Dan', '#000000', 11, true),
  ('Black Belt 4th Dan', '#000000', 12, true),
  ('Black Belt 5th Dan', '#000000', 13, true);

-- =====================
-- FUNCTIONS & TRIGGERS
-- =====================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON schools FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_families_updated_at BEFORE UPDATE ON families FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_student_profiles_updated_at BEFORE UPDATE ON student_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_class_schedules_updated_at BEFORE UPDATE ON class_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_family_memberships_updated_at BEFORE UPDATE ON family_memberships FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Handle new user signup (create profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Unknown')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Profile creation failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================
-- ROW LEVEL SECURITY
-- =====================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE belt_ranks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rank_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE signed_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_sessions ENABLE ROW LEVEL SECURITY;

-- Helper function to safely get user's school_id
CREATE OR REPLACE FUNCTION get_user_school_id()
RETURNS UUID AS $$
  SELECT school_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_user_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Profiles policies
CREATE POLICY "Users can view profiles in same school" ON profiles
  FOR SELECT USING (
    auth.uid() = id OR
    school_id = get_user_school_id() OR
    is_user_admin()
  );

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Schools policies
CREATE POLICY "Anyone can view schools" ON schools FOR SELECT USING (true);

CREATE POLICY "Owners can update own school" ON schools
  FOR UPDATE USING (owner_id = auth.uid() OR is_user_admin());

CREATE POLICY "Admin can insert schools" ON schools
  FOR INSERT WITH CHECK (is_user_admin());

-- Posts policies
CREATE POLICY "Users can view posts in same school" ON posts
  FOR SELECT USING (
    deleted_at IS NULL AND
    school_id = get_user_school_id()
  );

CREATE POLICY "Users can create posts in own school" ON posts
  FOR INSERT WITH CHECK (
    author_id = auth.uid() AND
    school_id = get_user_school_id()
  );

CREATE POLICY "Users can update own posts" ON posts
  FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY "Owners and authors can delete posts" ON posts
  FOR DELETE USING (
    author_id = auth.uid() OR
    is_user_admin()
  );

-- Belt ranks policies (viewable by all, managed by owners/admins)
CREATE POLICY "Anyone can view belt ranks" ON belt_ranks FOR SELECT USING (true);

CREATE POLICY "Owners can manage school belt ranks" ON belt_ranks
  FOR ALL USING (
    is_default = true OR
    is_user_admin()
  );

-- Events policies
CREATE POLICY "Users can view published events in school" ON events
  FOR SELECT USING (
    (is_published = true AND school_id = get_user_school_id()) OR
    is_user_admin()
  );

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (profile_id = auth.uid());

-- Service role bypass for all tables (for API operations)
CREATE POLICY "Service role has full access to profiles" ON profiles FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role has full access to schools" ON schools FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role has full access to families" ON families FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role has full access to family_members" ON family_members FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role has full access to student_profiles" ON student_profiles FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role has full access to belt_ranks" ON belt_ranks FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role has full access to rank_history" ON rank_history FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role has full access to class_schedules" ON class_schedules FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role has full access to class_sessions" ON class_sessions FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role has full access to class_enrollments" ON class_enrollments FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role has full access to attendance_records" ON attendance_records FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role has full access to events" ON events FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role has full access to event_registrations" ON event_registrations FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role has full access to contracts" ON contracts FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role has full access to signed_contracts" ON signed_contracts FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role has full access to memberships" ON memberships FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role has full access to family_memberships" ON family_memberships FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role has full access to custom_charges" ON custom_charges FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role has full access to posts" ON posts FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role has full access to post_counts" ON post_counts FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role has full access to comments" ON comments FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role has full access to likes" ON likes FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role has full access to announcements" ON announcements FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role has full access to announcement_reads" ON announcement_reads FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role has full access to conversations" ON conversations FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role has full access to messages" ON messages FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role has full access to notifications" ON notifications FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role has full access to contact_submissions" ON contact_submissions FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role has full access to waitlist" ON waitlist FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role has full access to platform_payments" ON platform_payments FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role has full access to user_sessions" ON user_sessions FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role has full access to visitor_sessions" ON visitor_sessions FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Public insert for contact and waitlist
CREATE POLICY "Anyone can submit contact form" ON contact_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can join waitlist" ON waitlist FOR INSERT WITH CHECK (true);

-- Admin policies for platform management
CREATE POLICY "Admin can view all waitlist" ON waitlist FOR SELECT USING (is_user_admin());
CREATE POLICY "Admin can update waitlist" ON waitlist FOR UPDATE USING (is_user_admin());
CREATE POLICY "Admin can delete waitlist" ON waitlist FOR DELETE USING (is_user_admin());

CREATE POLICY "Admin can view all contact_submissions" ON contact_submissions FOR SELECT USING (is_user_admin());
CREATE POLICY "Admin can update contact_submissions" ON contact_submissions FOR UPDATE USING (is_user_admin());

CREATE POLICY "Admin can view all profiles" ON profiles FOR SELECT USING (is_user_admin());
CREATE POLICY "Admin can view all student_profiles" ON student_profiles FOR SELECT USING (is_user_admin());
CREATE POLICY "Admin can view all families" ON families FOR SELECT USING (is_user_admin());
CREATE POLICY "Admin can view all schools" ON schools FOR SELECT USING (is_user_admin());

CREATE POLICY "Admin can view platform_payments" ON platform_payments FOR SELECT USING (is_user_admin());
CREATE POLICY "Admin can view user_sessions" ON user_sessions FOR SELECT USING (is_user_admin());
CREATE POLICY "Admin can view visitor_sessions" ON visitor_sessions FOR SELECT USING (is_user_admin());
