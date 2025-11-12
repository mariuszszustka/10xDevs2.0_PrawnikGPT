# Tech Stack – PrawnikGPT

## Frontend - Astro 5 z React 19 dla komponentów interaktywnych

### Astro 5
- Pozwala na tworzenie szybkich, wydajnych stron i aplikacji z minimalną ilością JavaScript
- Generuje statyczny HTML z możliwością partial hydration (React islands)
- Idealny dla content-heavy aplikacji (akty prawne, dokumentacja)
- Wspiera View Transitions API dla płynnych przejść między stronami
- Wydajność: ~40KB JS bundle (vs ~200KB w Next.js)

### React 19
- Zapewni interaktywność tam, gdzie jest potrzebna (komponenty typu "island")
- Użycie strategiczne: chat interface, formularze logowania, rating system
- Hooks dla state management (useState, useCallback, useMemo)
- Nowe features: useOptimistic, useTransition dla lepszego UX

### TypeScript 5
- Statyczne typowanie kodu dla całego projektu (frontend + backend types)
- Lepsze wsparcie IDE (IntelliSense, refactoring)
- Wspólne typy dla Astro, React i FastAPI (DTOs, entities)
- Type safety dla API calls między frontendem a backendem

### Tailwind CSS 4
- Utility-first CSS framework dla szybkiego stylowania
- Responsywność out-of-the-box (mobile-first)
- Dark mode support (dla przyszłych wersji)
- Minimalna konfiguracja, maksymalna produktywność

### Shadcn/ui
- Biblioteka dostępnych komponentów React (accessibility-first)
- Komponenty UI: buttons, inputs, modals, tooltips, toasts
- Łatwa customizacja i integracja z Tailwind
- Brak vendor lock-in (kod jest kopiowany do projektu)

---

## Backend - FastAPI jako kompleksowe rozwiązanie Python

### FastAPI
- Nowoczesny, szybki framework Python dla budowy API
- Automatyczna generacja dokumentacji (OpenAPI/Swagger)
- Natywne wsparcie dla async/await (ważne dla LLM requests)
- Walidacja danych za pomocą Pydantic
- Idealne połączenie z ekosystemem AI/ML (LangChain, OLLAMA)

### Python 3.11+
- Najlepszy język dla AI/ML workloads
- Ekosystem: LangChain, LlamaIndex, Hugging Face
- Łatwa integracja z OLLAMA (local LLM hosting)
- Performant dla data processing (embeddings, chunking)

---

## Baza danych - Supabase jako Backend-as-a-Service

### Supabase
- Open-source alternatywa dla Firebase
- PostgreSQL z pgvector extension dla embeddings
- Wbudowana autentykacja użytkowników (JWT tokens)
- Row-Level Security (RLS) dla autoryzacji
- Real-time subscriptions (opcjonalnie dla przyszłych wersji)
- SDK w wielu językach (Python dla FastAPI, JS dla Astro)
- Można hostować lokalnie lub na własnym serwerze (no vendor lock-in)

### PostgreSQL + pgvector
- Relacyjna baza danych z ACID guarantees
- pgvector extension dla similarity search (cosine similarity)
- Przechowywanie embeddingów (768-dim vectors)
- Efektywne indexy (IVFFlat, HNSW) dla semantic search

---

## AI Infrastructure - OLLAMA dla lokalnego hostingu LLM

### OLLAMA
- Local LLM hosting (brak dependency na zewnętrzne API)
- Obsługa wielu modeli jednocześnie:
  - **Model szybki (7B-13B)**: Llama 2 13B, Mistral 7B, Phi-2
  - **Model dokładny (120B)**: gpt-oss:120b
  - **Model embeddings**: nomic-embed-text (137M) lub mxbai-embed-large (334M)
- REST API dla łatwej integracji z FastAPI
- Kontrola nad kosztami (brak opłat per-token)
- Privacy-first (dane nie opuszczają infrastruktury)

### LangChain / LlamaIndex
- Orkiestracja RAG pipeline
- Chunking strategies (RecursiveCharacterTextSplitter)
- Vector store integrations (Supabase pgvector)
- Prompt engineering templates
- Memory management (context caching)
- LangChain Expression Language (LCEL) dla deklaratywnych pipeline'ów

---

## Data Ingestion - Crawl4AI

### Crawl4AI
- Python library dla web scraping z AI capabilities
- Obsługa ISAP API (`https://api.sejm.gov.pl/eli`)
- Parsowanie HTML i PDF (fallback)
- Rate limiting i retry logic
- Batch processing dla 20k ustaw
- Progress tracking i error handling

---

## CI/CD i Hosting

### GitHub Actions
- Automatyczne testy po każdym pushu
- Workflow dla frontendu (Astro build, ESLint)
- Workflow dla backendu (pytest, type checking)
- Deploy automation (opcjonalnie)

### Hosting opcje
- **Frontend (Astro)**: Vercel, Netlify, CloudFlare Pages (static/SSR)
- **Backend (FastAPI)**: DigitalOcean, AWS EC2, Render.com
- **Database (Supabase)**: Supabase Cloud lub self-hosted
- **OLLAMA**: Dedicated server z GPU (AWS g5.xlarge, vast.ai)

---

## Development Tools

### Package Managers
- **Frontend**: npm/pnpm (dla Astro + React)
- **Backend**: pip + virtualenv (dla FastAPI)

### Linting & Formatting
- **Frontend**: ESLint + Prettier
- **Backend**: Ruff (modern Python linter) + Black (formatter)

### Type Checking
- **Frontend**: TypeScript compiler (tsc)
- **Backend**: mypy (static type checker dla Python)

### Testing
- **Frontend**: Vitest (unit tests dla React components)
- **Backend**: pytest (unit tests + integration tests)

---

## Architecture Decision Records (ADR)

### Dlaczego Astro zamiast Next.js?
1. **Performance**: ~80% mniej JS (~40KB vs ~200KB)
2. **Content-first**: PrawnikGPT to głównie treść (akty prawne) + trochę interaktywności
3. **SEO**: Lepszy SSG dla landing pages
4. **React islands**: Wystarczająca interaktywność dla chat + formularzy
5. **Lightweight**: Szybsze ładowanie dla prawników (często słabszy internet)

### Dlaczego FastAPI zamiast Node.js?
1. **AI/ML ecosystem**: Python >> Node.js dla LLM/RAG
2. **LangChain/LlamaIndex**: Najlepsze wsparcie w Python
3. **OLLAMA integration**: Natywny Python SDK
4. **Data processing**: Pandas, NumPy dla embeddingów i chunking
5. **Type safety**: Pydantic + FastAPI = automatic validation

### Dlaczego Supabase zamiast samego PostgreSQL?
1. **Auth out-of-box**: JWT, email/password, RLS policies
2. **pgvector included**: Extension zainstalowany domyślnie
3. **Python SDK**: Łatwa integracja z FastAPI
4. **Local development**: `supabase start` dla dev environment
5. **Open source**: Możliwość self-hosting

### Dlaczego OLLAMA zamiast OpenAI API?
1. **Kosty**: $0 per token (tylko hosting)
2. **Privacy**: Dane prawne nie opuszczają infrastruktury
3. **Kontrola**: Pełna kontrola nad modelami
4. **Latency**: Brak network roundtrip do OpenAI
5. **MVP testing**: Łatwiejsze iterowanie bez kosztów API

---

## Uwagi implementacyjne

### Integracja Astro + FastAPI (Deployment-Agnostic)

**IMPORTANT:** Aplikacja jest **uniwersalna** i może działać w różnych konfiguracjach. Wszystkie adresy URL są konfigurowane przez zmienne środowiskowe w pliku `.env`.

#### Deployment Scenarios

**1️⃣ All-in-one (Single Machine)**

Wszystko na jednej maszynie (developer laptop, pojedynczy serwer):

```
┌─────────────────────────────────────┐
│ Single Machine (localhost)          │
│                                     │
│  User Browser                       │
│       ↓                             │
│  Astro (SSG/SSR) - Port 4321       │
│       ↓ HTTP/REST                   │
│  FastAPI Backend - Port 8000        │
│       ↓                             │
│  Supabase (Docker) - Port 8444     │
│  OLLAMA (Native) - Port 11434      │
│   - nomic-embed-text               │
│   - mistral:7b                     │
│   - gpt-oss:120b                   │
└─────────────────────────────────────┘
```

**Environment variables (.env):**
```bash
SUPABASE_URL=http://localhost:8444
OLLAMA_HOST=http://localhost:11434
PUBLIC_API_BASE_URL=http://localhost:8000
PUBLIC_SUPABASE_URL=http://localhost:8444
```

**Good for:** Development, testing, small deployments

---

**2️⃣ Distributed (Separate Machines)**

Frontend + Backend na jednej maszynie, Supabase + OLLAMA na drugiej (np. dedykowany serwer GPU):

```
┌─────────────────────────────────────┐
│ Machine A (Dev/Frontend)            │
│                                     │
│  User Browser                       │
│       ↓                             │
│  Astro (SSG/SSR) - Port 4321       │
│       ↓ HTTP/REST                   │
│  FastAPI Backend - Port 8000        │
│       │                             │
└───────┼─────────────────────────────┘
        │
        │ HTTP over LAN/Internet
        ↓
┌─────────────────────────────────────┐
│ Machine B (Services/GPU)            │
│                                     │
│  Supabase (Docker) - Port 8444     │
│   - PostgreSQL + Auth + pgvector   │
│                                     │
│  OLLAMA (Native) - Port 11434      │
│   - nomic-embed-text               │
│   - mistral:7b                     │
│   - gpt-oss:120b                   │
└─────────────────────────────────────┘
```

**Environment variables (.env) - Machine A:**
```bash
SUPABASE_URL=http://192.168.0.11:8444       # Replace with actual IP
OLLAMA_HOST=http://192.168.0.11:11434       # Replace with actual IP
PUBLIC_API_BASE_URL=http://localhost:8000
PUBLIC_SUPABASE_URL=http://192.168.0.11:8444
```

**Good for:** Development with dedicated GPU server, better resource separation

---

**3️⃣ Cloud/Production**

Wszystkie komponenty w chmurze:

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ User Browser │ ───▶ │ Vercel/      │ ───▶ │ DigitalOcean │ ───▶ │ Supabase     │
│              │      │ Netlify      │      │ (FastAPI)    │      │ Cloud        │
│              │      │ (Astro)      │      │              │      │              │
└──────────────┘      └──────────────┘      └──────┬───────┘      └──────────────┘
                                                    │
                                                    ↓
                                            ┌──────────────┐
                                            │ OLLAMA       │
                                            │ Server       │
                                            │ (GPU)        │
                                            └──────────────┘
```

**Environment variables (.env):**
```bash
SUPABASE_URL=https://your-project.supabase.co
OLLAMA_HOST=https://ollama.your-domain.com:11434
PUBLIC_API_BASE_URL=https://api.your-domain.com
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
```

**Good for:** Production deployments, scalability, global availability

---

**4️⃣ Hybrid (Mixed Local/Cloud)**

Dowolna kombinacja (np. local OLLAMA, cloud Supabase):

**Environment variables (.env):**
```bash
SUPABASE_URL=https://your-project.supabase.co    # Cloud
OLLAMA_HOST=http://192.168.0.11:11434            # Local
PUBLIC_API_BASE_URL=http://localhost:8000
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
```

**Good for:** Testing, cost optimization, specific requirements

---

### Development Workflow (Universal)

**1. Configure environment:**
```bash
# Copy .env.example to .env
cp .env.example .env

# Edit .env and choose your deployment scenario (see .env.example)
# Required variables:
# - SUPABASE_URL
# - SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY, SUPABASE_JWT_SECRET
# - OLLAMA_HOST
# - PUBLIC_API_BASE_URL, PUBLIC_SUPABASE_URL
```

**2. Start services (depending on your scenario):**

*If Supabase is local:*
```bash
docker-compose up -d supabase
# Or: supabase start (if using Supabase CLI)
```

*If OLLAMA is local:*
```bash
# Install OLLAMA from https://ollama.ai
ollama pull nomic-embed-text
ollama pull mistral:7b
ollama pull gpt-oss:120b

# Verify
ollama list
```

**3. Start application:**
```bash
# Backend (FastAPI)
cd backend
pip install -r requirements.txt
uvicorn main:app --reload  # Port 8000

# Frontend (Astro) - in separate terminal
npm install
npm run dev  # Port 4321
```

**4. Test connectivity:**
```bash
# Test Supabase
curl ${SUPABASE_URL}/health

# Test OLLAMA
curl ${OLLAMA_HOST}/api/version

# Test Backend
curl http://localhost:8000/health

# Open Frontend
# http://localhost:4321
```

### Network Troubleshooting

If services cannot connect to each other:

1. **Firewall rules** (for distributed deployment):
   - Allow TCP traffic on required ports (8444, 11434, 8000)
   - Example: `sudo ufw allow 8444/tcp`

2. **Service binding addresses**:
   - Services must bind to `0.0.0.0` (not `127.0.0.1`) for remote access
   - Check: `netstat -tlnp | grep <port>`

3. **Docker network** (if using Docker):
   - Ensure containers expose ports to host: `docker ps`
   - Check port mappings: `-p 8444:8444`

4. **DNS/Hostname resolution**:
   - Use IP addresses if hostname doesn't resolve
   - Test: `ping your-server-hostname`

### Production Deployment Checklist

Before deploying to production:

- [ ] Set `DEBUG=false` in `.env`
- [ ] Use HTTPS URLs (not HTTP) for all external services
- [ ] Rotate all secrets (SUPABASE_SERVICE_KEY, JWT_SECRET)
- [ ] Enable rate limiting on FastAPI
- [ ] Configure CORS for production domains
- [ ] Set up monitoring and logging
- [ ] Configure backups for Supabase
- [ ] Test failover scenarios
- [ ] Use environment-specific `.env` files (`.env.production`)

### Example Production Setup

```bash
# Frontend: Vercel
vercel deploy

# Backend: DigitalOcean App Platform or Docker
docker build -t prawnikgpt-backend .
docker push registry.digitalocean.com/prawnikgpt-backend

# Supabase: Cloud or self-hosted
# - Cloud: Use https://app.supabase.com
# - Self-hosted: Deploy Docker Compose on VPS

# OLLAMA: Dedicated GPU server (AWS g5.xlarge, vast.ai)
# - Install OLLAMA
# - Pull required models
# - Configure reverse proxy (nginx) with HTTPS
```
