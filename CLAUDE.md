# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PrawnikGPT** is an MVP legal assistant application for Polish lawyers and legal trainees. It provides an intelligent chat interface to query Polish legal acts using RAG (Retrieval-Augmented Generation) with a dual-response system: fast answers (<15s) from a smaller LLM and detailed answers (on request) from a larger 120B model.

**Key Goal**: Validate market demand for AI-assisted legal research by enabling natural language queries over 20,000 recent Polish legal acts from the ISAP database.

**Full documentation**:
- See [.ai/prd.md](.ai/prd.md) for complete product requirements
- See [.ai/tech-stack.md](.ai/tech-stack.md) for technology decisions
- See [.ai/api-plan.md](.ai/api-plan.md) for API endpoints
- See [.ai/db-plan.md](.ai/db-plan.md) for database schema
- See [.ai/ui-plan.md](.ai/ui-plan.md) for UI architecture
- See [.ai/rag-implementation-plan.md](.ai/rag-implementation-plan.md) for RAG pipeline

**AI Assistant Rules**:
- See [.cursor/rules/](.cursor/rules/) for Cursor AI rules
- See [.github/copilot-instructions.md](.github/copilot-instructions.md) for GitHub Copilot

## Development Commands

### Frontend (Astro + React Islands)
```bash
# Install dependencies
npm install

# Run development server (port 4321)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

### Backend (FastAPI)
```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run development server (port 8000)
uvicorn main:app --reload
```

### Database (Supabase)
```bash
# Start local Supabase instance
supabase start

# Stop Supabase
supabase stop

# View database credentials (after starting)
# Credentials appear in terminal output

# Access Supabase Studio
# http://127.0.0.1:54323 (after starting)
```

### Environment Setup

**IMPORTANT:** This application is **deployment-agnostic** and can run in multiple configurations:

#### Deployment Scenarios

**1️⃣ All-in-one (Single Machine)**
```
├─ Frontend (Astro) :4321
├─ Backend (FastAPI) :8000
├─ Supabase (Docker) :8444
└─ OLLAMA (Native) :11434
```
Good for: Development, testing, small deployments

**2️⃣ Distributed (Separate Machines)**
```
Machine A (dev/frontend)     Machine B (services/GPU)
├─ Astro :4321        ───▶   ├─ Supabase :8444
└─ FastAPI :8000      ───▶   └─ OLLAMA :11434
```
Good for: Dedicated GPU server, resource separation

**3️⃣ Cloud/Production**
```
Vercel (Astro) ──▶ DigitalOcean (FastAPI) ──▶ Supabase Cloud + OLLAMA Server
```
Good for: Production deployments, scalability

**Setup Steps:**

1. **Choose your deployment scenario** and configure services accordingly

2. **Configure environment variables:**
   ```bash
   # Copy .env.example to .env
   cp .env.example .env

   # Edit .env based on your chosen scenario (see .env.example for examples)
   # Required variables:
   # - SUPABASE_URL (e.g., http://localhost:8444 or http://192.168.0.11:8444)
   # - SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY
   # - OLLAMA_HOST (e.g., http://localhost:11434 or http://your-server:11434)
   ```

3. **Install and verify services:**
   ```bash
   # Supabase (Docker)
   docker-compose up -d supabase
   docker ps | grep supabase

   # OLLAMA (native or Docker)
   ollama list  # Should show: nomic-embed-text, mistral:7b, gpt-oss:120b

   # If models missing, pull them:
   ollama pull nomic-embed-text
   ollama pull mistral:7b
   ollama pull gpt-oss:120b
   ```

4. **Test connectivity:**
   ```bash
   # Test Supabase (replace URL with your actual SUPABASE_URL)
   curl ${SUPABASE_URL}/health

   # Test OLLAMA (replace URL with your actual OLLAMA_HOST)
   curl ${OLLAMA_HOST}/api/version
   ```

5. **Start application:**
   ```bash
   # Backend
   cd backend && uvicorn main:app --reload  # Port 8000

   # Frontend
   npm run dev  # Port 4321
   ```

## Architecture

### Technology Stack
- **Frontend**: Astro 5, React 19 (islands), TypeScript, Tailwind CSS, Shadcn/ui
- **Backend**: Python FastAPI
- **Database**: Supabase (PostgreSQL + pgvector for vector embeddings)
- **LLM Infrastructure**: OLLAMA (local model hosting)
  - Fast model: 7B-13B (mistral:7b, llama2:13b) for quick responses (<15s)
  - Detailed model: gpt-oss:120b for in-depth analysis (timeout: 240s)
  - Embedding model: nomic-embed-text (768-dim) or mxbai-embed-large (1024-dim) for semantic search
- **RAG Orchestration**: LangChain or LlamaIndex
- **Data Ingestion**: Crawl4AI (for ISAP API)

### Why Astro + FastAPI?
- **Astro:** Content-first framework perfect for legal text display; minimal JS (~40KB vs ~200KB in Next.js); partial hydration with React islands only for interactive components
- **FastAPI:** Python ecosystem excels for AI/ML workloads; native async support; automatic OpenAPI docs; perfect for OLLAMA integration

### Data Model (Supabase)
The application uses six main tables:

**User Data:**
1. **queries**: User questions with timestamps
2. **responses**: LLM answers (fast/detailed) with sources, model name, generation time
3. **ratings**: User feedback (thumbs up/down) for responses

**Legal Acts Data (Read-only in MVP):**
4. **legal_acts**: Metadata for 20k Polish legal acts (title, dates, status, issuing body, etc.)
5. **legal_act_relations**: Graph relationships between acts (modifies, repeals, implements, etc.)
6. **legal_act_chunks**: Text fragments (500-1500 chars) with 768-dim vector embeddings for semantic search

### Dual-Response RAG Flow
1. User submits query via chat interface
2. Query is converted to vector embedding
3. System searches `legal_act_chunks` for most relevant fragments
4. Related metadata and relationships fetched from `legal_acts` and `legal_act_relations`
5. **Fast Response** (<15s): Smaller model generates initial answer
6. User can optionally request **Detailed Response** (timeout: 240s): Larger model provides comprehensive analysis
7. Context from RAG retrieval is cached for 5 minutes to reuse for detailed response
8. Both responses include clickable source links (act title + article number)

### Authentication
- Email/password authentication via Supabase Auth
- JWT tokens stored client-side and attached to backend requests
- No email verification required in MVP (minimize friction)

### Key Features
- **Chat Interface**: Natural language queries in Polish
- **Query History**: Chronological list of past queries with both response types
- **Rating System**: Thumbs up/down for each response to collect quality feedback
- **Onboarding**: Welcome message and 3-4 clickable example queries for new users
- **Error Handling**: Friendly messages for timeouts and out-of-scope queries

## Data Source & Ingestion

### ISAP API Integration
- **Source**: Public API at `https://api.sejm.gov.pl/eli`
- **Scope for MVP**: 20,000 most recent legal acts (static dataset)
- **Tool**: Crawl4AI for orchestrating data collection

### Ingestion Process
1. Fetch list of recent acts from ISAP API
2. For each act:
   - Download full metadata from `/acts/{publisher}/{year}/{position}`
   - Extract act content (HTML preferred, PDF as fallback)
   - Fetch relationships from `/acts/{publisher}/{year}/{position}/references`
3. Process and store:
   - Metadata → `legal_acts` table
   - Relationships → `legal_act_relations` table
   - Text content:
     - Split into logical chunks (per article/paragraph)
     - Generate embeddings using OLLAMA embedding model
     - Store chunks + embeddings → `legal_act_chunks` table

## Project Structure

```
prawnik_v01/
├── .ai/                       # Planning documentation (for AI assistants)
│   ├── prd.md                # Product Requirements Document
│   ├── tech-stack.md         # Technology stack decisions
│   ├── api-plan.md           # FastAPI endpoints plan
│   ├── db-plan.md            # Database schema plan
│   ├── ui-plan.md            # UI architecture (Astro + React islands)
│   └── rag-implementation-plan.md  # RAG pipeline implementation
├── .cursor/                   # Cursor AI rules
│   └── rules/
│       ├── shared.mdc        # Shared rules (always apply)
│       ├── astro-react.mdc   # Frontend rules (*.astro, *.tsx)
│       ├── fastapi-backend.mdc  # Backend rules (backend/**/*.py)
│       └── supabase-migrations.mdc  # DB migration rules (*.sql)
├── .github/
│   └── copilot-instructions.md  # GitHub Copilot instructions
├── backend/                   # FastAPI backend
│   ├── main.py               # FastAPI app entry point
│   ├── routers/              # API route handlers
│   ├── services/             # Business logic (RAG pipeline, LLM)
│   ├── models/               # Pydantic request/response schemas
│   ├── db/                   # Database utilities (Supabase client)
│   ├── tests/                # Pytest tests
│   └── requirements.txt      # Python dependencies
├── src/                       # Astro frontend
│   ├── layouts/              # Astro layouts (BaseLayout, AppLayout)
│   ├── pages/                # Astro pages (index, login, register, app/*)
│   ├── components/           # Astro (static) + React (islands)
│   │   ├── layout/           # Header, Footer, UserMenu
│   │   ├── auth/             # LoginForm, RegisterForm (React islands)
│   │   ├── chat/             # ChatInput, ResponseCard (React islands)
│   │   ├── history/          # HistoryList (React islands)
│   │   └── ui/               # Shadcn/ui components (React)
│   ├── lib/                  # Utilities (API client, Supabase setup)
│   ├── middleware/           # Astro middleware (auth check)
│   └── assets/               # Static assets
├── supabase/                  # Database configuration
│   ├── config.toml           # Local Supabase settings
│   ├── migrations/           # Database migration files (*.sql)
│   └── seed.sql              # Seed data (optional)
├── docs/                      # Additional documentation
├── public/                    # Public assets (favicon, robots.txt)
├── .env.example               # Environment variable template
├── CLAUDE.md                  # This file - guidance for Claude Code
└── README.md                  # Project overview and setup
```

**Key directories:**
- **`.ai/`** - Comprehensive planning documents for AI assistants
- **`.cursor/rules/`** - Context-specific rules for Cursor AI (by file type)
- **`backend/`** - Python FastAPI backend with RAG pipeline
- **`src/`** - Astro frontend with React islands for interactivity
- **`supabase/`** - Database migrations and configuration

## MVP Implementation Strategy

### Phase 1: Single Model Flow
Implement complete flow (login, chat, history, ratings) using **only the smaller LLM** to stabilize core functionality.

### Phase 2: Dual Model Integration
Add "Get detailed answer" button functionality and integrate larger 120B model with proper timeout handling.

### Out of Scope for MVP
- Full ISAP database (only 20k recent acts)
- Advanced relationship interpretation between acts
- Admin panel for user management
- Payment/subscription features
- Searchable query history
- End-to-end (E2E) tests
- Automatic data updates (static dataset)

## Testing & CI/CD

### Testing Strategy
- Unit tests for core backend logic (prompt formatting, model routing)
- Mock Supabase SDK in tests
- GitHub Actions workflow runs tests on every push

### Success Metrics
- **Performance**: Fast response <15s in 95% of cases; detailed response <240s (timeout)
- **Adoption**: >100 registered users in first month; >30% weekly retention
- **Engagement**: Average >5 queries per active user
- **Quality**: >70% positive ratings (thumbs up)
- **Feature Usage**: 20-40% of queries request detailed answer; <10% queries fail to find relevant acts

## Development Notes

### OLLAMA Requirements
- Must have OLLAMA installed locally
- Ensure both fast (7B-13B) and detailed (gpt-oss:120b) models are downloaded
- Configure embedding model for RAG (nomic-embed-text or mxbai-embed-large)
- Default host: `http://localhost:11434`

### Language Context
- All UI text should be in Polish
- Legal queries will be in Polish
- Documentation can be bilingual (Polish/English)

### Code Quality Tools

**Frontend:**
- ESLint for linting (TypeScript + React)
- Prettier for code formatting (`.prettierrc.json`)
- TypeScript strict mode enabled
- Vitest for unit tests (React components)

**Backend:**
- Ruff for linting and formatting (modern Python linter)
- Mypy for type checking (optional but recommended)
- Pytest for unit and integration tests

**Git Hooks:**
- Husky configured (`.husky/`) for pre-commit checks

### Network Architecture

This application uses a **flexible, environment-variable-driven architecture**. Components communicate via HTTP/REST using URLs configured in `.env`:

**Component Communication:**
```
┌──────────────────┐
│  User Browser    │
│                  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐      ${PUBLIC_API_BASE_URL}
│ Astro Frontend   │────────────────────────────┐
│  (Port 4321)     │                            │
└──────────────────┘                            ▼
                                    ┌──────────────────────┐
                                    │  FastAPI Backend     │
                                    │   (Port 8000)        │
                                    └──────┬──────┬────────┘
                                           │      │
                        ${SUPABASE_URL}    │      │ ${OLLAMA_HOST}
                                           │      │
                        ┌──────────────────┘      └─────────────────┐
                        ▼                                           ▼
            ┌─────────────────────┐                   ┌──────────────────┐
            │  Supabase            │                   │  OLLAMA          │
            │  (PostgreSQL+Auth)   │                   │  (LLM Server)    │
            │  Port: 8444 or 443   │                   │  Port: 11434     │
            └─────────────────────┘                   └──────────────────┘
```

**Configuration via Environment Variables:**

All URLs are configured in `.env` - no hardcoded addresses!

```bash
# Example for all-in-one deployment
SUPABASE_URL=http://localhost:8444
OLLAMA_HOST=http://localhost:11434

# Example for distributed deployment
SUPABASE_URL=http://192.168.0.11:8444
OLLAMA_HOST=http://192.168.0.11:11434

# Example for cloud deployment
SUPABASE_URL=https://your-project.supabase.co
OLLAMA_HOST=https://ollama.your-domain.com
```

### Service Configuration

#### Supabase
- **Connection:** Configured via `SUPABASE_URL` environment variable
- **Default ports:** 8444 (Docker local), 443 (Cloud)
- **Components:** PostgreSQL, Auth (JWT), REST API, Studio UI
- **pgvector extension** required for embeddings (`CREATE EXTENSION vector;`)
- **RLS (Row-Level Security)** enabled on all user tables

#### OLLAMA
- **Connection:** Configured via `OLLAMA_HOST` environment variable
- **Default port:** 11434
- **Required models:**
  - `nomic-embed-text` (768-dim embeddings)
  - `mistral:7b` (fast responses <15s)
  - `gpt-oss:120b` (detailed responses <240s)

**Verify OLLAMA models:**
```bash
# Direct on OLLAMA host
ollama list

# Via HTTP API
curl ${OLLAMA_HOST}/api/tags
```

---

## React Islands Strategy

Astro uses "partial hydration" - only interactive components load JavaScript:

### Static Components (Astro .astro)
Use for content that doesn't require interactivity:
- Layouts (Header, Footer)
- Landing page sections
- Welcome messages, example questions
- Legal act source links (clickable but no state)

### React Islands (React .tsx)
Use ONLY when interactivity needed:
- **Forms** (LoginForm, RegisterForm, ChatInput)
- **State management** (ChatMessagesContainer, HistoryList)
- **User interactions** (RatingButtons, DeleteQueryButton, UserMenu)
- **Loading states** (DetailedAnswerButton with spinner)

### Hydration Directives
```astro
<ChatInput client:load />           {/* Hydrate immediately */}
<HistoryList client:idle />         {/* Hydrate when idle (default) */}
<HistoryList client:visible />      {/* Hydrate when visible (below fold) */}
```

**Result:** ~40KB JS bundle (vs ~200KB in full Next.js)
