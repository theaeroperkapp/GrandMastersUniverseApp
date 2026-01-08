-- Add contract_pending to notification_type enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'contract_pending';

-- Add link column to notifications table for action URLs
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT;

-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
