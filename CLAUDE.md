# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PrawnikGPT** is an MVP legal assistant application for Polish lawyers and legal trainees. It provides an intelligent chat interface to query Polish legal acts using RAG (Retrieval-Augmented Generation) with a dual-response system: fast answers (<15s) from a smaller LLM and detailed answers (on request) from a larger 120B model.

**Key Goal**: Validate market demand for AI-assisted legal research by enabling natural language queries over 20,000 recent Polish legal acts from the ISAP database.

**Full documentation**: See [docs/PRD.md](docs/PRD.md) for complete product requirements.

## Development Commands

### Frontend (Next.js)
```bash
# Install dependencies
npm install

# Run development server (port 3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

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
1. Copy `.env.example` to `.env`
2. Run `supabase start` to get database credentials
3. Update `.env` with SUPABASE_URL, SUPABASE_ANON_KEY, and OLLAMA_HOST

## Architecture

### Technology Stack
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Python FastAPI
- **Database**: Supabase (PostgreSQL + pgvector for vector embeddings)
- **LLM Infrastructure**: OLLAMA (local model hosting)
  - Fast model: 7B-13B for quick responses (<15s)
  - Detailed model: gpt-oss:120b for in-depth analysis (timeout: 240s)
  - Embedding model: nomic-embed-text or mxbai-embed-large for semantic search
- **RAG Orchestration**: LangChain or LlamaIndex
- **Data Ingestion**: Crawl4AI (for ISAP API)

### Data Model (Supabase)
The application uses three main tables to model legal acts:

1. **legal_acts**: Stores metadata for each legal act (title, dates, status, issuing body, etc.)
2. **legal_act_relations**: Models graph relationships between acts (modifies, repeals, implements, etc.)
3. **legal_act_chunks**: Stores text fragments with vector embeddings for semantic search

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
├── backend/           # FastAPI backend
│   ├── main.py       # Minimal FastAPI app (currently just Hello World)
│   └── requirements.txt
├── src/              # Next.js frontend
│   └── app/
│       ├── page.tsx      # Homepage
│       ├── layout.tsx    # Root layout
│       └── globals.css   # Global styles
├── supabase/         # Database configuration
│   ├── config.toml   # Local Supabase settings
│   ├── migrations/   # Database migration files (empty in MVP)
│   └── seed.sql      # Database seed file (if configured)
├── docs/             # Project documentation
│   ├── architecture.md         # (Not analyzed in detail)
│   ├── product_requirements.md # Detailed MVP spec with user stories
│   └── GEMINI.md              # (Not analyzed)
└── .env.example      # Environment variable template
```

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
- ESLint for frontend linting
- Prettier for code formatting (`.prettierrc.json`)
- Husky git hooks configured (`.husky/`)
- TypeScript strict mode enabled

### Supabase Configuration
- Local API port: 54321
- Local DB port: 54322
- Supabase Studio port: 54323
- Email testing (Inbucket) port: 54324
- Auth configured for local development (site_url: http://127.0.0.1:3000)
- pgvector extension required for embeddings
