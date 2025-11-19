# PrawnikGPT Backend

FastAPI backend for PrawnikGPT - Legal Question Answering System with RAG.

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Supabase (local or cloud)
- OLLAMA (for LLM models)
- Redis (optional, for caching)

### Installation

1. **Install Python venv package** (Debian/Ubuntu):
```bash
sudo apt install python3.11-venv
```

2. **Create virtual environment**:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# or: venv\Scripts\activate  # Windows
```

3. **Install dependencies**:
```bash
pip install -r requirements.txt
```

4. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with your configuration
nano .env  # or use your preferred editor
```

5. **Verify services are running**:
```bash
# Check Supabase
curl http://localhost:8444/health

# Check OLLAMA
curl http://localhost:11434/api/version
```

### Running the Server

```bash
# Development mode (with auto-reload)
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

# Production mode
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 4
```

Server will be available at:
- API: http://localhost:8000
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Testing Endpoints

```bash
# Root endpoint
curl http://localhost:8000/

# Health check
curl http://localhost:8000/health

# Expected response (when all services running):
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2025-11-19T10:30:00Z",
  "services": {
    "database": "ok",
    "ollama": "ok",
    "supabase_auth": "ok"
  }
}
```

## 📁 Project Structure

```
backend/
├── main.py                 # FastAPI app entry point
├── config.py              # Environment configuration
├── requirements.txt       # Python dependencies
├── .env                   # Environment variables (not in git)
├── .env.example          # Environment template
│
├── models/               # Pydantic models (DTOs)
│   ├── __init__.py
│   ├── health.py        # Health check models
│   ├── query.py         # Query-related models
│   ├── rating.py        # Rating models (TODO)
│   ├── legal_act.py     # Legal act models (TODO)
│   └── error.py         # Error response models
│
├── services/            # Business logic
│   ├── __init__.py
│   ├── health_check.py  # Health check logic
│   ├── exceptions.py    # Custom exceptions
│   ├── rag_pipeline.py  # RAG orchestration (TODO)
│   ├── embedding_service.py  # OLLAMA embeddings (TODO)
│   ├── llm_service.py   # OLLAMA text generation (TODO)
│   └── vector_search.py # Supabase pgvector queries (TODO)
│
├── db/                  # Database layer
│   ├── __init__.py
│   ├── supabase_client.py  # Supabase setup
│   ├── queries.py       # Query repository (TODO)
│   ├── ratings.py       # Rating repository (TODO)
│   └── legal_acts.py    # Legal acts repository (TODO)
│
├── routers/             # API endpoints
│   ├── __init__.py
│   ├── health.py        # Health check endpoint ✅
│   ├── queries.py       # Query endpoints (TODO)
│   ├── ratings.py       # Rating endpoints (TODO)
│   ├── legal_acts.py    # Legal acts endpoints (TODO)
│   └── onboarding.py    # Onboarding endpoints (TODO)
│
├── middleware/          # FastAPI middleware
│   ├── __init__.py
│   ├── auth.py          # JWT validation (TODO)
│   ├── rate_limit.py    # Rate limiting (TODO)
│   └── error_handler.py # Global error handling (TODO)
│
└── tests/               # Tests (pytest)
    ├── __init__.py
    ├── conftest.py      # Pytest fixtures (TODO)
    ├── test_health.py   # Health check tests (TODO)
    └── ...
```

## 🔧 Development

### Code Quality

```bash
# Lint with Ruff
ruff check backend/

# Format with Ruff
ruff format backend/

# Type checking with mypy
mypy backend/ --strict
```

### Running Tests

```bash
# Run all tests
pytest backend/tests/

# Run specific test file
pytest backend/tests/test_health.py -v

# Run with coverage
pytest --cov=backend --cov-report=html
```

## 📚 API Documentation

### Implemented Endpoints

- ✅ `GET /` - Root endpoint (API info)
- ✅ `GET /health` - System health check

### Coming Soon

- 🔜 `POST /api/v1/queries` - Submit query
- 🔜 `GET /api/v1/queries` - List queries
- 🔜 `GET /api/v1/queries/{query_id}` - Query details
- 🔜 `DELETE /api/v1/queries/{query_id}` - Delete query
- 🔜 `POST /api/v1/queries/{query_id}/accurate-response` - Request accurate response
- 🔜 `POST /api/v1/queries/{query_id}/ratings` - Rate response
- 🔜 `GET /api/v1/legal-acts` - List legal acts
- 🔜 `GET /api/v1/legal-acts/{act_id}` - Legal act details

Full API documentation: [api-plan.md](../.ai/api-plan.md)

## 🌐 Deployment

This backend is **deployment-agnostic** and can run in multiple configurations:

- 🏠 **All-in-one**: Everything on localhost
- 🔀 **Distributed**: Frontend/Backend on one machine, services on another
- ☁️ **Cloud**: All components in cloud providers
- 🔄 **Hybrid**: Any combination of local and cloud

All service URLs are configured via `.env` file. See `.env.example` for examples.

## 🔗 Related Documentation

- [API Implementation Plan](../.ai/api-implementation-index.md)
- [Database Schema](../.ai/db-plan.md)
- [RAG Implementation](../.ai/rag-implementation-plan.md)
- [Tech Stack](../.ai/tech-stack.md)

## 📝 License

MIT License - See LICENSE file for details.

