# PrawnikGPT - Intelligent Legal Assistant

PrawnikGPT is a Retrieval-Augmented Generation (RAG) based legal assistant designed to answer questions about Polish law. It leverages a FastAPI backend, a Supabase database with pgvector for semantic search, and OLLAMA for Large Language Model (LLM) integration.

## ✨ Key Features

- **RAG Pipeline**: Provides accurate, context-aware answers to legal questions by retrieving relevant information from a vectorized database of legal acts.
- **Dual Response System**: Offers both a "fast response" using a smaller, quicker model and a more detailed "accurate response" from a larger, more powerful model.
- **Query Management**: Users can view their query history, see detailed results, and manage their data.
- **Response Ratings**: A feedback system allows users to rate the quality of generated responses (thumbs up/down).
- **Legal Acts Browser**: A comprehensive interface to browse, search (with full-text search), and view relationships between legal acts.
- **Secure Authentication**: User management and authentication are handled securely through Supabase.

## 🛠️ Tech Stack

- **Backend**: Python 3.11+, FastAPI, Uvicorn
- **Database**: Supabase (PostgreSQL with pgvector extension)
- **LLM & Embeddings**: OLLAMA (running models like Mistral, Llama, etc.)
- **Caching**: Redis (for caching RAG context)
- **Frontend**: Astro 5 + React 19 (islands), TypeScript 5, Tailwind CSS 4, Shadcn/ui
- **Testing**:
  - Backend: Pytest, pytest-asyncio, httpx, pytest-cov
  - Frontend: Vitest, @testing-library/react, MSW
  - E2E: Playwright (optional)
  - Performance: locust, k6, Lighthouse
  - Security: bandit, npm audit
- **Code Quality**: Ruff, Prettier, ESLint, mypy
- **DevOps**: Docker, Husky (pre-commit hooks), GitHub Actions

## 📂 Project Structure

```
/
├── backend/            # FastAPI application source code
│   ├── db/             # Database access layer (repositories)
│   ├── models/         # Pydantic models for data validation
│   ├── routers/        # API endpoint definitions
│   ├── services/       # Business logic (RAG pipeline, LLM services)
│   └── tests/          # Unit and integration tests
├── src/                # Astro frontend source code
│   ├── lib/            # Supabase client, API client, types
│   ├── pages/          # Application pages/routes
│   └── layouts/        # Astro layouts
├── supabase/           # Supabase configuration and migrations
│   └── migrations/     # Database schema migrations
├── docs/               # Project documentation
├── scripts/            # Utility and automation scripts
├── .env.example        # Environment variable template
├── package.json        # Frontend dependencies
└── requirements.txt    # Backend dependencies
```

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Node.js (version specified in `.nvmrc`)
- Docker and Docker Compose
- An active Supabase project
- OLLAMA installed and running locally

### 1. Clone the Repository

```bash
git clone <repository-url>
cd prawnik_v01
```

### 2. Configure Environment Variables

Copy the example environment file and fill in your credentials for Supabase, OLLAMA, and Redis.

```bash
cp .env.example .env
```

### 3. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Frontend Setup

```bash
# From the root directory
npm install
```

### 5. Apply Database Migrations

Make sure your Supabase CLI is configured, then apply the migrations.

```bash
supabase db push
```

## 🏃 Running the Application

### 1. Run the Backend Server

```bash
# From the backend/ directory
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Run the Frontend Development Server

```bash
# From the root directory
npm run dev
```

The application should now be available at `http://localhost:4321`.

## 🧪 Testing

### Quick Start

For a quick introduction to running tests, see **[TESTING_QUICKSTART.md](./TESTING_QUICKSTART.md)**.

For detailed setup and configuration, see **[TESTING_SETUP.md](./TESTING_SETUP.md)**.

### Backend Tests (Python)

The backend uses **pytest** as the primary testing framework with additional tools for async testing, mocking, and coverage measurement.

**Run tests:**
```bash
cd backend
pytest                          # Run all tests
pytest --cov=backend            # Run with coverage report
pytest -v                       # Verbose output
pytest tests/test_rag_pipeline.py  # Run specific test file
```

**Testing tools:**
- **pytest** (>=8.3.0) - Main testing framework
- **pytest-asyncio** (>=0.24.0) - Testing async/await code
- **httpx** (>=0.28.0) - TestClient for FastAPI endpoints
- **pytest-mock** - Mocking framework
- **pytest-cov** - Code coverage measurement
- **unittest.mock** - Mocking OLLAMA API and external services

**Coverage target:** ≥70% for backend code

### Frontend Tests (TypeScript/React)

The frontend uses **Vitest** for unit testing React components and utility functions.

**Run tests:**
```bash
npm run test                    # Run all tests
npm run test:coverage           # Run with coverage report
npm run test:watch              # Watch mode for development
```

**Testing tools:**
- **Vitest** - Modern testing framework (Vite-native)
- **@testing-library/react** - Testing React components
- **@testing-library/user-event** - Simulating user interactions
- **MSW (Mock Service Worker)** - Mocking API calls
- **@vitest/coverage-v8** - Code coverage measurement
- **@axe-core/react** - Accessibility testing

**Coverage target:** ≥50% for frontend code (MVP)

### End-to-End Tests (Optional)

E2E tests are not in MVP scope but can be added for comprehensive testing:

**Recommended tools:**
- **Playwright** - Modern E2E testing framework (recommended)
- **Cypress** - Alternative E2E framework

**Run E2E tests (when implemented):**
```bash
npm run test:e2e                # Playwright tests
npm run test:e2e:ui             # Playwright UI mode
```

### Performance Testing

**Tools:**
- **locust** - Load testing (Python-based)
- **k6** - Alternative load testing (JavaScript-based)
- **Lighthouse** - Frontend performance and accessibility audits

**Performance targets:**
- Fast response: <15s (95th percentile)
- Accurate response: <240s (timeout)
- Similarity search: <200ms average
- First Contentful Paint: <2s
- Main JS bundle: <50KB (gzipped)

### Security Testing

**Tools:**
- **bandit** - Python security linter
- **npm audit** - npm dependency vulnerability scanner
- **snyk** - Advanced security scanning (optional)

**Run security checks:**
```bash
# Backend
cd backend
bandit -r . -ll                 # Check for common security issues

# Frontend
npm audit                       # Check for vulnerable dependencies
npm audit fix                   # Auto-fix if possible
```

### Test Structure

```
backend/tests/
├── test_health.py              # Health check endpoint tests
├── test_query_endpoints.py     # Query API endpoint tests
├── test_rating_endpoints.py    # Rating API endpoint tests
├── test_rag_pipeline.py        # RAG pipeline unit tests
├── test_llm_service.py         # LLM service tests
├── test_vector_search.py       # Vector search tests
└── integration/
    ├── test_database_integration.py   # Supabase integration tests
    └── test_ollama_integration.py     # OLLAMA integration tests

src/
└── (Vitest tests to be implemented)
```