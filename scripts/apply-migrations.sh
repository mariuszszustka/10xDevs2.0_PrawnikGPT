#!/bin/bash
# =========================================================================
# Script: Apply Supabase Migrations
# Purpose: Apply all database migrations to Supabase (local or remote)
# Usage: ./scripts/apply-migrations.sh [--remote]
# =========================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Applying Supabase Migrations${NC}"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found!${NC}"
    echo ""
    echo "Install Supabase CLI:"
    echo "  Linux:"
    echo "    curl -fsSL https://supabase.com/install.sh | sh"
    echo ""
    echo "  Or download from: https://github.com/supabase/cli/releases"
    echo ""
    exit 1
fi

# Check if we're in project root
if [ ! -d "supabase/migrations" ]; then
    echo -e "${RED}❌ Error: supabase/migrations directory not found!${NC}"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Determine if we're using remote or local Supabase
USE_REMOTE=false
if [ "$1" == "--remote" ]; then
    USE_REMOTE=true
fi

# Count migrations
MIGRATION_COUNT=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l)
echo -e "${YELLOW}📦 Found ${MIGRATION_COUNT} migration files${NC}"

if [ "$MIGRATION_COUNT" -eq 0 ]; then
    echo -e "${RED}❌ No migration files found!${NC}"
    exit 1
fi

# Apply migrations
if [ "$USE_REMOTE" = true ]; then
    echo -e "${YELLOW}🌐 Applying migrations to REMOTE Supabase...${NC}"
    echo ""
    echo "Make sure you're logged in:"
    echo "  supabase login"
    echo ""
    echo "Link your project:"
    echo "  supabase link --project-ref YOUR_PROJECT_REF"
    echo ""
    read -p "Press Enter to continue with remote push..."
    supabase db push
else
    echo -e "${YELLOW}🏠 Applying migrations to LOCAL Supabase...${NC}"
    
    # Check if local Supabase is running
    if ! curl -s http://localhost:54321/health > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Local Supabase doesn't seem to be running.${NC}"
        echo "Starting local Supabase..."
        supabase start
    fi
    
    # Apply migrations
    supabase db push
fi

echo ""
echo -e "${GREEN}✅ Migrations applied successfully!${NC}"
echo ""
echo "Verify migrations:"
echo "  supabase db diff"
echo ""

