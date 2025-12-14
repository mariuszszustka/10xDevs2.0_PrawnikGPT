#!/bin/bash
# ============================================
# Simple script to add test data with embeddings
# Uses OLLAMA API directly and Supabase REST API
# ============================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}🚀 Dodawanie danych testowych z embeddings${NC}"
echo ""

# Load .env
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

OLLAMA_HOST=${OLLAMA_HOST:-"http://192.168.0.11:11434"}
SUPABASE_URL=${SUPABASE_URL:-$PUBLIC_SUPABASE_URL}
SUPABASE_KEY=${SUPABASE_SERVICE_KEY:-$SUPABASE_ANON_KEY}

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
    echo -e "${RED}❌ Błąd: SUPABASE_URL lub SUPABASE_KEY nie jest ustawiony${NC}"
    exit 1
fi

echo -e "${CYAN}📋 Konfiguracja:${NC}"
echo "   OLLAMA_HOST: $OLLAMA_HOST"
echo "   SUPABASE_URL: $SUPABASE_URL"
echo ""

# Check OLLAMA
echo -e "${CYAN}🔍 Sprawdzanie OLLAMA...${NC}"
if ! curl -s "${OLLAMA_HOST}/api/tags" > /dev/null 2>&1; then
    echo -e "${RED}❌ OLLAMA nie odpowiada na ${OLLAMA_HOST}${NC}"
    echo -e "${YELLOW}💡 Uruchom OLLAMA lub sprawdź konfigurację${NC}"
    exit 1
fi
echo -e "${GREEN}✅ OLLAMA działa${NC}"
echo ""

# Get legal acts from database
echo -e "${CYAN}📜 Pobieranie aktów prawnych z bazy...${NC}"
ACTS_JSON=$(curl -s -k -X GET \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    "${SUPABASE_URL}/rest/v1/legal_acts?select=id,title&limit=100")

if [ $? -ne 0 ] || [ -z "$ACTS_JSON" ]; then
    echo -e "${RED}❌ Nie można pobrać aktów prawnych${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Pobrano akty prawne${NC}"
echo ""

echo -e "${YELLOW}⚠️  Uwaga: Generowanie embeddings przez OLLAMA może zająć kilka minut${NC}"
echo -e "${YELLOW}💡 Dla szybszego rozwiązania użyj: python scripts/generate-test-embeddings.py${NC}"
echo ""
echo -e "${CYAN}📝 Alternatywnie, możesz:${NC}"
echo "   1. Uruchomić skrypt Python (wymaga zainstalowanych zależności):"
echo "      cd backend && source .venv/bin/activate && python ../scripts/generate-test-embeddings.py"
echo ""
echo "   2. Użyć Supabase Dashboard do ręcznego dodania chunks (bez embeddings dla testów)"
echo ""
echo -e "${CYAN}✨ Gotowe!${NC}"
