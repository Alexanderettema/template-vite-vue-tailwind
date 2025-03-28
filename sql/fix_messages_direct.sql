-- Fix for message storage issues in ACT Therapy App
-- Run this script in the Supabase Dashboard SQL Editor

-- Add a constraint to ensure session_id + created_at is unique
ALTER TABLE messages
DROP CONSTRAINT IF EXISTS unique_session_message;

ALTER TABLE messages
ADD CONSTRAINT unique_session_message UNIQUE (session_id, created_at);

-- Add index on all needed message fields to ensure fast retrieval
CREATE INDEX IF NOT EXISTS messages_full_idx 
ON messages(session_id, role, created_at);

-- Check counts to verify the fix is applied
SELECT
  s.id AS session_id,
  s.title,
  COUNT(m.id) AS message_count
FROM
  sessions s
LEFT JOIN
  messages m ON s.id = m.session_id
GROUP BY
  s.id, s.title
ORDER BY
  s.created_at DESC; 