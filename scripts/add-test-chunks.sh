#!/bin/bash
# ============================================
# Add test chunks with embeddings via OLLAMA and Supabase API
# ============================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}🚀 Dodawanie chunks z embeddings${NC}"
echo ""

# Load .env
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

OLLAMA_HOST=${OLLAMA_HOST:-"http://192.168.0.11:11434"}
SUPABASE_URL=${SUPABASE_URL:-$PUBLIC_SUPABASE_URL}
SUPABASE_KEY=${SUPABASE_SERVICE_KEY:-$SUPABASE_ANON_KEY}
EMBEDDING_MODEL=${EMBEDDING_MODEL:-"nomic-embed-text"}

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
    echo -e "${RED}❌ Błąd: SUPABASE_URL lub SUPABASE_KEY nie jest ustawiony${NC}"
    exit 1
fi

echo -e "${CYAN}📋 Konfiguracja:${NC}"
echo "   OLLAMA_HOST: $OLLAMA_HOST"
echo "   SUPABASE_URL: $SUPABASE_URL"
echo "   EMBEDDING_MODEL: $EMBEDDING_MODEL"
echo ""

# Check OLLAMA
echo -e "${CYAN}🔍 Sprawdzanie OLLAMA...${NC}"
if ! curl -s "${OLLAMA_HOST}/api/tags" > /dev/null 2>&1; then
    echo -e "${RED}❌ OLLAMA nie odpowiada na ${OLLAMA_HOST}${NC}"
    exit 1
fi
echo -e "${GREEN}✅ OLLAMA działa${NC}"
echo ""

# Get legal acts
echo -e "${CYAN}📜 Pobieranie aktów prawnych...${NC}"
ACTS_JSON=$(curl -s -k -X GET \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    "${SUPABASE_URL}/rest/v1/legal_acts?select=id,title&order=title")

if [ $? -ne 0 ] || [ -z "$ACTS_JSON" ]; then
    echo -e "${RED}❌ Nie można pobrać aktów prawnych${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Pobrano akty prawne${NC}"
echo ""

# Simple test chunks (first 3 acts only for speed)
echo -e "${YELLOW}⚠️  Dodawanie przykładowych chunks (pierwsze 3 akty)...${NC}"
echo -e "${YELLOW}💡 To może zająć kilka minut (generowanie embeddings)${NC}"
echo ""

# Test chunks data
declare -A TEST_CHUNKS=(
    ["Kodeks cywilny"]="Art. 1. Kodeks niniejszy reguluje stosunki cywilnoprawne między osobami fizycznymi i osobami prawnymi. Prawo cywilne określa prawa i obowiązki podmiotów prawa cywilnego."
    ["Ustawa o prawach konsumenta"]="Art. 2. 1. Konsumentem jest osoba fizyczna dokonująca z przedsiębiorcą czynności prawnej niezwiązanej bezpośrednio z jej działalnością gospodarczą lub zawodową."
    ["Kodeks pracy"]="Art. 22. § 1. Przez nawiązanie stosunku pracy pracownik zobowiązuje się do wykonywania pracy określonego rodzaju na rzecz pracodawcy i pod jego kierownictwem."
)

CHUNK_INDEX=0
SUCCESS=0
FAILED=0

# Parse acts JSON and process
echo "$ACTS_JSON" | python3 -c "
import json
import sys
data = json.load(sys.stdin)
acts = data if isinstance(data, list) else []
for act in acts[:3]:  # First 3 acts only
    print(f\"{act['id']}|{act['title']}\")
" | while IFS='|' read -r ACT_ID ACT_TITLE; do
    
    if [ -z "$ACT_ID" ] || [ -z "$ACT_TITLE" ]; then
        continue
    fi
    
    CONTENT="${TEST_CHUNKS[$ACT_TITLE]}"
    if [ -z "$CONTENT" ]; then
        continue
    fi
    
    echo -e "${CYAN}📝 Przetwarzam: ${ACT_TITLE}${NC}"
    echo "   Tekst: ${CONTENT:0:60}..."
    
    # Generate embedding
    echo "   🔄 Generuję embedding..."
    EMBEDDING_JSON=$(curl -s -X POST "${OLLAMA_HOST}/api/embeddings" \
        -H "Content-Type: application/json" \
        -d "{\"model\": \"${EMBEDDING_MODEL}\", \"prompt\": \"${CONTENT}\"}")
    
    if [ $? -ne 0 ] || [ -z "$EMBEDDING_JSON" ]; then
        echo -e "   ${RED}❌ Błąd generowania embedding${NC}"
        FAILED=$((FAILED + 1))
        continue
    fi
    
    # Extract embedding array
    EMBEDDING=$(echo "$EMBEDDING_JSON" | python3 -c "
import json, sys
data = json.load(sys.stdin)
embedding = data.get('embedding', [])
# Pad to 1024 if needed (nomic-embed-text is 768)
if len(embedding) == 768:
    embedding = embedding + [0.0] * 256
elif len(embedding) < 1024:
    embedding = embedding + [0.0] * (1024 - len(embedding))
elif len(embedding) > 1024:
    embedding = embedding[:1024]
print(json.dumps(embedding))
" 2>/dev/null)
    
    if [ -z "$EMBEDDING" ]; then
        echo -e "   ${RED}❌ Błąd parsowania embedding${NC}"
        FAILED=$((FAILED + 1))
        continue
    fi
    
    # Insert chunk
    CHUNK_JSON=$(cat <<EOF
{
    "legal_act_id": "${ACT_ID}",
    "chunk_index": ${CHUNK_INDEX},
    "content": "${CONTENT}",
    "embedding": ${EMBEDDING},
    "embedding_model_name": "${EMBEDDING_MODEL}",
    "metadata": {"type": "article", "number": "1"}
}
EOF
)
    
    RESPONSE=$(curl -s -k -X POST \
        -H "apikey: ${SUPABASE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_KEY}" \
        -H "Content-Type: application/json" \
        -H "Prefer: return=representation" \
        -d "$CHUNK_JSON" \
        "${SUPABASE_URL}/rest/v1/legal_act_chunks")
    
    if [ $? -eq 0 ] && echo "$RESPONSE" | grep -q "id"; then
        echo -e "   ${GREEN}✅ Dodano chunk${NC}"
        SUCCESS=$((SUCCESS + 1))
        CHUNK_INDEX=$((CHUNK_INDEX + 1))
    else
        echo -e "   ${RED}❌ Błąd wstawiania: ${RESPONSE}${NC}"
        FAILED=$((FAILED + 1))
    fi
    
    echo ""
done

echo -e "${CYAN}====================================================${NC}"
echo -e "${CYAN}📊 PODSUMOWANIE${NC}"
echo -e "${CYAN}====================================================${NC}"
echo -e "${GREEN}✅ Pomyślnie: ${SUCCESS}${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}❌ Niepowodzenia: ${FAILED}${NC}"
fi
echo ""

# Verify
CHUNKS_COUNT=$(curl -s -k -X GET \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    "${SUPABASE_URL}/rest/v1/legal_act_chunks?select=id&limit=1" | python3 -c "import json, sys; data = json.load(sys.stdin); print(len(data) if isinstance(data, list) else 0)" 2>/dev/null || echo "0")

echo -e "${CYAN}📊 Łączna liczba chunks w bazie: ${CHUNKS_COUNT}${NC}"
echo ""
echo -e "${CYAN}✨ Gotowe!${NC}"
