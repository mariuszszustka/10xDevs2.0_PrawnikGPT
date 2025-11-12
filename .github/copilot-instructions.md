# AI Rules for PrawnikGPT

PrawnikGPT is an MVP legal assistant application for Polish lawyers and legal trainees. It provides an intelligent chat interface to query Polish legal acts using RAG (Retrieval-Augmented Generation) with a dual-response system: fast answers (<15s) from a smaller LLM and detailed answers (on request) from a larger 120B model.

## Tech Stack

- **Frontend:** Astro 5, React 19, TypeScript, Tailwind CSS, Shadcn/ui
- **Backend:** Python FastAPI
- **Database:** Supabase (PostgreSQL + pgvector)
- **LLM Infrastructure:** OLLAMA (local model hosting)
  - Fast model: 7B-13B (mistral:7b, llama2:13b)
  - Detailed model: gpt-oss:120b
  - Embedding model: nomic-embed-text (768-dim) or mxbai-embed-large (1024-dim)
- **RAG Orchestration:** LangChain or LlamaIndex
- **Data Ingestion:** Crawl4AI (for ISAP API)

---

## Project Structure

**Frontend (Astro + React Islands):**
- `./src/layouts` - Astro layouts
- `./src/pages` - Astro pages (index, login, register, app/*)
- `./src/components` - Astro (static) and React (interactive) components
  - `./src/components/ui` - Shadcn/ui components
- `./src/lib` - Utilities (API client, Supabase setup)
- `./src/middleware` - Auth middleware
- `./src/assets` - Static assets

**Backend (FastAPI):**
- `./backend/main.py` - FastAPI app entry point
- `./backend/routers/` - API route handlers
- `./backend/services/` - Business logic (RAG pipeline, LLM)
- `./backend/models/` - Pydantic schemas
- `./backend/db/` - Database utilities
- `./backend/tests/` - Pytest tests

**Database (Supabase):**
- `./supabase/migrations/` - Database migrations
- `./supabase/config.toml` - Local Supabase settings

**Documentation:**
- `./.ai/` - Planning docs (PRD, tech stack, API/DB/UI/RAG plans)
- `./docs/` - Additional documentation
- `./CLAUDE.md` - Instructions for Claude Code

---

## Coding Practices

### Clean Code Guidelines

- Handle errors and edge cases at the beginning of functions
- Use early returns for error conditions (avoid deeply nested ifs)
- Place happy path last in functions
- Use guard clauses for preconditions
- Prioritize error handling and user-friendly messages
- Use linter feedback (ESLint for frontend, Ruff for backend)

### Frontend (Astro + React)

- Use Astro components (.astro) for static content and layouts
- Use React islands (.tsx) ONLY for interactive components
- Never use Next.js directives ("use client", "use server")
- Use `client:*` directives appropriately (load, idle, visible)
- Minimize JavaScript bundle (<50KB target)
- Use functional components with hooks
- Implement React.memo() for expensive components
- Use useCallback/useMemo for performance
- Implement accessibility (ARIA, keyboard nav, semantic HTML)

### Backend (FastAPI + Python)

- Use async/await for all I/O operations (httpx instead of requests)
- Define Pydantic models for request/response validation
- Implement dependency injection for JWT auth
- Use custom exceptions for error handling
- Always add type hints (Python 3.11+ syntax)
- Use lowercase SQL in migrations
- Enable RLS on all Supabase tables
- Create granular RLS policies (one per operation + role)

---

## Key Features

### Dual-Response RAG System

1. **Fast Response (<15s):** Smaller model (7B-13B) provides initial answer
2. **Detailed Response (timeout 240s):** Larger model (120B) provides in-depth analysis on request
3. **Context Caching:** RAG context cached for 5 minutes to reuse for detailed response
4. **Source Links:** Both responses include clickable links to legal act sources

### RAG Pipeline

1. Convert user question to embedding (OLLAMA nomic-embed-text)
2. Similarity search in `legal_act_chunks` (pgvector cosine similarity)
3. Fetch metadata from `legal_acts` and relations from `legal_act_relations`
4. Construct prompt with context (chunks + metadata + relations)
5. Generate answer with LLM (fast or detailed model)
6. Parse sources and create clickable links
7. Store query and response in database
8. Cache context for potential detailed response request

---

## Database Schema (Key Tables)

- **queries:** User questions with timestamps
- **responses:** LLM answers (fast/detailed) with sources and generation time
- **ratings:** User feedback (thumbs up/down) for responses
- **legal_acts:** Metadata for 20k Polish legal acts
- **legal_act_chunks:** Text fragments with 768-dim embeddings for semantic search
- **legal_act_relations:** Graph relationships between acts (modifies, repeals, etc.)

---

## Authentication & Authorization

- Supabase Auth (email/password, no email verification in MVP)
- JWT tokens stored client-side (cookies or localStorage)
- Row-Level Security (RLS) ensures users only access their own data
- FastAPI middleware validates JWT on every request

---

## Performance Targets

- Fast response: <15 seconds (95th percentile)
- Detailed response: <240 seconds (timeout)
- Similarity search: <200ms
- Page load (FCP): <2 seconds
- JS bundle size: <50KB

---

## MVP Scope

**In scope:**
- Email/password authentication
- Chat interface with fast + detailed responses
- Query history (chronological list)
- Rating system (thumbs up/down)
- Onboarding (welcome message, example questions)
- 20,000 recent Polish legal acts (static dataset)

**Out of scope:**
- Full ISAP database (only 20k acts)
- Advanced search/filters in history
- Sharing queries between users
- Export to PDF/DOCX
- Mobile apps (web only)
- Automatic data updates
- E2E tests

---

## Resources

- **Full PRD:** See `.ai/prd.md`
- **Tech Stack:** See `.ai/tech-stack.md`
- **API Plan:** See `.ai/api-plan.md`
- **DB Schema:** See `.ai/db-plan.md`
- **UI Plan:** See `.ai/ui-plan.md`
- **RAG Implementation:** See `.ai/rag-implementation-plan.md`
- **Cursor Rules:** See `.cursor/rules/` (shared, astro-react, fastapi-backend, supabase-migrations)

---

## Deployment Architecture

**IMPORTANT:** This application is **deployment-agnostic** and can run in multiple configurations:

**1️⃣ All-in-one (Single Machine)**
```
Single Machine (localhost)
├─ Astro :4321
├─ FastAPI :8000
├─ Supabase :8444 (Docker)
└─ OLLAMA :11434 (Native)
```

**2️⃣ Distributed (Separate Machines)**
```
Machine A (Dev/Frontend)     Machine B (Services/GPU)
├─ Astro :4321        ─────▶ Supabase :8444 (Docker)
└─ FastAPI :8000      ─────▶ OLLAMA :11434 (Native)
```

**3️⃣ Cloud/Production**
```
Vercel (Astro) ──▶ DigitalOcean (FastAPI) ──▶ Supabase Cloud + OLLAMA Server
```

**4️⃣ Hybrid (Mixed Local/Cloud)**
```
Local Frontend/Backend ──▶ Cloud Supabase + Local OLLAMA (or any combination)
```

All URLs are configured via `.env` file. See `.env.example` for detailed deployment scenarios.

## Development Commands

### Universal Setup (Works for All Deployment Scenarios)

**1. Configure Environment:**
```bash
# Copy .env.example to .env
cp .env.example .env

# Edit .env based on your chosen deployment scenario
# See .env.example for 4 example configurations:
# - Scenario 1: All-in-one (localhost)
# - Scenario 2: Distributed (separate machines)
# - Scenario 3: Cloud/Production
# - Scenario 4: Hybrid (mixed)

# Required variables:
# - SUPABASE_URL (e.g., http://localhost:8444 or http://192.168.0.11:8444)
# - SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY, SUPABASE_JWT_SECRET
# - OLLAMA_HOST (e.g., http://localhost:11434 or http://your-server:11434)
# - PUBLIC_API_BASE_URL, PUBLIC_SUPABASE_URL
```

**2. Start Services (if running locally):**

*If Supabase is local:*
```bash
# Using Docker Compose
docker-compose up -d supabase

# Or using Supabase CLI
supabase start

# Verify
docker ps | grep supabase
```

*If OLLAMA is local:*
```bash
# Install OLLAMA (if not already installed)
# Download from: https://ollama.ai

# Pull required models
ollama pull nomic-embed-text
ollama pull mistral:7b
ollama pull gpt-oss:120b

# Verify
ollama list
```

**3. Frontend (Astro):**
```bash
npm install
npm run dev      # Port 4321
npm run build
```

**4. Backend (FastAPI):**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload  # Port 8000
```

**5. Verify Connectivity:**
```bash
# Test Supabase (replace URL with your actual SUPABASE_URL)
curl ${SUPABASE_URL}/health

# Examples:
# curl http://localhost:8444/health
# curl http://192.168.0.11:8444/health
# curl https://your-project.supabase.co/health

# Test OLLAMA (replace URL with your actual OLLAMA_HOST)
curl ${OLLAMA_HOST}/api/version

# Examples:
# curl http://localhost:11434/api/version
# curl http://192.168.0.11:11434/api/version

# Test Backend
curl http://localhost:8000/health
```

---

## Language Context

- **UI text:** Polish (wszystkie teksty w interfejsie użytkownika)
- **Code/comments:** English preferred
- **Legal queries:** Polish (użytkownicy zadają pytania po polsku)
- **Documentation:** Bilingual (Polish/English mix OK)
