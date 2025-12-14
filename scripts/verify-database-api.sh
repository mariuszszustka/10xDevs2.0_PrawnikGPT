#!/bin/bash
# ============================================
# PrawnikGPT - Database Verification via API
# ============================================
# Ten skrypt weryfikuje bazę danych przez Supabase REST API
# Nie wymaga psql - używa tylko curl i jq (opcjonalnie)
# ============================================

set -e

# Kolory dla outputu
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}====================================================${NC}"
echo -e "${CYAN}🔍 Weryfikacja bazy danych przez API${NC}"
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

# Sprawdź, czy SUPABASE_ANON_KEY jest ustawiony
if [ -z "$PUBLIC_SUPABASE_ANON_KEY" ] && [ -z "$SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}❌ Błąd: SUPABASE_ANON_KEY nie jest ustawiony w .env${NC}"
    exit 1
fi

SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY:-$PUBLIC_SUPABASE_ANON_KEY}

echo -e "${CYAN}📋 Konfiguracja:${NC}"
echo -e "   SUPABASE_URL: ${SUPABASE_URL}"
if [ -n "$SUPABASE_ANON_KEY" ]; then
    ANON_PREVIEW="${SUPABASE_ANON_KEY:0:20}..."
    echo -e "   SUPABASE_ANON_KEY: ${ANON_PREVIEW}"
fi
echo ""

# Funkcja pomocnicza do wykonywania zapytań API
api_request() {
    local endpoint=$1
    local method=${2:-GET}
    
    # Usuń https:// z URL jeśli istnieje i dodaj /rest/v1
    local api_url="${SUPABASE_URL}"
    if [[ "$api_url" == https://* ]]; then
        api_url="${api_url}/rest/v1${endpoint}"
    elif [[ "$api_url" == http://* ]]; then
        api_url="${api_url}/rest/v1${endpoint}"
    else
        api_url="https://${api_url}/rest/v1${endpoint}"
    fi
    
    curl -s -k -X "$method" \
        -H "apikey: ${SUPABASE_ANON_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
        -H "Content-Type: application/json" \
        -H "Prefer: return=representation" \
        "$api_url" 2>/dev/null || echo "ERROR"
}

# Test połączenia
echo -e "${CYAN}🔌 Test połączenia z Supabase API...${NC}"
RESPONSE=$(api_request "/" "GET")

if [ "$RESPONSE" = "ERROR" ] || [ -z "$RESPONSE" ]; then
    echo -e "${RED}❌ Błąd: Nie można połączyć się z Supabase API${NC}"
    echo -e "${YELLOW}💡 Sprawdź:${NC}"
    echo -e "   - Czy Supabase działa na: ${SUPABASE_URL}"
    echo -e "   - Czy SUPABASE_ANON_KEY jest poprawny"
    echo -e "   - Czy masz dostęp do sieci"
    echo ""
    echo -e "${YELLOW}💡 Alternatywnie, użyj Supabase Dashboard:${NC}"
    echo -e "   1. Otwórz Supabase Dashboard (SQL Editor)"
    echo -e "   2. Otwórz plik: supabase/verify-database.sql"
    echo -e "   3. Wykonaj skrypt"
    exit 1
fi

echo -e "${GREEN}✅ Połączenie z Supabase API działa${NC}"
echo ""

# Sprawdź tabele przez API
echo -e "${CYAN}📊 Sprawdzanie tabel przez API...${NC}"
REQUIRED_TABLES=("legal_acts" "legal_act_chunks" "legal_act_relations" "query_history" "ratings")
MISSING_TABLES=()
EXISTING_TABLES=()

for table in "${REQUIRED_TABLES[@]}"; do
    # Spróbuj pobrać pierwszy rekord (limit 1) - jeśli tabela istnieje, dostaniemy odpowiedź
    RESPONSE=$(api_request "/${table}?select=*&limit=1" "GET")
    
    # Sprawdź czy odpowiedź zawiera błąd "relation does not exist" lub jest pusta
    if echo "$RESPONSE" | grep -q "relation.*does not exist" || \
       echo "$RESPONSE" | grep -q "permission denied" || \
       [ "$RESPONSE" = "ERROR" ]; then
        echo -e "${RED}   ❌ $table (brak lub brak dostępu)${NC}"
        MISSING_TABLES+=("$table")
    else
        echo -e "${GREEN}   ✅ $table${NC}"
        EXISTING_TABLES+=("$table")
    fi
done

echo ""

# Sprawdź dane w tabelach (tylko dla tabel które istnieją)
echo -e "${CYAN}📈 Sprawdzanie danych w tabelach...${NC}"

for table in "${EXISTING_TABLES[@]}"; do
    # Pobierz liczbę rekordów (używając count w select)
    RESPONSE=$(api_request "/${table}?select=*&limit=1" "GET")
    
    # Jeśli odpowiedź jest tablicą JSON, sprawdź czy jest pusta
    if echo "$RESPONSE" | grep -q "\[\]" || [ "$RESPONSE" = "[]" ]; then
        echo -e "${YELLOW}   ⚠️  $table: 0 rekordów${NC}"
    elif echo "$RESPONSE" | grep -q "\[{" || [ "$RESPONSE" != "ERROR" ]; then
        # Spróbuj policzyć rekordy przez Range header (jeśli API to obsługuje)
        # Lub po prostu sprawdź czy są dane
        echo -e "${GREEN}   ✅ $table: zawiera dane${NC}"
    else
        echo -e "${YELLOW}   ⚠️  $table: nie można sprawdzić${NC}"
    fi
done

# Specjalne sprawdzenie dla legal_acts i legal_act_chunks
if [[ " ${EXISTING_TABLES[@]} " =~ " legal_acts " ]]; then
    RESPONSE=$(api_request "/legal_acts?select=id&limit=1" "GET")
    if echo "$RESPONSE" | grep -q "\[\]" || [ "$RESPONSE" = "[]" ]; then
        echo -e "${YELLOW}   ⚠️  legal_acts: 0 rekordów (wymagane dane dla E2E)${NC}"
    fi
fi

if [[ " ${EXISTING_TABLES[@]} " =~ " legal_act_chunks " ]]; then
    RESPONSE=$(api_request "/legal_act_chunks?select=id&limit=1" "GET")
    if echo "$RESPONSE" | grep -q "\[\]" || [ "$RESPONSE" = "[]" ]; then
        echo -e "${YELLOW}   ⚠️  legal_act_chunks: 0 rekordów (wymagane dane dla E2E)${NC}"
    fi
fi

echo ""

# Sprawdź funkcje RPC (przez wywołanie health_check)
echo -e "${CYAN}⚙️  Sprawdzanie funkcji RPC...${NC}"

# Test health_check
HEALTH_RESPONSE=$(curl -s -k -X POST \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    "${SUPABASE_URL}/rest/v1/rpc/health_check" 2>/dev/null || echo "ERROR")

if [ "$HEALTH_RESPONSE" != "ERROR" ] && ! echo "$HEALTH_RESPONSE" | grep -q "function.*does not exist"; then
    echo -e "${GREEN}   ✅ health_check()${NC}"
else
    echo -e "${RED}   ❌ health_check() (brak)${NC}"
fi

# Test semantic_search_chunks (nie wywołujemy, tylko sprawdzamy czy istnieje)
# Możemy spróbować wywołać z pustymi parametrami - jeśli funkcja istnieje, dostaniemy błąd walidacji, nie "does not exist"
SEMANTIC_RESPONSE=$(curl -s -k -X POST \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d '{"query_embedding": []}' \
    "${SUPABASE_URL}/rest/v1/rpc/semantic_search_chunks" 2>/dev/null || echo "ERROR")

if [ "$SEMANTIC_RESPONSE" != "ERROR" ] && ! echo "$SEMANTIC_RESPONSE" | grep -q "function.*does not exist"; then
    echo -e "${GREEN}   ✅ semantic_search_chunks()${NC}"
else
    echo -e "${RED}   ❌ semantic_search_chunks() (brak)${NC}"
fi

echo ""

# Podsumowanie
echo -e "${CYAN}====================================================${NC}"
echo -e "${CYAN}📊 PODSUMOWANIE${NC}"
echo -e "${CYAN}====================================================${NC}"
echo ""

if [ ${#MISSING_TABLES[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ Wszystkie wymagane tabele istnieją${NC}"
else
    echo -e "${RED}❌ Brakujące tabele: ${MISSING_TABLES[*]}${NC}"
    echo -e "${YELLOW}💡 Uruchom migracje:${NC}"
    echo -e "   ./scripts/apply-migrations.sh"
    echo -e "   # Lub przez Supabase Dashboard (SQL Editor)"
fi

echo ""
echo -e "${CYAN}📝 Uwagi:${NC}"
echo -e "   - Weryfikacja przez API ma ograniczenia (RLS, uprawnienia)"
echo -e "   - Dla pełnej weryfikacji użyj: supabase/verify-database.sql"
echo -e "   - Zobacz dokumentację: .ai/notatki/2025-01-11_database-verification-for-e2e.md"
echo ""
echo -e "${CYAN}✨ Weryfikacja zakończona${NC}"
echo ""
