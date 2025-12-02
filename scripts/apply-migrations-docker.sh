#!/bin/bash
# =========================================================================
# Script: Apply Supabase Migrations via Docker
# Purpose: Apply database migrations directly to Supabase container
# Usage: ./scripts/apply-migrations-docker.sh
# =========================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🐳 Applying Supabase Migrations via Docker${NC}"
echo ""

# Check if we're in project root
if [ ! -d "supabase/migrations" ]; then
    echo -e "${RED}❌ Error: supabase/migrations directory not found!${NC}"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Check if Docker is running
if ! docker ps > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Docker is not running!${NC}"
    exit 1
fi

# Find Supabase database container
DB_CONTAINER=$(docker ps --filter "name=supabase-db" --format "{{.Names}}" | head -1)

if [ -z "$DB_CONTAINER" ]; then
    echo -e "${RED}❌ Error: Supabase database container not found!${NC}"
    echo ""
    echo "Available containers:"
    docker ps --format "table {{.Names}}\t{{.Status}}"
    echo ""
    echo "Please make sure Supabase is running:"
    echo "  docker ps | grep supabase"
    exit 1
fi

echo -e "${GREEN}✅ Found Supabase container: ${DB_CONTAINER}${NC}"
echo ""

# Count migrations
MIGRATION_COUNT=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l)
echo -e "${YELLOW}📦 Found ${MIGRATION_COUNT} migration files${NC}"

if [ "$MIGRATION_COUNT" -eq 0 ]; then
    echo -e "${RED}❌ No migration files found!${NC}"
    exit 1
fi

# List migrations
echo -e "${YELLOW}📋 Migrations to apply:${NC}"
ls -1 supabase/migrations/*.sql | xargs -n1 basename | while read migration; do
    echo "   - $migration"
done
echo ""

# Ask for confirmation (skip if --yes flag is provided)
if [ "$1" != "--yes" ] && [ "$1" != "-y" ]; then
    read -p "Apply these migrations to ${DB_CONTAINER}? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi
else
    echo -e "${YELLOW}Auto-confirming (--yes flag provided)${NC}"
fi

echo ""
echo -e "${YELLOW}🚀 Applying migrations...${NC}"
echo ""

# Apply each migration
SUCCESS_COUNT=0
FAIL_COUNT=0

for migration_file in supabase/migrations/*.sql; do
    migration_name=$(basename "$migration_file")
    echo -e "${YELLOW}📄 Applying: ${migration_name}${NC}"
    
    # Copy migration file to container and execute
    if docker cp "$migration_file" "${DB_CONTAINER}:/tmp/${migration_name}" > /dev/null 2>&1; then
        # Execute migration in container
        if docker exec -i "${DB_CONTAINER}" psql -U postgres -d postgres -f "/tmp/${migration_name}" > /tmp/migration_output.log 2>&1; then
            echo -e "   ${GREEN}✅ Success${NC}"
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        else
            echo -e "   ${RED}❌ Failed${NC}"
            echo "   Error output:"
            cat /tmp/migration_output.log | sed 's/^/      /'
            FAIL_COUNT=$((FAIL_COUNT + 1))
        fi
        
        # Cleanup temp file in container
        docker exec "${DB_CONTAINER}" rm -f "/tmp/${migration_name}" > /dev/null 2>&1
    else
        echo -e "   ${RED}❌ Failed to copy migration file${NC}"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
    
    echo ""
done

# Summary
echo "======================================"
echo -e "${GREEN}📊 Summary:${NC}"
echo -e "   ${GREEN}✅ Success: ${SUCCESS_COUNT}${NC}"
if [ $FAIL_COUNT -gt 0 ]; then
    echo -e "   ${RED}❌ Failed: ${FAIL_COUNT}${NC}"
else
    echo -e "   ❌ Failed: ${FAIL_COUNT}"
fi
echo "======================================"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}🎉 All migrations applied successfully!${NC}"
    echo ""
    echo -e "${YELLOW}🔍 Verifying tables...${NC}"
    docker exec "${DB_CONTAINER}" psql -U postgres -d postgres -c "\dt" 2>/dev/null | grep -E "public|query_history|ratings|legal_acts" || echo "   (Run 'docker exec ${DB_CONTAINER} psql -U postgres -d postgres -c \"\\dt\"' to see all tables)"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some migrations failed. Check the output above.${NC}"
    exit 1
fi

