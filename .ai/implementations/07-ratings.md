# Rating System Endpoints

Grupa endpointów zarządzających oceną odpowiedzi (thumbs up/down).

---

# 7. POST /api/v1/queries/{query_id}/ratings - Create/Update Rating

**Endpoint:** `POST /api/v1/queries/{query_id}/ratings`  
**Autentykacja:** Wymagana  
**Złożoność:** Średnia  
**Czas:** 2-3 godziny

## Przegląd

Idempotentny endpoint - tworzy nową ocenę lub aktualizuje istniejącą.

---

## Request

**Method:** POST  
**Path Params:** `query_id` (UUID)

**Body:**
```json
{
  "response_type": "fast" | "accurate",
  "rating_value": "up" | "down"
}
```

**Validation:**
- `response_type`: enum ['fast', 'accurate']
- `rating_value`: enum ['up', 'down']

---

## Response

### 201 Created (New Rating)
```json
{
  "rating_id": "uuid",
  "query_id": "uuid",
  "response_type": "fast",
  "rating_value": "up",
  "created_at": "...",
  "updated_at": "..."
}
```

### 200 OK (Updated)
Same format as 201.

---

## Implementacja (Upsert Logic)

```python
@router.post("/{query_id}/ratings")
async def create_or_update_rating(
    query_id: UUID,
    request: RatingCreateRequest,
    user_id: str = Depends(get_current_user),
    repo: RatingRepository = Depends(get_rating_repo)
):
    # 1. Check if rating exists
    existing = await repo.find_rating(
        query_id=query_id,
        user_id=user_id,
        response_type=request.response_type
    )
    
    if existing:
        # UPDATE
        rating = await repo.update_rating(
            rating_id=existing.id,
            rating_value=request.rating_value
        )
        status_code = 200
    else:
        # INSERT
        rating = await repo.create_rating(
            query_id=query_id,
            user_id=user_id,
            response_type=request.response_type,
            rating_value=request.rating_value
        )
        status_code = 201
    
    return Response(
        status_code=status_code,
        content=rating.model_dump_json()
    )
```

---

## Database

### Unique Constraint
```sql
-- Allow only one rating per (query, user, response_type)
CREATE UNIQUE INDEX idx_ratings_unique
    ON ratings(query_history_id, user_id, response_type);
```

### Updated_at Trigger
```sql
CREATE TRIGGER update_ratings_updated_at
    BEFORE UPDATE ON ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## Checklist

- [ ] Pydantic models (RatingCreateRequest, RatingResponse)
- [ ] Repository methods (find_rating, create_rating, update_rating)
- [ ] Unique index on (query_id, user_id, response_type)
- [ ] Updated_at trigger
- [ ] Router endpoint
- [ ] Tests (create + update scenarios)

---

# 8. GET /api/v1/queries/{query_id}/ratings - Get Ratings

**Endpoint:** `GET /api/v1/queries/{query_id}/ratings`  
**Autentykacja:** Wymagana  
**Złożoność:** Niska  
**Czas:** 1 godzina

## Przegląd

Zwraca wszystkie oceny dla zapytania (fast + accurate).

---

## Response (200 OK)

```json
{
  "query_id": "uuid",
  "ratings": [
    {
      "rating_id": "uuid",
      "response_type": "fast",
      "rating_value": "up",
      "created_at": "...",
      "updated_at": "..."
    },
    {
      "rating_id": "uuid",
      "response_type": "accurate",
      "rating_value": "up",
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

---

## Implementacja

```python
@router.get("/{query_id}/ratings")
async def get_ratings(
    query_id: UUID,
    user_id: str = Depends(get_current_user),
    repo: RatingRepository = Depends(get_rating_repo)
):
    # Verify query ownership
    query = await query_repo.get_query(query_id, user_id)
    if not query:
        raise HTTPException(404, "Query not found")
    
    # Get all ratings
    ratings = await repo.get_ratings_for_query(query_id, user_id)
    
    return {
        "query_id": query_id,
        "ratings": ratings
    }
```

---

# 9. DELETE /api/v1/ratings/{rating_id} - Delete Rating

**Endpoint:** `DELETE /api/v1/ratings/{rating_id}`  
**Autentykacja:** Wymagana  
**Złożoność:** Bardzo niska  
**Czas:** 30 minut

## Przegląd

Usuwa pojedynczą ocenę. Opcjonalny w MVP UI.

---

## Response (204 No Content)

Brak body.

---

## Implementacja

```python
@router.delete("/{rating_id}", status_code=204)
async def delete_rating(
    rating_id: UUID,
    user_id: str = Depends(get_current_user),
    repo: RatingRepository = Depends(get_rating_repo)
):
    # Verify ownership via RLS
    exists = await repo.rating_exists(rating_id, user_id)
    if not exists:
        raise HTTPException(404, "Rating not found")
    
    await repo.delete_rating(rating_id)
    
    return Response(status_code=204)
```

---

**Powrót do:** [Index](../api-implementation-index.md)

