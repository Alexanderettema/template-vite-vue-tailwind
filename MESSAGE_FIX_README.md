# Fixing Message Storage Issues in ACT Therapy App

## Problem Description

There is an issue with saving and displaying messages in session details view. When creating a new session, the messages are not properly saved to the database or are not correctly being retrieved.

## Root Cause Analysis

The issue has been traced to a combination of factors:

1. **Message ID Handling**: Messages were being upserted based on `session_id` and `created_at`, but timestamps were sometimes identical, causing conflicts.

2. **Database Constraints**: The lack of a proper uniqueness constraint in the database allowed conflicting records.

3. **Message Persistence**: In some cases, messages were saved to the session object but not properly persisted to the database.

## Solution

We've implemented a multi-faceted fix:

1. **Database Schema Fix**: Added a uniqueness constraint and index to ensure proper message storage.

2. **Code Improvements**: 
   - Updated message saving logic to ensure each message has a unique ID
   - Enhanced timestamp handling to prevent conflicts
   - Added fallback mechanisms for message saving
   - Improved error handling and logging

## How to Apply the Fix

### Method 1: Using the Provided Script (Recommended)

1. Run the fix script:
   ```bash
   ./fix_messages.sh
   ```

2. Restart your application

3. Try creating a new session and verify the messages appear in session details

### Method 2: Manual Application

1. Run the SQL fix script manually:
   ```bash
   supabase db execute --file sql/fix_messages.sql
   ```

2. If you're using a remote Supabase project, specify the project reference:
   ```bash
   supabase db execute -p your-project-ref --file sql/fix_messages.sql
   ```

3. Restart your application

## Verification

After applying the fix, you can verify that it's working by:

1. Creating a new therapy session
2. Exchanging several messages with the AI
3. Ending the session
4. Going to the sessions list and opening the session details
5. Confirming that all messages appear in the conversation view

## Troubleshooting

If you're still experiencing issues:

1. Check the browser console for any errors related to message saving
2. Look for logs indicating "Messages may not have been saved"
3. Try running a manual database query to check message counts:
   ```sql
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
   ```

4. If the issue persists, you may need to modify the message save logic in:
   - `src/composables/useSessionManagement.ts`
   - `src/components/ChatInterface.vue` 