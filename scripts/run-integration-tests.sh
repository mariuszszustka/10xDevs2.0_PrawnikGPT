#!/bin/bash
# =========================================================================
# Script: Run Integration Tests
# Purpose: Run integration tests with real Supabase database
# Usage: ./scripts/run-integration-tests.sh
# =========================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🧪 Running Integration Tests${NC}"
echo ""

# Check if we're in project root
if [ ! -d "backend/tests/integration" ]; then
    echo -e "${RED}❌ Error: backend/tests/integration directory not found!${NC}"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Check if .env exists in backend
if [ ! -f "backend/.env" ]; then
    echo -e "${RED}❌ Error: backend/.env file not found!${NC}"
    echo ""
    echo "Create backend/.env with:"
    echo "  SUPABASE_URL=http://localhost:8444  # or your Supabase URL"
    echo "  SUPABASE_SERVICE_KEY=your-service-key"
    echo "  SUPABASE_JWT_SECRET=your-jwt-secret"
    exit 1
fi

# Load environment variables from backend/.env
echo -e "${YELLOW}📄 Loading environment variables from backend/.env...${NC}"
export $(grep -v '^#' backend/.env | grep -v '^$' | xargs)

# Check required variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo -e "${RED}❌ Error: SUPABASE_URL or SUPABASE_SERVICE_KEY not set in backend/.env!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment variables loaded${NC}"
echo ""

# Check if Supabase is accessible
echo -e "${YELLOW}🔍 Checking Supabase connection...${NC}"
if curl -s -f "${SUPABASE_URL}/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Supabase is accessible at ${SUPABASE_URL}${NC}"
else
    echo -e "${YELLOW}⚠️  Could not reach Supabase at ${SUPABASE_URL}${NC}"
    echo "Tests may still work if Supabase is accessible from Python."
fi
echo ""

# Run integration tests
echo -e "${YELLOW}🚀 Running integration tests...${NC}"
echo ""

cd backend

# Try to activate venv if it exists
if [ -d "venv" ]; then
    echo -e "${YELLOW}📦 Activating virtual environment...${NC}"
    source venv/bin/activate
elif [ -d ".venv" ]; then
    echo -e "${YELLOW}📦 Activating virtual environment...${NC}"
    source .venv/bin/activate
fi

# Add backend directory to PYTHONPATH so imports work
export PYTHONPATH="${PWD}:${PYTHONPATH}"

# Use python3 if available, otherwise python
PYTHON_CMD="python3"
if ! command -v python3 &> /dev/null; then
    PYTHON_CMD="python"
fi

# Run pytest
$PYTHON_CMD -m pytest tests/integration/ -v -m integration "$@"

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All integration tests passed!${NC}"
else
    echo -e "${RED}❌ Some integration tests failed${NC}"
fi

exit $EXIT_CODE

