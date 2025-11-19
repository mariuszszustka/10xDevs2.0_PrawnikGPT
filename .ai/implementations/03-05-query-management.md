# Query Management Endpoints

Grupa endpointów zarządzających historią zapytań użytkownika.

---

# 3. GET /api/v1/queries - List User Queries

**Endpoint:** `GET /api/v1/queries`  
**Autentykacja:** Wymagana  
**Złożoność:** Średnia  
**Czas:** 3-4 godziny

## Przegląd

Historia zapytań użytkownika z paginacją i ocenami.

## Request

**Params:**
- `page` (default=1)
- `per_page` (default=20, max=100)
- `order` (desc/asc, default=desc)

## Response (200 OK)

```json
{
  "queries": [
    {
      "query_id": "uuid",
      "query_text": "...",
      "created_at": "...",
      "fast_response": {
        "content": "...",
        "model_name": "mistral:7b",
        "generation_time_ms": 8500,
        "sources_count": 3,
        "rating": {"value": "up"}
      },
      "accurate_response": {
        "exists": true,
        "model_name": "gpt-oss:120b",
        "rating": null
      }
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total_pages": 3,
    "total_count": 45
  }
}
```

## Implementacja

### Database Query
```python
# Single query with JOINs (avoid N+1)
# Use window function for COUNT
# RLS enforced (user_id = auth.uid())
```

### RPC Function
```sql
CREATE OR REPLACE FUNCTION list_user_queries(
    p_user_id uuid,
    p_limit int,
    p_offset int,
    p_order text
) RETURNS TABLE (...);
```

### Indexes
```sql
CREATE INDEX idx_query_history_user_id_created_at 
    ON query_history(user_id, created_at DESC);
```

## Checklist
- [ ] Extend Pydantic models (QueryListItem, PaginationMetadata)
- [ ] Implement RPC function
- [ ] Implement repository method
- [ ] Implement router endpoint
- [ ] Add indexes
- [ ] Write tests

---

# 4. GET /api/v1/queries/{query_id} - Get Query Details

**Endpoint:** `GET /api/v1/queries/{query_id}`  
**Autentykacja:** Wymagana  
**Złożoność:** Niska  
**Czas:** 1-2 godziny

## Przegląd

Szczegóły pojedynczego zapytania z pełnymi odpowiedziami.

## Request

**Path Params:** `query_id` (UUID)

## Response (200 OK)

```json
{
  "query_id": "uuid",
  "query_text": "...",
  "status": "completed",
  "created_at": "...",
  "fast_response": {
    "content": "...",
    "model_name": "mistral:7b",
    "generation_time_ms": 8500,
    "sources": [...],
    "rating": {...}
  },
  "accurate_response": {...} or null
}
```

## Error Responses
- 401 Unauthorized
- 403 Forbidden - Not owner
- 404 Not Found

## Implementacja

### Simple SELECT with RLS
```python
async def get_query(query_id: UUID, user_id: str) -> Dict:
    result = await supabase.table("query_history") \
        .select("*, ratings(*)") \
        .eq("id", query_id) \
        .eq("user_id", user_id) \
        .single() \
        .execute()
    
    if not result.data:
        raise HTTPException(404, "Query not found")
    
    return result.data
```

## Checklist
- [ ] Pydantic model (QueryDetailResponse)
- [ ] Repository method
- [ ] Router endpoint
- [ ] Tests

---

# 5. DELETE /api/v1/queries/{query_id} - Delete Query

**Endpoint:** `DELETE /api/v1/queries/{query_id}`  
**Autentykacja:** Wymagana  
**Złożoność:** Bardzo niska  
**Czas:** 1 godzina

## Przegląd

Usuwa zapytanie z historii. Kaskadowo usuwa ratings (ON DELETE CASCADE).

## Request

**Path Params:** `query_id` (UUID)

## Response (204 No Content)

Brak body.

## Error Responses
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found

## Implementacja

```python
@router.delete("/{query_id}", status_code=204)
async def delete_query(
    query_id: UUID,
    user_id: str = Depends(get_current_user),
    repo: QueryRepository = Depends(get_query_repo)
):
    # Verify ownership (RLS will handle it)
    exists = await repo.query_exists(query_id, user_id)
    if not exists:
        raise HTTPException(404, "Query not found")
    
    # Delete (cascade to ratings handled by DB)
    await repo.delete_query(query_id)
    
    return Response(status_code=204)
```

## Checklist
- [ ] Repository method (delete_query)
- [ ] Router endpoint
- [ ] Tests (including cascade check)

---

**Powrót do:** [Index](../api-implementation-index.md)

