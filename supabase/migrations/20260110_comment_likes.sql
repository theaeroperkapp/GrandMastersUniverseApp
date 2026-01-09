-- Create comment_likes table
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(comment_id, profile_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_profile ON comment_likes(profile_id);

-- Enable RLS
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- RLS policies for comment_likes
CREATE POLICY "Users can view comment likes in their school" ON comment_likes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM comments c
      JOIN posts p ON c.post_id = p.id
      WHERE c.id = comment_likes.comment_id
      AND p.school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can like comments" ON comment_likes
  FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can unlike their own likes" ON comment_likes
  FOR DELETE USING (profile_id = auth.uid());

-- Service role bypass
CREATE POLICY "Service role has full access to comment_likes" ON comment_likes
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Add comment_likes to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE comment_likes;
