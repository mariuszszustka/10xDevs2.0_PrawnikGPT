# Legal Acts Management Endpoints

Grupa endpointów zarządzających aktami prawnymi (reference data).

---

# 10. GET /api/v1/legal-acts - List Legal Acts

**Endpoint:** `GET /api/v1/legal-acts`  
**Autentykacja:** Opcjonalna (publiczny)  
**Złożoność:** Średnia  
**Czas:** 4-5 godzin

## Przegląd

Lista aktów prawnych z filtrowaniem, wyszukiwaniem full-text i paginacją.

---

## Request

**Params:**

- `page` (default=1)
- `per_page` (default=20, max=100)
- `search` (min 3 chars) - full-text search na title
- `status` (enum) - 'obowiązująca', 'uchylona', 'nieobowiązująca'
- `publisher` (string) - 'dz-u', 'mp', etc.
- `year` (int) - filter by year
- `order_by` (enum) - 'published_date', 'title'
- `order` (enum) - 'desc', 'asc'

---

## Response (200 OK)

```json
{
  "legal_acts": [
    {
      "id": "uuid",
      "publisher": "dz-u",
      "year": 2023,
      "position": 1234,
      "title": "Ustawa o prawach konsumenta",
      "typ_aktu": "ustawa",
      "status": "obowiązująca",
      "organ_wydajacy": "Sejm RP",
      "published_date": "2023-06-15",
      "effective_date": "2023-07-01",
      "created_at": "..."
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total_pages": 1000,
    "total_count": 20000
  }
}
```

---

## Implementacja

### Full-Text Search (GIN Index)

```sql
-- Index na title
CREATE INDEX idx_legal_acts_title_fts
    ON legal_acts USING GIN (to_tsvector('polish', title));

-- Query
SELECT *
FROM legal_acts
WHERE to_tsvector('polish', title) @@ plainto_tsquery('polish', $1)
ORDER BY published_date DESC;
```

### Filters

```python
query = supabase.table("legal_acts").select("*")

# Apply filters
if params.status:
    query = query.eq("status", params.status)
if params.publisher:
    query = query.eq("publisher", params.publisher)
if params.year:
    query = query.eq("year", params.year)
if params.search:
    # Use RPC for FTS
    query = query.text_search("title", params.search)

# Order and paginate
query = query.order(params.order_by, desc=(params.order == "desc"))
query = query.range(offset, offset + per_page - 1)

result = await query.execute()
```

---

## Checklist

- [ ] Pydantic models (LegalActListItem, LegalActListParams)
- [ ] FTS index on title
- [ ] Repository method with filters
- [ ] RPC function (optional, for complex queries)
- [ ] Router endpoint
- [ ] Tests (filters, pagination, search)

---

# 11. GET /api/v1/legal-acts/{act_id} - Get Legal Act Details

**Endpoint:** `GET /api/v1/legal-acts/{act_id}`  
**Autentykacja:** Opcjonalna  
**Złożoność:** Niska  
**Czas:** 1-2 godziny

## Przegląd

Szczegóły aktu prawnego z statystykami (chunks count, relations count).

---

## Response (200 OK)

```json
{
  "id": "uuid",
  "publisher": "dz-u",
  "year": 2023,
  "position": 1234,
  "title": "Ustawa o prawach konsumenta",
  "typ_aktu": "ustawa",
  "status": "obowiązująca",
  "organ_wydajacy": "Sejm RP",
  "published_date": "2023-06-15",
  "effective_date": "2023-07-01",
  "created_at": "...",
  "updated_at": "...",
  "stats": {
    "total_chunks": 45,
    "related_acts_count": 12
  }
}
```

---

## Implementacja

```python
async def get_legal_act_details(act_id: UUID) -> Dict:
    # Fetch act
    act = await supabase.table("legal_acts") \
        .select("*") \
        .eq("id", act_id) \
        .single() \
        .execute()

    if not act.data:
        raise HTTPException(404, "Legal act not found")

    # Calculate stats
    chunks_count = await supabase.table("legal_act_chunks") \
        .select("id", count="exact") \
        .eq("legal_act_id", act_id) \
        .execute()

    relations_count = await supabase.rpc("count_relations", {"act_id": act_id}).execute()

    return {
        **act.data,
        "stats": {
            "total_chunks": chunks_count.count,
            "related_acts_count": relations_count.data
        }
    }
```

---

# 12. GET /api/v1/legal-acts/{act_id}/relations - Get Relations

**Endpoint:** `GET /api/v1/legal-acts/{act_id}/relations`  
**Autentykacja:** Opcjonalna  
**Złożoność:** Wysoka  
**Czas:** 4-6 godzin

## Przegląd

Graf relacji między aktami (modifies, repeals, etc.) z recursive CTE.

---

## Request

**Params:**

- `depth` (1 or 2, default=1) - max graph traversal depth
- `relation_type` (optional) - filter by type

---

## Response (200 OK)

```json
{
  "act_id": "uuid",
  "relations": {
    "outgoing": [
      {
        "relation_id": "uuid",
        "target_act": {
          "id": "uuid",
          "title": "Kodeks cywilny",
          "publisher": "dz-u",
          "year": 1964,
          "position": 16,
          "status": "obowiązująca"
        },
        "relation_type": "modifies",
        "description": "Modyfikuje przepisy...",
        "created_at": "..."
      }
    ],
    "incoming": [
      {
        "relation_id": "uuid",
        "source_act": {
          "id": "uuid",
          "title": "Ustawa o zmianie...",
          "status": "obowiązująca"
        },
        "relation_type": "amends",
        "description": "...",
        "created_at": "..."
      }
    ]
  },
  "depth": 1
}
```

---

## Implementacja (Recursive CTE)

```sql
CREATE OR REPLACE FUNCTION get_legal_act_relations(
    p_act_id uuid,
    p_max_depth int DEFAULT 1,
    p_relation_type relation_type_enum DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    WITH RECURSIVE act_tree AS (
        -- Base case: direct relations
        SELECT
            lar.id AS relation_id,
            lar.source_act_id,
            lar.target_act_id,
            lar.relation_type,
            lar.description,
            1 AS depth,
            'outgoing' AS direction
        FROM legal_act_relations lar
        WHERE lar.source_act_id = p_act_id
        AND (p_relation_type IS NULL OR lar.relation_type = p_relation_type)

        UNION

        -- Incoming relations
        SELECT
            lar.id,
            lar.source_act_id,
            lar.target_act_id,
            lar.relation_type,
            lar.description,
            1 AS depth,
            'incoming' AS direction
        FROM legal_act_relations lar
        WHERE lar.target_act_id = p_act_id
        AND (p_relation_type IS NULL OR lar.relation_type = p_relation_type)

        UNION

        -- Recursive case: traverse graph
        SELECT
            lar.id,
            lar.source_act_id,
            lar.target_act_id,
            lar.relation_type,
            lar.description,
            at.depth + 1,
            at.direction
        FROM legal_act_relations lar
        JOIN act_tree at ON lar.source_act_id = at.target_act_id
        WHERE at.depth < p_max_depth
        AND at.direction = 'outgoing'
    )
    SELECT json_build_object(
        'act_id', p_act_id,
        'depth', p_max_depth,
        'relations', json_build_object(
            'outgoing', (SELECT json_agg(...) FROM act_tree WHERE direction = 'outgoing'),
            'incoming', (SELECT json_agg(...) FROM act_tree WHERE direction = 'incoming')
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql;
```

---

## Checklist

- [ ] Pydantic models (LegalActRelationsResponse, OutgoingRelation, IncomingRelation)
- [ ] RPC function with recursive CTE
- [ ] Repository method
- [ ] Router endpoint
- [ ] Tests (depth=1, depth=2, filters)
- [ ] Performance tests (prevent infinite loops)

---

**Powrót do:** [Index](../api-implementation-index.md)
