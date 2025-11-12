# RAG Implementation Plan – PrawnikGPT

## 1. Overview (Przegląd)

System RAG (Retrieval-Augmented Generation) dla PrawnikGPT składa się z dwóch głównych faz:
1. **Data Ingestion (Ingecja danych):** Jednorazowe pobranie, przetworzenie i zaindeksowanie 20k aktów prawnych
2. **Query Pipeline (Pipeline zapytań):** Runtime retrieval + generation dla zapytań użytkowników

**Tech Stack:**
- **Embeddings:** nomic-embed-text (137M params, 768-dim) via OLLAMA
- **Vector Store:** Supabase pgvector (PostgreSQL extension)
- **Chunking:** LangChain RecursiveCharacterTextSplitter
- **LLM:** OLLAMA (fast: mistral:7b, detailed: gpt-oss:120b)
- **Orchestration:** LangChain LCEL (LangChain Expression Language)

---

## 2. Phase 1: Data Ingestion Pipeline

### 2.1. Wysokopoziomowy przepływ

```
ISAP API
   ↓ (Crawl4AI)
Raw Act Data (JSON/HTML)
   ↓ (Parse & Clean)
Structured Act + Text Content
   ↓ (Chunking Strategy)
Text Chunks (per article/paragraph)
   ↓ (Embedding Generation via OLLAMA)
Chunks + Embeddings (768-dim vectors)
   ↓ (Store in Supabase)
legal_acts + legal_act_chunks + legal_act_relations tables
```

### 2.2. Step 1: Fetch Act List from ISAP API

**Endpoint:** `GET https://api.sejm.gov.pl/eli/acts`

**Query Parameters:**
- `publisher`: `dz-u` (Dziennik Ustaw)
- `year`: 2020-2025 (iterate to get ~20k acts)
- `limit`: 100 (max per page)
- `offset`: 0, 100, 200, ... (pagination)

**Response Schema:**
```json
{
  "items": [
    {
      "publisher": "dz-u",
      "year": 2023,
      "position": 1234,
      "title": "Ustawa o prawach konsumenta",
      "issuingBody": "Sejm RP",
      "announcementDate": "2023-06-15",
      "entryIntoForceDate": "2023-07-01"
    }
  ],
  "count": 20000,
  "limit": 100,
  "offset": 0
}
```

**Implementation (Python):**
```python
import requests
from typing import List, Dict

def fetch_act_list(publisher="dz-u", start_year=2020, end_year=2025) -> List[Dict]:
    acts = []
    for year in range(start_year, end_year + 1):
        offset = 0
        while True:
            url = f"https://api.sejm.gov.pl/eli/acts?publisher={publisher}&year={year}&limit=100&offset={offset}"
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            data = response.json()
            acts.extend(data["items"])
            if len(data["items"]) < 100:  # Last page
                break
            offset += 100
            time.sleep(0.5)  # Rate limiting
    return acts[:20000]  # Limit to 20k for MVP
```

---

### 2.3. Step 2: Fetch Full Act Details + Content

**Endpoint:** `GET https://api.sejm.gov.pl/eli/acts/{publisher}/{year}/{position}`

**Response Schema:**
```json
{
  "publisher": "dz-u",
  "year": 2023,
  "position": 1234,
  "title": "Ustawa o prawach konsumenta",
  "type": "ustawa",
  "status": "obowiązująca",
  "text": {
    "html": "https://api.sejm.gov.pl/eli/acts/dz-u/2023/1234/text.html",
    "pdf": "https://api.sejm.gov.pl/eli/acts/dz-u/2023/1234/text.pdf"
  }
}
```

**Implementation:**
```python
def fetch_act_details(publisher, year, position) -> Dict:
    url = f"https://api.sejm.gov.pl/eli/acts/{publisher}/{year}/{position}"
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    return response.json()

def fetch_act_content(text_url: str) -> str:
    """Prefer HTML, fallback to PDF parsing"""
    if text_url.endswith(".html"):
        response = requests.get(text_url, timeout=30)
        response.raise_for_status()
        return parse_html_content(response.text)
    elif text_url.endswith(".pdf"):
        response = requests.get(text_url, timeout=30)
        return parse_pdf_content(response.content)
    else:
        raise ValueError(f"Unknown content type: {text_url}")

def parse_html_content(html: str) -> str:
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, "html.parser")
    # Extract text from <div class="act-content"> or similar
    content = soup.find("div", class_="act-content")
    return content.get_text(separator="\n") if content else ""
```

---

### 2.4. Step 3: Fetch Act Relations

**Endpoint:** `GET https://api.sejm.gov.pl/eli/acts/{publisher}/{year}/{position}/references`

**Response Schema:**
```json
{
  "references": [
    {
      "type": "modifies",
      "target": {
        "publisher": "dz-u",
        "year": 2020,
        "position": 567,
        "title": "Kodeks cywilny"
      }
    },
    {
      "type": "repeals",
      "target": { ... }
    }
  ]
}
```

**Implementation:**
```python
def fetch_act_relations(publisher, year, position) -> List[Dict]:
    url = f"https://api.sejm.gov.pl/eli/acts/{publisher}/{year}/{position}/references"
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    return response.json().get("references", [])
```

---

### 2.5. Step 4: Text Chunking Strategy

**Goal:** Split act content into logical chunks (per article/paragraph) for semantic search.

**Strategy:**
- **Primary:** Split by article (`Art. 1`, `Art. 2`, etc.)
- **Secondary:** If article >2000 chars, split by paragraph (keep article context)
- **Chunk size:** 500-1500 characters (optimal for embeddings)
- **Overlap:** 100 characters (preserve context at boundaries)

**Implementation (LangChain):**
```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

def chunk_act_content(content: str, act_id: int) -> List[Dict]:
    # Step 1: Split by articles using regex
    import re
    articles = re.split(r'(Art\.\s+\d+[a-z]?\s*\.)', content)

    chunks = []
    chunk_index = 0

    for i in range(1, len(articles), 2):  # Pairs of (article header, article content)
        article_number = articles[i].strip()
        article_content = articles[i+1].strip()
        full_article = f"{article_number}\n{article_content}"

        # If article too long, split further
        if len(full_article) > 2000:
            splitter = RecursiveCharacterTextSplitter(
                chunk_size=1500,
                chunk_overlap=100,
                separators=["\n\n", "\n", ". ", " ", ""]
            )
            sub_chunks = splitter.split_text(full_article)
            for sub_chunk in sub_chunks:
                chunks.append({
                    "legal_act_id": act_id,
                    "chunk_index": chunk_index,
                    "article_number": article_number,
                    "content": sub_chunk
                })
                chunk_index += 1
        else:
            chunks.append({
                "legal_act_id": act_id,
                "chunk_index": chunk_index,
                "article_number": article_number,
                "content": full_article
            })
            chunk_index += 1

    return chunks
```

---

### 2.6. Step 5: Embedding Generation (OLLAMA)

**Model:** nomic-embed-text (137M params, 768-dim, optimized for retrieval)

**OLLAMA Endpoint:** `POST ${OLLAMA_HOST}/api/embeddings`
(Default: `http://192.168.0.11:11434` - configured in .env)

**Request:**
```json
{
  "model": "nomic-embed-text",
  "prompt": "Art. 5 ust. 1. Konsument ma prawo do..."
}
```

**Response:**
```json
{
  "embedding": [0.123, -0.456, 0.789, ..., 0.321]  // 768 floats
}
```

**Implementation:**
```python
import requests
import numpy as np
import os

# Get OLLAMA host from environment variable
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://192.168.0.11:11434")

def generate_embedding(text: str, model="nomic-embed-text") -> np.ndarray:
    url = f"{OLLAMA_HOST}/api/embeddings"
    payload = {"model": model, "prompt": text}
    response = requests.post(url, json=payload, timeout=60)
    response.raise_for_status()
    return np.array(response.json()["embedding"], dtype=np.float32)

def generate_embeddings_batch(texts: List[str], batch_size=32) -> List[np.ndarray]:
    """Batch processing for efficiency"""
    embeddings = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i+batch_size]
        for text in batch:
            emb = generate_embedding(text)
            embeddings.append(emb)
            time.sleep(0.1)  # Rate limiting
    return embeddings
```

**Performance:**
- Speed: ~50 embeddings/sec on CPU, ~500/sec on GPU
- For 500k chunks: ~3 hours on CPU, ~20 min on GPU

---

### 2.7. Step 6: Store in Supabase

**Tables:**
1. `legal_acts` - metadata
2. `legal_act_chunks` - chunks + embeddings
3. `legal_act_relations` - graph relations

**Implementation (Supabase Python Client):**
```python
from supabase import create_client, Client

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def store_act(act_data: Dict) -> int:
    """Insert into legal_acts table, return act_id"""
    result = supabase.table("legal_acts").insert({
        "publisher": act_data["publisher"],
        "year": act_data["year"],
        "position": act_data["position"],
        "title": act_data["title"],
        "type": act_data["type"],
        "status": act_data["status"],
        "issuing_body": act_data.get("issuingBody"),
        "published_date": act_data["announcementDate"],
        "effective_date": act_data.get("entryIntoForceDate")
    }).execute()
    return result.data[0]["id"]

def store_chunks(chunks: List[Dict]):
    """Batch insert into legal_act_chunks table"""
    supabase.table("legal_act_chunks").insert(chunks).execute()

def store_relations(relations: List[Dict]):
    """Insert into legal_act_relations table"""
    supabase.table("legal_act_relations").insert(relations).execute()
```

---

### 2.8. Step 7: Orchestration Script (Crawl4AI)

**Main Pipeline:**
```python
from crawl4ai import AsyncWebCrawler
import asyncio

async def ingest_acts():
    # Step 1: Fetch list
    acts = fetch_act_list(start_year=2020, end_year=2025)
    print(f"Fetched {len(acts)} acts")

    for act in acts[:20000]:  # Limit to 20k
        try:
            # Step 2: Fetch details
            details = fetch_act_details(act["publisher"], act["year"], act["position"])

            # Store metadata
            act_id = store_act(details)

            # Step 3: Fetch content
            content = fetch_act_content(details["text"]["html"])

            # Step 4: Chunk
            chunks_data = chunk_act_content(content, act_id)

            # Step 5: Generate embeddings
            texts = [c["content"] for c in chunks_data]
            embeddings = generate_embeddings_batch(texts)

            # Combine chunks + embeddings
            for chunk, emb in zip(chunks_data, embeddings):
                chunk["embedding"] = emb.tolist()

            # Step 6: Store chunks
            store_chunks(chunks_data)

            # Step 7: Fetch relations
            relations = fetch_act_relations(act["publisher"], act["year"], act["position"])
            if relations:
                store_relations([{
                    "source_act_id": act_id,
                    "target_act_id": resolve_act_id(r["target"]),  # Helper to find target ID
                    "relation_type": r["type"]
                } for r in relations])

            print(f"✓ Processed: {act['title']}")

        except Exception as e:
            print(f"✗ Error processing {act['title']}: {e}")
            continue

if __name__ == "__main__":
    asyncio.run(ingest_acts())
```

---

## 3. Phase 2: Query Pipeline (Runtime RAG)

### 3.1. Wysokopoziomowy przepływ

```
User Question (Polish text)
   ↓ (Generate embedding via OLLAMA)
Query Embedding (768-dim vector)
   ↓ (Similarity search in pgvector)
Top K relevant chunks (K=10)
   ↓ (Fetch metadata + relations)
Enriched Context (chunks + act metadata + relations)
   ↓ (Construct prompt)
LLM Prompt (context + question)
   ↓ (Generate answer via OLLAMA)
Fast Response (mistral:7b, <15s)
   ↓ (Optional: detailed response)
Detailed Response (gpt-oss:120b, <240s)
```

### 3.2. Step 1: Generate Query Embedding

**Same as ingestion:**
```python
def embed_query(question: str) -> np.ndarray:
    return generate_embedding(question, model="nomic-embed-text")
```

---

### 3.3. Step 2: Similarity Search (pgvector)

**SQL Query:**
```sql
SELECT
  lac.id,
  lac.content,
  lac.article_number,
  la.id AS act_id,
  la.title AS act_title,
  la.publisher,
  la.year,
  la.position,
  la.type,
  (lac.embedding <=> $1::vector) AS distance
FROM legal_act_chunks lac
JOIN legal_acts la ON la.id = lac.legal_act_id
WHERE la.status = 'obowiązująca'
ORDER BY lac.embedding <=> $1::vector
LIMIT 10;
```

**Implementation:**
```python
def semantic_search(query_embedding: np.ndarray, top_k=10) -> List[Dict]:
    from supabase import create_client
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Convert numpy array to list for JSON serialization
    emb_list = query_embedding.tolist()

    # Use Supabase RPC for pgvector query
    result = supabase.rpc("semantic_search_chunks", {
        "query_embedding": emb_list,
        "match_count": top_k
    }).execute()

    return result.data

# Note: Create RPC function in Supabase:
# CREATE FUNCTION semantic_search_chunks(query_embedding vector(768), match_count int)
# RETURNS TABLE(...) AS $$
#   SELECT ... ORDER BY embedding <=> query_embedding LIMIT match_count;
# $$ LANGUAGE sql;
```

**Threshold:** If best match distance > 0.5 (low similarity), return "out of scope" message.

---

### 3.4. Step 3: Fetch Related Acts (Graph Traversal)

**Query:** Breadth-first search, max depth 2

```python
def fetch_related_acts(act_ids: List[int], max_depth=2) -> List[Dict]:
    """Recursive query for related acts"""
    query = """
    WITH RECURSIVE act_tree AS (
      SELECT source_act_id, target_act_id, relation_type, 1 AS depth
      FROM legal_act_relations
      WHERE source_act_id = ANY($1)

      UNION

      SELECT lar.source_act_id, lar.target_act_id, lar.relation_type, at.depth + 1
      FROM legal_act_relations lar
      JOIN act_tree at ON lar.source_act_id = at.target_act_id
      WHERE at.depth < $2
    )
    SELECT DISTINCT
      la.id, la.title, la.publisher, la.year, la.position,
      at.relation_type, at.depth
    FROM act_tree at
    JOIN legal_acts la ON la.id = at.target_act_id;
    """
    result = supabase.rpc("fetch_related_acts", {
        "act_ids": act_ids,
        "max_depth": max_depth
    }).execute()
    return result.data
```

---

### 3.5. Step 4: Construct Prompt

**Prompt Template:**
```python
PROMPT_TEMPLATE = """Jesteś asystentem prawnym specjalizującym się w polskim prawie.

Kontekst prawny (fragmenty ustaw):
{context}

Powiązane akty prawne:
{related_acts}

Pytanie użytkownika:
{question}

Odpowiedz na pytanie w języku polskim, bazując wyłącznie na podanym kontekście.
Jeśli kontekst nie zawiera informacji potrzebnych do odpowiedzi, wyraźnie to zaznacz.

Na końcu odpowiedzi wymień źródła w formacie:
Źródła:
- [Tytuł aktu, Art. X]
- [Tytuł aktu, Art. Y]
"""

def construct_prompt(question: str, chunks: List[Dict], related_acts: List[Dict]) -> str:
    # Format context
    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        context_parts.append(
            f"[{i}] {chunk['act_title']} ({chunk['year']}), {chunk['article_number']}\n"
            f"{chunk['content']}\n"
        )
    context = "\n".join(context_parts)

    # Format related acts
    related_parts = []
    for act in related_acts:
        related_parts.append(
            f"- {act['title']} ({act['year']}) - {act['relation_type']}"
        )
    related = "\n".join(related_parts) if related_parts else "Brak powiązanych aktów."

    return PROMPT_TEMPLATE.format(
        context=context,
        related_acts=related,
        question=question
    )
```

---

### 3.6. Step 5: Generate Response (LLM via OLLAMA)

**OLLAMA Endpoint:** `POST http://localhost:11434/api/generate`

**Request:**
```json
{
  "model": "mistral:7b",
  "prompt": "Jesteś asystentem prawnym...",
  "stream": false,
  "options": {
    "temperature": 0.3,
    "top_p": 0.9,
    "max_tokens": 1024
  }
}
```

**Implementation:**
```python
def generate_llm_response(prompt: str, model="mistral:7b", timeout=15) -> str:
    url = "http://localhost:11434/api/generate"
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.3 if "7b" in model else 0.5,  # Lower temp for fast model
            "top_p": 0.9,
            "max_tokens": 1024
        }
    }
    response = requests.post(url, json=payload, timeout=timeout)
    response.raise_for_status()
    return response.json()["response"]

def generate_fast_response(question: str, chunks: List[Dict], related_acts: List[Dict]) -> Dict:
    prompt = construct_prompt(question, chunks, related_acts)
    import time
    start = time.time()
    content = generate_llm_response(prompt, model="mistral:7b", timeout=15)
    duration = int((time.time() - start) * 1000)  # ms

    sources = extract_sources(content, chunks)  # Parse sources from response

    return {
        "content": content,
        "sources": sources,
        "model_name": "mistral:7b",
        "generation_time_ms": duration
    }

def generate_detailed_response(question: str, chunks: List[Dict], related_acts: List[Dict]) -> Dict:
    prompt = construct_prompt(question, chunks, related_acts)
    import time
    start = time.time()
    content = generate_llm_response(prompt, model="gpt-oss:120b", timeout=240)
    duration = int((time.time() - start) * 1000)

    sources = extract_sources(content, chunks)

    return {
        "content": content,
        "sources": sources,
        "model_name": "gpt-oss:120b",
        "generation_time_ms": duration
    }
```

---

### 3.7. Step 6: Parse Sources from Response

**Strategy:** Extract `[Tytuł aktu, Art. X]` from response using regex

```python
import re

def extract_sources(response_text: str, chunks: List[Dict]) -> List[Dict]:
    """Extract sources mentioned in LLM response"""
    # Regex to match: [Title, Art. X]
    pattern = r'\[(.*?),\s*(Art\.\s*\d+[a-z]?(?:\s+ust\.\s+\d+)?)\]'
    matches = re.findall(pattern, response_text, re.IGNORECASE)

    sources = []
    for title, article in matches:
        # Find matching act in chunks
        matching_chunks = [c for c in chunks if title.lower() in c['act_title'].lower()]
        if matching_chunks:
            chunk = matching_chunks[0]
            sources.append({
                "act_title": chunk['act_title'],
                "article": article,
                "link": f"/acts/{chunk['publisher']}/{chunk['year']}/{chunk['position']}#{article.replace(' ', '-').lower()}"
            })

    return sources
```

---

### 3.8. Step 7: Cache Context (5 minutes TTL)

**Purpose:** Reuse context when user requests detailed response (avoid re-running retrieval)

**Implementation (Redis):**
```python
import redis
import json

redis_client = redis.Redis(host='localhost', port=6379, db=0)

def cache_rag_context(query_id: int, chunks: List[Dict], related_acts: List[Dict]):
    key = f"rag_context:{query_id}"
    value = json.dumps({"chunks": chunks, "related_acts": related_acts})
    redis_client.setex(key, 300, value)  # 5 minutes TTL

def get_cached_context(query_id: int) -> Optional[Dict]:
    key = f"rag_context:{query_id}"
    value = redis_client.get(key)
    if value:
        return json.loads(value)
    return None
```

---

## 4. Full Query Pipeline Integration (FastAPI Endpoint)

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

class QueryRequest(BaseModel):
    question: str

@app.post("/queries")
async def create_query(req: QueryRequest, user_id: str):  # user_id from JWT
    # Validate
    if not (10 <= len(req.question) <= 1000):
        raise HTTPException(400, "Question must be 10-1000 characters")

    # Step 1: Embed question
    query_embedding = embed_query(req.question)

    # Step 2: Similarity search
    chunks = semantic_search(query_embedding, top_k=10)

    # Check threshold
    if not chunks or chunks[0]["distance"] > 0.5:
        raise HTTPException(404, "Moja baza wiedzy jest ograniczona...")

    # Step 3: Fetch related acts
    act_ids = list(set(c["act_id"] for c in chunks))
    related_acts = fetch_related_acts(act_ids, max_depth=2)

    # Step 4: Generate fast response
    response_data = generate_fast_response(req.question, chunks, related_acts)

    # Step 5: Store in database
    query_id = store_query(user_id, req.question)
    response_id = store_response(query_id, "fast", response_data)

    # Step 6: Cache context
    cache_rag_context(query_id, chunks, related_acts)

    return {
        "query_id": query_id,
        "question": req.question,
        "response": {
            "id": response_id,
            "response_type": "fast",
            **response_data
        }
    }

@app.post("/queries/{query_id}/detailed-response")
async def create_detailed_response(query_id: int, user_id: str):
    # Step 1: Get cached context (or regenerate)
    cached = get_cached_context(query_id)
    if not cached:
        # Regenerate context (fetch query, re-run retrieval)
        raise HTTPException(410, "Context expired, please retry query")

    chunks = cached["chunks"]
    related_acts = cached["related_acts"]
    question = get_query_question(query_id)  # Helper to fetch from DB

    # Step 2: Generate detailed response
    response_data = generate_detailed_response(question, chunks, related_acts)

    # Step 3: Store in database
    response_id = store_response(query_id, "detailed", response_data)

    return {
        "response": {
            "id": response_id,
            "response_type": "detailed",
            **response_data
        }
    }
```

---

## 5. Performance Optimizations

### 5.1. Embedding Generation
- Batch processing (32 chunks at once)
- GPU acceleration (CUDA for OLLAMA)
- Model quantization (FP16 instead of FP32)

### 5.2. Vector Search
- Use IVFFlat index (lists=100) for 500k chunks
- Upgrade to HNSW index if query latency >100ms
- Pre-filter by `status='obowiązująca'` before similarity search

### 5.3. LLM Generation
- Use smaller context window for fast model (max 4k tokens)
- Streaming response for better perceived performance
- Model caching: keep models loaded in OLLAMA

### 5.4. Caching
- Redis for RAG context (5 min TTL)
- Cache embeddings for common questions (optional)
- Cache act metadata (1 hour TTL)

---

## 6. Error Handling

### 6.1. Ingestion Errors
- **ISAP API timeout:** Retry 3x with exponential backoff
- **HTML parsing failure:** Fallback to PDF, log error
- **Embedding generation failure:** Skip chunk, log error
- **Database insert failure:** Rollback transaction, retry

### 6.2. Query Errors
- **No relevant chunks found (distance >0.5):** Return 404 with friendly message
- **OLLAMA timeout (<15s fast, <240s detailed):** Return 408 with retry option
- **Context cache miss:** Return 410, ask user to retry query
- **LLM generation error:** Return 500, log to Sentry

---

## 7. Monitoring & Analytics

### 7.1. Metrics to Track
- **Ingestion:**
  - Acts processed per hour
  - Embedding generation time per chunk
  - Database insert time per batch
  - Error rate (% of failed acts)

- **Query Pipeline:**
  - Similarity search latency (p50, p95, p99)
  - Fast response latency (<15s target)
  - Detailed response latency (<240s target)
  - Cache hit rate (RAG context)
  - Top K accuracy (user ratings as proxy)

### 7.2. Logging
- Log all queries + responses (for analytics)
- Log errors with full stack trace (Sentry)
- Log slow queries (>5s for similarity search)
- Don't log sensitive data (user emails, passwords)

---

## 8. Future Enhancements (Post-MVP)

### 8.1. Hybrid Search
- Combine semantic search (pgvector) with keyword search (PostgreSQL FTS)
- Re-rank results using cross-encoder model

### 8.2. Query Expansion
- Use LLM to generate multiple phrasings of user question
- Search with all variations, deduplicate results

### 8.3. Conversational Memory
- Store previous 3 Q&A pairs in context window
- Allow follow-up questions without repeating context

### 8.4. Fine-tuned Embeddings
- Fine-tune nomic-embed-text on Polish legal corpus
- Improve retrieval accuracy for domain-specific terms

### 8.5. Streaming Responses
- Use OLLAMA streaming API (`"stream": true`)
- Send tokens to frontend as they're generated (SSE or WebSocket)

### 8.6. Multi-hop Reasoning
- For complex questions, chain multiple retrieval + generation steps
- Use LangChain ReAct agent pattern

---

## 9. Testing Strategy

### 9.1. Unit Tests
- Test chunking logic (various article formats)
- Test embedding generation (mock OLLAMA)
- Test similarity search (mock pgvector)
- Test prompt construction
- Test source parsing (regex)

### 9.2. Integration Tests
- End-to-end RAG pipeline (real database + OLLAMA)
- Test with sample acts (10 acts, 100 chunks)
- Verify response quality (manual evaluation)

### 9.3. Load Tests
- Simulate 100 concurrent queries (locust.io)
- Measure p95 latency under load
- Identify bottlenecks (OLLAMA, database, network)

---

## 10. Deployment Checklist

### 10.1. Prerequisites

**On Linux Server (192.168.0.11):**
- [ ] Supabase running in Docker on port 8444
  - pgvector extension enabled: `CREATE EXTENSION vector;`
  - Tables created (legal_acts, legal_act_chunks, legal_act_relations)
  - Indexes created (IVFFlat on embeddings)
  - RLS policies enabled
- [ ] OLLAMA installed natively with models pulled:
  ```bash
  ollama pull nomic-embed-text   # For embeddings (768-dim)
  ollama pull mistral:7b          # For fast responses
  ollama pull gpt-oss:120b        # For detailed responses
  ```
- [ ] Firewall ports open: 8444 (Supabase), 11434 (OLLAMA)

**On Windows PC (localhost):**
- [ ] .env file configured with remote server addresses:
  ```bash
  SUPABASE_URL=http://192.168.0.11:8444
  OLLAMA_HOST=http://192.168.0.11:11434
  ```
- [ ] Redis server for caching (optional, can run locally or on Linux server)

### 10.2. Ingestion
- [ ] Run ingestion script (estimated 6-12 hours)
- [ ] Verify 20k acts in `legal_acts` table
- [ ] Verify ~500k chunks in `legal_act_chunks` table
- [ ] Test similarity search with sample query

### 10.3. Backend
- [ ] Deploy FastAPI application
- [ ] Configure environment variables (SUPABASE_URL, OLLAMA_HOST, REDIS_URL)
- [ ] Test /queries endpoint with sample questions
- [ ] Monitor logs for errors

### 10.4. Frontend
- [ ] Deploy Astro application
- [ ] Configure API endpoint URL
- [ ] Test end-to-end flow (register → login → ask question)
