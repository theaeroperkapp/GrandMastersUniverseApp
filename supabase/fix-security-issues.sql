-- Fix Security Issues for GrandMastersUniverse
-- Run this BEFORE the optimize-rls-policies.sql script
-- Run in Supabase SQL Editor

BEGIN;

-- =====================================================
-- FIX 3 CRITICAL ERRORS: Enable RLS on tables
-- =====================================================

-- 1. trigger_logs - Enable RLS
ALTER TABLE IF EXISTS trigger_logs ENABLE ROW LEVEL SECURITY;

-- Add policies for trigger_logs (admin/service role only)
DROP POLICY IF EXISTS "Service role has full access to trigger_logs" ON trigger_logs;
CREATE POLICY "Service role has full access to trigger_logs" ON trigger_logs
  FOR ALL USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

-- 2. belt_test_payments - Enable RLS
ALTER TABLE IF EXISTS belt_test_payments ENABLE ROW LEVEL SECURITY;

-- Add policies for belt_test_payments
DROP POLICY IF EXISTS "Service role has full access to belt_test_payments" ON belt_test_payments;
CREATE POLICY "Service role has full access to belt_test_payments" ON belt_test_payments
  FOR ALL USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

DROP POLICY IF EXISTS "Owners can manage belt_test_payments" ON belt_test_payments;
CREATE POLICY "Owners can manage belt_test_payments" ON belt_test_payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('owner', 'admin')
    )
  );

-- 3. belt_test_fees - Enable RLS
ALTER TABLE IF EXISTS belt_test_fees ENABLE ROW LEVEL SECURITY;

-- Add policies for belt_test_fees
DROP POLICY IF EXISTS "Service role has full access to belt_test_fees" ON belt_test_fees;
CREATE POLICY "Service role has full access to belt_test_fees" ON belt_test_fees
  FOR ALL USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

DROP POLICY IF EXISTS "Owners can manage belt_test_fees" ON belt_test_fees;
CREATE POLICY "Owners can manage belt_test_fees" ON belt_test_fees
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can view belt_test_fees in their school" ON belt_test_fees;
CREATE POLICY "Users can view belt_test_fees in their school" ON belt_test_fees
  FOR SELECT USING (school_id = get_user_school_id());

COMMIT;

-- =====================================================
-- FIX 10 FUNCTION WARNINGS: Set search_path
-- =====================================================

-- 1. handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- 2. messages_broadcast_trigger
CREATE OR REPLACE FUNCTION public.messages_broadcast_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_notify('messages', json_build_object(
    'type', TG_OP,
    'record', row_to_json(NEW)
  )::text);
  RETURN NEW;
END;
$$;

-- 3. conversations_broadcast_trigger
CREATE OR REPLACE FUNCTION public.conversations_broadcast_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_notify('conversations', json_build_object(
    'type', TG_OP,
    'record', row_to_json(NEW)
  )::text);
  RETURN NEW;
END;
$$;

-- 4. posts_broadcast_trigger
CREATE OR REPLACE FUNCTION public.posts_broadcast_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_notify('posts', json_build_object(
    'type', TG_OP,
    'record', row_to_json(NEW)
  )::text);
  RETURN NEW;
END;
$$;

-- 5. comments_broadcast_trigger
CREATE OR REPLACE FUNCTION public.comments_broadcast_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_notify('comments', json_build_object(
    'type', TG_OP,
    'record', row_to_json(NEW)
  )::text);
  RETURN NEW;
END;
$$;

-- 6. likes_broadcast_trigger
CREATE OR REPLACE FUNCTION public.likes_broadcast_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_notify('likes', json_build_object(
    'type', TG_OP,
    'record', row_to_json(NEW)
  )::text);
  RETURN NEW;
END;
$$;

-- 7. notifications_broadcast_trigger
CREATE OR REPLACE FUNCTION public.notifications_broadcast_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_notify('notifications', json_build_object(
    'type', TG_OP,
    'record', row_to_json(NEW)
  )::text);
  RETURN NEW;
END;
$$;

-- 8. announcements_broadcast_trigger
CREATE OR REPLACE FUNCTION public.announcements_broadcast_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_notify('announcements', json_build_object(
    'type', TG_OP,
    'record', row_to_json(NEW)
  )::text);
  RETURN NEW;
END;
$$;

-- 9. update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 10. generate_unique_pin
CREATE OR REPLACE FUNCTION public.generate_unique_pin()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_pin TEXT;
  pin_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 6-digit PIN
    new_pin := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');

    -- Check if PIN already exists
    SELECT EXISTS(SELECT 1 FROM public.schools WHERE pin = new_pin) INTO pin_exists;

    -- Exit loop if PIN is unique
    EXIT WHEN NOT pin_exists;
  END LOOP;

  RETURN new_pin;
END;
$$;

-- =====================================================
-- NOTE: The following warnings are INTENTIONAL and should NOT be changed:
--
-- 1. "Anyone can submit contact form" on contact_submissions
--    -> This is intentional - public contact forms need anonymous access
--
-- 2. "Allow inserts" on notifications
--    -> This is intentional - system needs to create notifications for users
--    -> Consider restricting to service_role only if notifications are only created server-side
--
-- 3. "Anyone can join waitlist" on waitlist
--    -> This is intentional - public waitlist signups need anonymous access
--
-- 4. "Leaked Password Protection Disabled"
--    -> Enable this in Supabase Dashboard: Authentication > Settings > Password Security
-- =====================================================

-- OPTIONAL: If you want to restrict notifications to service_role only (recommended)
-- Uncomment the following:

-- DROP POLICY IF EXISTS "Allow inserts" ON notifications;
-- CREATE POLICY "Service role can insert notifications" ON notifications
--   FOR INSERT WITH CHECK (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);
