# 6. POST /api/v1/queries/{query_id}/accurate-response

**Endpoint:** `POST /api/v1/queries/{query_id}/accurate-response`  
**Typ:** Accurate Response Generation  
**Autentykacja:** Wymagana  
**Złożoność:** Wysoka  
**Czas:** 1-2 dni

---

## Przegląd

Generuje dokładną odpowiedź przy użyciu większego modelu (gpt-oss:120b). 

**Kluczowe:** Wykorzystuje cached RAG context (ważny 5 min po initial query).

---

## Request

**Method:** POST  
**Path Params:** `query_id` (UUID)  
**Body:** Empty

---

## Response

### 202 Accepted (Immediate)
```json
{
  "query_id": "uuid",
  "accurate_response": {
    "status": "processing",
    "estimated_time_seconds": 180
  }
}
```

### After Completion
```json
{
  "query_id": "uuid",
  "accurate_response": {
    "status": "completed",
    "content": "Szczegółowa odpowiedź...",
    "model_name": "gpt-oss:120b",
    "generation_time_ms": 120000,
    "sources": [...]
  }
}
```

---

## Error Responses

- **409 Conflict** - Accurate response already exists
- **410 Gone** - RAG context expired (>5 min)
- **504 Gateway Timeout** - Generation exceeded 240s

---

## Implementacja

### Preconditions Check
```python
# 1. Check if accurate response exists
if query.accurate_response_content:
    raise HTTPException(409, "Accurate response already exists")

# 2. Retrieve cached RAG context
context = await redis.get(f"rag_context:{query_id}")
if not context:
    raise HTTPException(410, "RAG context expired. Please resubmit query.")
```

### Generation
```python
# 3. Generate with larger model (timeout 240s)
try:
    response = await llm_service.generate(
        prompt=context["prompt"],
        model="gpt-oss:120b",
        timeout=240.0,
        temperature=0.2  # Lower for accuracy
    )
except asyncio.TimeoutError:
    raise OLLAMATimeoutError("gpt-oss:120b", 240)

# 4. Update database
await query_repo.update_accurate_response(
    query_id=query_id,
    content=response["text"],
    sources=context["sources"],
    generation_time_ms=response["generation_time"]
)
```

---

## Wydajność

**Cele:**
- Timeout: 240s (4 minuty)
- Cache hit: 100% (context musi istnieć)
- Response quality: Wyższa niż fast response

**Optymalizacje:**
- Używanie cached context (no re-search)
- Streaming response (future enhancement)
- Queue for multiple requests

---

## Checklist

- [ ] Pydantic models (AccurateResponseSubmitResponse, etc.)
- [ ] Cache retrieval logic
- [ ] Preconditions checks (409, 410)
- [ ] LLM generation with longer timeout
- [ ] Database update
- [ ] Router endpoint
- [ ] Tests (including timeout scenarios)

---

**Powrót do:** [Index](../api-implementation-index.md)

