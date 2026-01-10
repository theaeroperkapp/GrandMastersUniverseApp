-- Optimized RLS Policies for GrandMastersUniverse
-- This script replaces auth.uid() with (select auth.uid()) and auth.jwt() with (select auth.jwt())
-- This optimization prevents re-evaluation of auth functions for each row
-- Run this in Supabase SQL Editor

BEGIN;

-- =====================================================
-- ANNOUNCEMENT_READS
-- =====================================================
DROP POLICY IF EXISTS "Service role has full access to announcement_reads" ON announcement_reads;
CREATE POLICY "Service role has full access to announcement_reads" ON announcement_reads
  FOR ALL USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

-- =====================================================
-- ANNOUNCEMENTS
-- =====================================================
DROP POLICY IF EXISTS "Members can view published announcements" ON announcements;
CREATE POLICY "Members can view published announcements" ON announcements
  FOR SELECT USING ((is_published = true) AND (school_id IN (
    SELECT profiles.school_id FROM profiles WHERE (profiles.id = (select auth.uid()))
  )));

DROP POLICY IF EXISTS "Owners can delete announcements" ON announcements;
CREATE POLICY "Owners can delete announcements" ON announcements
  FOR DELETE USING (school_id IN (
    SELECT profiles.school_id FROM profiles
    WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['owner'::user_role, 'admin'::user_role])))
  ));

DROP POLICY IF EXISTS "Owners can insert announcements" ON announcements;
CREATE POLICY "Owners can insert announcements" ON announcements
  FOR INSERT WITH CHECK (
    (school_id IN (
      SELECT profiles.school_id FROM profiles
      WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['owner'::user_role, 'admin'::user_role])))
    )) AND (author_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "Owners can update announcements" ON announcements;
CREATE POLICY "Owners can update announcements" ON announcements
  FOR UPDATE USING (school_id IN (
    SELECT profiles.school_id FROM profiles
    WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['owner'::user_role, 'admin'::user_role])))
  ));

DROP POLICY IF EXISTS "Owners can view school announcements" ON announcements;
CREATE POLICY "Owners can view school announcements" ON announcements
  FOR SELECT USING (school_id IN (
    SELECT profiles.school_id FROM profiles
    WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['owner'::user_role, 'admin'::user_role])))
  ));

DROP POLICY IF EXISTS "Service role has full access to announcements" ON announcements;
CREATE POLICY "Service role has full access to announcements" ON announcements
  FOR ALL USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

-- =====================================================
-- ATTENDANCE_RECORDS
-- =====================================================
DROP POLICY IF EXISTS "Service role has full access to attendance_records" ON attendance_records;
CREATE POLICY "Service role has full access to attendance_records" ON attendance_records
  FOR ALL USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

DROP POLICY IF EXISTS "Students can view own attendance" ON attendance_records;
CREATE POLICY "Students can view own attendance" ON attendance_records
  FOR SELECT USING (student_profile_id IN (
    SELECT student_profiles.id FROM student_profiles WHERE (student_profiles.profile_id = (select auth.uid()))
  ));

-- =====================================================
-- BELT_RANKS
-- =====================================================
DROP POLICY IF EXISTS "Service role has full access to belt_ranks" ON belt_ranks;
CREATE POLICY "Service role has full access to belt_ranks" ON belt_ranks
  FOR ALL USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

-- =====================================================
-- CLASS_ENROLLMENTS
-- =====================================================
DROP POLICY IF EXISTS "Service role has full access to class_enrollments" ON class_enrollments;
CREATE POLICY "Service role has full access to class_enrollments" ON class_enrollments
  FOR ALL USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

DROP POLICY IF EXISTS "Students can view own enrollments" ON class_enrollments;
CREATE POLICY "Students can view own enrollments" ON class_enrollments
  FOR SELECT USING (student_profile_id IN (
    SELECT student_profiles.id FROM student_profiles WHERE (student_profiles.profile_id = (select auth.uid()))
  ));

-- =====================================================
-- CLASS_SCHEDULES
-- =====================================================
DROP POLICY IF EXISTS "Members can view school class schedules" ON class_schedules;
CREATE POLICY "Members can view school class schedules" ON class_schedules
  FOR SELECT USING ((is_active = true) AND (school_id IN (
    SELECT profiles.school_id FROM profiles WHERE (profiles.id = (select auth.uid()))
  )));

DROP POLICY IF EXISTS "Owners can delete class schedules" ON class_schedules;
CREATE POLICY "Owners can delete class schedules" ON class_schedules
  FOR DELETE USING (school_id IN (
    SELECT profiles.school_id FROM profiles
    WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['owner'::user_role, 'admin'::user_role])))
  ));

DROP POLICY IF EXISTS "Owners can insert class schedules" ON class_schedules;
CREATE POLICY "Owners can insert class schedules" ON class_schedules
  FOR INSERT WITH CHECK (school_id IN (
    SELECT profiles.school_id FROM profiles
    WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['owner'::user_role, 'admin'::user_role])))
  ));

DROP POLICY IF EXISTS "Owners can update class schedules" ON class_schedules;
CREATE POLICY "Owners can update class schedules" ON class_schedules
  FOR UPDATE USING (school_id IN (
    SELECT profiles.school_id FROM profiles
    WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['owner'::user_role, 'admin'::user_role])))
  ));

DROP POLICY IF EXISTS "Owners can view all school class schedules" ON class_schedules;
CREATE POLICY "Owners can view all school class schedules" ON class_schedules
  FOR SELECT USING (school_id IN (
    SELECT profiles.school_id FROM profiles
    WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['owner'::user_role, 'admin'::user_role])))
  ));

DROP POLICY IF EXISTS "Service role has full access to class_schedules" ON class_schedules;
CREATE POLICY "Service role has full access to class_schedules" ON class_schedules
  FOR ALL USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

DROP POLICY IF EXISTS "Users can view class schedules for their school" ON class_schedules;
CREATE POLICY "Users can view class schedules for their school" ON class_schedules
  FOR SELECT USING (school_id IN (
    SELECT profiles.school_id FROM profiles WHERE (profiles.id = (select auth.uid()))
  ));

-- =====================================================
-- CLASS_SESSIONS
-- =====================================================
DROP POLICY IF EXISTS "Service role has full access to class_sessions" ON class_sessions;
CREATE POLICY "Service role has full access to class_sessions" ON class_sessions
  FOR ALL USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

-- =====================================================
-- COMMENT_LIKES
-- =====================================================
DROP POLICY IF EXISTS "Service role has full access to comment_likes" ON comment_likes;
CREATE POLICY "Service role has full access to comment_likes" ON comment_likes
  FOR ALL USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

DROP POLICY IF EXISTS "Users can like comments" ON comment_likes;
CREATE POLICY "Users can like comments" ON comment_likes
  FOR INSERT WITH CHECK (profile_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can unlike their own likes" ON comment_likes;
CREATE POLICY "Users can unlike their own likes" ON comment_likes
  FOR DELETE USING (profile_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view comment likes in their school" ON comment_likes;
CREATE POLICY "Users can view comment likes in their school" ON comment_likes
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM (comments c JOIN posts p ON ((c.post_id = p.id)))
    WHERE ((c.id = comment_likes.comment_id) AND (p.school_id = (
      SELECT profiles.school_id FROM profiles WHERE (profiles.id = (select auth.uid()))
    )))
  ));

-- =====================================================
-- COMMENTS
-- =====================================================
DROP POLICY IF EXISTS "Service role has full access to comments" ON comments;
CREATE POLICY "Service role has full access to comments" ON comments
  FOR ALL USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

DROP POLICY IF EXISTS "Users can create comments" ON comments;
CREATE POLICY "Users can create comments" ON comments
  FOR INSERT WITH CHECK (
    (author_id = (select auth.uid())) AND (EXISTS (
      SELECT 1 FROM (posts p JOIN profiles prof ON ((prof.school_id = p.school_id)))
      WHERE ((p.id = comments.post_id) AND (prof.id = (select auth.uid())) AND (p.deleted_at IS NULL))
    ))
  );

DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
CREATE POLICY "Users can delete own comments" ON comments
  FOR DELETE USING (author_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own comments" ON comments;
CREATE POLICY "Users can update own comments" ON comments
  FOR UPDATE USING (author_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view comments" ON comments;
CREATE POLICY "Users can view comments" ON comments
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM (posts p JOIN profiles prof ON ((prof.school_id = p.school_id)))
    WHERE ((p.id = comments.post_id) AND (prof.id = (select auth.uid())) AND (p.deleted_at IS NULL))
  ));

-- =====================================================
-- CONTACT_SUBMISSIONS
-- =====================================================
DROP POLICY IF EXISTS "Service role has full access to contact_submissions" ON contact_submissions;
CREATE POLICY "Service role has full access to contact_submissions" ON contact_submissions
  FOR ALL USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

-- =====================================================
-- CONTRACTS
-- =====================================================
DROP POLICY IF EXISTS "Owners can delete contracts" ON contracts;
CREATE POLICY "Owners can delete contracts" ON contracts
  FOR DELETE USING (
    (school_id = get_user_school_id()) AND (EXISTS (
      SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'owner'::user_role))
    ))
  );

DROP POLICY IF EXISTS "Owners can insert contracts" ON contracts;
CREATE POLICY "Owners can insert contracts" ON contracts
  FOR INSERT WITH CHECK (
    (school_id = get_user_school_id()) AND (EXISTS (
      SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'owner'::user_role))
    ))
  );

DROP POLICY IF EXISTS "Owners can update contracts" ON contracts;
CREATE POLICY "Owners can update contracts" ON contracts
  FOR UPDATE USING (
    (school_id = get_user_school_id()) AND (EXISTS (
      SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'owner'::user_role))
    ))
  );

DROP POLICY IF EXISTS "Owners can view school contracts" ON contracts;
CREATE POLICY "Owners can view school contracts" ON contracts
  FOR SELECT USING (
    (school_id = get_user_school_id()) AND (EXISTS (
      SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'owner'::user_role))
    ))
  );

DROP POLICY IF EXISTS "Service role has full access to contracts" ON contracts;
CREATE POLICY "Service role has full access to contracts" ON contracts
  FOR ALL USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

-- =====================================================
-- CONVERSATIONS
-- =====================================================
DROP POLICY IF EXISTS "Service role has full access to conversations" ON conversations;
CREATE POLICY "Service role has full access to conversations" ON conversations
  FOR ALL USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK ((participant_one = (select auth.uid())) OR (participant_two = (select auth.uid())));

DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
CREATE POLICY "Users can update own conversations" ON conversations
  FOR UPDATE USING ((participant_one = (select auth.uid())) OR (participant_two = (select auth.uid())));

DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT USING ((participant_one = (select auth.uid())) OR (participant_two = (select auth.uid())));

-- =====================================================
-- CUSTOM_CHARGES
-- =====================================================
DROP POLICY IF EXISTS "Service role has full access to custom_charges" ON custom_charges;
CREATE POLICY "Service role has full access to custom_charges" ON custom_charges
  FOR ALL USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

DROP POLICY IF EXISTS "Users can view their own charges" ON custom_charges;
CREATE POLICY "Users can view their own charges" ON custom_charges
  FOR SELECT USING (
    (family_id IN (
      SELECT profiles.family_id FROM profiles
      WHERE ((profiles.id = (select auth.uid())) AND (profiles.family_id IS NOT NULL))
    )) OR (profile_id = (select auth.uid()))
  );

-- =====================================================
-- EVENT_REGISTRATIONS
-- =====================================================
DROP POLICY IF EXISTS "Owners can delete event_registrations" ON event_registrations;
CREATE POLICY "Owners can delete event_registrations" ON event_registrations
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM events e
    WHERE ((e.id = event_registrations.event_id) AND (e.school_id = get_user_school_id()) AND (EXISTS (
      SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'owner'::user_role))
    )))
  ));

DROP POLICY IF EXISTS "Owners can insert event_registrations" ON event_registrations;
CREATE POLICY "Owners can insert event_registrations" ON event_registrations
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM events e
    WHERE ((e.id = event_registrations.event_id) AND (e.school_id = get_user_school_id()) AND (EXISTS (
      SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'owner'::user_role))
    )))
  ));

DROP POLICY IF EXISTS "Owners can update event_registrations" ON event_registrations;
CREATE POLICY "Owners can update event_registrations" ON event_registrations
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM events e
    WHERE ((e.id = event_registrations.event_id) AND (e.school_id = get_user_school_id()) AND (EXISTS (
      SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'owner'::user_role))
    )))
  ));

DROP POLICY IF EXISTS "Owners can view school event_registrations" ON event_registrations;
CREATE POLICY "Owners can view school event_registrations" ON event_registrations
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM events e
    WHERE ((e.id = event_registrations.event_id) AND (e.school_id = get_user_school_id()) AND (EXISTS (
      SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'owner'::user_role))
    )))
  ));

DROP POLICY IF EXISTS "Service role has full access to event_registrations" ON event_registrations;
CREATE POLICY "Service role has full access to event_registrations" ON event_registrations
  FOR ALL USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

DROP POLICY IF EXISTS "Users can insert own event_registrations" ON event_registrations;
CREATE POLICY "Users can insert own event_registrations" ON event_registrations
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM student_profiles sp
    WHERE ((sp.id = event_registrations.student_profile_id) AND (sp.profile_id = (select auth.uid())))
  ));

DROP POLICY IF EXISTS "Users can view own event_registrations" ON event_registrations;
CREATE POLICY "Users can view own event_registrations" ON event_registrations
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM student_profiles sp
    WHERE ((sp.id = event_registrations.student_profile_id) AND (sp.profile_id = (select auth.uid())))
  ));

-- =====================================================
-- EVENTS
-- =====================================================
DROP POLICY IF EXISTS "Owners can delete events" ON events;
CREATE POLICY "Owners can delete events" ON events
  FOR DELETE USING (
    (school_id = get_user_school_id()) AND (EXISTS (
      SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'owner'::user_role))
    ))
  );

DROP POLICY IF EXISTS "Owners can insert events" ON events;
CREATE POLICY "Owners can insert events" ON events
  FOR INSERT WITH CHECK (
    (school_id = get_user_school_id()) AND (EXISTS (
      SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'owner'::user_role))
    ))
  );

DROP POLICY IF EXISTS "Owners can update events" ON events;
CREATE POLICY "Owners can update events" ON events
  FOR UPDATE USING (
    (school_id = get_user_school_id()) AND (EXISTS (
      SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'owner'::user_role))
    ))
  );

DROP POLICY IF EXISTS "Owners can view school events" ON events;
CREATE POLICY "Owners can view school events" ON events
  FOR SELECT USING (
    (school_id = get_user_school_id()) AND (EXISTS (
      SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'owner'::user_role))
    ))
  );

DROP POLICY IF EXISTS "Service role has full access to events" ON events;
CREATE POLICY "Service role has full access to events" ON events
  FOR ALL USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

DROP POLICY IF EXISTS "Users can view published events in school" ON events;
CREATE POLICY "Users can view published events in school" ON events
  FOR SELECT USING (
    ((is_published = true) AND (school_id = get_user_school_id())) OR (EXISTS (
      SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['admin'::user_role, 'owner'::user_role])))
    ))
  );

-- =====================================================
-- FAMILIES
-- =====================================================
DROP POLICY IF EXISTS "Owners can delete families" ON families;
CREATE POLICY "Owners can delete families" ON families
  FOR DELETE USING (
    (school_id = get_user_school_id()) AND (EXISTS (
      SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'owner'::user_role))
    ))
  );

DROP POLICY IF EXISTS "Owners can insert families" ON families;
CREATE POLICY "Owners can insert families" ON families
  FOR INSERT WITH CHECK (
    (school_id = get_user_school_id()) AND (EXISTS (
      SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'owner'::user_role))
    ))
  );

DROP POLICY IF EXISTS "Owners can update families" ON families;
CREATE POLICY "Owners can update families" ON families
  FOR UPDATE USING (
    (school_id = get_user_school_id()) AND (EXISTS (
      SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'owner'::user_role))
    ))
  );

DROP POLICY IF EXISTS "Owners can view school families" ON families;
CREATE POLICY "Owners can view school families" ON families
  FOR SELECT USING (
    (school_id = get_user_school_id()) AND (EXISTS (
      SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'owner'::user_role))
    ))
  );

DROP POLICY IF EXISTS "Service role has full access to families" ON families;
CREATE POLICY "Service role has full access to families" ON families
  FOR ALL USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

-- =====================================================
-- FAMILY_MEMBERS
-- =====================================================
DROP POLICY IF EXISTS "Service role has full access to family_members" ON family_members;
CREATE POLICY "Service role has full access to family_members" ON family_members
  FOR ALL USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

-- =====================================================
-- FAMILY_MEMBERSHIPS
-- =====================================================
DROP POLICY IF EXISTS "Service role has full access to family_memberships" ON family_memberships;
CREATE POLICY "Service role has full access to family_memberships" ON family_memberships
  FOR ALL USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

-- =====================================================
-- LIKES
-- =====================================================
DROP POLICY IF EXISTS "Service role has full access to likes" ON likes;
CREATE POLICY "Service role has full access to likes" ON likes
  FOR ALL USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

DROP POLICY IF EXISTS "Users can like posts" ON likes;
CREATE POLICY "Users can like posts" ON likes
  FOR INSERT WITH CHECK (
    (profile_id = (select auth.uid())) AND (EXISTS (
      SELECT 1 FROM (posts p JOIN profiles prof ON ((prof.school_id = p.school_id)))
      WHERE ((p.id = likes.post_id) AND (prof.id = (select auth.uid())) AND (p.deleted_at IS NULL))
    ))
  );

DROP POLICY IF EXISTS "Users can unlike posts" ON likes;
CREATE POLICY "Users can unlike posts" ON likes
  FOR DELETE USING (profile_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view likes" ON likes;
CREATE POLICY "Users can view likes" ON likes
  FOR SELECT USING (
    (profile_id = (select auth.uid())) OR (EXISTS (
      SELECT 1 FROM (posts p JOIN profiles prof ON ((prof.school_id = p.school_id)))
      WHERE ((p.id = likes.post_id) AND (prof.id = (select auth.uid())) AND (p.deleted_at IS NULL))
    ))
  );

-- =====================================================
-- MEMBERSHIPS
-- =====================================================
DROP POLICY IF EXISTS "Service role has full access to memberships" ON memberships;
CREATE POLICY "Service role has full access to memberships" ON memberships
  FOR ALL USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

-- =====================================================
-- MESSAGE_REACTIONS
-- =====================================================
DROP POLICY IF EXISTS "Users can add reactions to messages in their conversations" ON message_reactions;
CREATE POLICY "Users can add reactions to messages in their conversations" ON message_reactions
  FOR INSERT WITH CHECK (
    ((select auth.uid()) = user_id) AND (EXISTS (
      SELECT 1 FROM (messages m JOIN conversations c ON ((m.conversation_id = c.id)))
      WHERE ((m.id = message_reactions.message_id) AND ((c.participant_one = (select auth.uid())) OR (c.participant_two = (select auth.uid()))))
    ))
  );

DROP POLICY IF EXISTS "Users can remove their own reactions" ON message_reactions;
CREATE POLICY "Users can remove their own reactions" ON message_reactions
  FOR DELETE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view reactions in their conversations" ON message_reactions;
CREATE POLICY "Users can view reactions in their conversations" ON message_reactions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM (messages m JOIN conversations c ON ((m.conversation_id = c.id)))
    WHERE ((m.id = message_reactions.message_id) AND ((c.participant_one = (select auth.uid())) OR (c.participant_two = (select auth.uid()))))
  ));

-- =====================================================
-- MESSAGES
-- =====================================================
DROP POLICY IF EXISTS "Service role has full access to messages" ON messages;
CREATE POLICY "Service role has full access to messages" ON messages
  FOR ALL USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (
    (sender_id = (select auth.uid())) AND (EXISTS (
      SELECT 1 FROM conversations c
      WHERE ((c.id = messages.conversation_id) AND ((c.participant_one = (select auth.uid())) OR (c.participant_two = (select auth.uid()))))
    ))
  );

DROP POLICY IF EXISTS "Users can update messages in own conversations" ON messages;
CREATE POLICY "Users can update messages in own conversations" ON messages
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM conversations c
    WHERE ((c.id = messages.conversation_id) AND ((c.participant_one = (select auth.uid())) OR (c.participant_two = (select auth.uid()))))
  ));

DROP POLICY IF EXISTS "Users can view messages in own conversations" ON messages;
CREATE POLICY "Users can view messages in own conversations" ON messages
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM conversations c
    WHERE ((c.id = messages.conversation_id) AND ((c.participant_one = (select auth.uid())) OR (c.participant_two = (select auth.uid()))))
  ));

-- =====================================================
-- NOTIFICATIONS
-- =====================================================
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING ((select auth.uid()) = user_id);

-- =====================================================
-- PLATFORM_PAYMENTS
-- =====================================================
DROP POLICY IF EXISTS "Admin full access to payments" ON platform_payments;
CREATE POLICY "Admin full access to payments" ON platform_payments
  FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::user_role))
  ));

DROP POLICY IF EXISTS "Owners can view their school payments" ON platform_payments;
CREATE POLICY "Owners can view their school payments" ON platform_payments
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'owner'::user_role) AND (profiles.school_id = platform_payments.school_id))
  ));

DROP POLICY IF EXISTS "Service role has full access to platform_payments" ON platform_payments;
CREATE POLICY "Service role has full access to platform_payments" ON platform_payments
  FOR ALL USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

-- =====================================================
-- POST_COUNTS
-- =====================================================
DROP POLICY IF EXISTS "Service role has full access to post_counts" ON post_counts;
CREATE POLICY "Service role has full access to post_counts" ON post_counts
  FOR ALL USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

-- =====================================================
-- POSTS
-- =====================================================
DROP POLICY IF EXISTS "Owners and authors can delete posts" ON posts;
CREATE POLICY "Owners and authors can delete posts" ON posts
  FOR DELETE USING ((author_id = (select auth.uid())) OR is_user_admin());

DROP POLICY IF EXISTS "Service role has full access to posts" ON posts;
CREATE POLICY "Service role has full access to posts" ON posts
  FOR ALL USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

DROP POLICY IF EXISTS "Users can create posts in own school" ON posts;
CREATE POLICY "Users can create posts in own school" ON posts
  FOR INSERT WITH CHECK ((author_id = (select auth.uid())) AND (school_id = get_user_school_id()));

DROP POLICY IF EXISTS "Users can update own posts" ON posts;
CREATE POLICY "Users can update own posts" ON posts
  FOR UPDATE USING (author_id = (select auth.uid()));

-- =====================================================
-- PROFILE_MEMBERSHIPS
-- =====================================================
DROP POLICY IF EXISTS "Owners can view school member subscriptions" ON profile_memberships;
CREATE POLICY "Owners can view school member subscriptions" ON profile_memberships
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM profiles owner_profile
    WHERE ((owner_profile.id = (select auth.uid())) AND (owner_profile.role = ANY (ARRAY['owner'::user_role, 'admin'::user_role])) AND (owner_profile.school_id = (
      SELECT profiles.school_id FROM profiles WHERE (profiles.id = profile_memberships.profile_id)
    )))
  ));

DROP POLICY IF EXISTS "Service role has full access to profile_memberships" ON profile_memberships;
CREATE POLICY "Service role has full access to profile_memberships" ON profile_memberships
  FOR ALL USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

DROP POLICY IF EXISTS "Users can view their own membership" ON profile_memberships;
CREATE POLICY "Users can view their own membership" ON profile_memberships
  FOR SELECT USING (profile_id = (select auth.uid()));

-- =====================================================
-- PROFILES
-- =====================================================
DROP POLICY IF EXISTS "Service role has full access to profiles" ON profiles;
CREATE POLICY "Service role has full access to profiles" ON profiles
  FOR ALL USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can view profiles in same school" ON profiles;
CREATE POLICY "Users can view profiles in same school" ON profiles
  FOR SELECT USING (((select auth.uid()) = id) OR (school_id = get_user_school_id()) OR is_user_admin());

-- =====================================================
-- RANK_HISTORY
-- =====================================================
DROP POLICY IF EXISTS "Service role has full access to rank_history" ON rank_history;
CREATE POLICY "Service role has full access to rank_history" ON rank_history
  FOR ALL USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

-- =====================================================
-- SCHOOL_FEATURE_SUBSCRIPTIONS
-- =====================================================
DROP POLICY IF EXISTS "Admin full access to subscriptions" ON school_feature_subscriptions;
CREATE POLICY "Admin full access to subscriptions" ON school_feature_subscriptions
  FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::user_role))
  ));

DROP POLICY IF EXISTS "Owners can view their school subscriptions" ON school_feature_subscriptions;
CREATE POLICY "Owners can view their school subscriptions" ON school_feature_subscriptions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'owner'::user_role) AND (profiles.school_id = school_feature_subscriptions.school_id))
  ));

-- =====================================================
-- SCHOOLS
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can create schools" ON schools;
CREATE POLICY "Authenticated users can create schools" ON schools
  FOR INSERT WITH CHECK ((select auth.uid()) = owner_id);

DROP POLICY IF EXISTS "Owners can update own school" ON schools;
CREATE POLICY "Owners can update own school" ON schools
  FOR UPDATE USING ((owner_id = (select auth.uid())) OR is_user_admin());

DROP POLICY IF EXISTS "Service role has full access to schools" ON schools;
CREATE POLICY "Service role has full access to schools" ON schools
  FOR ALL USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

-- =====================================================
-- SIGNED_CONTRACTS
-- =====================================================
DROP POLICY IF EXISTS "Members can sign contracts" ON signed_contracts;
CREATE POLICY "Members can sign contracts" ON signed_contracts
  FOR INSERT WITH CHECK (signed_by = (select auth.uid()));

DROP POLICY IF EXISTS "Members can view own signed contracts" ON signed_contracts;
CREATE POLICY "Members can view own signed contracts" ON signed_contracts
  FOR SELECT USING (signed_by = (select auth.uid()));

DROP POLICY IF EXISTS "Owners can delete signed_contracts" ON signed_contracts;
CREATE POLICY "Owners can delete signed_contracts" ON signed_contracts
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM contracts c
    WHERE ((c.id = signed_contracts.contract_id) AND (c.school_id = get_user_school_id()) AND (EXISTS (
      SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'owner'::user_role))
    )))
  ));

DROP POLICY IF EXISTS "Owners can insert signed_contracts" ON signed_contracts;
CREATE POLICY "Owners can insert signed_contracts" ON signed_contracts
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM contracts c
    WHERE ((c.id = signed_contracts.contract_id) AND (c.school_id = get_user_school_id()) AND (EXISTS (
      SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'owner'::user_role))
    )))
  ));

DROP POLICY IF EXISTS "Owners can update signed_contracts" ON signed_contracts;
CREATE POLICY "Owners can update signed_contracts" ON signed_contracts
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM contracts c
    WHERE ((c.id = signed_contracts.contract_id) AND (c.school_id = get_user_school_id()) AND (EXISTS (
      SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'owner'::user_role))
    )))
  ));

DROP POLICY IF EXISTS "Owners can view school signed_contracts" ON signed_contracts;
CREATE POLICY "Owners can view school signed_contracts" ON signed_contracts
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM contracts c
    WHERE ((c.id = signed_contracts.contract_id) AND (c.school_id = get_user_school_id()) AND (EXISTS (
      SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'owner'::user_role))
    )))
  ));

DROP POLICY IF EXISTS "Service role has full access to signed_contracts" ON signed_contracts;
CREATE POLICY "Service role has full access to signed_contracts" ON signed_contracts
  FOR ALL USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

-- =====================================================
-- STUDENT_PROFILES
-- =====================================================
DROP POLICY IF EXISTS "Owners can delete student_profiles" ON student_profiles;
CREATE POLICY "Owners can delete student_profiles" ON student_profiles
  FOR DELETE USING (
    (school_id = get_user_school_id()) AND (EXISTS (
      SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'owner'::user_role))
    ))
  );

DROP POLICY IF EXISTS "Owners can insert student_profiles" ON student_profiles;
CREATE POLICY "Owners can insert student_profiles" ON student_profiles
  FOR INSERT WITH CHECK (
    (school_id = get_user_school_id()) AND (EXISTS (
      SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'owner'::user_role))
    ))
  );

DROP POLICY IF EXISTS "Owners can update student_profiles" ON student_profiles;
CREATE POLICY "Owners can update student_profiles" ON student_profiles
  FOR UPDATE USING (
    (school_id = get_user_school_id()) AND (EXISTS (
      SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'owner'::user_role))
    ))
  );

DROP POLICY IF EXISTS "Owners can view school student_profiles" ON student_profiles;
CREATE POLICY "Owners can view school student_profiles" ON student_profiles
  FOR SELECT USING (
    (school_id = get_user_school_id()) AND (EXISTS (
      SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'owner'::user_role))
    ))
  );

DROP POLICY IF EXISTS "Service role has full access to student_profiles" ON student_profiles;
CREATE POLICY "Service role has full access to student_profiles" ON student_profiles
  FOR ALL USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

DROP POLICY IF EXISTS "Users can view own student profile" ON student_profiles;
CREATE POLICY "Users can view own student profile" ON student_profiles
  FOR SELECT USING (profile_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own student_profiles" ON student_profiles;
CREATE POLICY "Users can view own student_profiles" ON student_profiles
  FOR SELECT USING (profile_id = (select auth.uid()));

-- =====================================================
-- USER_PRESENCE
-- =====================================================
DROP POLICY IF EXISTS "Users can delete their own presence" ON user_presence;
CREATE POLICY "Users can delete their own presence" ON user_presence
  FOR DELETE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own presence" ON user_presence;
CREATE POLICY "Users can update their own presence" ON user_presence
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own presence status" ON user_presence;
CREATE POLICY "Users can update their own presence status" ON user_presence
  FOR UPDATE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view presence in their school" ON user_presence;
CREATE POLICY "Users can view presence in their school" ON user_presence
  FOR SELECT USING (school_id IN (
    SELECT profiles.school_id FROM profiles WHERE (profiles.id = (select auth.uid()))
  ));

-- =====================================================
-- USER_SESSIONS
-- =====================================================
DROP POLICY IF EXISTS "Service role has full access to user_sessions" ON user_sessions;
CREATE POLICY "Service role has full access to user_sessions" ON user_sessions
  FOR ALL USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

-- =====================================================
-- USER_SETTINGS
-- =====================================================
DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING ((select auth.uid()) = user_id);

-- =====================================================
-- VISITOR_SESSIONS
-- =====================================================
DROP POLICY IF EXISTS "Service role has full access to visitor_sessions" ON visitor_sessions;
CREATE POLICY "Service role has full access to visitor_sessions" ON visitor_sessions
  FOR ALL USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

-- =====================================================
-- WAITLIST
-- =====================================================
DROP POLICY IF EXISTS "Service role has full access to waitlist" ON waitlist;
CREATE POLICY "Service role has full access to waitlist" ON waitlist
  FOR ALL USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

COMMIT;

-- =====================================================
-- ALSO OPTIMIZE THE HELPER FUNCTIONS
-- These functions are called in RLS policies and should
-- also use (select auth.uid()) for consistency
-- Using plpgsql to support SET search_path
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_school_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT school_id FROM public.profiles WHERE id = (select auth.uid()));
END;
$$;

CREATE OR REPLACE FUNCTION is_user_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (select auth.uid())
    AND role = 'admin'::user_role
  );
END;
$$;
