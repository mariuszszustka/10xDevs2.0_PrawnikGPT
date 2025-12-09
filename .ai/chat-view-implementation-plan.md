# Plan implementacji widoku Chat View

## 1. Przegląd

Chat View to główny interfejs aplikacji PrawnikGPT, umożliwiający zadawanie pytań prawnych w języku naturalnym i otrzymywanie odpowiedzi z systemu RAG. Widok wykorzystuje dwupoziomowy mechanizm odpowiedzi: szybką odpowiedź (<15s) z mniejszego modelu oraz opcjonalną dokładną odpowiedź (do 240s) z większego modelu 120B. Widok jest zbudowany w architekturze Astro 5 + React 19 islands, gdzie statyczne elementy (komunikaty powitalne, przykładowe pytania) są renderowane przez Astro, a interaktywne komponenty (input, lista wiadomości, przyciski oceny) są React islands z strategicznym użyciem dyrektyw hydratacji.

**Główne funkcjonalności:**

- Zadawanie pytań z walidacją (10-1000 znaków)
- Otrzymywanie szybkich odpowiedzi z polling (exponential backoff 1s → 2s max)
- Żądanie dokładniejszych odpowiedzi z długim pollingiem (co 5s, timeout 240s)
- Ocenianie odpowiedzi z optimistic updates
- Onboarding dla nowych użytkowników (komunikat powitalny + przykładowe pytania)
- Obsługa błędów (NoRelevantActsError, timeout, network errors)
- Rate limiting feedback (10 zapytań/min)
- Limit 3 równoczesnych zapytań z wskaźnikiem w nagłówku
- Timer cache RAG context (5 minut) z wizualnym wskaźnikiem

## 2. Routing widoku

**Ścieżka:** `/app` lub `/app/chat`  
**Plik:** `src/pages/app/index.astro` (preferowane) lub `src/pages/app/chat.astro`  
**Typ:** Astro SSR (Server-Side Rendering)  
**Autentykacja:** Wymagana (middleware sprawdzający sesję użytkownika)

**Middleware:**

- Sprawdzenie autoryzacji użytkownika przez Supabase Auth
- Przekierowanie do `/login` jeśli użytkownik nie jest zalogowany
- Dodanie Supabase client do `Astro.locals.supabase` (już zaimplementowane w `src/middleware/index.ts`)

**Layout:**

- Użycie `AppLayout.astro` (jeśli istnieje) lub `BaseLayout.astro` z nagłówkiem aplikacji
- Nagłówek zawiera: logo, nawigację (Chat, Historia, Ustawienia), User Menu, wskaźnik aktywnych zapytań (X/3)

## 3. Struktura komponentów

```
Chat View (app/index.astro)
├── AppLayout.astro (lub BaseLayout.astro)
│   ├── Header (nawigacja, User Menu, wskaźnik aktywnych zapytań)
│   └── Main Content
│       ├── WelcomeMessage.astro (warunkowo - tylko jeśli brak historii)
│       ├── ExampleQuestions.astro (warunkowo - tylko jeśli brak historii)
│       ├── ChatMessagesContainer.tsx (React island, client:load)
│       │   ├── QueryBubble.tsx (pytanie użytkownika, right-aligned)
│       │   ├── ResponseCard.tsx (React island, client:visible)
│       │   │   ├── MarkdownContent.tsx (z sanitizacją)
│       │   │   ├── SourcesList.astro (lista źródeł z linkami ISAP)
│       │   │   ├── RatingButtons.tsx (React island, client:visible)
│       │   │   ├── DetailedAnswerButton.tsx (React island)
│       │   │   └── GenerationTimeBadge.tsx
│       │   ├── NoRelevantActsCard.tsx (React island, warunkowo)
│       │   └── SkeletonLoader.tsx (podczas generowania)
│       └── ChatInput.tsx (React island, client:load)
│           ├── Textarea (auto-resize, max 5 linii)
│           ├── CharacterCounter (10-1000 znaków)
│           ├── RateLimitIndicator (X/10 zapytań)
│           └── SendButton (disabled jeśli <10 lub >1000 znaków)
└── DetailedAnswerModal.tsx (React island, warunkowo otwarty)
    ├── ModalHeader (tytuł, przycisk zamknięcia)
    ├── ProgressBar (indeterminate podczas generowania)
    ├── MarkdownContent.tsx (z sanitizacją)
    ├── SourcesList.astro
    └── RatingButtons.tsx
```

**Hierarchia komponentów:**

1. **Astro Page (`app/index.astro`):**
   - Renderuje layout i warunkowo wyświetla onboarding (WelcomeMessage, ExampleQuestions)
   - Integruje React islands z odpowiednimi dyrektywami hydratacji
   - Przekazuje dane z SSR do React islands (np. lista przykładowych pytań)

2. **React Islands (interaktywne):**
   - `ChatMessagesContainer.tsx` - Główny kontener zarządzający listą wiadomości, pollingiem i stanem
   - `ChatInput.tsx` - Pole wprowadzania z walidacją i rate limiting feedback
   - `ResponseCard.tsx` - Karta pojedynczej odpowiedzi z Markdown, źródłami, ratingami
   - `RatingButtons.tsx` - Przyciski oceny z optimistic updates
   - `DetailedAnswerModal.tsx` - Modal dla dokładnej odpowiedzi z długim pollingiem
   - `NoRelevantActsCard.tsx` - Komunikat błędu dla aktów spoza bazy

3. **Astro Components (statyczne):**
   - `WelcomeMessage.astro` - Komunikat powitalny dla nowych użytkowników
   - `ExampleQuestions.astro` - Lista przykładowych pytań (klikalne, przekazują tekst do ChatInput)
   - `SourcesList.astro` - Lista źródeł z linkami do ISAP

## 4. Szczegóły komponentów

### 4.1. ChatMessagesContainer.tsx

**Opis komponentu:**
Główny kontener zarządzający listą wiadomości czatu. Odpowiedzialny za wyświetlanie par query/response, zarządzanie pollingiem dla szybkich odpowiedzi, auto-scroll do najnowszej wiadomości oraz obsługę stanów ładowania i błędów.

**Główne elementy:**

- `<div role="log" aria-live="polite" aria-label="Historia czatu">` - Kontener wiadomości z ARIA live region
- `QueryBubble` - Komponent wyświetlający pytanie użytkownika (right-aligned bubble)
- `ResponseCard` - Komponent wyświetlający odpowiedź (left-aligned card)
- `SkeletonLoader` - Wskaźnik ładowania podczas generowania odpowiedzi
- `NoRelevantActsCard` - Komunikat błędu dla aktów spoza bazy (warunkowo)
- Auto-scroll do najnowszej wiadomości przy użyciu `useEffect` i `scrollIntoView`

**Obsługiwane zdarzenia:**

- `onQuerySubmit` - Callback wywoływany po wysłaniu zapytania (dodaje optimistic query do listy)
- `onResponseReceived` - Callback wywoływany po otrzymaniu odpowiedzi (aktualizuje listę)
- `onError` - Callback wywoływany przy błędzie (wyświetla komunikat błędu)

**Obsługiwana walidacja:**

- Sprawdzanie statusu odpowiedzi (`pending`, `processing`, `completed`, `failed`)
- Weryfikacja czy odpowiedź zawiera błąd `NoRelevantActsError` (kod błędu z API)
- Timeout handling dla szybkich odpowiedzi (15s) - wyświetlenie komunikatu błędu

**Typy:**

- **Props:**
  ```typescript
  interface ChatMessagesContainerProps {
    initialQueries?: QueryDetailResponse[]; // Opcjonalne: wstępnie załadowane zapytania z SSR
    onQuerySubmit?: (queryId: string) => void; // Callback po wysłaniu zapytania
  }
  ```
- **State:**
  - `queries: QueryDetailResponse[]` - Lista zapytań i odpowiedzi
  - `isPolling: boolean` - Flaga wskazująca aktywny polling
  - `activeQueryIds: Set<string>` - Zbiór ID zapytań w trakcie przetwarzania

**Custom Hooks:**

- `useQueryPolling(queryId: string)` - Polling z exponential backoff (1s → 2s max) dla szybkich odpowiedzi
- `useActiveQueries()` - Zarządzanie limitem 3 równoczesnych zapytań (z AppContext)

**Integracja z API:**

- `GET /api/v1/queries/{query_id}` - Polling dla aktualizacji statusu odpowiedzi
- Obsługa statusów: `pending` → `processing` → `completed` / `failed`

### 4.2. ChatInput.tsx

**Opis komponentu:**
Pole wprowadzania pytań z walidacją, licznikiem znaków, wskaźnikiem rate limit oraz obsługą klawiatury (Enter do wysłania, Shift+Enter dla nowej linii).

**Główne elementy:**

- `<form>` - Formularz z obsługą submit
- `<textarea>` - Pole tekstowe z auto-resize (max 5 linii widocznych, scroll po przekroczeniu)
- `<div>` - Licznik znaków (10-1000, kolor czerwony jeśli poza zakresem)
- `<div>` - Wskaźnik rate limit (X/10 zapytań, kolor czerwony jeśli >= 10)
- `<button type="submit">` - Przycisk wysłania (disabled jeśli <10 lub >1000 znaków lub rate limit osiągnięty)
- Auto-focus na textarea po załadowaniu komponentu

**Obsługiwane zdarzenia:**

- `onSubmit: (queryText: string) => Promise<string>` - Callback wywoływany po wysłaniu zapytania, zwraca `query_id`
- `onKeyDown` - Obsługa Enter (submit) i Shift+Enter (nowa linia)
- `onChange` - Aktualizacja wartości i walidacja w czasie rzeczywistym
- `onExampleQuestionClick` - Callback wywoływany po kliknięciu przykładowego pytania (ustawia wartość textarea)

**Obsługiwana walidacja:**

- **Client-side:**
  - Długość tekstu: 10-1000 znaków (walidacja w czasie rzeczywistym)
  - Rate limit: Maksymalnie 10 zapytań/min (sprawdzanie przez AppContext)
  - Concurrent queries: Maksymalnie 3 równoczesne zapytania (sprawdzanie przez AppContext)
- **Server-side:**
  - Walidacja przez API (kod błędu `VALIDATION_ERROR` jeśli nie spełnione)
  - Rate limit przez API (kod błędu `RATE_LIMIT_EXCEEDED` jeśli przekroczony)

**Typy:**

- **Props:**
  ```typescript
  interface ChatInputProps {
    onSubmit: (queryText: string) => Promise<string>; // Zwraca query_id
    disabled?: boolean; // Disabled podczas przetwarzania
    exampleQuestions?: ExampleQuestion[]; // Przykładowe pytania (opcjonalne, przekazywane z Astro)
  }
  ```
- **State:**
  - `queryText: string` - Wartość pola tekstowego
  - `isSubmitting: boolean` - Flaga wskazująca wysyłanie zapytania
  - `characterCount: number` - Liczba znaków (obliczana z `queryText.length`)
  - `isValid: boolean` - Flaga walidacji (10-1000 znaków)

**Custom Hooks:**

- `useRateLimit()` - Pobieranie informacji o rate limit z AppContext
- `useActiveQueries()` - Sprawdzanie liczby aktywnych zapytań z AppContext

**Integracja z API:**

- `POST /api/v1/queries` - Wysłanie zapytania
  - Request: `QuerySubmitRequest` (`query_text: string`)
  - Response: `QuerySubmitResponse` (`query_id`, `status: "processing"`, `fast_response.status: "pending"`)

### 4.3. ResponseCard.tsx

**Opis komponentu:**
Karta wyświetlająca pojedynczą odpowiedź (szybką lub dokładną) z renderowaniem Markdown, listą źródeł, przyciskami oceny, przyciskiem "Uzyskaj dokładniejszą odpowiedź" oraz wskaźnikiem czasu generowania.

**Główne elementy:**

- `<article>` - Semantic HTML dla odpowiedzi
- `MarkdownContent` - Renderowanie treści odpowiedzi z sanitizacją (`rehype-sanitize`)
- `SourcesList` - Lista źródeł z linkami do ISAP
- `RatingButtons` - Przyciski oceny (kciuk w górę/dół)
- `DetailedAnswerButton` - Przycisk żądania dokładniejszej odpowiedzi (tylko dla szybkiej odpowiedzi)
- `GenerationTimeBadge` - Badge z czasem generowania (np. "8.5s")
- `RAGContextTimer` - Wskaźnik czasu ważności cache RAG context (5 minut, wizualny timer)

**Obsługiwane zdarzenia:**

- `onRatingClick: (responseType: ResponseType, ratingValue: RatingValue) => Promise<void>` - Callback po kliknięciu oceny
- `onDetailedAnswerClick: () => Promise<void>` - Callback po kliknięciu "Uzyskaj dokładniejszą odpowiedź"
- `onSourceClick: (link: string) => void` - Callback po kliknięciu źródła (otwarcie w nowej karcie)

**Obsługiwana walidacja:**

- Sprawdzanie czy odpowiedź jest kompletna (`status === "completed"`)
- Sprawdzanie czy dokładna odpowiedź już istnieje (ukrycie przycisku "Uzyskaj dokładniejszą odpowiedź")
- Sprawdzanie czy cache RAG context jest ważny (<5 minut od utworzenia zapytania)

**Typy:**

- **Props:**
  ```typescript
  interface ResponseCardProps {
    query: QueryDetailResponse; // Pełne dane zapytania
    responseType: "fast" | "accurate"; // Typ odpowiedzi do wyświetlenia
    onRatingClick?: (responseType: ResponseType, ratingValue: RatingValue) => Promise<void>;
    onDetailedAnswerClick?: () => Promise<void>;
  }
  ```
- **ViewModel:**
  ```typescript
  interface ResponseCardViewModel {
    content: string; // Treść odpowiedzi (Markdown)
    modelName: string; // Nazwa modelu (np. "mistral:7b")
    generationTimeMs: number; // Czas generowania w milisekundach
    sources: SourceReference[]; // Lista źródeł
    rating?: RatingDetail; // Aktualna ocena (jeśli istnieje)
    hasAccurateResponse: boolean; // Czy dokładna odpowiedź już istnieje
    ragContextExpiresAt: Date | null; // Data wygaśnięcia cache RAG context
  }
  ```

**Custom Hooks:**

- `useRAGContextTimer(createdAt: string)` - Timer odliczający czas ważności cache (5 minut)
- `useOptimisticRating(queryId: string, responseType: ResponseType)` - Optimistic updates dla ratingów

**Integracja z API:**

- `POST /api/v1/queries/{query_id}/ratings` - Tworzenie/aktualizacja oceny
- `POST /api/v1/queries/{query_id}/accurate-response` - Żądanie dokładniejszej odpowiedzi

### 4.4. RatingButtons.tsx

**Opis komponentu:**
Przyciski oceny (kciuk w górę/dół) z optimistic updates, rollback przy błędzie oraz wizualną zmianą stanu po oddaniu głosu.

**Główne elementy:**

- `<button aria-label="Oceń pozytywnie">` - Przycisk kciuk w górę
- `<button aria-label="Oceń negatywnie">` - Przycisk kciuk w dół
- Wizualna zmiana stanu: aktywny przycisk (wypełniony kolor), nieaktywny (disabled, szary)
- Toast notification po sukcesie (opcjonalnie, przez AppContext)

**Obsługiwane zdarzenia:**

- `onClick: (ratingValue: RatingValue) => Promise<void>` - Callback po kliknięciu oceny
- Optimistic update: Natychmiastowa zmiana stanu wizualnego przed otrzymaniem odpowiedzi z API
- Rollback: Przywrócenie poprzedniego stanu przy błędzie API

**Obsługiwana walidacja:**

- Sprawdzanie czy ocena już istnieje (blokada drugiego przycisku)
- Sprawdzanie czy odpowiedź jest kompletna (tylko kompletne odpowiedzi można oceniać)

**Typy:**

- **Props:**
  ```typescript
  interface RatingButtonsProps {
    queryId: string;
    responseType: ResponseType; // 'fast' | 'accurate'
    currentRating?: RatingDetail; // Aktualna ocena (jeśli istnieje)
    onRatingChange?: (rating: RatingDetail) => void; // Callback po zmianie oceny
  }
  ```
- **State:**
  - `optimisticRating: RatingValue | null` - Optimistic rating (tymczasowy stan)
  - `isSubmitting: boolean` - Flaga wskazująca wysyłanie oceny

**Custom Hooks:**

- `useOptimisticRating(queryId: string, responseType: ResponseType)` - Logika optimistic updates z rollback

**Integracja z API:**

- `POST /api/v1/queries/{query_id}/ratings` - Tworzenie/aktualizacja oceny
  - Request: `RatingCreateRequest` (`response_type`, `rating_value`)
  - Response: `RatingResponse` (201 Created dla nowej, 200 OK dla aktualizacji)

### 4.5. DetailedAnswerModal.tsx

**Opis komponentu:**
Modal wyświetlający dokładną odpowiedź z długim pollingiem (co 5s, timeout 240s), progress barem podczas generowania oraz możliwością zamknięcia.

**Główne elementy:**

- `<div role="dialog" aria-modal="true" aria-labelledby="modal-title">` - Modal z ARIA attributes
- `<button aria-label="Zamknij modal">` - Przycisk zamknięcia (X w prawym górnym rogu)
- `ProgressBar` - Indeterminate progress bar podczas generowania
- `MarkdownContent` - Renderowanie treści odpowiedzi z sanitizacją
- `SourcesList` - Lista źródeł
- `RatingButtons` - Przyciski oceny
- Focus trap: Focus pozostaje w modalu, przywrócenie focus po zamknięciu

**Obsługiwane zdarzenia:**

- `onClose: () => void` - Callback wywoływany po zamknięciu modala (ESC, kliknięcie backdrop, przycisk X)
- `onRatingClick: (ratingValue: RatingValue) => Promise<void>` - Callback po kliknięciu oceny
- `onEscapeKey` - Zamknięcie modala klawiszem ESC

**Obsługiwana walidacja:**

- Sprawdzanie statusu odpowiedzi (`pending`, `processing`, `completed`, `failed`)
- Timeout handling (240s) - wyświetlenie komunikatu błędu z możliwością ponowienia
- Sprawdzanie czy cache RAG context jest ważny (jeśli wygasł, wyświetlenie komunikatu)

**Typy:**

- **Props:**
  ```typescript
  interface DetailedAnswerModalProps {
    queryId: string;
    isOpen: boolean;
    onClose: () => void;
    onRatingClick?: (ratingValue: RatingValue) => Promise<void>;
  }
  ```
- **State:**
  - `accurateResponse: AccurateResponseData | null` - Dane dokładnej odpowiedzi
  - `isPolling: boolean` - Flaga wskazująca aktywny polling
  - `timeoutReached: boolean` - Flaga wskazująca timeout (240s)

**Custom Hooks:**

- `useLongPolling(queryId: string, timeout: number = 240000)` - Długi polling co 5s z timeoutem 240s
- `useFocusTrap(isOpen: boolean)` - Focus trap dla modala

**Integracja z API:**

- `POST /api/v1/queries/{query_id}/accurate-response` - Żądanie dokładniejszej odpowiedzi
  - Request: Empty body
  - Response (202 Accepted): `AccurateResponseSubmitResponse` (`status: "processing"`, `estimated_time_seconds: 180`)
- `GET /api/v1/queries/{query_id}` - Polling dla aktualizacji statusu (co 5s)
  - Response: `QueryDetailResponse` z `accurate_response.status: "completed"` lub `"failed"`

### 4.6. WelcomeMessage.astro

**Opis komponentu:**
Statyczny komponent Astro wyświetlający komunikat powitalny dla nowych użytkowników (tylko jeśli brak historii zapytań).

**Główne elementy:**

- `<section>` - Sekcja z komunikatem powitalnym
- `<h2>` - Tytuł: "Witaj w PrawnikGPT!"
- `<p>` - Opis zakresu MVP i funkcjonalności
- `<p>` - Informacja o ograniczeniach (20k ustaw)

**Obsługiwane zdarzenia:**

- Brak (komponent statyczny)

**Obsługiwana walidacja:**

- Warunek wyświetlenia: `hasQueryHistory === false` (sprawdzane w Astro page)

**Typy:**

- **Props:**
  ```typescript
  interface WelcomeMessageProps {
    // Brak props (komponent statyczny)
  }
  ```

### 4.7. ExampleQuestions.astro

**Opis komponentu:**
Statyczny komponent Astro wyświetlający listę przykładowych pytań (klikalne, przekazują tekst do ChatInput).

**Główne elementy:**

- `<section>` - Sekcja z przykładowymi pytaniami
- `<h3>` - Tytuł: "Przykładowe pytania"
- `<ul>` - Lista przykładowych pytań
- `<button>` - Przyciski z przykładowymi pytaniami (klikalne, przekazują tekst do ChatInput przez event)

**Obsługiwane zdarzenia:**

- `onExampleQuestionClick: (question: string) => void` - Callback wywoływany po kliknięciu przykładowego pytania (przekazywany do ChatInput przez Astro)

**Obsługiwana walidacja:**

- Warunek wyświetlenia: `hasQueryHistory === false` (sprawdzane w Astro page)
- Sprawdzanie czy lista przykładowych pytań nie jest pusta

**Typy:**

- **Props:**
  ```typescript
  interface ExampleQuestionsProps {
    examples: ExampleQuestion[]; // Lista przykładowych pytań z API
    onExampleQuestionClick?: (question: string) => void; // Callback przekazywany do ChatInput
  }
  ```

**Integracja z API:**

- `GET /api/v1/onboarding/example-questions` - Pobranie listy przykładowych pytań (wywoływane w Astro page, SSR)

### 4.8. SourcesList.astro

**Opis komponentu:**
Statyczny komponent Astro wyświetlający listę źródeł z linkami do ISAP.

**Główne elementy:**

- `<section>` - Sekcja z źródłami
- `<h4>` - Tytuł: "Źródła"
- `<ul>` - Lista źródeł
- `<li>` - Pozycja źródła z linkiem
- `<a target="_blank" rel="noopener noreferrer">` - Link do ISAP (otwarcie w nowej karcie)

**Obsługiwane zdarzenia:**

- Brak (komponent statyczny, linki otwierają się w nowej karcie)

**Obsługiwana walidacja:**

- Sprawdzanie czy lista źródeł nie jest pusta
- Walidacja URL (link do ISAP)

**Typy:**

- **Props:**
  ```typescript
  interface SourcesListProps {
    sources: SourceReference[]; // Lista źródeł
  }
  ```

### 4.9. NoRelevantActsCard.tsx

**Opis komponentu:**
React island wyświetlający komunikat błędu dla zapytań o akty spoza bazy (NoRelevantActsError).

**Główne elementy:**

- `<div role="alert">` - Alert z komunikatem błędu
- `<h3>` - Tytuł: "Akt prawny nie został znaleziony"
- `<p>` - Komunikat: "Przepraszam, moja baza wiedzy jest na razie ograniczona..."
- `<button>` - Przycisk "Spróbuj ponownie" (opcjonalnie)

**Obsługiwane zdarzenia:**

- `onRetry?: () => void` - Callback wywoływany po kliknięciu "Spróbuj ponownie"

**Obsługiwana walidacja:**

- Warunek wyświetlenia: `errorCode === "NO_RELEVANT_ACTS"` (kod błędu z API)

**Typy:**

- **Props:**
  ```typescript
  interface NoRelevantActsCardProps {
    queryText: string; // Tekst zapytania (do wyświetlenia w komunikacie)
    onRetry?: () => void; // Callback do ponowienia zapytania
  }
  ```

## 5. Typy

### 5.1. Typy DTO (Data Transfer Objects)

Wszystkie typy DTO są zdefiniowane w `src/lib/types.ts` i pochodzą z dokumentacji API:

**QuerySubmitRequest:**

```typescript
interface QuerySubmitRequest {
  query_text: string; // 10-1000 znaków, required
}
```

**QuerySubmitResponse:**

```typescript
interface QuerySubmitResponse {
  query_id: string;
  query_text: string;
  status: QueryProcessingStatus; // "pending" | "processing" | "completed" | "failed"
  created_at: string; // ISO 8601
  fast_response: {
    status: QueryProcessingStatus;
    estimated_time_seconds: number;
  };
}
```

**QueryDetailResponse:**

```typescript
interface QueryDetailResponse {
  query_id: string;
  query_text: string;
  status: QueryProcessingStatus;
  created_at: string;
  fast_response: {
    status: QueryProcessingStatus;
    content?: string; // Markdown
    model_name?: string; // np. "mistral:7b"
    generation_time_ms?: number;
    sources?: SourceReference[];
    rating?: RatingDetail;
  };
  accurate_response: {
    status: QueryProcessingStatus;
    content?: string; // Markdown
    model_name?: string; // np. "gpt-oss:120b"
    generation_time_ms?: number;
    sources?: SourceReference[];
    rating?: RatingDetail;
  } | null;
}
```

**AccurateResponseSubmitResponse:**

```typescript
interface AccurateResponseSubmitResponse {
  query_id: string;
  accurate_response: {
    status: QueryProcessingStatus; // "processing"
    estimated_time_seconds: number; // np. 180
  };
}
```

**RatingCreateRequest:**

```typescript
interface RatingCreateRequest {
  response_type: ResponseType; // "fast" | "accurate"
  rating_value: RatingValue; // "up" | "down"
}
```

**RatingResponse:**

```typescript
interface RatingResponse {
  rating_id: string;
  query_id: string;
  response_type: ResponseType;
  rating_value: RatingValue;
  created_at: string;
  updated_at: string;
}
```

**ExampleQuestionsResponse:**

```typescript
interface ExampleQuestionsResponse {
  examples: ExampleQuestion[];
}
```

**ExampleQuestion:**

```typescript
interface ExampleQuestion {
  id: number;
  question: string;
  category: "consumer_rights" | "civil_law" | "labor_law" | "criminal_law";
}
```

**SourceReference:**

```typescript
interface SourceReference {
  act_title: string;
  article: string;
  link: string; // URL do ISAP
  chunk_id: string;
}
```

**RatingDetail:**

```typescript
interface RatingDetail {
  rating_id: string;
  value: RatingValue; // "up" | "down"
  created_at: string;
}
```

**ErrorResponse:**

```typescript
interface ErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: ErrorDetails;
    timestamp: string;
    request_id?: string;
  };
}
```

**ApiErrorCode:**

```typescript
type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "GONE"
  | "RATE_LIMIT_EXCEEDED"
  | "INTERNAL_SERVER_ERROR"
  | "SERVICE_UNAVAILABLE"
  | "GATEWAY_TIMEOUT"
  | "GENERATION_TIMEOUT"
  | "LLM_SERVICE_UNAVAILABLE"
  | "NO_RELEVANT_ACTS"; // Dodatkowy kod dla aktów spoza bazy
```

### 5.2. Typy ViewModel (dla komponentów)

**ResponseCardViewModel:**

```typescript
interface ResponseCardViewModel {
  content: string; // Treść odpowiedzi (Markdown)
  modelName: string; // Nazwa modelu
  generationTimeMs: number; // Czas generowania
  sources: SourceReference[]; // Lista źródeł
  rating?: RatingDetail; // Aktualna ocena
  hasAccurateResponse: boolean; // Czy dokładna odpowiedź istnieje
  ragContextExpiresAt: Date | null; // Data wygaśnięcia cache (5 min od createdAt)
}
```

**ChatInputViewModel:**

```typescript
interface ChatInputViewModel {
  queryText: string;
  characterCount: number;
  isValid: boolean; // 10-1000 znaków
  rateLimitInfo: {
    used: number;
    limit: number; // 10
    resetAt: Date | null;
  };
  activeQueriesCount: number; // 0-3
  canSubmit: boolean; // isValid && rateLimitInfo.used < limit && activeQueriesCount < 3
}
```

**DetailedAnswerModalViewModel:**

```typescript
interface DetailedAnswerModalViewModel {
  queryId: string;
  accurateResponse: AccurateResponseData | null;
  isPolling: boolean;
  timeoutReached: boolean; // true jeśli timeout 240s
  ragContextExpiresAt: Date | null; // Data wygaśnięcia cache
}
```

## 6. Zarządzanie stanem

### 6.1. Globalny stan (AppContext)

**AppContext.tsx:**

```typescript
interface AppContextType {
  // Aktywne zapytania (limit 3)
  activeQueries: Set<string>; // Set<query_id>
  setActiveQueries: (queries: Set<string>) => void;

  // Sesja użytkownika
  userSession: Session | null;
  setUserSession: (session: Session | null) => void;

  // Rate limit info
  rateLimitInfo: {
    used: number;
    limit: number; // 10
    resetAt: Date | null;
  } | null;
  setRateLimitInfo: (info: RateLimitInfo | null) => void;
}
```

**Użycie:**

- Provider w `AppLayout.astro` (lub `BaseLayout.astro` z nagłówkiem)
- Consume w React islands przez `useContext(AppContext)`
- Aktualizacja rate limit info z nagłówków odpowiedzi API (`X-RateLimit-*`)

### 6.2. Lokalny stan komponentów

**ChatMessagesContainer:**

- `queries: QueryDetailResponse[]` - Lista zapytań i odpowiedzi
- `isPolling: boolean` - Flaga aktywności polling
- `activeQueryIds: Set<string>` - Zbiór ID zapytań w trakcie przetwarzania

**ChatInput:**

- `queryText: string` - Wartość pola tekstowego
- `isSubmitting: boolean` - Flaga wysyłania zapytania
- `characterCount: number` - Liczba znaków (obliczana)

**ResponseCard:**

- `isExpanded: boolean` - Flaga rozwinięcia (dla przyszłych funkcji)
- `ragContextTimer: number` - Pozostały czas cache (w sekundach)

**RatingButtons:**

- `optimisticRating: RatingValue | null` - Optimistic rating
- `isSubmitting: boolean` - Flaga wysyłania oceny

**DetailedAnswerModal:**

- `accurateResponse: AccurateResponseData | null` - Dane dokładnej odpowiedzi
- `isPolling: boolean` - Flaga aktywności polling
- `timeoutReached: boolean` - Flaga timeout

### 6.3. Custom Hooks

**useQueryPolling(queryId: string):**

```typescript
function useQueryPolling(queryId: string) {
  // Exponential backoff: 1s → 1.5s → 2s (max)
  // Timeout: 15s dla szybkich odpowiedzi
  // Zwraca: { query: QueryDetailResponse | null, isPolling: boolean, error: ApiError | null }
}
```

**useLongPolling(queryId: string, timeout: number = 240000):**

```typescript
function useLongPolling(queryId: string, timeout: number = 240000) {
  // Polling co 5s
  // Timeout: 240s (domyślnie)
  // Zwraca: { accurateResponse: AccurateResponseData | null, isPolling: boolean, timeoutReached: boolean, error: ApiError | null }
}
```

**useActiveQueries():**

```typescript
function useActiveQueries() {
  // Pobiera activeQueries z AppContext
  // Zwraca: { activeQueries: Set<string>, addQuery: (id: string) => void, removeQuery: (id: string) => void, canAddQuery: boolean }
}
```

**useRAGContextTimer(createdAt: string):**

```typescript
function useRAGContextTimer(createdAt: string) {
  // Timer odliczający czas ważności cache (5 minut od createdAt)
  // Zwraca: { secondsRemaining: number, isExpiring: boolean (<1 minuta) }
}
```

**useOptimisticRating(queryId: string, responseType: ResponseType):**

```typescript
function useOptimisticRating(queryId: string, responseType: ResponseType) {
  // Optimistic updates dla ratingów
  // Zwraca: { rating: RatingValue | null, isSubmitting: boolean, handleRating: (value: RatingValue) => Promise<void> }
}
```

**useRateLimit():**

```typescript
function useRateLimit() {
  // Pobiera rateLimitInfo z AppContext
  // Zwraca: { used: number, limit: number, resetAt: Date | null, canSubmit: boolean }
}
```

**useFocusTrap(isOpen: boolean):**

```typescript
function useFocusTrap(isOpen: boolean) {
  // Focus trap dla modala
  // Trap focus w modalu, przywrócenie focus po zamknięciu
}
```

## 7. Integracja API

### 7.1. Submit Query

**Endpoint:** `POST /api/v1/queries`  
**Metoda API Client:** `apiPost<QuerySubmitResponse>('/api/v1/queries', request)`

**Request:**

```typescript
const request: QuerySubmitRequest = {
  query_text: string; // 10-1000 znaków
};
```

**Response (202 Accepted):**

```typescript
const response: QuerySubmitResponse = {
  query_id: string;
  query_text: string;
  status: "processing";
  created_at: string;
  fast_response: {
    status: "pending";
    estimated_time_seconds: number; // np. 10
  };
};
```

**Obsługa:**

- Po otrzymaniu odpowiedzi, dodanie optimistic query do listy w `ChatMessagesContainer`
- Rozpoczęcie polling przez `useQueryPolling(query_id)`
- Aktualizacja `activeQueries` w AppContext
- Parsowanie nagłówków `X-RateLimit-*` i aktualizacja `rateLimitInfo` w AppContext

**Błędy:**

- `VALIDATION_ERROR` (400) - Nieprawidłowa długość tekstu → wyświetlenie komunikatu w ChatInput
- `RATE_LIMIT_EXCEEDED` (429) - Przekroczony limit → wyświetlenie komunikatu w ChatInput
- `UNAUTHORIZED` (401) - Brak autoryzacji → przekierowanie do `/login`
- `SERVICE_UNAVAILABLE` (503) - Błąd serwera → wyświetlenie komunikatu błędu

### 7.2. Get Query Details (Polling)

**Endpoint:** `GET /api/v1/queries/{query_id}`  
**Metoda API Client:** `apiGet<QueryDetailResponse>(`/api/v1/queries/${queryId}`)`

**Response (200 OK):**

```typescript
const response: QueryDetailResponse = {
  query_id: string;
  query_text: string;
  status: "completed" | "failed";
  created_at: string;
  fast_response: {
    status: "completed" | "failed";
    content?: string; // Markdown
    model_name?: string;
    generation_time_ms?: number;
    sources?: SourceReference[];
    rating?: RatingDetail;
  };
  accurate_response: {...} | null;
};
```

**Obsługa:**

- Polling z exponential backoff (1s → 1.5s → 2s max) przez `useQueryPolling`
- Aktualizacja listy w `ChatMessagesContainer` po otrzymaniu odpowiedzi
- Zatrzymanie polling po `status === "completed"` lub `status === "failed"`
- Timeout 15s dla szybkich odpowiedzi

**Błędy:**

- `NOT_FOUND` (404) - Zapytanie nie istnieje → wyświetlenie komunikatu błędu
- `GATEWAY_TIMEOUT` (504) - Timeout → wyświetlenie komunikatu błędu z możliwością ponowienia
- `GENERATION_TIMEOUT` - Timeout generowania → wyświetlenie komunikatu błędu

### 7.3. Accurate Response

**Endpoint:** `POST /api/v1/queries/{query_id}/accurate-response`  
**Metoda API Client:** `apiPost<AccurateResponseSubmitResponse>(`/api/v1/queries/${queryId}/accurate-response`, {})`

**Request:** Empty body

**Response (202 Accepted):**

```typescript
const response: AccurateResponseSubmitResponse = {
  query_id: string;
  accurate_response: {
    status: "processing";
    estimated_time_seconds: number; // np. 180
  };
};
```

**Obsługa:**

- Po otrzymaniu odpowiedzi, otwarcie `DetailedAnswerModal`
- Rozpoczęcie długiego polling przez `useLongPolling(query_id, 240000)`
- Polling co 5s do czasu `status === "completed"` lub `status === "failed"`
- Timeout 240s

**Błędy:**

- `NOT_FOUND` (404) - Zapytanie nie istnieje → wyświetlenie komunikatu błędu
- `CONFLICT` (409) - Dokładna odpowiedź już istnieje → aktualizacja modala
- `GATEWAY_TIMEOUT` (504) - Timeout → wyświetlenie komunikatu błędu z możliwością ponowienia
- `GENERATION_TIMEOUT` - Timeout generowania → wyświetlenie komunikatu błędu

### 7.4. Create/Update Rating

**Endpoint:** `POST /api/v1/queries/{query_id}/ratings`  
**Metoda API Client:** `apiPost<RatingResponse>(`/api/v1/queries/${queryId}/ratings`, request)`

**Request:**

```typescript
const request: RatingCreateRequest = {
  response_type: "fast" | "accurate";
  rating_value: "up" | "down";
};
```

**Response (201 Created / 200 OK):**

```typescript
const response: RatingResponse = {
  rating_id: string;
  query_id: string;
  response_type: "fast" | "accurate";
  rating_value: "up" | "down";
  created_at: string;
  updated_at: string;
};
```

**Obsługa:**

- Optimistic update przez `useOptimisticRating`
- Natychmiastowa zmiana stanu wizualnego przed otrzymaniem odpowiedzi
- Rollback przy błędzie API
- Toast notification po sukcesie (opcjonalnie)

**Błędy:**

- `VALIDATION_ERROR` (400) - Nieprawidłowe parametry → rollback optimistic update
- `NOT_FOUND` (404) - Zapytanie nie istnieje → rollback optimistic update
- `UNAUTHORIZED` (401) - Brak autoryzacji → przekierowanie do `/login`

### 7.5. Example Questions

**Endpoint:** `GET /api/v1/onboarding/example-questions`  
**Metoda API Client:** `apiGet<ExampleQuestionsResponse>('/api/v1/onboarding/example-questions')`

**Response (200 OK):**

```typescript
const response: ExampleQuestionsResponse = {
  examples: ExampleQuestion[];
};
```

**Obsługa:**

- Wywołanie w Astro page (SSR) przed renderowaniem
- Przekazanie listy do `ExampleQuestions.astro`
- Kliknięcie przykładowego pytania przekazuje tekst do `ChatInput`

**Błędy:**

- `SERVICE_UNAVAILABLE` (503) - Błąd serwera → ukrycie komponentu `ExampleQuestions.astro`

## 8. Interakcje użytkownika

### 8.1. Zadawanie pytania (US-003)

**Przepływ:**

1. Użytkownik wpisuje tekst w `ChatInput` (textarea)
2. Licznik znaków aktualizuje się w czasie rzeczywistym (10-1000)
3. Przycisk "Wyślij" jest disabled jeśli <10 lub >1000 znaków lub rate limit osiągnięty
4. Użytkownik klika "Wyślij" lub naciska Enter
5. `ChatInput` wywołuje `onSubmit(queryText)`
6. Optimistic query jest dodawany do listy w `ChatMessagesContainer` (right-aligned bubble)
7. `ChatInput` wywołuje `POST /api/v1/queries`
8. Po otrzymaniu `query_id`, rozpoczyna się polling przez `useQueryPolling`
9. Skeleton loader jest wyświetlany podczas generowania
10. Po otrzymaniu odpowiedzi, `ResponseCard` jest wyświetlany (left-aligned card)
11. Auto-scroll do najnowszej wiadomości

**Obsługa błędów:**

- `VALIDATION_ERROR` → wyświetlenie komunikatu w ChatInput
- `RATE_LIMIT_EXCEEDED` → wyświetlenie komunikatu w ChatInput z czasem resetu
- `SERVICE_UNAVAILABLE` → wyświetlenie komunikatu błędu z możliwością ponowienia

### 8.2. Otrzymywanie szybkiej odpowiedzi (US-004)

**Przepływ:**

1. Polling przez `useQueryPolling` (exponential backoff 1s → 2s max)
2. `ResponseCard` wyświetla odpowiedź z Markdown (z sanitizacją)
3. `SourcesList` wyświetla listę źródeł z linkami do ISAP
4. `RatingButtons` wyświetla przyciski oceny
5. `DetailedAnswerButton` wyświetla przycisk "Uzyskaj dokładniejszą odpowiedź"
6. `GenerationTimeBadge` wyświetla czas generowania (np. "8.5s")
7. Auto-scroll do najnowszej wiadomości

**Obsługa błędów:**

- Timeout 15s → wyświetlenie komunikatu błędu z możliwością ponowienia
- `GENERATION_TIMEOUT` → wyświetlenie komunikatu błędu
- `NO_RELEVANT_ACTS` → wyświetlenie `NoRelevantActsCard` z komunikatem

### 8.3. Żądanie dokładniejszej odpowiedzi (US-005)

**Przepływ:**

1. Użytkownik klika "Uzyskaj dokładniejszą odpowiedź" w `ResponseCard`
2. Przycisk zmienia się we wskaźnik ładowania (`aria-busy="true"`)
3. `ResponseCard` wywołuje `onDetailedAnswerClick()`
4. `POST /api/v1/queries/{query_id}/accurate-response` jest wywoływany
5. `DetailedAnswerModal` otwiera się z progress barem
6. Długi polling przez `useLongPolling` (co 5s, timeout 240s)
7. Po otrzymaniu odpowiedzi, `MarkdownContent` wyświetla treść
8. `SourcesList` wyświetla listę źródeł
9. `RatingButtons` wyświetla przyciski oceny

**Obsługa błędów:**

- Timeout 240s → wyświetlenie komunikatu błędu z możliwością ponowienia
- `GENERATION_TIMEOUT` → wyświetlenie komunikatu błędu
- `CONFLICT` (409) → aktualizacja modala z istniejącą odpowiedzią

### 8.4. Ocenianie odpowiedzi (US-008)

**Przepływ:**

1. Użytkownik klika przycisk oceny (kciuk w górę/dół) w `RatingButtons`
2. Optimistic update: natychmiastowa zmiana stanu wizualnego
3. `POST /api/v1/queries/{query_id}/ratings` jest wywoływany
4. Po otrzymaniu odpowiedzi, stan jest aktualizowany
5. Drugi przycisk jest disabled
6. Toast notification po sukcesie (opcjonalnie)

**Obsługa błędów:**

- Błąd API → rollback optimistic update, wyświetlenie komunikatu błędu

### 8.5. Onboarding nowego użytkownika (US-010)

**Przepływ:**

1. Sprawdzenie czy użytkownik ma historię zapytań (SSR w Astro page)
2. Jeśli brak historii, wyświetlenie `WelcomeMessage.astro`
3. `GET /api/v1/onboarding/example-questions` jest wywoływany (SSR)
4. `ExampleQuestions.astro` wyświetla listę przykładowych pytań
5. Użytkownik klika przykładowe pytanie
6. Tekst jest przekazywany do `ChatInput` (ustawienie wartości textarea)
7. Użytkownik może edytować tekst lub wysłać bezpośrednio

**Obsługa błędów:**

- `SERVICE_UNAVAILABLE` → ukrycie `ExampleQuestions.astro`

### 8.6. Obsługa zapytań o akty spoza bazy (US-009)

**Przepływ:**

1. Po otrzymaniu odpowiedzi z API, sprawdzenie czy `error.code === "NO_RELEVANT_ACTS"`
2. Jeśli tak, wyświetlenie `NoRelevantActsCard` zamiast `ResponseCard`
3. Komunikat: "Przepraszam, moja baza wiedzy jest na razie ograniczona..."
4. Opcjonalnie: przycisk "Spróbuj ponownie" (resetuje zapytanie)

**Obsługa błędów:**

- Komunikat jest wyświetlany w `NoRelevantActsCard`

## 9. Warunki i walidacja

### 9.1. Walidacja client-side

**ChatInput:**

- **Długość tekstu:** 10-1000 znaków
  - Walidacja w czasie rzeczywistym (`onChange`)
  - Licznik znaków: kolor czerwony jeśli poza zakresem
  - Przycisk "Wyślij" disabled jeśli <10 lub >1000 znaków
- **Rate limit:** Maksymalnie 10 zapytań/min
  - Sprawdzanie przez `useRateLimit()` z AppContext
  - Wskaźnik rate limit: kolor czerwony jeśli >= 10
  - Przycisk "Wyślij" disabled jeśli rate limit osiągnięty
- **Concurrent queries:** Maksymalnie 3 równoczesne zapytania
  - Sprawdzanie przez `useActiveQueries()` z AppContext
  - Przycisk "Wyślij" disabled jeśli >= 3 aktywne zapytania

**ResponseCard:**

- **Status odpowiedzi:** Tylko kompletne odpowiedzi (`status === "completed"`) mogą być oceniane
  - Przyciski oceny disabled jeśli `status !== "completed"`
- **Dokładna odpowiedź:** Przycisk "Uzyskaj dokładniejszą odpowiedź" ukryty jeśli dokładna odpowiedź już istnieje
  - Sprawdzanie: `query.accurate_response !== null && query.accurate_response.status === "completed"`
- **Cache RAG context:** Timer odliczający czas ważności (5 minut)
  - Sprawdzanie przez `useRAGContextTimer(createdAt)`
  - Wizualny wskaźnik: kolor żółty jeśli <1 minuta, czerwony jeśli wygasł

**DetailedAnswerModal:**

- **Status odpowiedzi:** Polling kontynuowany do czasu `status === "completed"` lub `status === "failed"`
- **Timeout:** 240s dla dokładnych odpowiedzi
  - Wyświetlenie komunikatu błędu jeśli timeout osiągnięty
- **Cache RAG context:** Sprawdzanie czy cache jest ważny (<5 minut)
  - Wyświetlenie komunikatu jeśli cache wygasł

### 9.2. Walidacja server-side

**POST /api/v1/queries:**

- **Długość tekstu:** 10-1000 znaków (walidacja przez Pydantic)
- **Rate limit:** 10 zapytań/min (sprawdzanie przez backend)
- **Autoryzacja:** JWT token wymagany

**POST /api/v1/queries/{query_id}/accurate-response:**

- **Zapytanie istnieje:** Sprawdzanie czy `query_id` istnieje w bazie
- **Dokładna odpowiedź nie istnieje:** Sprawdzanie czy dokładna odpowiedź już nie została wygenerowana (409 Conflict jeśli istnieje)
- **Cache RAG context:** Sprawdzanie czy cache jest ważny (<5 minut)

**POST /api/v1/queries/{query_id}/ratings:**

- **Zapytanie istnieje:** Sprawdzanie czy `query_id` istnieje w bazie
- **Odpowiedź istnieje:** Sprawdzanie czy odpowiedź (fast/accurate) istnieje i jest kompletna
- **Autoryzacja:** JWT token wymagany

### 9.3. Warunki wyświetlania komponentów

**WelcomeMessage.astro:**

- Warunek: `hasQueryHistory === false` (sprawdzane w Astro page przez SSR)

**ExampleQuestions.astro:**

- Warunek: `hasQueryHistory === false` (sprawdzane w Astro page przez SSR)
- Warunek: `examples.length > 0` (sprawdzane w Astro page)

**NoRelevantActsCard.tsx:**

- Warunek: `errorCode === "NO_RELEVANT_ACTS"` (sprawdzane w `ChatMessagesContainer`)

**DetailedAnswerModal.tsx:**

- Warunek: `isOpen === true` (kontrolowany przez `ResponseCard`)

**DetailedAnswerButton:**

- Warunek: `query.accurate_response === null || query.accurate_response.status !== "completed"` (sprawdzane w `ResponseCard`)

## 10. Obsługa błędów

### 10.1. Błędy walidacji

**VALIDATION_ERROR (400):**

- **Przyczyna:** Nieprawidłowa długość tekstu (<10 lub >1000 znaków)
- **Obsługa:** Wyświetlenie komunikatu w `ChatInput` pod textarea
- **Komunikat:** "Pytanie musi zawierać od 10 do 1000 znaków"

### 10.2. Błędy autoryzacji

**UNAUTHORIZED (401):**

- **Przyczyna:** Brak lub nieprawidłowy JWT token
- **Obsługa:** Przekierowanie do `/login?expired=true` (obsługiwane przez `apiClient.ts`)
- **Komunikat:** "Sesja wygasła. Zaloguj się ponownie."

**FORBIDDEN (403):**

- **Przyczyna:** Brak uprawnień do zasobu
- **Obsługa:** Wyświetlenie komunikatu błędu
- **Komunikat:** "Brak uprawnień do wykonania tej operacji."

### 10.3. Błędy rate limiting

**RATE_LIMIT_EXCEEDED (429):**

- **Przyczyna:** Przekroczony limit 10 zapytań/min
- **Obsługa:** Wyświetlenie komunikatu w `ChatInput` z czasem resetu
- **Komunikat:** "Przekroczono limit zapytań. Spróbuj ponownie za X sekund."
- **Aktualizacja:** Parsowanie nagłówka `X-RateLimit-Reset` i aktualizacja `rateLimitInfo` w AppContext

### 10.4. Błędy timeout

**GATEWAY_TIMEOUT (504):**

- **Przyczyna:** Timeout połączenia z backendem
- **Obsługa:** Wyświetlenie komunikatu błędu z możliwością ponowienia
- **Komunikat:** "Przekroczono czas oczekiwania. Spróbuj ponownie."

**GENERATION_TIMEOUT:**

- **Przyczyna:** Timeout generowania odpowiedzi (15s dla szybkich, 240s dla dokładnych)
- **Obsługa:** Wyświetlenie komunikatu błędu z możliwością ponowienia
- **Komunikat:** "Generowanie odpowiedzi trwa zbyt długo. Spróbuj ponownie."

### 10.5. Błędy sieciowe

**SERVICE_UNAVAILABLE (503):**

- **Przyczyna:** Backend niedostępny lub błąd sieciowy
- **Obsługa:** Wyświetlenie komunikatu błędu z możliwością ponowienia
- **Komunikat:** "Serwis tymczasowo niedostępny. Spróbuj ponownie za chwilę."

**Network Error:**

- **Przyczyna:** Brak połączenia z internetem lub błąd DNS
- **Obsługa:** Wyświetlenie komunikatu błędu
- **Komunikat:** "Brak połączenia z internetem. Sprawdź swoje połączenie."

### 10.6. Błędy biznesowe

**NO_RELEVANT_ACTS:**

- **Przyczyna:** Zapytanie dotyczy aktu prawnego spoza bazy (20k ustaw)
- **Obsługa:** Wyświetlenie `NoRelevantActsCard` z komunikatem
- **Komunikat:** "Przepraszam, moja baza wiedzy jest na razie ograniczona i nie zawiera tego aktu. Aktualnie dysponuję informacjami o 20 000 najnowszych ustaw."

**NOT_FOUND (404):**

- **Przyczyna:** Zapytanie nie istnieje w bazie
- **Obsługa:** Wyświetlenie komunikatu błędu
- **Komunikat:** "Zapytanie nie zostało znalezione."

**CONFLICT (409):**

- **Przyczyna:** Dokładna odpowiedź już istnieje (przy ponownym żądaniu)
- **Obsługa:** Aktualizacja `DetailedAnswerModal` z istniejącą odpowiedzią
- **Komunikat:** Brak (automatyczna aktualizacja)

### 10.7. Błędy wewnętrzne

**INTERNAL_SERVER_ERROR (500):**

- **Przyczyna:** Błąd serwera
- **Obsługa:** Wyświetlenie komunikatu błędu z możliwością ponowienia
- **Komunikat:** "Wystąpił błąd serwera. Spróbuj ponownie."

**LLM_SERVICE_UNAVAILABLE:**

- **Przyczyna:** OLLAMA niedostępny
- **Obsługa:** Wyświetlenie komunikatu błędu
- **Komunikat:** "Usługa generowania odpowiedzi jest tymczasowo niedostępna."

### 10.8. Strategia obsługi błędów

**Optimistic Updates:**

- Rollback przy błędzie API (np. `RatingButtons`)
- Przywrócenie poprzedniego stanu wizualnego

**Retry Logic:**

- Przycisk "Spróbuj ponownie" dla błędów timeout i sieciowych
- Automatyczne ponowienie przy 401 (refresh token) w `apiClient.ts`

**Error Boundaries:**

- `ErrorBoundary.tsx` dla React islands (przechwytywanie błędów React)
- Fallback UI dla krytycznych komponentów

**Logging:**

- Logowanie błędów do konsoli w dev
- Logowanie błędów do Sentry w prod (opcjonalnie)

## 11. Kroki implementacji

### 11.1. Przygotowanie infrastruktury

1. **Utworzenie AppContext.tsx:**
   - Definicja `AppContextType` z `activeQueries`, `userSession`, `rateLimitInfo`
   - Provider komponentu z `useState` dla każdego pola
   - Export `useAppContext()` hook

2. **Utworzenie custom hooks:**
   - `useQueryPolling.ts` - Exponential backoff polling (1s → 2s max, timeout 15s)
   - `useLongPolling.ts` - Długi polling (co 5s, timeout 240s)
   - `useActiveQueries.ts` - Zarządzanie limitem 3 aktywnych zapytań
   - `useRAGContextTimer.ts` - Timer cache TTL (5 minut)
   - `useOptimisticRating.ts` - Optimistic updates dla ratingów
   - `useRateLimit.ts` - Pobieranie rate limit info z AppContext
   - `useFocusTrap.ts` - Focus trap dla modala

3. **Rozszerzenie apiClient.ts:**
   - Parsowanie nagłówków `X-RateLimit-*` i zwracanie w odpowiedzi
   - Obsługa 401 z automatycznym refresh token i retry

### 11.2. Implementacja komponentów Astro (statyczne)

4. **Utworzenie WelcomeMessage.astro:**
   - Komunikat powitalny z tytułem i opisem
   - Warunkowe wyświetlanie (tylko jeśli brak historii)

5. **Utworzenie ExampleQuestions.astro:**
   - Lista przykładowych pytań z przyciskami
   - Callback `onExampleQuestionClick` przekazywany do ChatInput
   - Warunkowe wyświetlanie (tylko jeśli brak historii)

6. **Utworzenie SourcesList.astro:**
   - Lista źródeł z linkami do ISAP
   - Linki otwierają się w nowej karcie (`target="_blank"`)

### 11.3. Implementacja komponentów React (islands)

7. **Utworzenie ChatInput.tsx:**
   - Textarea z auto-resize (max 5 linii)
   - Licznik znaków (10-1000)
   - Wskaźnik rate limit (X/10)
   - Przycisk "Wyślij" z walidacją
   - Obsługa Enter (submit) i Shift+Enter (nowa linia)
   - Auto-focus po załadowaniu
   - Integracja z `POST /api/v1/queries`

8. **Utworzenie ChatMessagesContainer.tsx:**
   - Lista query/response pairs
   - Optimistic UI dla pytań użytkownika
   - Polling przez `useQueryPolling` dla szybkich odpowiedzi
   - Auto-scroll do najnowszej wiadomości
   - Skeleton loaders podczas generowania
   - ARIA live region (`aria-live="polite"`)
   - Integracja z `GET /api/v1/queries/{query_id}`

9. **Utworzenie ResponseCard.tsx:**
   - Renderowanie Markdown z sanitizacją (`react-markdown` + `rehype-sanitize`)
   - `SourcesList` (Astro component)
   - `RatingButtons`
   - `DetailedAnswerButton` (tylko dla szybkiej odpowiedzi)
   - `GenerationTimeBadge`
   - `RAGContextTimer` (wizualny wskaźnik)
   - Semantic HTML (`<article>`)

10. **Utworzenie RatingButtons.tsx:**
    - Przyciski kciuk w górę/dół
    - Optimistic updates przez `useOptimisticRating`
    - Rollback przy błędzie
    - Toast notification po sukcesie (opcjonalnie)
    - ARIA labels dla przycisków
    - Integracja z `POST /api/v1/queries/{query_id}/ratings`

11. **Utworzenie DetailedAnswerModal.tsx:**
    - Modal zamykalny (ESC, backdrop, przycisk X)
    - Progress bar (indeterminate) podczas generowania
    - Długi polling przez `useLongPolling` (co 5s, timeout 240s)
    - Renderowanie Markdown z sanitizacją
    - `SourcesList`
    - `RatingButtons`
    - Focus trap przez `useFocusTrap`
    - ARIA attributes (`role="dialog"`, `aria-modal="true"`)
    - Integracja z `POST /api/v1/queries/{query_id}/accurate-response`

12. **Utworzenie NoRelevantActsCard.tsx:**
    - Komunikat błędu dla aktów spoza bazy
    - Przycisk "Spróbuj ponownie" (opcjonalnie)
    - ARIA role="alert"

### 11.4. Integracja komponentów w Astro page

13. **Aktualizacja app/index.astro:**
    - Sprawdzenie autoryzacji (middleware)
    - Sprawdzenie czy użytkownik ma historię zapytań (SSR)
    - Pobranie przykładowych pytań (`GET /api/v1/onboarding/example-questions`, SSR)
    - Warunkowe wyświetlanie `WelcomeMessage.astro` i `ExampleQuestions.astro`
    - Integracja `ChatMessagesContainer.tsx` z `client:load`
    - Integracja `ChatInput.tsx` z `client:load`
    - Przekazanie przykładowych pytań do `ChatInput` przez callback
    - AppContext Provider w layout

### 11.5. Styling i dostępność

14. **Styling z Tailwind CSS:**
    - Responsywny design (mobile-first)
    - Chat input: full-width sticky bottom (mobile), max-width 800px centered (desktop)
    - Message bubbles: right-aligned (user), left-aligned (response)
    - Loading states: skeleton loaders, progress bars
    - Error states: przyjazne komunikaty z ikonami

15. **Dostępność (WCAG AA):**
    - ARIA attributes: `aria-live="polite"`, `aria-busy="true"`, `aria-label`
    - Semantic HTML: `<main>`, `<article>`, `<nav>`, `<button>`
    - Keyboard navigation: Tab order, Enter/Escape handlers
    - Focus management: Auto-focus, focus trap w modalu, restore focus po zamknięciu
    - Color contrast: 4.5:1 dla tekstu

### 11.6. Testowanie

16. **Testy funkcjonalne:**
    - Test submit query (walidacja, optimistic UI, polling)
    - Test polling dla szybkich odpowiedzi (exponential backoff, timeout)
    - Test żądania dokładnej odpowiedzi (długi polling, timeout 240s)
    - Test ratingów (optimistic updates, rollback)
    - Test error states (NoRelevantActsError, timeout, network errors)
    - Test onboarding (komunikat powitalny, przykładowe pytania)

17. **Testy dostępności:**
    - Test keyboard navigation (Tab, Enter, Escape)
    - Test screen reader (NVDA/JAWS)
    - Test focus management (auto-focus, focus trap)

18. **Testy responsywności:**
    - Test na różnych rozdzielczościach (mobile, tablet, desktop)
    - Test auto-resize textarea
    - Test sticky chat input

### 11.7. Optymalizacja i finał

19. **Optymalizacja wydajności:**
    - Sprawdzenie bundle size (<50KB JS)
    - Lazy loading dla `DetailedAnswerModal`
    - Memoization komponentów (`React.memo`)
    - Debounce dla licznika znaków (opcjonalnie)

20. **Dokumentacja:**
    - Aktualizacja README.md z instrukcjami użycia
    - Komentarze JSDoc dla komponentów i hooks
    - Aktualizacja `.ai/view-implementation-index.md`

21. **Code review:**
    - Sprawdzenie zgodności z coding guidelines
    - Sprawdzenie zgodności z PRD i user stories
    - Sprawdzenie bezpieczeństwa (sanitizacja, walidacja, rate limiting)
