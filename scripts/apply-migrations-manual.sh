#!/bin/bash
# =========================================================================
# Script: Apply Supabase Migrations Manually (via SQL API)
# Purpose: Apply database migrations through Supabase REST API or SQL Editor
# Usage: ./scripts/apply-migrations-manual.sh
# =========================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}====================================================${NC}"
echo -e "${CYAN}🚀 Ręczne zastosowanie migracji${NC}"
echo -e "${CYAN}====================================================${NC}"
echo ""

# Check if we're in project root
if [ ! -d "supabase/migrations" ]; then
    echo -e "${RED}❌ Error: supabase/migrations directory not found!${NC}"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Count migrations
MIGRATION_COUNT=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l)
echo -e "${YELLOW}📦 Znaleziono ${MIGRATION_COUNT} plików migracji${NC}"

if [ "$MIGRATION_COUNT" -eq 0 ]; then
    echo -e "${RED}❌ Brak plików migracji!${NC}"
    exit 1
fi

echo ""
echo -e "${CYAN}📋 Pliki migracji (w kolejności):${NC}"
ls -1 supabase/migrations/*.sql | xargs -n1 basename | nl -w2 -s'. '
echo ""

# List migrations in order
echo -e "${CYAN}📝 Kolejność wykonania migracji:${NC}"
echo ""
ls -1 supabase/migrations/*.sql | sort | while read migration_file; do
    migration_name=$(basename "$migration_file")
    echo -e "   ${YELLOW}→${NC} $migration_name"
done

echo ""
echo -e "${CYAN}====================================================${NC}"
echo -e "${CYAN}📖 Instrukcje:${NC}"
echo -e "${CYAN}====================================================${NC}"
echo ""
echo -e "${GREEN}Metoda 1: Supabase Dashboard (ZALECANE)${NC}"
echo ""
echo "1. Otwórz Supabase Dashboard:"
echo "   https://192.168.0.11:8443"
echo "   lub"
echo "   http://192.168.0.11:54323 (Supabase Studio)"
echo ""
echo "2. Przejdź do: SQL Editor → New query"
echo ""
echo "3. Wykonaj migracje w kolejności:"
ls -1 supabase/migrations/*.sql | sort | nl -w2 -s'. ' | while read line; do
    migration_file=$(echo "$line" | awk '{print $2}')
    migration_name=$(basename "$migration_file")
    echo "   $line"
done
echo ""
echo "4. Dla każdej migracji:"
echo "   - Skopiuj zawartość pliku: supabase/migrations/[nazwa-pliku]"
echo "   - Wklej do SQL Editor"
echo "   - Kliknij 'Run' (lub Ctrl+Enter)"
echo "   - Sprawdź czy nie ma błędów"
echo ""
echo -e "${GREEN}Metoda 2: Przez psql (jeśli masz dostęp)${NC}"
echo ""
echo "1. Połącz się z bazą danych:"
echo "   psql -h 192.168.0.11 -p 5432 -U postgres -d postgres"
echo ""
echo "2. Wykonaj migracje:"
ls -1 supabase/migrations/*.sql | sort | while read migration_file; do
    migration_name=$(basename "$migration_file")
    echo "   \\i $migration_file"
done
echo ""
echo -e "${GREEN}Metoda 3: Przez Docker (jeśli Supabase działa w Dockerze)${NC}"
echo ""
echo "1. Znajdź kontener Supabase:"
echo "   docker ps | grep supabase"
echo ""
echo "2. Skopiuj i wykonaj migracje:"
echo "   docker cp supabase/migrations/[nazwa-pliku] [kontener]:/tmp/"
echo "   docker exec [kontener] psql -U postgres -d postgres -f /tmp/[nazwa-pliku]"
echo ""
echo -e "${CYAN}====================================================${NC}"
echo -e "${CYAN}✅ Po wykonaniu migracji:${NC}"
echo -e "${CYAN}====================================================${NC}"
echo ""
echo "1. Zweryfikuj tabele:"
echo "   ./scripts/verify-database-api.sh"
echo ""
echo "2. Sprawdź RLS:"
echo "   Otwórz: supabase/scripts/check-rls-policies.sql w SQL Editor"
echo ""
echo "3. Sprawdź pełną weryfikację:"
echo "   Otwórz: supabase/verify-database.sql w SQL Editor"
echo ""
echo -e "${CYAN}✨ Gotowe!${NC}"
echo ""
