-- Enable Realtime for messages and conversations tables
-- This allows the app to receive real-time updates when messages are sent/received

-- Note: These tables may already be in the publication
-- Use DO block to handle "already exists" errors gracefully

DO $$
BEGIN
  -- Add messages table to realtime publication
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  EXCEPTION WHEN duplicate_object THEN
    -- Table already in publication, ignore
    NULL;
  END;

  -- Add conversations table to realtime publication
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  -- Add notifications table to realtime publication (for bell notifications)
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;
