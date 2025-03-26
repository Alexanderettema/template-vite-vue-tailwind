-- Check if tables exist and show their structure
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name IN ('sessions', 'messages')
ORDER BY 
    table_name, ordinal_position; 