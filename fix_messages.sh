#!/bin/bash

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}==============================================${NC}"
echo -e "${YELLOW}   Database Fix for Message Storage Issues    ${NC}"
echo -e "${YELLOW}==============================================${NC}"

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: Supabase CLI is not installed.${NC}"
    echo "Please install it first: https://supabase.com/docs/guides/cli"
    exit 1
fi

echo -e "${GREEN}Applying fixes to the database...${NC}"

# Run the SQL script against your Supabase project
supabase db execute --file sql/fix_messages.sql

echo -e "${GREEN}Database fixes applied successfully.${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Restart your application"
echo "2. Try creating a new session and sending messages"
echo "3. Check if messages appear correctly in session details"
echo ""
echo -e "${YELLOW}If issues persist, try running this script again with your Supabase project reference:${NC}"
echo "supabase db execute -p your-project-ref --file sql/fix_messages.sql"
echo ""

# Make the script executable
chmod +x fix_messages.sh 