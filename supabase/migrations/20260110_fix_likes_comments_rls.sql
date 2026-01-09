-- Fix RLS policies for likes and comments tables
-- These tables were missing user-level read policies

-- =============================================
-- LIKES - User policies
-- =============================================

-- Users can view likes on posts they can access (same school)
DROP POLICY IF EXISTS "Users can view likes" ON likes;
CREATE POLICY "Users can view likes" ON likes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM posts p
    JOIN profiles prof ON prof.school_id = p.school_id
    WHERE p.id = likes.post_id
    AND prof.id = auth.uid()
    AND p.deleted_at IS NULL
  )
);

-- Users can like posts in their school
DROP POLICY IF EXISTS "Users can like posts" ON likes;
CREATE POLICY "Users can like posts" ON likes FOR INSERT WITH CHECK (
  profile_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM posts p
    JOIN profiles prof ON prof.school_id = p.school_id
    WHERE p.id = likes.post_id
    AND prof.id = auth.uid()
    AND p.deleted_at IS NULL
  )
);

-- Users can unlike their own likes
DROP POLICY IF EXISTS "Users can unlike posts" ON likes;
CREATE POLICY "Users can unlike posts" ON likes FOR DELETE USING (
  profile_id = auth.uid()
);

-- =============================================
-- COMMENTS - User policies
-- =============================================

-- Users can view comments on posts they can access (same school)
DROP POLICY IF EXISTS "Users can view comments" ON comments;
CREATE POLICY "Users can view comments" ON comments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM posts p
    JOIN profiles prof ON prof.school_id = p.school_id
    WHERE p.id = comments.post_id
    AND prof.id = auth.uid()
    AND p.deleted_at IS NULL
  )
);

-- Users can comment on posts in their school
DROP POLICY IF EXISTS "Users can create comments" ON comments;
CREATE POLICY "Users can create comments" ON comments FOR INSERT WITH CHECK (
  author_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM posts p
    JOIN profiles prof ON prof.school_id = p.school_id
    WHERE p.id = comments.post_id
    AND prof.id = auth.uid()
    AND p.deleted_at IS NULL
  )
);

-- Users can delete their own comments
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (
  author_id = auth.uid()
);

-- Users can update their own comments
DROP POLICY IF EXISTS "Users can update own comments" ON comments;
CREATE POLICY "Users can update own comments" ON comments FOR UPDATE USING (
  author_id = auth.uid()
);

-- =============================================
-- ENABLE REALTIME for feed features
-- =============================================

DO $$
BEGIN
  -- Add posts table to realtime publication
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE posts;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  -- Add comments table to realtime publication
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE comments;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  -- Add likes table to realtime publication
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE likes;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  -- Add announcements table to realtime publication
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE announcements;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;
