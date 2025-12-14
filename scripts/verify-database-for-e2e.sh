#!/bin/bash
# ============================================
# PrawnikGPT - Database Verification for E2E
# ============================================
# Ten skrypt weryfikuje bazę danych przed testami E2E
# ============================================

set -e

# Kolory dla outputu
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}====================================================${NC}"
echo -e "${CYAN}🔍 Weryfikacja bazy danych dla testów E2E${NC}"
echo -e "${CYAN}====================================================${NC}"
echo ""

# Sprawdź, czy jesteśmy w katalogu głównym projektu
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Błąd: Uruchom skrypt z katalogu głównego projektu${NC}"
    exit 1
fi

# Sprawdź, czy plik .env istnieje
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Plik .env nie istnieje${NC}"
    echo -e "${YELLOW}📝 Skopiuj .env.example do .env i wypełnij danymi${NC}"
    exit 1
fi

# Wczytaj zmienne z .env
export $(grep -v '^#' .env | xargs)

# Sprawdź, czy SUPABASE_URL jest ustawiony
if [ -z "$PUBLIC_SUPABASE_URL" ] && [ -z "$SUPABASE_URL" ]; then
    echo -e "${RED}❌ Błąd: SUPABASE_URL nie jest ustawiony w .env${NC}"
    exit 1
fi

# Użyj PUBLIC_SUPABASE_URL jeśli SUPABASE_URL nie jest ustawiony
SUPABASE_URL=${SUPABASE_URL:-$PUBLIC_SUPABASE_URL}

echo -e "${CYAN}📋 Konfiguracja:${NC}"
echo -e "   SUPABASE_URL: ${SUPABASE_URL}"
echo ""

# Sprawdź, czy psql jest dostępny
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  psql nie jest zainstalowany${NC}"
    echo -e "${YELLOW}💡 Użyj Supabase Dashboard (SQL Editor) do uruchomienia:${NC}"
    echo -e "${YELLOW}   supabase/verify-database.sql${NC}"
    exit 0
fi

# Sprawdź, czy DATABASE_URL jest ustawiony
if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  DATABASE_URL nie jest ustawiony${NC}"
    echo -e "${YELLOW}💡 Dla lokalnego Supabase użyj:${NC}"
    echo -e "${YELLOW}   postgresql://postgres:postgres@localhost:54322/postgres${NC}"
    echo ""
    echo -e "${CYAN}Alternatywnie, użyj Supabase Dashboard:${NC}"
    echo -e "   1. Otwórz Supabase Dashboard (SQL Editor)"
    echo -e "   2. Otwórz plik: supabase/verify-database.sql"
    echo -e "   3. Wykonaj skrypt"
    exit 0
fi

# Parsuj DATABASE_URL
# Format: postgresql://user:password@host:port/database
if [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)/(.+) ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASS="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
else
    echo -e "${RED}❌ Błąd: Nieprawidłowy format DATABASE_URL${NC}"
    exit 1
fi

export PGPASSWORD="$DB_PASS"

echo -e "${CYAN}🔌 Łączenie z bazą danych...${NC}"
echo ""

# Test połączenia
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}❌ Błąd: Nie można połączyć się z bazą danych${NC}"
    echo -e "${YELLOW}💡 Sprawdź:${NC}"
    echo -e "   - Czy Supabase działa?"
    echo -e "   - Czy DATABASE_URL jest poprawny?"
    echo -e "   - Czy masz dostęp do bazy danych?"
    exit 1
fi

echo -e "${GREEN}✅ Połączenie z bazą danych działa${NC}"
echo ""

# Sprawdź rozszerzenia
echo -e "${CYAN}📦 Sprawdzanie rozszerzeń PostgreSQL...${NC}"
EXTENSIONS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT extname 
    FROM pg_extension 
    WHERE extname IN ('vector', 'unaccent');
" 2>/dev/null | tr -d ' ')

if echo "$EXTENSIONS" | grep -q "vector"; then
    echo -e "${GREEN}   ✅ vector${NC}"
else
    echo -e "${RED}   ❌ vector (brak)${NC}"
fi

if echo "$EXTENSIONS" | grep -q "unaccent"; then
    echo -e "${GREEN}   ✅ unaccent${NC}"
else
    echo -e "${RED}   ❌ unaccent (brak)${NC}"
fi

echo ""

# Sprawdź tabele
echo -e "${CYAN}📊 Sprawdzanie tabel...${NC}"
REQUIRED_TABLES=("legal_acts" "legal_act_chunks" "legal_act_relations" "query_history" "ratings")
MISSING_TABLES=()

for table in "${REQUIRED_TABLES[@]}"; do
    EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = '$table'
        );
    " 2>/dev/null | tr -d ' ')

    if [ "$EXISTS" = "t" ]; then
        echo -e "${GREEN}   ✅ $table${NC}"
    else
        echo -e "${RED}   ❌ $table (brak)${NC}"
        MISSING_TABLES+=("$table")
    fi
done

echo ""

# Sprawdź dane
echo -e "${CYAN}📈 Sprawdzanie danych w tabelach...${NC}"

# legal_acts
LEGAL_ACTS_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT COUNT(*) FROM legal_acts;
" 2>/dev/null | tr -d ' ')

if [ "$LEGAL_ACTS_COUNT" -gt 0 ]; then
    echo -e "${GREEN}   ✅ legal_acts: $LEGAL_ACTS_COUNT rekordów${NC}"
else
    echo -e "${YELLOW}   ⚠️  legal_acts: 0 rekordów (wymagane dane dla E2E)${NC}"
fi

# legal_act_chunks
CHUNKS_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT COUNT(*) FROM legal_act_chunks;
" 2>/dev/null | tr -d ' ')

if [ "$CHUNKS_COUNT" -gt 0 ]; then
    echo -e "${GREEN}   ✅ legal_act_chunks: $CHUNKS_COUNT rekordów${NC}"
else
    echo -e "${YELLOW}   ⚠️  legal_act_chunks: 0 rekordów (wymagane dane dla E2E)${NC}"
fi

# query_history
QUERY_HISTORY_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT COUNT(*) FROM query_history;
" 2>/dev/null | tr -d ' ')

echo -e "${GREEN}   ✅ query_history: $QUERY_HISTORY_COUNT rekordów${NC}"

# ratings
RATINGS_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT COUNT(*) FROM ratings;
" 2>/dev/null | tr -d ' ')

echo -e "${GREEN}   ✅ ratings: $RATINGS_COUNT rekordów${NC}"

echo ""

# Sprawdź funkcje RPC
echo -e "${CYAN}⚙️  Sprawdzanie funkcji RPC...${NC}"
REQUIRED_FUNCTIONS=("health_check" "semantic_search_chunks" "fetch_related_acts" "list_user_queries")
MISSING_FUNCTIONS=()

for func in "${REQUIRED_FUNCTIONS[@]}"; do
    EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_name = '$func'
        );
    " 2>/dev/null | tr -d ' ')

    if [ "$EXISTS" = "t" ]; then
        echo -e "${GREEN}   ✅ $func()${NC}"
    else
        echo -e "${RED}   ❌ $func() (brak)${NC}"
        MISSING_FUNCTIONS+=("$func")
    fi
done

echo ""

# Podsumowanie
echo -e "${CYAN}====================================================${NC}"
echo -e "${CYAN}📊 PODSUMOWANIE${NC}"
echo -e "${CYAN}====================================================${NC}"
echo ""

if [ ${#MISSING_TABLES[@]} -eq 0 ] && [ ${#MISSING_FUNCTIONS[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ Wszystkie wymagane tabele i funkcje istnieją${NC}"
else
    if [ ${#MISSING_TABLES[@]} -gt 0 ]; then
        echo -e "${RED}❌ Brakujące tabele: ${MISSING_TABLES[*]}${NC}"
        echo -e "${YELLOW}💡 Uruchom migracje:${NC}"
        echo -e "   ./scripts/apply-migrations.sh"
    fi
    
    if [ ${#MISSING_FUNCTIONS[@]} -gt 0 ]; then
        echo -e "${RED}❌ Brakujące funkcje: ${MISSING_FUNCTIONS[*]}${NC}"
        echo -e "${YELLOW}💡 Uruchom migracje z funkcjami RPC${NC}"
    fi
fi

if [ "$LEGAL_ACTS_COUNT" -eq 0 ] || [ "$CHUNKS_COUNT" -eq 0 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  UWAGA: Brak danych w kluczowych tabelach${NC}"
    echo -e "${YELLOW}💡 Dla testów E2E potrzebne są:${NC}"
    echo -e "   - legal_acts: minimum 10-20 rekordów"
    echo -e "   - legal_act_chunks: minimum 50-100 rekordów z embeddings"
    echo ""
    echo -e "${YELLOW}📝 Zobacz dokumentację:${NC}"
    echo -e "   .ai/notatki/2025-01-11_database-verification-for-e2e.md"
fi

echo ""
echo -e "${CYAN}✨ Weryfikacja zakończona${NC}"
echo ""

# Wyczyść PGPASSWORD
unset PGPASSWORD
