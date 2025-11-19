# Checklist Walidacji Typów dla Implementacji Backendu

**Data:** 2025-11-19  
**Cel:** Pomoc programiście implementującemu backend w zachowaniu spójności z typami TypeScript

---

## 🎯 Quick Summary

**Status:** ✅ Wszystkie typy w `types.ts` są spójne z planami implementacji  
**Akcja:** Możesz bezpośrednio używać tych typów jako referencji przy tworzeniu Pydantic models

---

## 📝 Mapowanie TypeScript → Python (Pydantic)

### Typy Podstawowe

| TypeScript | Python (Pydantic) | Przykład |
|------------|-------------------|----------|
| `string` | `str` | `query_text: str` |
| `number` | `int` lub `float` | `year: int`, `generation_time_ms: int` |
| `boolean` | `bool` | `exists: bool` |
| `string[]` | `List[str]` | `from typing import List` |
| `{ key: value }` | `Dict[str, Any]` | `from typing import Dict, Any` |
| `type \| null` | `Optional[type]` | `from typing import Optional` |
| `field?` | `Optional[type] = None` | Domyślnie None |

### Literal Types & Enums

**TypeScript:**
```typescript
export type ServiceStatus = "ok" | "degraded" | "down";
```

**Python (Pydantic):**
```python
from typing import Literal

ServiceStatus = Literal["ok", "degraded", "down"]
```

**ALBO z Enum:**
```python
from enum import Enum

class ServiceStatus(str, Enum):
    OK = "ok"
    DEGRADED = "degraded"
    DOWN = "down"
```

---

## 🔍 Szczegółowe Mapowanie dla Każdego Endpointu

### 1. Health Check (`GET /health`)

**TypeScript (types.ts linie 414-423):**
```typescript
export interface HealthResponse {
  status: ServiceStatus;
  version: string;
  timestamp: string;
  services: {
    database: ServiceStatus;
    ollama: ServiceStatus;
    supabase_auth: ServiceStatus;
  };
}
```

**Python (backend/models/health.py):**
```python
from pydantic import BaseModel
from typing import Literal
from datetime import datetime

ServiceStatus = Literal["ok", "degraded", "down"]

class ServiceHealthStatus(BaseModel):
    database: ServiceStatus
    ollama: ServiceStatus
    supabase_auth: ServiceStatus

class HealthResponse(BaseModel):
    status: ServiceStatus
    version: str
    timestamp: datetime  # ← Pydantic konwertuje na ISO string w JSON
    services: ServiceHealthStatus
```

---

### 2. Query Submit (`POST /api/v1/queries`)

#### Request Body

**TypeScript (types.ts linie 86-88):**
```typescript
export interface QuerySubmitRequest {
  query_text: string;
}
```

**Python (backend/models/query.py):**
```python
from pydantic import BaseModel, Field, validator

class QuerySubmitRequest(BaseModel):
    query_text: str = Field(
        min_length=10,
        max_length=1000,
        description="Legal question from user"
    )
    
    @validator('query_text')
    def validate_text_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Query text cannot be empty')
        return v.strip()
```

#### Response (202 Accepted)

**TypeScript (types.ts linie 125-134):**
```typescript
export interface QuerySubmitResponse {
  query_id: string;
  query_text: string;
  status: QueryProcessingStatus;
  created_at: string;
  fast_response: {
    status: QueryProcessingStatus;
    estimated_time_seconds: number;
  };
}
```

**Python:**
```python
from pydantic import BaseModel
from typing import Literal
from datetime import datetime
from uuid import UUID

QueryProcessingStatus = Literal["pending", "processing", "completed", "failed"]

class FastResponseStatus(BaseModel):
    status: QueryProcessingStatus
    estimated_time_seconds: int

class QuerySubmitResponse(BaseModel):
    query_id: UUID  # ← Pydantic automatycznie konwertuje UUID na string w JSON
    query_text: str
    status: QueryProcessingStatus
    created_at: datetime
    fast_response: FastResponseStatus
```

#### Response (Completed)

**TypeScript (types.ts linie 143-164):**
```typescript
export interface QueryDetailResponse {
  query_id: string;
  query_text: string;
  status: QueryProcessingStatus;
  created_at: string;
  fast_response: {
    status: QueryProcessingStatus;
    content?: string;
    model_name?: string;
    generation_time_ms?: number;
    sources?: SourceReference[];
    rating?: RatingDetail;
  };
  accurate_response: {
    status: QueryProcessingStatus;
    content?: string;
    model_name?: string;
    generation_time_ms?: number;
    sources?: SourceReference[];
    rating?: RatingDetail;
  } | null;
}
```

**Python:**
```python
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime

class SourceReference(BaseModel):
    act_title: str
    article: str
    link: str
    chunk_id: str

class RatingDetail(BaseModel):
    rating_id: UUID
    value: Literal["up", "down"]
    created_at: datetime

class FastResponseData(BaseModel):
    status: QueryProcessingStatus
    content: Optional[str] = None
    model_name: Optional[str] = None
    generation_time_ms: Optional[int] = None
    sources: Optional[List[SourceReference]] = None
    rating: Optional[RatingDetail] = None

class AccurateResponseData(BaseModel):
    status: QueryProcessingStatus
    content: Optional[str] = None
    model_name: Optional[str] = None
    generation_time_ms: Optional[int] = None
    sources: Optional[List[SourceReference]] = None
    rating: Optional[RatingDetail] = None

class QueryDetailResponse(BaseModel):
    query_id: UUID
    query_text: str
    status: QueryProcessingStatus
    created_at: datetime
    fast_response: FastResponseData
    accurate_response: Optional[AccurateResponseData] = None
    # ☝️ UWAGA: null w TypeScript = None w Python
```

**⚠️ UWAGA: Optional Fields**

W `QueryDetailResponse.fast_response`:
- Pola są optional (`content?: string`) bo w momencie submitowania (202) nie mają jeszcze wartości
- Po zakończeniu processing wszystkie pola są wypełnione
- Backend musi to obsłużyć w dwóch różnych response models lub conditionally

**Rekomendacja:** Stwórz dwa modele:
```python
class FastResponsePending(BaseModel):
    status: Literal["pending", "processing"]
    estimated_time_seconds: int

class FastResponseCompleted(BaseModel):
    status: Literal["completed"]
    content: str  # ← Nie optional, zawsze present po completion
    model_name: str
    generation_time_ms: int
    sources: List[SourceReference]
    rating: Optional[RatingDetail] = None
```

---

### 3. Query List (`GET /api/v1/queries`)

**TypeScript (types.ts linie 172-189):**
```typescript
export interface QueryListItem {
  query_id: string;
  query_text: string;
  created_at: string;
  fast_response: {
    content: string;
    model_name: string;
    generation_time_ms: number;
    sources_count: number;  // ← UWAGA: nie sources[], tylko count
    rating?: RatingSummary;
  };
  accurate_response: {
    exists: boolean;  // ← UWAGA: boolean flag, nie pełne dane
    model_name?: string;
    generation_time_ms?: number;
    rating?: RatingSummary;
  } | null;
}
```

**Python:**
```python
class RatingSummary(BaseModel):
    value: Literal["up", "down"]

class QueryListItemFastResponse(BaseModel):
    content: str
    model_name: str
    generation_time_ms: int
    sources_count: int  # ← Aggregated field (COUNT w SQL)
    rating: Optional[RatingSummary] = None

class QueryListItemAccurateResponse(BaseModel):
    exists: bool  # ← Boolean flag zamiast pełnych danych
    model_name: Optional[str] = None
    generation_time_ms: Optional[int] = None
    rating: Optional[RatingSummary] = None

class QueryListItem(BaseModel):
    query_id: UUID
    query_text: str
    created_at: datetime
    fast_response: QueryListItemFastResponse
    accurate_response: Optional[QueryListItemAccurateResponse] = None
```

**💡 TIP: SQL Query dla `sources_count`**

```sql
SELECT 
  qh.id AS query_id,
  qh.query_text,
  qh.created_at,
  qh.fast_response_content AS content,
  qh.fast_model_name AS model_name,
  qh.fast_generation_time_ms AS generation_time_ms,
  -- Agregacja: liczba źródeł zamiast pełnych danych
  jsonb_array_length(qh.sources) AS sources_count,
  -- Rating jako nested object
  (SELECT jsonb_build_object('value', r.rating_value)
   FROM ratings r
   WHERE r.query_history_id = qh.id
   AND r.response_type = 'fast') AS rating
FROM query_history qh
WHERE qh.user_id = $1
ORDER BY qh.created_at DESC
LIMIT $2 OFFSET $3;
```

---

### 4. Rating Create/Update (`POST /api/v1/queries/{query_id}/ratings`)

#### Request Body

**TypeScript (types.ts linie 242-245):**
```typescript
export interface RatingCreateRequest {
  response_type: ResponseType;  // 'fast' | 'accurate'
  rating_value: RatingValue;    // 'up' | 'down'
}
```

**Python:**
```python
from pydantic import BaseModel
from typing import Literal

ResponseType = Literal["fast", "accurate"]
RatingValue = Literal["up", "down"]

class RatingCreateRequest(BaseModel):
    response_type: ResponseType
    rating_value: RatingValue
```

#### Response

**TypeScript (types.ts linie 255-262):**
```typescript
export interface RatingResponse {
  rating_id: string;
  query_id: string;
  response_type: ResponseType;
  rating_value: RatingValue;
  created_at: string;
  updated_at: string;
}
```

**Python:**
```python
class RatingResponse(BaseModel):
    rating_id: UUID
    query_id: UUID
    response_type: ResponseType
    rating_value: RatingValue
    created_at: datetime
    updated_at: datetime
```

**💡 TIP: Upsert Logic**

```python
# backend/db/ratings.py
async def upsert_rating(
    query_id: UUID,
    user_id: str,
    response_type: str,
    rating_value: str
) -> Dict:
    # Check if rating exists
    existing = await supabase.table("ratings") \
        .select("*") \
        .eq("query_history_id", query_id) \
        .eq("user_id", user_id) \
        .eq("response_type", response_type) \
        .execute()
    
    if existing.data:
        # UPDATE
        result = await supabase.table("ratings") \
            .update({"rating_value": rating_value}) \
            .eq("id", existing.data[0]["id"]) \
            .execute()
        return result.data[0], 200  # Status 200 OK
    else:
        # INSERT
        result = await supabase.table("ratings") \
            .insert({
                "query_history_id": query_id,
                "user_id": user_id,
                "response_type": response_type,
                "rating_value": rating_value
            }) \
            .execute()
        return result.data[0], 201  # Status 201 Created
```

---

### 5. Legal Acts (`GET /api/v1/legal-acts`)

**TypeScript (types.ts linie 285-296):**
```typescript
export interface LegalActListItem {
  id: string;
  publisher: string;
  year: number;
  position: number;
  title: string;
  typ_aktu: string;
  status: LegalActStatus;           // enum
  organ_wydajacy: string | null;    // ← NULLABLE
  published_date: string;
  effective_date: string | null;    // ← NULLABLE
  created_at: string;
}
```

**Python:**
```python
from pydantic import BaseModel
from typing import Optional, Literal
from uuid import UUID
from datetime import datetime, date

LegalActStatus = Literal["obowiązująca", "uchylona", "nieobowiązująca"]

class LegalActListItem(BaseModel):
    id: UUID
    publisher: str
    year: int
    position: int
    title: str
    typ_aktu: str
    status: LegalActStatus
    organ_wydajacy: Optional[str] = None  # ← NULLABLE w bazie
    published_date: date  # ← date, nie datetime
    effective_date: Optional[date] = None  # ← NULLABLE w bazie
    created_at: datetime
```

**⚠️ UWAGA: Date vs DateTime**

- `published_date` i `effective_date` są typu `DATE` w PostgreSQL (bez godziny)
- W Pythonie użyj `datetime.date`, NIE `datetime.datetime`
- Pydantic automatycznie konwertuje na ISO string `"2023-06-15"`

---

### 6. Legal Act Relations (`GET /api/v1/legal-acts/{act_id}/relations`)

**TypeScript (types.ts linie 332-361):**
```typescript
export interface LegalActReference {
  id: string;
  title: string;
  publisher: string;
  year: number;
  position: number;
  status: LegalActStatus;
}

export interface OutgoingRelation {
  relation_id: string;
  target_act: LegalActReference;
  relation_type: RelationType;
  description: string;
  created_at: string;
}

export interface IncomingRelation {
  relation_id: string;
  source_act: LegalActReference;
  relation_type: RelationType;
  description: string;
  created_at: string;
}

export interface LegalActRelationsResponse {
  act_id: string;
  relations: {
    outgoing: OutgoingRelation[];
    incoming: IncomingRelation[];
  };
  depth: number;
}
```

**Python:**
```python
from typing import List

RelationType = Literal["modifies", "repeals", "implements", "based_on", "amends"]

class LegalActReference(BaseModel):
    id: UUID
    title: str
    publisher: str
    year: int
    position: int
    status: LegalActStatus

class OutgoingRelation(BaseModel):
    relation_id: UUID
    target_act: LegalActReference
    relation_type: RelationType
    description: str
    created_at: datetime

class IncomingRelation(BaseModel):
    relation_id: UUID
    source_act: LegalActReference
    relation_type: RelationType
    description: str
    created_at: datetime

class LegalActRelations(BaseModel):
    outgoing: List[OutgoingRelation]
    incoming: List[IncomingRelation]

class LegalActRelationsResponse(BaseModel):
    act_id: UUID
    relations: LegalActRelations
    depth: int = Field(ge=1, le=2)  # ← Walidacja 1-2
```

---

### 7. Onboarding (`GET /api/v1/onboarding/example-questions`)

**TypeScript (types.ts linie 387-399):**
```typescript
export interface ExampleQuestion {
  id: number;
  question: string;
  category: "consumer_rights" | "civil_law" | "labor_law" | "criminal_law";
}

export interface ExampleQuestionsResponse {
  examples: ExampleQuestion[];
}
```

**Python:**
```python
from typing import List, Literal

CategoryType = Literal["consumer_rights", "civil_law", "labor_law", "criminal_law"]

class ExampleQuestion(BaseModel):
    id: int
    question: str
    category: CategoryType

class ExampleQuestionsResponse(BaseModel):
    examples: List[ExampleQuestion]
```

**💡 TIP: Static Data**

```python
# backend/routers/onboarding.py
EXAMPLE_QUESTIONS = [
    ExampleQuestion(
        id=1,
        question="Jakie są podstawowe prawa konsumenta w Polsce?",
        category="consumer_rights"
    ),
    ExampleQuestion(
        id=2,
        question="Co to jest przedawnienie w prawie cywilnym?",
        category="civil_law"
    ),
    # ... więcej przykładów
]

@router.get("/example-questions", response_model=ExampleQuestionsResponse)
async def get_example_questions():
    return ExampleQuestionsResponse(examples=EXAMPLE_QUESTIONS)
```

---

## 🚨 Najważniejsze Pułapki do Uniknięcia

### 1. ⚠️ UUID vs String

**Problem:** PostgreSQL UUID ≠ Python str

**Rozwiązanie:**
```python
from uuid import UUID

# ✅ Dobre
class QueryResponse(BaseModel):
    query_id: UUID  # Pydantic konwertuje UUID <-> string automatycznie
    
# ❌ Złe
class QueryResponse(BaseModel):
    query_id: str  # Brak walidacji formatu UUID
```

### 2. ⚠️ Datetime vs String

**Problem:** ISO 8601 timestamps w JSON

**Rozwiązanie:**
```python
from datetime import datetime

# ✅ Dobre
class Response(BaseModel):
    created_at: datetime  # Pydantic konwertuje datetime <-> ISO string
    
# ❌ Złe
class Response(BaseModel):
    created_at: str  # Brak walidacji formatu daty
```

### 3. ⚠️ Optional vs Null

**Problem:** `null` w TypeScript ≠ `undefined`

**TypeScript:**
```typescript
accurate_response: {...} | null  // może być object lub null
```

**Python:**
```python
# ✅ Dobre
accurate_response: Optional[AccurateResponseData] = None

# ❌ Złe
accurate_response: AccurateResponseData = None  # Type error
```

### 4. ⚠️ Array vs List

**Problem:** Typy kolekcji

**TypeScript:**
```typescript
sources: SourceReference[];
```

**Python:**
```python
from typing import List

# ✅ Dobre
sources: List[SourceReference]

# ❌ Złe (przed Python 3.9)
sources: list[SourceReference]  # Działa tylko w Python 3.9+
```

### 5. ⚠️ Enum Values Case Sensitivity

**Problem:** PostgreSQL ENUM wartości są case-sensitive

**TypeScript:**
```typescript
type LegalActStatus = "obowiązująca" | "uchylona" | "nieobowiązująca";
```

**Python:**
```python
# ✅ Dobre - dokładne match z PostgreSQL
LegalActStatus = Literal["obowiązująca", "uchylona", "nieobowiązująca"]

# ❌ Złe - nie będzie działać z bazą
LegalActStatus = Literal["Obowiązująca", "Uchylona", "Nieobowiązująca"]
```

---

## ✅ Checklist dla Programisty Backend

Przed implementacją każdego endpointu:

### Przygotowanie
- [ ] Przeczytaj plan implementacji z `.ai/implementations/`
- [ ] Sprawdź odpowiednie typy w `src/lib/types.ts`
- [ ] Sprawdź schemat bazy w `.ai/db-plan.md`

### Implementacja Pydantic Models
- [ ] Użyj dokładnie tych samych nazw pól co w TypeScript (snake_case → snake_case)
- [ ] Zachowaj nullable fields (`string | null` → `Optional[str]`)
- [ ] Użyj `UUID` dla ID-ów
- [ ] Użyj `datetime` dla timestamps
- [ ] Użyj `date` dla dat bez godziny
- [ ] Użyj `Literal` dla enums
- [ ] Użyj `List[T]` dla arrays
- [ ] Dodaj `Field()` validators gdzie potrzeba (min_length, max_length)

### Walidacja
- [ ] Przetestuj serialization (Pydantic → JSON)
- [ ] Przetestuj deserialization (JSON → Pydantic)
- [ ] Sprawdź czy JSON output match-uje przykłady z planu implementacji

### Testy
- [ ] Unit test dla każdego Pydantic modelu
- [ ] Test walidacji (błędne wartości)
- [ ] Test optional fields (None values)
- [ ] Test enum values (tylko dozwolone wartości)

---

## 🔗 Przydatne Linki

- [Pydantic Documentation](https://docs.pydantic.dev/)
- [FastAPI with Pydantic](https://fastapi.tiangolo.com/tutorial/body/)
- [Pydantic Field Types](https://docs.pydantic.dev/latest/usage/types/)
- [PostgreSQL ENUM Types](https://www.postgresql.org/docs/current/datatype-enum.html)

---

**Ostatnia aktualizacja:** 2025-11-19


