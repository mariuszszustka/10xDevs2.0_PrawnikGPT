# History View - Implementation Plan

**Widok:** History View (Widok historii zapytań)  
**Ścieżka:** `/app/history`  
**Typ:** Astro SSR + React islands  
**Autentykacja:** Wymagana

---

## 1. Product Requirements Document (PRD)

@.ai/prd.md

---

## 2. Opis widoku

### 2.6. History View (Widok historii zapytań)

**Ścieżka:** `/app/history`  
**Typ:** Astro SSR + React islands  
**Autentykacja:** Wymagana

**Główny cel:**
Przeglądanie chronologicznej historii zapytań i odpowiedzi użytkownika.

**Kluczowe informacje do wyświetlenia:**
- **Lista zapytań (od najnowszych):**
  - **Query Card** dla każdego zapytania:
    - Question text (truncated do 100 znaków, expand on click)
    - Timestamp (relative: "2 godz. temu", "wczoraj", "3 dni temu")
    - Status badge: "Ukończone" / "Przetwarzanie..." (z możliwością odświeżenia)
    - Fast response (collapsed by default, expand icon ▼):
      - Response content (Markdown)
      - Sources list
      - Rating buttons (z aktualnym stanem)
      - Generation time badge
    - Detailed response indicator: Ikona 🔬 jeśli istnieje (collapsed by default)
    - Delete button (ikona 🗑️) → confirmation modal → DELETE `/api/v1/queries/{id}`
  - **Paginacja:**
    - Przycisk "Załaduj więcej" na dole listy
    - Licznik: "Załaduj więcej (45 pozostałych)"
    - Zachowanie scroll position po załadowaniu nowych elementów
- **Empty state:**
  - Ikona + nagłówek: "Nie masz jeszcze żadnych zapytań"
  - Opis: "Wróć do czatu i zadaj pierwsze pytanie!"
  - CTA button: "Przejdź do czatu" → `/app`

**Kluczowe komponenty widoku:**
- `HistoryList.tsx` (React island) - Główny kontener z paginacją
- `QueryCard.tsx` (React island) - Karta pojedynczego zapytania (collapsible)
- `DeleteQueryButton.tsx` (React island) - Przycisk usuwania z confirmation modal
- `EmptyState.tsx` (React island) - Stan pusty z CTA

**UX, dostępność i względy bezpieczeństwa:**
- **UX:**
  - Collapsible responses (domyślnie zwinięte dla lepszej czytelności)
  - Smooth expand/collapse animation
  - Zachowanie scroll position przy paginacji
  - Confirmation modal przed usunięciem (zapobieganie przypadkowym usunięciom)
  - Status "Przetwarzanie..." z możliwością odświeżenia (jeśli zapytanie jest w trakcie)
  - Auto-refresh dla zapytań w statusie "processing" (opcjonalnie)
- **Dostępność:**
  - `aria-expanded` dla collapsible items
  - `aria-label` dla przycisków expand/collapse i delete
  - Keyboard navigation: Tab order, Enter do expand/collapse
  - Focus management: Restore focus po zamknięciu modala
  - Semantic HTML: `<article>` dla każdego query card
- **Bezpieczeństwo:**
  - RLS policies: Użytkownik widzi tylko swoje zapytania
  - Weryfikacja ownership przed usunięciem (backend)
  - Kaskadowe usuwanie ocen (handled by database)
  - Sanitizacja Markdown w odpowiedziach

---

## 3. User Stories

**US-006: Przeglądanie historii zapytań**
**Opis:** Jako użytkownik, chcę mieć dostęp do listy moich poprzednich zapytań i odpowiedzi, aby móc do nich wrócić.

**Kryteria akceptacji:**
- W interfejsie dostępna jest sekcja "Historia".
- Historia wyświetla listę zapytań w porządku chronologicznym (od najnowszych).
- Domyślnie widoczna jest szybka odpowiedź z ikoną informującą o istnieniu wersji dokładnej (jeśli istnieje).
- Użytkownik może rozwinąć wpis, aby zobaczyć obie odpowiedzi.

**US-007: Usuwanie zapytania z historii**
**Opis:** Jako użytkownik, chcę móc usunąć wybrane pozycje z mojej historii zapytań, aby zachować porządek.

**Kryteria akceptacji:**
- Każdy wpis w historii ma opcję usunięcia (np. ikona kosza).
- Po potwierdzeniu, wpis jest trwale usuwany z historii użytkownika.
- Usunięcie zapytania powoduje również usunięcie powiązanych z nim ocen z bazy danych (kaskadowe usuwanie).

**US-008: Udzielanie informacji zwrotnej na temat odpowiedzi**
**Opis:** Jako użytkownik, chcę móc ocenić każdą odpowiedź, aby pomóc w ulepszaniu systemu.

**Kryteria akceptacji:**
- Kliknięcie przycisku "kciuk w górę" lub "kciuk w dół" zapisuje ocenę w bazie danych.
- Po oddaniu głosu, przycisk zmienia swój stan wizualny, a druga opcja jest blokowana.
- Ocena jest powiązana z konkretną odpowiedzią i użytym modelem (szybki/dokładny).
- Użytkownik może zobaczyć, że jego ocena została zapisana (zmiana koloru lub checkmark).

---

## 4. Endpoint Description

### 4.1. List User Queries
**Endpoint:** `GET /api/v1/queries`  
**Implementacja:** @.ai/implementations/03-05-query-management.md (List Queries)  
**Typ:** Query Management  
**Autentykacja:** Wymagana

**Query Parameters:**
- `page` (default=1, min=1)
- `per_page` (default=20, max=100)
- `order` (default="desc", values: "desc" | "asc")

**Response (200 OK):**
```json
{
  "queries": [
    {
      "query_id": "uuid",
      "query_text": "...",
      "created_at": "2025-11-19T10:30:00Z",
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
        "generation_time_ms": 120000,
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

### 4.2. Get Query Details
**Endpoint:** `GET /api/v1/queries/{query_id}`  
**Implementacja:** @.ai/implementations/03-05-query-management.md (Query Details)  
**Typ:** Query Management  
**Autentykacja:** Wymagana

**Path Parameters:**
- `query_id` (UUID)

**Response (200 OK):**
```json
{
  "query_id": "uuid",
  "query_text": "...",
  "status": "completed",
  "created_at": "...",
  "fast_response": {
    "status": "completed",
    "content": "...",
    "model_name": "mistral:7b",
    "generation_time_ms": 8500,
    "sources": [...],
    "rating": {...}
  },
  "accurate_response": {
    "status": "completed",
    "content": "...",
    "model_name": "gpt-oss:120b",
    "generation_time_ms": 120000,
    "sources": [...],
    "rating": {...}
  } | null
}
```

### 4.3. Delete Query
**Endpoint:** `DELETE /api/v1/queries/{query_id}`  
**Implementacja:** @.ai/implementations/03-05-query-management.md (Delete Query)  
**Typ:** Query Management  
**Autentykacja:** Wymagana

**Path Parameters:**
- `query_id` (UUID)

**Response (204 No Content):**
Brak body.

**Error Responses:**
- 401 Unauthorized
- 403 Forbidden (not owner)
- 404 Not Found

### 4.4. Create/Update Rating
**Endpoint:** `POST /api/v1/queries/{query_id}/ratings`  
**Implementacja:** @.ai/implementations/07-ratings.md  
**Typ:** Rating System  
**Autentykacja:** Wymagana

**Request:**
```json
{
  "response_type": "fast" | "accurate",
  "rating_value": "up" | "down"
}
```

**Response (201 Created / 200 OK):**
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

---

## 5. Endpoint Implementation

### 5.1. List Queries
- **Backend router:** `backend/routers/queries.py`
- **Repository:** `backend/db/queries.py`
- **Models:** `backend/models/query.py` (QueryListResponse, QueryListItem, PaginationMetadata)
- **Implementacja:** Zobacz @.ai/implementations/03-05-query-management.md

### 5.2. Get Query Details
- **Backend router:** `backend/routers/queries.py`
- **Repository:** `backend/db/queries.py`
- **Models:** `backend/models/query.py` (QueryDetailResponse)
- **Implementacja:** Zobacz @.ai/implementations/03-05-query-management.md

### 5.3. Delete Query
- **Backend router:** `backend/routers/queries.py`
- **Repository:** `backend/db/queries.py`
- **Implementacja:** Zobacz @.ai/implementations/03-05-query-management.md

### 5.4. Create/Update Rating
- **Backend router:** `backend/routers/ratings.py`
- **Repository:** `backend/db/ratings.py`
- **Models:** `backend/models/rating.py` (RatingCreateRequest, RatingResponse)
- **Implementacja:** Zobacz @.ai/implementations/07-ratings.md

---

## 6. Type Definitions

**Frontend types:** `src/lib/types.ts`

### Query Types
- `QueryListResponse` (linie 195-198)
- `QueryListItem` (linie 172-189)
- `QueryDetailResponse` (linie 143-164)
- `QueryProcessingStatus` (linia 93)
- `PaginationMetadata` (linie 42-47)

### Rating Types
- `RatingCreateRequest` (linie 242-245)
- `RatingResponse` (linie 255-262)
- `RatingSummary` (linie 64-66)
- `RatingDetail` (linie 71-74)
- `RatingValue` (linia 22)
- `ResponseType` (linia 23)

### Query Parameters
- `QueryListParams` (linie 473-477)

### Error Types
- `ApiErrorCode` (linie 432-444)
- `ErrorResponse` (linie 455-463)

---

## 7. Tech Stack

**Frontend:**
- **Framework:** Astro 5 (SSR dla chronionych widoków)
- **React Islands:** React 19 dla interaktywnych komponentów
  - `client:load` - HistoryList, QueryCard
  - `client:visible` - DeleteQueryButton, RatingButtons
- **Styling:** Tailwind CSS + Shadcn/ui
- **Markdown:** `react-markdown` z `rehype-sanitize` (XSS prevention)
- **State Management:** React Context (`AppContext`) dla globalnego stanu (opcjonalnie)

**Backend:**
- **Framework:** FastAPI (Python 3.11+)
- **Database:** Supabase (PostgreSQL + pgvector)
- **RLS:** Row Level Security policies dla izolacji danych użytkowników

**Zobacz:** @.ai/tech-stack.md dla szczegółów infrastruktury

---

## 8. Checklist Implementacji

### Frontend (Astro + React)
- [ ] Utworzenie `src/pages/app/history.astro`
- [ ] Komponent `HistoryList.tsx` (React island)
  - [ ] Fetch GET `/api/v1/queries?page=1&per_page=20`
  - [ ] Paginacja z przyciskiem "Załaduj więcej"
  - [ ] Licznik pozostałych zapytań
  - [ ] Zachowanie scroll position
  - [ ] Empty state z CTA
- [ ] Komponent `QueryCard.tsx` (React island)
  - [ ] Collapsible responses (domyślnie zwinięte)
  - [ ] Expand/collapse animation
  - [ ] Status badge ("Ukończone" / "Przetwarzanie...")
  - [ ] Timestamp (relative: "2 godz. temu")
  - [ ] Question text (truncated do 100 znaków)
  - [ ] Fast response (Markdown, sources, rating buttons)
  - [ ] Detailed response indicator (ikona 🔬)
  - [ ] Delete button
- [ ] Komponent `DeleteQueryButton.tsx` (React island)
  - [ ] Confirmation modal
  - [ ] DELETE `/api/v1/queries/{id}`
  - [ ] Optimistic update (usunięcie z listy)
  - [ ] Error handling
- [ ] Komponent `EmptyState.tsx` (React island)
  - [ ] Ikona + nagłówek
  - [ ] Opis
  - [ ] CTA button → `/app`
- [ ] Komponent `RatingButtons.tsx` (React island) - Reuse z Chat View
- [ ] Utility functions:
  - [ ] `formatRelativeTime(date: string): string` - Formatowanie czasu względnego
  - [ ] `truncateText(text: string, maxLength: number): string` - Skracanie tekstu

### Backend
- [ ] Endpoint `GET /api/v1/queries` (List Queries)
- [ ] Endpoint `GET /api/v1/queries/{query_id}` (Query Details)
- [ ] Endpoint `DELETE /api/v1/queries/{query_id}` (Delete Query)
- [ ] Endpoint `POST /api/v1/queries/{query_id}/ratings` (Create/Update Rating)

### Integration
- [ ] API client (`src/lib/apiClient.ts`)
- [ ] Error handling (ApiError class)
- [ ] Sanitizacja Markdown (XSS prevention)
- [ ] RLS policies (weryfikacja w backend)

### Testing
- [ ] Test listowania zapytań z paginacją
- [ ] Test expand/collapse responses
- [ ] Test usuwania zapytania (z confirmation modal)
- [ ] Test ratingów w historii
- [ ] Test empty state
- [ ] Test accessibility (keyboard navigation, screen reader)

---

## 9. Uwagi Implementacyjne

1. **Paginacja:** Użyj "Załaduj więcej" zamiast tradycyjnej paginacji (lepsze UX dla długich list)
2. **Collapsible Responses:** Domyślnie zwinięte dla lepszej czytelności, użytkownik może rozwinąć
3. **Relative Timestamps:** Formatuj daty jako "2 godz. temu", "wczoraj", "3 dni temu"
4. **Optimistic Updates:** Natychmiastowe usunięcie z listy po potwierdzeniu (przed API call)
5. **Confirmation Modal:** Zapobieganie przypadkowym usunięciom
6. **Status Badge:** Wyświetlaj "Przetwarzanie..." dla zapytań w trakcie, z możliwością odświeżenia
7. **RLS Policies:** Backend weryfikuje ownership przed usunięciem
8. **Cascade Delete:** Usunięcie zapytania automatycznie usuwa powiązane oceny (handled by database)
9. **Markdown Sanitization:** Użyj `rehype-sanitize` dla XSS prevention
10. **Accessibility:** Pełna zgodność z WCAG AA (ARIA labels, keyboard navigation)

---

**Powrót do:** [View Implementation Index](../view-implementation-index.md) | [UI Plan](../ui-plan.md) | [PRD](../prd.md) | [API Implementation Index](../api-implementation-index.md)

