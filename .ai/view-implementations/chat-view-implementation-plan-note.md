# Chat View - Implementation Plan

**Widok:** Chat View (Główny widok czatu)  
**Ścieżka:** `/app` lub `/app/chat`  
**Typ:** Astro SSR + React islands (główny interaktywny widok)  
**Autentykacja:** Wymagana

---

## 1. Product Requirements Document (PRD)

@.ai/prd.md

---

## 2. Opis widoku

### 2.5. Chat View (Główny widok czatu)

**Ścieżka:** `/app` lub `/app/chat`  
**Typ:** Astro SSR + React islands (główny interaktywny widok)  
**Autentykacja:** Wymagana

**Główny cel:**
Główny interfejs aplikacji umożliwiający zadawanie pytań prawnych i otrzymywanie odpowiedzi z systemu RAG.

**Kluczowe informacje do wyświetlenia:**

#### 2.5.1. Welcome Message (Onboarding)
- **Warunek wyświetlenia:** Użytkownik nie ma historii zapytań (pierwsze użycie)
- **Treść:** Komunikat powitalny wyjaśniający zakres MVP
- **Przykładowe pytania (klikalne):** 3-4 przykładowe pytania

#### 2.5.2. Chat Messages Area
- **Lista query/response pairs:**
  - User question (right-aligned bubble)
  - Fast response (left-aligned card z Markdown, źródłami, rating buttons)
  - Detailed response (jeśli wygenerowana)
- **Loading states:** Skeleton loader, progress bar
- **Error states:** NoRelevantActsError, network errors, timeout

#### 2.5.3. Chat Input Component
- Textarea z auto-resize (max 5 linii)
- Character counter (10-1000 znaków)
- Send button (disabled jeśli <10 lub >1000 znaków)
- Wskaźnik rate limit (X/10 zapytań)
- Enter to submit, Shift+Enter for newline

**Kluczowe komponenty widoku:**
- `ChatMessagesContainer.tsx` (React island) - Główny kontener wiadomości z polling
- `ChatInput.tsx` (React island) - Pole wprowadzania pytań
- `ResponseCard.tsx` (React island) - Karta pojedynczej odpowiedzi
- `RatingButtons.tsx` (React island) - Przyciski oceny z optimistic updates
- `DetailedAnswerModal.tsx` (React island) - Modal dla dokładnej odpowiedzi (240s timeout)
- `WelcomeMessage.astro` - Komunikat powitalny (statyczny)
- `ExampleQuestions.astro` - Przykładowe pytania (statyczne, klikalne)
- `SourcesList.astro` - Lista źródeł z linkami do ISAP
- `NoRelevantActsCard.tsx` (React island) - Komunikat błędu dla aktów spoza bazy

**UX, dostępność i względy bezpieczeństwa:**
- **UX:**
  - Auto-scroll do najnowszej wiadomości
  - Optimistic UI: Natychmiastowe wyświetlenie pytania użytkownika
  - Polling z exponential backoff (1s → 2s max) dla szybkich odpowiedzi
  - Długi polling (co 5s) dla dokładnych odpowiedzi w modal
  - Limit 3 równoczesnych zapytań (wskaźnik w nagłówku)
  - Timer cache RAG context z wizualnym wskaźnikiem
  - Rate limiting feedback w ChatInput
- **Dostępność:**
  - `aria-live="polite"` na kontenerze wiadomości
  - `aria-busy="true"` na przycisku "Uzyskaj dokładniejszą odpowiedź"
  - `aria-label` dla wszystkich przycisków ikonowych
  - Semantic HTML: `<article>` dla każdej odpowiedzi
  - Keyboard navigation: Tab order
  - Focus management: Auto-focus na input po załadowaniu
- **Bezpieczeństwo:**
  - Sanitizacja Markdown (`rehype-sanitize`) dla XSS prevention
  - Walidacja input: 10-1000 znaków (client + server)
  - Rate limiting: 10 zapytań/min (feedback w UI)
  - Timeout handling: 15s dla szybkich, 240s dla dokładnych odpowiedzi
  - Secure token handling przez Supabase Auth SDK

---

## 3. User Stories

**US-003: Zadawanie pytania w języku naturalnym**
**Opis:** Jako zalogowany użytkownik, chcę móc wpisać pytanie dotyczące aktu prawnego w polu czatu i wysłać je do systemu.

**US-004: Otrzymywanie szybkiej odpowiedzi**
**Opis:** Jako użytkownik, po zadaniu pytania chcę otrzymać szybką i trafną odpowiedź, aby sprawnie kontynuować moją pracę.

**US-005: Żądanie dokładniejszej odpowiedzi**
**Opis:** Jako użytkownik, jeśli szybka odpowiedź jest niewystarczająca, chcę mieć możliwość uzyskania bardziej szczegółowej odpowiedzi.

**US-008: Udzielanie informacji zwrotnej na temat odpowiedzi**
**Opis:** Jako użytkownik, chcę móc ocenić każdą odpowiedź, aby pomóc w ulepszaniu systemu.

**US-009: Obsługa zapytań o akty spoza bazy**
**Opis:** Jako użytkownik, zadając pytanie o akt prawny, którego nie ma w bazie, chcę otrzymać jasną informację o ograniczeniach systemu.

**US-010: Onboarding nowego użytkownika**
**Opis:** Jako nowy użytkownik, po pierwszym zalogowaniu chcę zrozumieć, co aplikacja potrafi i jak z niej korzystać.

---

## 4. Endpoint Description

### 4.1. Submit Query (RAG Pipeline)
**Endpoint:** `POST /api/v1/queries`  
**Implementacja:** @.ai/implementations/02-submit-query.md  
**Typ:** Core Functionality - RAG Pipeline  
**Autentykacja:** Wymagana (JWT)  
**Złożoność:** Bardzo wysoka ⭐ **NAJWAŻNIEJSZY ENDPOINT**

**Request:**
```json
{
  "query_text": "Jakie są podstawowe prawa konsumenta w Polsce?"
}
```

**Response (202 Accepted - Immediate):**
```json
{
  "query_id": "uuid",
  "query_text": "...",
  "status": "processing",
  "created_at": "2025-11-19T10:30:00Z",
  "fast_response": {
    "status": "pending",
    "estimated_time_seconds": 10
  }
}
```

**Response (After Processing - via polling):**
```json
{
  "query_id": "uuid",
  "query_text": "...",
  "status": "completed",
  "fast_response": {
    "content": "...",
    "model_name": "mistral:7b",
    "generation_time_ms": 8500,
    "sources": [...]
  }
}
```

### 4.2. Get Query Details (Polling)
**Endpoint:** `GET /api/v1/queries/{query_id}`  
**Implementacja:** @.ai/implementations/03-05-query-management.md (Query Details)  
**Typ:** Query Management  
**Autentykacja:** Wymagana

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
  "accurate_response": {...} or null
}
```

### 4.3. Accurate Response
**Endpoint:** `POST /api/v1/queries/{query_id}/accurate-response`  
**Implementacja:** @.ai/implementations/06-accurate-response.md  
**Typ:** Accurate Response Generation  
**Autentykacja:** Wymagana

**Request:** Empty body

**Response (202 Accepted - Immediate):**
```json
{
  "query_id": "uuid",
  "accurate_response": {
    "status": "processing",
    "estimated_time_seconds": 180
  }
}
```

**Response (After Completion):**
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

### 4.5. Example Questions (Onboarding)
**Endpoint:** `GET /api/v1/onboarding/example-questions`  
**Implementacja:** @.ai/implementations/09-onboarding.md  
**Typ:** Onboarding - Static Content  
**Autentykacja:** Nie wymagana (publiczny)

**Response (200 OK):**
```json
{
  "examples": [
    {
      "id": 1,
      "question": "Jakie są podstawowe prawa konsumenta w Polsce?",
      "category": "consumer_rights"
    },
    ...
  ]
}
```

---

## 5. Endpoint Implementation

### 5.1. Submit Query
- **Backend router:** `backend/routers/queries.py`
- **Service:** `backend/services/rag_pipeline.py` (⭐ CORE)
- **Models:** `backend/models/query.py` (QuerySubmitRequest, QuerySubmitResponse, QueryDetailResponse)
- **Implementacja:** Zobacz @.ai/implementations/02-submit-query.md

### 5.2. Get Query Details
- **Backend router:** `backend/routers/queries.py`
- **Repository:** `backend/db/queries.py`
- **Models:** `backend/models/query.py` (QueryDetailResponse)
- **Implementacja:** Zobacz @.ai/implementations/03-05-query-management.md

### 5.3. Accurate Response
- **Backend router:** `backend/routers/queries.py`
- **Service:** `backend/services/rag_pipeline.py`
- **Models:** `backend/models/query.py` (AccurateResponseSubmitResponse, AccurateResponseCompletedResponse)
- **Implementacja:** Zobacz @.ai/implementations/06-accurate-response.md

### 5.4. Create/Update Rating
- **Backend router:** `backend/routers/ratings.py`
- **Repository:** `backend/db/ratings.py`
- **Models:** `backend/models/rating.py` (RatingCreateRequest, RatingResponse)
- **Implementacja:** Zobacz @.ai/implementations/07-ratings.md

### 5.5. Example Questions
- **Backend router:** `backend/routers/onboarding.py`
- **Models:** `backend/models/onboarding.py` (ExampleQuestionsResponse)
- **Implementacja:** Zobacz @.ai/implementations/09-onboarding.md

---

## 6. Type Definitions

**Frontend types:** `src/lib/types.ts`

### Query Types
- `QuerySubmitRequest` (linie 86-88)
- `QueryProcessingStatus` (linia 93)
- `QuerySubmitResponse` (linie 125-134)
- `QueryDetailResponse` (linie 143-164)
- `FastResponseData` (linie 99-105)
- `AccurateResponseData` (linie 111-117)
- `AccurateResponseSubmitResponse` (linie 206-212)
- `AccurateResponseCompletedResponse` (linie 218-227)

### Rating Types
- `RatingCreateRequest` (linie 242-245)
- `RatingResponse` (linie 255-262)
- `RatingValue` (linia 22)
- `ResponseType` (linia 23)

### Onboarding Types
- `ExampleQuestion` (linie 387-391)
- `ExampleQuestionsResponse` (linie 397-399)

### Shared Types
- `SourceReference` (linie 53-58)
- `RatingSummary` (linie 64-66)
- `RatingDetail` (linie 71-74)
- `PaginationMetadata` (linie 42-47)

### Error Types
- `ApiErrorCode` (linie 432-444)
- `ErrorResponse` (linie 455-463)

---

## 7. Tech Stack

**Frontend:**
- **Framework:** Astro 5 (SSR dla chronionych widoków)
- **React Islands:** React 19 dla interaktywnych komponentów
  - `client:load` - ChatInput, ChatMessagesContainer
  - `client:visible` - ResponseCard, RatingButtons
- **Styling:** Tailwind CSS + Shadcn/ui
- **Markdown:** `react-markdown` z `rehype-sanitize` (XSS prevention)
- **Polling:** Custom hooks (`useQueryPolling`, `useLongPolling`)
- **State Management:** React Context (`AppContext`) dla globalnego stanu

**Backend:**
- **Framework:** FastAPI (Python 3.11+)
- **RAG Pipeline:** LangChain/LlamaIndex
- **LLM:** OLLAMA (mistral:7b, gpt-oss:120b)
- **Embeddings:** OLLAMA (nomic-embed-text)
- **Database:** Supabase (PostgreSQL + pgvector)
- **Caching:** Redis (RAG context cache, 5 min TTL)

**Zobacz:** @.ai/tech-stack.md dla szczegółów infrastruktury

---

## 8. Checklist Implementacji

### Frontend (Astro + React)
- [ ] Utworzenie `src/pages/app/index.astro` lub `src/pages/app/chat.astro`
- [ ] Komponent `ChatMessagesContainer.tsx` (React island)
  - [ ] Lista query/response pairs
  - [ ] Polling z exponential backoff dla szybkich odpowiedzi
  - [ ] Auto-scroll do najnowszej wiadomości
  - [ ] Skeleton loaders podczas generowania
  - [ ] ARIA live region dla screen readers
- [ ] Komponent `ChatInput.tsx` (React island)
  - [ ] Textarea z auto-resize (max 5 linii)
  - [ ] Character counter (10-1000 znaków)
  - [ ] Rate limit indicator
  - [ ] Enter to submit, Shift+Enter for newline
  - [ ] Loading state (disabled podczas przetwarzania)
- [ ] Komponent `ResponseCard.tsx` (React island)
  - [ ] Markdown rendering z sanitizacją
  - [ ] Sources list z linkami do ISAP
  - [ ] Rating buttons
  - [ ] Detailed answer button
  - [ ] Timer cache RAG context
  - [ ] Generation time badge
- [ ] Komponent `RatingButtons.tsx` (React island)
  - [ ] Optimistic updates
  - [ ] Rollback przy błędzie
  - [ ] Toast notification po sukcesie
- [ ] Komponent `DetailedAnswerModal.tsx` (React island)
  - [ ] Modal zamykalny
  - [ ] Progress bar (indeterminate)
  - [ ] Długi polling (co 5s) z timeoutem 240s
  - [ ] Error handling (timeout, network errors)
- [ ] Komponent `WelcomeMessage.astro` (statyczny)
- [ ] Komponent `ExampleQuestions.astro` (statyczny, klikalne)
- [ ] Komponent `NoRelevantActsCard.tsx` (React island)
- [ ] Custom hooks:
  - [ ] `useQueryPolling.ts` - Exponential backoff polling
  - [ ] `useLongPolling.ts` - Długi polling dla dokładnych odpowiedzi
  - [ ] `useActiveQueries.ts` - Zarządzanie limitem 3 aktywnych zapytań
  - [ ] `useRAGContextTimer.ts` - Timer cache TTL (5 minut)
  - [ ] `useOptimisticRating.ts` - Optimistic updates dla ratingów
- [ ] React Context (`AppContext.tsx`) dla globalnego stanu

### Backend
- [ ] Endpoint `POST /api/v1/queries` (RAG Pipeline)
- [ ] Endpoint `GET /api/v1/queries/{query_id}` (Polling)
- [ ] Endpoint `POST /api/v1/queries/{query_id}/accurate-response`
- [ ] Endpoint `POST /api/v1/queries/{query_id}/ratings`
- [ ] Endpoint `GET /api/v1/onboarding/example-questions`

### Integration
- [ ] API client (`src/lib/apiClient.ts`)
- [ ] Error handling (ApiError class)
- [ ] Rate limiting feedback w UI
- [ ] Timeout handling (15s dla szybkich, 240s dla dokładnych)
- [ ] Sanitizacja Markdown (XSS prevention)

### Testing
- [ ] Test submit query
- [ ] Test polling dla szybkich odpowiedzi
- [ ] Test żądania dokładnej odpowiedzi
- [ ] Test ratingów (optimistic updates)
- [ ] Test error states (NoRelevantActsError, timeout)
- [ ] Test accessibility (keyboard navigation, screen reader)

---

## 9. Uwagi Implementacyjne

1. **RAG Pipeline:** Najbardziej złożony endpoint - implementacja 8 kroków pipeline'u
2. **Polling Strategy:** Exponential backoff (1s → 2s max) dla szybkich odpowiedzi, długi polling (co 5s) dla dokładnych
3. **Optimistic UI:** Natychmiastowe wyświetlenie pytania użytkownika przed otrzymaniem odpowiedzi
4. **Rate Limiting:** Limit 10 zapytań/min, feedback w UI
5. **Concurrent Queries:** Limit 3 równoczesnych zapytań (wskaźnik w nagłówku)
6. **RAG Context Cache:** Cache ważny 5 minut, timer z wizualnym wskaźnikiem
7. **Error Handling:** Przyjazne komunikaty dla różnych scenariuszy błędów
8. **Markdown Sanitization:** Użyj `rehype-sanitize` dla XSS prevention
9. **Accessibility:** Pełna zgodność z WCAG AA (ARIA labels, keyboard navigation)

---

**Powrót do:** [View Implementation Index](../view-implementation-index.md) | [UI Plan](../ui-plan.md) | [PRD](../prd.md) | [API Implementation Index](../api-implementation-index.md)

