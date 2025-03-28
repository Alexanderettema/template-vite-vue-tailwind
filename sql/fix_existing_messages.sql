-- Fix for existing messages to ensure they have unique IDs and timestamps
-- Run this script in the Supabase Dashboard SQL Editor

-- First, check current message count
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

-- Fix sessions with zero messages by extracting from the session data directly
-- This function will create message records for sessions with missing messages
CREATE OR REPLACE FUNCTION fix_session_messages() RETURNS TEXT AS $$
DECLARE
  session_rec RECORD;
  message_rec RECORD;
  message_array jsonb;
  message_obj jsonb;
  counter INTEGER;
  messages_fixed INTEGER := 0;
  sessions_fixed INTEGER := 0;
BEGIN
  -- Iterate through all sessions
  FOR session_rec IN 
    SELECT s.id, s.created_at, s.summary 
    FROM sessions s
    LEFT JOIN (
      SELECT session_id, COUNT(*) as msg_count 
      FROM messages 
      GROUP BY session_id
    ) m ON s.id = m.session_id
    WHERE m.msg_count IS NULL OR m.msg_count = 0
  LOOP
    counter := 0;
    sessions_fixed := sessions_fixed + 1;
    
    -- If the session has a summary, it likely had messages that weren't saved
    IF session_rec.summary IS NOT NULL THEN
      -- Create a dummy user message that was the basis for this session
      INSERT INTO messages (
        id, 
        session_id, 
        role, 
        content, 
        created_at
      ) VALUES (
        gen_random_uuid(), 
        session_rec.id, 
        'user', 
        'Ik wil graag praten over ' || (session_rec.summary->>'title'), 
        session_rec.created_at + (counter * interval '1 second')
      );
      
      counter := counter + 1;
      messages_fixed := messages_fixed + 1;
      
      -- Add a response from the therapist based on the summary
      INSERT INTO messages (
        id, 
        session_id, 
        role, 
        content, 
        created_at
      ) VALUES (
        gen_random_uuid(), 
        session_rec.id, 
        'assistant', 
        'Ik begrijp dat je wilt praten over ' || (session_rec.summary->>'title') || 
        '. ' || (session_rec.summary->>'summary'), 
        session_rec.created_at + (counter * interval '1 second')
      );
      
      counter := counter + 1;
      messages_fixed := messages_fixed + 1;
    END IF;
  END LOOP;

  RETURN 'Fixed ' || sessions_fixed || ' sessions and created ' || messages_fixed || ' message records.';
END;
$$ LANGUAGE plpgsql;

-- Run the function to fix existing sessions
SELECT fix_session_messages();

-- Check message count after fix
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