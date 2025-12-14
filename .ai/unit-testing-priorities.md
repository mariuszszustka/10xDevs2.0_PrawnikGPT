# Unit Testing Priorities - PrawnikGPT

## Analiza: Które elementy warto testować i dlaczego?

### Metodyka priorytetyzacji

Elementy oceniane według kryteriów:
1. **Krytyczność biznesowa** (1-5) - wpływ na kluczowe funkcje aplikacji
2. **Złożoność logiki** (1-5) - im bardziej złożona logika, tym większe ryzyko błędów
3. **Częstotliwość zmian** (1-5) - jak często kod jest modyfikowany
4. **Podatność na błędy** (1-5) - historia bugów, edge cases
5. **Izolacja** (1-5) - łatwość testowania w izolacji

**Priorytet = (Krytyczność × 2) + Złożoność + Częstotliwość + Podatność**

---

## 🔴 PRIORYTET KRYTYCZNY (Score: 40-50)

### 1. Backend RAG Pipeline (`backend/services/rag_pipeline.py`)

**Score: 50/50** ⭐⭐⭐⭐⭐

**Dlaczego testować:**
- ✅ **Krytyczność (5/5):** Serce aplikacji - generuje odpowiedzi prawne
- ✅ **Złożoność (5/5):** Wieloetapowy proces (embedding → search → generation)
- ✅ **Częstotliwość (5/5):** Często modyfikowany (optymalizacje, nowe modele)
- ✅ **Podatność (5/5):** Wiele edge cases (brak aktów, timeout, złe embeddingi)
- ✅ **Izolacja (5/5):** Można mockować OLLAMA i Supabase

**Co testować:**
```python
# 1. Embedding generation
def test_generate_query_embedding():
    """Czy embedding ma poprawną długość (768-dim)?"""

def test_embedding_with_empty_query():
    """Jak zachowuje się dla pustego query?"""

# 2. Vector search
def test_similarity_search_returns_top_k():
    """Czy zwraca K najbardziej podobnych fragmentów?"""

def test_similarity_search_with_no_results():
    """Co się dzieje gdy nie ma wyników?"""

# 3. Context building
def test_build_context_from_chunks():
    """Czy kontekst jest poprawnie sformatowany?"""

def test_context_truncation_on_max_tokens():
    """Czy kontekst jest obcinany przy przekroczeniu max_tokens?"""

# 4. Response generation
def test_generate_fast_response():
    """Czy fast response jest generowany w <15s?"""

def test_generate_accurate_response():
    """Czy accurate response używa większego modelu?"""

# 5. Error handling
def test_handle_ollama_timeout():
    """Jak obsługiwany jest timeout OLLAMA?"""

def test_handle_no_relevant_acts_error():
    """Czy NoRelevantActsError jest poprawnie rzucany?"""
```

**Korzyści testów:**
- Wykrycie regresji przy zmianie modeli/promptów
- Zapewnienie jakości odpowiedzi
- Dokumentacja oczekiwanych zachowań
- Łatwe refaktoryzowanie

---

### 2. Frontend ChatInput Component (`src/components/chat/ChatInput.tsx`)

**Score: 44/50** ⭐⭐⭐⭐⭐

**Dlaczego testować:**
- ✅ **Krytyczność (5/5):** Główny punkt wejścia użytkownika
- ✅ **Złożoność (4/5):** Walidacja, state management, keyboard shortcuts
- ✅ **Częstotliwość (4/5):** UX improvements, nowe features
- ✅ **Podatność (5/5):** Walidacja 10-1000 znaków, edge cases
- ✅ **Izolacja (5/5):** Pure React component

**Co testować:**
```typescript
// 1. Walidacja długości
it('should disable submit for queries < 10 chars', async () => {
  // Arrange
  render(<ChatInput onSubmit={vi.fn()} />);
  const user = userEvent.setup();

  // Act
  await user.type(screen.getByRole('textbox'), 'krótkie');

  // Assert
  expect(screen.getByRole('button')).toBeDisabled();
});

it('should disable submit for queries > 1000 chars', async () => {
  // Test max length validation
});

// 2. Keyboard shortcuts
it('should submit on Enter key', async () => {
  // Verify Enter submits
});

it('should insert newline on Shift+Enter', async () => {
  // Verify multiline input
});

// 3. State management
it('should clear input after successful submit', async () => {
  // Verify reset after submit
});

// 4. Error handling
it('should show error message on submit failure', async () => {
  // Verify error display
});

// 5. Character counter
it('should show character count', () => {
  // Verify 234/1000 display
});
```

**Korzyści testów:**
- Zapewnienie UX consistency
- Brak regresji przy refaktoringu
- Dokumentacja zachowań walidacji
- Łatwiejsze debugowanie

---

### 3. Backend LLM Service (`backend/services/llm_service.py`)

**Score: 43/50** ⭐⭐⭐⭐⭐

**Dlaczego testować:**
- ✅ **Krytyczność (5/5):** Integracja z OLLAMA - kluczowa funkcjonalność
- ✅ **Złożoność (5/5):** Timeout handling, model switching, streaming
- ✅ **Częstotliwość (4/5):** Nowe modele, optymalizacje
- ✅ **Podatność (4/5):** Network errors, timeouts, model failures
- ✅ **Izolacja (4/5):** Można mockować OLLAMA API

**Co testować:**
```python
# 1. Model selection
def test_select_fast_model():
    """Czy wybiera mistral:7b dla fast response?"""

def test_select_accurate_model():
    """Czy wybiera gpt-oss:120b dla accurate response?"""

# 2. Timeout handling
def test_fast_response_timeout_15s():
    """Czy fast response ma timeout 15s?"""

def test_accurate_response_timeout_240s():
    """Czy accurate response ma timeout 240s?"""

# 3. Error handling
def test_handle_model_not_available():
    """Co się dzieje gdy model nie jest dostępny?"""

def test_handle_network_error():
    """Jak obsługiwany jest network error?"""

# 4. Response formatting
def test_parse_ollama_response():
    """Czy odpowiedź OLLAMA jest poprawnie parsowana?"""
```

**Korzyści testów:**
- Stabilność integracji z OLLAMA
- Łatwe testowanie różnych modeli
- Wykrywanie problemów z timeout
- Dokumentacja API kontraktu

---

## 🟠 PRIORYTET WYSOKI (Score: 30-39)

### 4. Backend Vector Search (`backend/services/vector_search.py`)

**Score: 38/50** ⭐⭐⭐⭐

**Dlaczego testować:**
- ✅ **Krytyczność (5/5):** Kluczowe dla RAG - wyszukiwanie semantyczne
- ✅ **Złożoność (4/5):** Cosine similarity, ranking, filtering
- ✅ **Częstotliwość (3/5):** Optymalizacje, nowe indeksy
- ✅ **Podatność (4/5):** Edge cases (brak wyników, duplikaty)
- ✅ **Izolacja (3/5):** Wymaga mock database

**Co testować:**
```python
# 1. Similarity search
def test_similarity_search_returns_top_5():
    """Czy zwraca top 5 najbardziej podobnych fragmentów?"""

def test_similarity_threshold():
    """Czy filtruje wyniki poniżej similarity threshold?"""

# 2. Ranking
def test_results_sorted_by_similarity_desc():
    """Czy wyniki są sortowane malejąco po similarity?"""

# 3. Edge cases
def test_search_with_no_results():
    """Czy zwraca pustą listę gdy brak wyników?"""

def test_search_with_duplicate_chunks():
    """Jak obsługuje duplikaty?"""

# 4. Performance
def test_search_completes_under_200ms():
    """Czy search jest szybszy niż 200ms?"""
```

---

### 5. Frontend ResponseCard Component (`src/components/chat/ResponseCard.tsx`)

**Score: 36/50** ⭐⭐⭐⭐

**Dlaczego testować:**
- ✅ **Krytyczność (5/5):** Wyświetla główną wartość aplikacji - odpowiedzi
- ✅ **Złożoność (3/5):** Markdown rendering, sources display
- ✅ **Częstotliwość (4/5):** UX improvements, styling
- ✅ **Podatność (4/5):** Markdown parsing, XSS prevention
- ✅ **Izolacja (5/5):** Pure React component

**Co testować:**
```typescript
// 1. Content rendering
it('should render fast response content', () => {
  // Verify content display
});

it('should render markdown properly', () => {
  // Test markdown rendering
});

// 2. Sources display
it('should display source legal acts', () => {
  // Verify sources list
});

it('should render clickable source links', () => {
  // Test link functionality
});

// 3. Response types
it('should distinguish fast vs accurate response', () => {
  // Verify visual distinction
});

// 4. Error states
it('should display error message when response failed', () => {
  // Verify error handling
});
```

---

### 6. Frontend RatingButtons Component (`src/components/chat/RatingButtons.tsx`)

**Score: 35/50** ⭐⭐⭐⭐

**Dlaczego testować:**
- ✅ **Krytyczność (4/5):** Feedback system - ważny dla quality monitoring
- ✅ **Złożoność (4/5):** Optimistic updates, UPSERT logic
- ✅ **Częstotliwość (3/5):** Rzadkie zmiany po stabilizacji
- ✅ **Podatność (4/5):** Race conditions, network failures
- ✅ **Izolacja (5/5):** Pure React component

**Co testować:**
```typescript
// 1. Rating actions
it('should call onRate with "up" when thumbs up clicked', async () => {
  const mockOnRate = vi.fn();
  render(<RatingButtons onRate={mockOnRate} />);

  await userEvent.click(screen.getByTestId('rating-thumbs-up'));

  expect(mockOnRate).toHaveBeenCalledWith('up');
});

// 2. Optimistic updates
it('should update UI immediately (optimistic)', async () => {
  // Verify instant feedback
});

// 3. State management
it('should allow changing rating from up to down', async () => {
  // Verify rating change
});

// 4. Disabled state
it('should disable buttons while submitting', async () => {
  // Verify loading state
});
```

---

### 7. Backend API Endpoints (`backend/routers/queries.py`)

**Score: 34/50** ⭐⭐⭐⭐

**Dlaczego testować:**
- ✅ **Krytyczność (5/5):** API - główny interface aplikacji
- ✅ **Złożoność (3/5):** Routing, validation, authorization
- ✅ **Częstotliwość (3/5):** Nowe endpoints, zmiany w API
- ✅ **Podatność (4/5):** Validation errors, auth failures
- ✅ **Izolacja (4/5):** TestClient FastAPI

**Co testować:**
```python
# 1. POST /api/v1/queries
def test_submit_query_success(client, auth_headers):
    """Czy poprawne query zwraca 201 Created?"""

def test_submit_query_validation_error(client, auth_headers):
    """Czy query < 10 znaków zwraca 422?"""

# 2. GET /api/v1/queries
def test_get_queries_pagination(client, auth_headers):
    """Czy paginacja działa poprawnie?"""

def test_get_queries_unauthorized(client):
    """Czy brak auth zwraca 401?"""

# 3. DELETE /api/v1/queries/{id}
def test_delete_query_cascade_ratings(client, auth_headers):
    """Czy usunięcie query usuwa ratings?"""

# 4. Rate limiting
def test_rate_limit_10_per_minute(client, auth_headers):
    """Czy 11. request zwraca 429?"""
```

---

## 🟡 PRIORYTET ŚREDNI (Score: 20-29)

### 8. Frontend LoginForm Component (`src/components/auth/LoginForm.tsx`)

**Score: 28/50** ⭐⭐⭐

**Dlaczego testować:**
- ✅ **Krytyczność (4/5):** Gate do aplikacji
- ✅ **Złożoność (3/5):** Walidacja, error handling
- ✅ **Częstotliwość (2/5):** Stabilny po implementacji
- ✅ **Podatność (3/5):** Edge cases (empty fields, network errors)
- ✅ **Izolacja (5/5):** Pure React component

**Co testować:**
```typescript
// 1. Validation
it('should validate email format', async () => {
  // Test email validation
});

it('should require password', async () => {
  // Test password requirement
});

// 2. Submit handling
it('should call onSubmit with credentials', async () => {
  // Verify form submission
});

// 3. Error display
it('should display error message on login failure', async () => {
  // Verify error handling
});

// 4. Loading state
it('should disable submit button while loading', async () => {
  // Verify loading state
});
```

---

### 9. Frontend HistoryList Component (`src/components/history/HistoryList.tsx`)

**Score: 26/50** ⭐⭐⭐

**Dlaczego testować:**
- ✅ **Krytyczność (3/5):** Ważna feature, ale nie critical path
- ✅ **Złożoność (4/5):** Paginacja, infinite scroll, delete
- ✅ **Częstotliwość (3/5):** UX improvements
- ✅ **Podatność (3/5):** Edge cases (pusta lista, błędy paginacji)
- ✅ **Izolacja (5/5):** Pure React component

**Co testować:**
```typescript
// 1. Data display
it('should render list of queries', () => {
  // Verify list rendering
});

// 2. Pagination
it('should load more queries when "Load More" clicked', async () => {
  // Verify pagination
});

// 3. Empty state
it('should show empty state when no queries', () => {
  // Verify empty state
});

// 4. Delete functionality
it('should remove query from list after delete', async () => {
  // Verify optimistic delete
});
```

---

### 10. Backend Middleware Auth (`backend/middleware/auth.py`)

**Score: 25/50** ⭐⭐⭐

**Dlaczego testować:**
- ✅ **Krytyczność (4/5):** Security - autoryzacja
- ✅ **Złożoność (3/5):** JWT validation, user extraction
- ✅ **Częstotliwość (2/5):** Stabilny po implementacji
- ✅ **Podatność (3/5):** Security vulnerabilities
- ✅ **Izolacja (4/5):** Można mockować Supabase

**Co testować:**
```python
# 1. JWT validation
def test_valid_jwt_allows_access():
    """Czy poprawny JWT daje dostęp?"""

def test_expired_jwt_returns_401():
    """Czy wygasły JWT zwraca 401?"""

# 2. User extraction
def test_extract_user_id_from_jwt():
    """Czy user_id jest poprawnie wyciągany z JWT?"""

# 3. Error handling
def test_missing_auth_header_returns_401():
    """Czy brak header zwraca 401?"""
```

---

## 🟢 PRIORYTET NISKI (Score: 10-19)

### 11. UI Components (Shadcn/ui)

**Score: 10/50** ⭐

**Dlaczego NIE testować:**
- ❌ **Krytyczność (2/5):** External library, well-tested
- ❌ **Złożoność (1/5):** Proste komponenty
- ❌ **Częstotliwość (1/5):** Rzadko modyfikowane
- ❌ **Podatność (1/5):** Stabilne komponenty
- ✅ **Izolacja (5/5):** Łatwe do testowania, ale niepotrzebne

**Rekomendacja:**
- ⛔ **NIE testuj** - to external library
- ✅ Testuj tylko customizacje (jeśli dodasz własną logikę)

---

### 12. Layout Components (`src/components/layout/Header.astro`, `Footer.astro`)

**Score: 12/50** ⭐

**Dlaczego NIE testować:**
- ❌ **Krytyczność (2/5):** Statyczne elementy UI
- ❌ **Złożoność (1/5):** Prosty markup
- ❌ **Częstotliwość (2/5):** Rzadkie zmiany
- ❌ **Podatność (1/5):** Mało edge cases
- ✅ **Izolacja (5/5):** Łatwe do testowania

**Rekomendacja:**
- ⛔ **NIE testuj jednostkowo** - lepiej E2E (visual regression)
- ✅ E2E testy wystarczą (screenshot tests)

---

## 📊 PODSUMOWANIE PRIORYTETÓW

```
═══════════════════════════════════════════════════════════════════
                    TESTING PRIORITIES MATRIX
═══════════════════════════════════════════════════════════════════

🔴 KRYTYCZNY (40-50 pkt) - Testuj ZAWSZE
├─ RAG Pipeline (50/50)                    ⭐⭐⭐⭐⭐
├─ ChatInput (44/50)                       ⭐⭐⭐⭐⭐
└─ LLM Service (43/50)                     ⭐⭐⭐⭐⭐

🟠 WYSOKI (30-39 pkt) - Testuj PRIORYTETOWO
├─ Vector Search (38/50)                   ⭐⭐⭐⭐
├─ ResponseCard (36/50)                    ⭐⭐⭐⭐
├─ RatingButtons (35/50)                   ⭐⭐⭐⭐
└─ API Endpoints (34/50)                   ⭐⭐⭐⭐

🟡 ŚREDNI (20-29 pkt) - Testuj gdy jest czas
├─ LoginForm (28/50)                       ⭐⭐⭐
├─ HistoryList (26/50)                     ⭐⭐⭐
└─ Auth Middleware (25/50)                 ⭐⭐⭐

🟢 NISKI (10-19 pkt) - Opcjonalnie/Nie testuj
├─ Layout Components (12/50)               ⭐
└─ Shadcn/ui Components (10/50)            ⭐

═══════════════════════════════════════════════════════════════════
```

---

## 🎯 STRATEGIA TESTOWANIA

### Faza 1: MVP (Tydzień 1-2)
**Cel: 50% coverage, 100% critical paths**

```bash
✅ Backend:
   ├─ RAG Pipeline (100% coverage)
   ├─ LLM Service (100% coverage)
   └─ Vector Search (80% coverage)

✅ Frontend:
   ├─ ChatInput (100% coverage)
   ├─ ResponseCard (80% coverage)
   └─ RatingButtons (80% coverage)
```

### Faza 2: Stabilizacja (Tydzień 3-4)
**Cel: 70% coverage**

```bash
✅ Backend:
   ├─ API Endpoints (100% coverage)
   └─ Auth Middleware (100% coverage)

✅ Frontend:
   ├─ LoginForm (100% coverage)
   └─ HistoryList (80% coverage)
```

### Faza 3: Optymalizacja (Tydzień 5+)
**Cel: 80%+ coverage**

```bash
✅ Edge cases dla wszystkich komponentów
✅ Performance tests
✅ Security tests
```

---

## 💡 KLUCZOWE ZASADY

### 1. **Testuj logikę biznesową, nie implementację**

```typescript
// ❌ ZŁE - testuje implementację
it('should call useState with false', () => {
  expect(useState).toHaveBeenCalledWith(false);
});

// ✅ DOBRE - testuje zachowanie
it('should disable submit button for short queries', () => {
  render(<ChatInput />);
  expect(screen.getByRole('button')).toBeDisabled();
});
```

### 2. **Testuj edge cases, nie happy path only**

```typescript
// ✅ DOBRE - testuj edge cases
it('should handle exactly 10 characters', () => {
  // Boundary value
});

it('should handle exactly 1000 characters', () => {
  // Boundary value
});

it('should handle empty query', () => {
  // Edge case
});

it('should handle query with only whitespace', () => {
  // Edge case
});
```

### 3. **Mockuj zależności zewnętrzne**

```typescript
// ✅ DOBRE - mock API calls
vi.mock('@/lib/apiClient', () => ({
  submitQuery: vi.fn().mockResolvedValue({ id: '123' }),
}));

// ✅ DOBRE - mock OLLAMA
@patch('services.ollama_service.generate')
def test_rag_pipeline(mock_generate):
    mock_generate.return_value = "Mocked response"
```

### 4. **Testuj accessibility**

```typescript
// ✅ DOBRE - testuj a11y
it('should have no accessibility violations', async () => {
  const { container } = render(<ChatInput />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

## 📈 ROI (Return on Investment) Testów

### Wysokie ROI (testuj to!)

```
Component           | ROI  | Powód
--------------------|------|----------------------------------------
RAG Pipeline        | 🔥🔥🔥 | Krityczne dla biznesu, często zmieniane
ChatInput           | 🔥🔥🔥 | Główny UX entry point, wiele edge cases
LLM Service         | 🔥🔥🔥 | Integracja zewnętrzna, timeouty
Vector Search       | 🔥🔥   | Performance-critical, edge cases
API Endpoints       | 🔥🔥   | Contract testing, bezpieczeństwo
```

### Niskie ROI (skip to!)

```
Component           | ROI  | Powód
--------------------|------|----------------------------------------
Shadcn/ui           | ❌    | External library, already tested
Static layouts      | ❌    | Prosty markup, lepsze E2E
Helper utilities    | 🔥    | Testuj tylko złożone (np. date parsing)
```

---

## 🚀 Quick Start

### Zacznij od tych 3 testów:

**1. Backend RAG Pipeline:**
```bash
cd backend
pytest tests/test_rag_pipeline.py -v
```

**2. Frontend ChatInput:**
```bash
npm run test -- ChatInput
```

**3. API Integration:**
```bash
cd backend
pytest tests/test_query_endpoints.py -v
```

### Jeśli wszystkie 3 przejdą = masz pokrycie critical path! ✅

---

**Created:** 2025-01-11
**Author:** Claude Code
**Version:** 1.0.0
