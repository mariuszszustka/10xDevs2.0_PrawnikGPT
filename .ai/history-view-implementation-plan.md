# Plan implementacji widoku History View

## 1. Przegląd

History View to widok umożliwiający przeglądanie chronologicznej historii zapytań i odpowiedzi użytkownika. Widok wyświetla listę zapytań od najnowszych, z możliwością rozwijania odpowiedzi (domyślnie zwinięte dla lepszej czytelności), usuwania zapytań z potwierdzeniem oraz oceniania odpowiedzi. Widok wykorzystuje paginację typu "Załaduj więcej" zamiast tradycyjnej paginacji, co zapewnia lepsze UX dla długich list. Widok jest zbudowany w architekturze Astro 5 + React 19 islands, gdzie statyczne elementy są renderowane przez Astro, a interaktywne komponenty (lista zapytań, karty zapytań, przyciski usuwania i oceny) są React islands z strategicznym użyciem dyrektyw hydratacji.

**Główne funkcjonalności:**

- Wyświetlanie listy zapytań z paginacją "Załaduj więcej" (domyślnie 20 na stronę)
- Collapsible responses (domyślnie zwinięte, możliwość rozwinięcia)
- Status badge ("Ukończone" / "Przetwarzanie...") z możliwością odświeżenia
- Relative timestamps ("2 godz. temu", "wczoraj", "3 dni temu")
- Usuwanie zapytań z confirmation modal
- Ocenianie odpowiedzi z optimistic updates
- Empty state z CTA do czatu
- Zachowanie scroll position przy paginacji
- Auto-refresh dla zapytań w statusie "processing" (opcjonalnie)

## 2. Routing widoku

**Ścieżka:** `/app/history`  
**Plik:** `src/pages/app/history.astro`  
**Typ:** Astro SSR (Server-Side Rendering)  
**Autentykacja:** Wymagana (middleware sprawdzający sesję użytkownika)

**Middleware:**

- Sprawdzenie autoryzacji użytkownika przez Supabase Auth
- Przekierowanie do `/login` jeśli użytkownik nie jest zalogowany
- Dodanie Supabase client do `Astro.locals.supabase` (już zaimplementowane w `src/middleware/index.ts`)

**Layout:**

- Użycie `AppLayout.astro` (jeśli istnieje) lub `BaseLayout.astro` z nagłówkiem aplikacji
- Nagłówek zawiera: logo, nawigację (Chat, Historia, Ustawienia), User Menu

## 3. Struktura komponentów

```
History View (app/history.astro)
├── AppLayout.astro (lub BaseLayout.astro)
│   ├── Header (nawigacja, User Menu)
│   └── Main Content
│       ├── PageHeader.astro (statyczny nagłówek "Historia zapytań")
│       ├── HistoryList.tsx (React island, client:load)
│       │   ├── QueryCard.tsx (React island, client:visible)
│       │   │   ├── QueryHeader.tsx (question text, timestamp, status badge, delete button)
│       │   │   ├── FastResponseSection.tsx (collapsible)
│       │   │   │   ├── ExpandButton.tsx (aria-expanded)
│       │   │   │   ├── MarkdownContent.tsx (z sanitizacją)
│       │   │   │   ├── SourcesList.astro (lista źródeł z linkami ISAP)
│       │   │   │   ├── RatingButtons.tsx (React island, client:visible)
│       │   │   │   └── GenerationTimeBadge.tsx
│       │   │   └── AccurateResponseIndicator.tsx (ikona 🔬, collapsed by default)
│       │   │       └── AccurateResponseSection.tsx (collapsible, expand on click)
│       │   │           ├── MarkdownContent.tsx
│       │   │           ├── SourcesList.astro
│       │   │           ├── RatingButtons.tsx
│       │   │           └── GenerationTimeBadge.tsx
│       │   └── DeleteQueryButton.tsx (React island, client:visible)
│       │       └── ConfirmationModal.tsx (React island)
│       ├── LoadMoreButton.tsx (React island, client:visible)
│       └── EmptyState.tsx (React island, warunkowo)
│           ├── Icon (lub ilustracja)
│           ├── Nagłówek "Nie masz jeszcze żadnych zapytań"
│           ├── Opis "Wróć do czatu i zadaj pierwsze pytanie!"
│           └── CTA button "Przejdź do czatu" → `/app`
```

**Hierarchia komponentów:**

1. **Astro Page (`app/history.astro`):**
   - Renderuje layout i statyczny nagłówek strony
   - Integruje React islands z odpowiednimi dyrektywami hydratacji
   - Przekazuje dane z SSR do React islands (opcjonalnie)

2. **React Islands (interaktywne):**
   - `HistoryList.tsx` - Główny kontener zarządzający listą zapytań, paginacją i stanem
   - `QueryCard.tsx` - Karta pojedynczego zapytania z collapsible responses
   - `DeleteQueryButton.tsx` - Przycisk usuwania z confirmation modal
   - `EmptyState.tsx` - Stan pusty z CTA do czatu
   - `RatingButtons.tsx` - Przyciski oceny (reuse z Chat View)
   - `LoadMoreButton.tsx` - Przycisk "Załaduj więcej" z licznikiem

3. **Astro Components (statyczne):**
   - `PageHeader.astro` - Nagłówek strony "Historia zapytań"
   - `SourcesList.astro` - Lista źródeł z linkami do ISAP (reuse z Chat View)

## 4. Szczegóły komponentów

### 4.1. HistoryList.tsx

**Opis komponentu:**
Główny kontener zarządzający listą zapytań użytkownika. Odpowiedzialny za pobieranie danych z API, zarządzanie paginacją typu "Załaduj więcej", zachowanie scroll position, wyświetlanie empty state oraz obsługę stanów ładowania i błędów.

**Główne elementy:**

- `<div role="list" aria-label="Lista zapytań">` - Kontener listy z ARIA attributes
- `QueryCard` - Komponenty kart zapytań (renderowane w pętli)
- `LoadMoreButton` - Przycisk "Załaduj więcej" z licznikiem pozostałych zapytań
- `EmptyState` - Stan pusty (warunkowo wyświetlany)
- `SkeletonLoader` - Wskaźnik ładowania podczas pobierania danych
- Scroll position preservation przy użyciu `useRef` i `scrollIntoView`

**Obsługiwane zdarzenia:**

- `onLoadMore: () => Promise<void>` - Callback wywoływany po kliknięciu "Załaduj więcej"
- `onQueryDelete: (queryId: string) => Promise<void>` - Callback po usunięciu zapytania (optimistic update)
- `onRatingChange: (queryId: string, responseType: ResponseType, rating: RatingDetail) => void` - Callback po zmianie oceny

**Obsługiwana walidacja:**

- Sprawdzanie czy są jeszcze zapytania do załadowania (`pagination.page < pagination.total_pages`)
- Sprawdzanie czy lista jest pusta (wyświetlenie empty state)
- Sprawdzanie czy zapytanie należy do użytkownika (backend weryfikuje przez RLS)

**Typy:**

- **Props:**
  ```typescript
  interface HistoryListProps {
    initialQueries?: QueryListItem[]; // Opcjonalne dane z SSR
    initialPagination?: PaginationMetadata; // Opcjonalna paginacja z SSR
  }
  ```
- **State:**
  - `queries: QueryListItem[]` - Lista zapytań
  - `pagination: PaginationMetadata | null` - Metadane paginacji
  - `isLoading: boolean` - Flaga wskazująca ładowanie danych
  - `isLoadingMore: boolean` - Flaga wskazująca ładowanie kolejnej strony
  - `error: ApiError | null` - Błąd API (jeśli wystąpił)
  - `scrollPosition: number` - Pozycja scroll przed załadowaniem nowych elementów

**Custom Hooks:**

- `useQueryList(page: number, perPage: number, order: "desc" | "asc")` - Hook do pobierania listy zapytań z API
- `useScrollPosition()` - Hook do zachowania i przywracania pozycji scroll
- `useOptimisticDelete(queryId: string)` - Optimistic update przy usuwaniu zapytania

**Integracja z API:**

- `GET /api/v1/queries?page={page}&per_page={per_page}&order={order}` - Pobieranie listy zapytań
  - Request: Query parameters (`QueryListParams`)
  - Response: `QueryListResponse` (200 OK)

### 4.2. QueryCard.tsx

**Opis komponentu:**
Karta pojedynczego zapytania z collapsible responses. Wyświetla pytanie użytkownika, timestamp, status badge, szybką odpowiedź (domyślnie zwiniętą) oraz wskaźnik dokładnej odpowiedzi (jeśli istnieje). Odpowiedzialna za zarządzanie stanem rozwinięcia/zwinięcia odpowiedzi oraz przekazywanie zdarzeń do komponentów potomnych.

**Główne elementy:**

- `<article aria-label="Zapytanie z {timestamp}">` - Semantic HTML dla karty zapytania
- `QueryHeader` - Nagłówek z pytaniem, timestampem, status badge i przyciskiem usuwania
- `FastResponseSection` - Sekcja szybkiej odpowiedzi (collapsible)
  - `ExpandButton` - Przycisk rozwinięcia/zwinięcia z `aria-expanded`
  - `MarkdownContent` - Renderowanie treści odpowiedzi z sanitizacją
  - `SourcesList` - Lista źródeł z linkami ISAP
  - `RatingButtons` - Przyciski oceny
  - `GenerationTimeBadge` - Badge z czasem generowania
- `AccurateResponseIndicator` - Wskaźnik dokładnej odpowiedzi (ikona 🔬, collapsed by default)
  - `AccurateResponseSection` - Sekcja dokładnej odpowiedzi (collapsible, expand on click)
    - `MarkdownContent`
    - `SourcesList`
    - `RatingButtons`
    - `GenerationTimeBadge`
- Smooth expand/collapse animation przy użyciu CSS transitions

**Obsługiwane zdarzenia:**

- `onExpandFastResponse: () => void` - Callback po rozwinięciu szybkiej odpowiedzi
- `onCollapseFastResponse: () => void` - Callback po zwinięciu szybkiej odpowiedzi
- `onExpandAccurateResponse: () => void` - Callback po rozwinięciu dokładnej odpowiedzi
- `onDelete: (queryId: string) => Promise<void>` - Callback po kliknięciu usuwania
- `onRatingChange: (responseType: ResponseType, rating: RatingDetail) => void` - Callback po zmianie oceny

**Obsługiwana walidacja:**

- Sprawdzanie czy szybka odpowiedź istnieje i jest kompletna (status === "completed")
- Sprawdzanie czy dokładna odpowiedź istnieje (`accurate_response.exists === true`)
- Sprawdzanie czy zapytanie należy do użytkownika (backend weryfikuje przez RLS)

**Typy:**

- **Props:**
  ```typescript
  interface QueryCardProps {
    query: QueryListItem; // Dane zapytania z listy
    onDelete?: (queryId: string) => Promise<void>;
    onRatingChange?: (queryId: string, responseType: ResponseType, rating: RatingDetail) => void;
    onRefresh?: (queryId: string) => Promise<void>; // Opcjonalnie dla zapytań w statusie "processing"
  }
  ```
- **State:**
  - `isFastResponseExpanded: boolean` - Stan rozwinięcia szybkiej odpowiedzi (domyślnie false)
  - `isAccurateResponseExpanded: boolean` - Stan rozwinięcia dokładnej odpowiedzi (domyślnie false)
  - `isDeleting: boolean` - Flaga wskazująca proces usuwania

**Custom Hooks:**

- `useCollapsible(initialExpanded: boolean)` - Hook do zarządzania stanem rozwinięcia/zwinięcia
- `useQueryDetails(queryId: string)` - Hook do pobierania szczegółów zapytania (opcjonalnie, dla refresh)

**Integracja z API:**

- `GET /api/v1/queries/{query_id}` - Pobieranie szczegółów zapytania (opcjonalnie, dla refresh)
  - Response: `QueryDetailResponse` (200 OK)
- `DELETE /api/v1/queries/{query_id}` - Usuwanie zapytania (delegowane do DeleteQueryButton)
  - Response: 204 No Content

### 4.3. DeleteQueryButton.tsx

**Opis komponentu:**
Przycisk usuwania zapytania z confirmation modal. Zapewnia bezpieczne usuwanie z potwierdzeniem użytkownika, optimistic update w liście oraz obsługę błędów z rollback.

**Główne elementy:**

- `<button aria-label="Usuń zapytanie">` - Przycisk usuwania (ikona 🗑️)
- `ConfirmationModal` - Modal potwierdzenia z focus trap
  - Nagłówek: "Usunąć zapytanie?"
  - Treść: "Czy na pewno chcesz usunąć to zapytanie? Ta operacja jest nieodwracalna."
  - Przyciski: "Anuluj" i "Usuń" (destructive)
  - Focus trap: Focus pozostaje w modalu, przywrócenie focus po zamknięciu

**Obsługiwane zdarzenia:**

- `onClick: () => void` - Callback po kliknięciu przycisku (otwiera modal)
- `onConfirm: (queryId: string) => Promise<void>` - Callback po potwierdzeniu usunięcia
- `onCancel: () => void` - Callback po anulowaniu (zamyka modal)
- Optimistic update: Natychmiastowe usunięcie z listy przed otrzymaniem odpowiedzi z API
- Rollback: Przywrócenie zapytania w liście przy błędzie API

**Obsługiwana walidacja:**

- Sprawdzanie czy zapytanie należy do użytkownika (backend weryfikuje przez RLS, 403 Forbidden jeśli nie)
- Sprawdzanie czy zapytanie istnieje (404 Not Found)

**Typy:**

- **Props:**
  ```typescript
  interface DeleteQueryButtonProps {
    queryId: string;
    queryText: string; // Dla wyświetlenia w modalu (truncated)
    onDelete: (queryId: string) => Promise<void>; // Callback po pomyślnym usunięciu
  }
  ```
- **State:**
  - `isModalOpen: boolean` - Stan otwarcia modala
  - `isDeleting: boolean` - Flaga wskazująca proces usuwania
  - `error: ApiError | null` - Błąd API (jeśli wystąpił)

**Custom Hooks:**

- `useFocusTrap(isActive: boolean)` - Hook do zarządzania focus trap w modalu
- `useOptimisticDelete(queryId: string, onDelete: (id: string) => Promise<void>)` - Optimistic update z rollback

**Integracja z API:**

- `DELETE /api/v1/queries/{query_id}` - Usuwanie zapytania
  - Response: 204 No Content (sukces)
  - Error Responses:
    - 401 Unauthorized - Przekierowanie do `/login`
    - 403 Forbidden - Użytkownik nie jest właścicielem zapytania
    - 404 Not Found - Zapytanie nie istnieje

### 4.4. EmptyState.tsx

**Opis komponentu:**
Stan pusty wyświetlany gdy użytkownik nie ma jeszcze żadnych zapytań. Zawiera ikonę, nagłówek, opis oraz CTA button przekierowujący do czatu.

**Główne elementy:**

- `<div role="status" aria-live="polite">` - Kontener z ARIA live region
- Ikona lub ilustracja (opcjonalnie)
- Nagłówek: "Nie masz jeszcze żadnych zapytań"
- Opis: "Wróć do czatu i zadaj pierwsze pytanie!"
- `<a href="/app">` - CTA button "Przejdź do czatu"

**Obsługiwane zdarzenia:**

- `onNavigateToChat: () => void` - Callback po kliknięciu CTA (opcjonalnie, dla tracking)

**Obsługiwana walidacja:**

- Sprawdzanie czy lista zapytań jest pusta (`queries.length === 0`)

**Typy:**

- **Props:**
  ```typescript
  interface EmptyStateProps {
    onNavigateToChat?: () => void; // Opcjonalny callback
  }
  ```
- Brak state (komponent statyczny)

**Custom Hooks:**

- Brak (komponent statyczny)

**Integracja z API:**

- Brak (komponent statyczny)

### 4.5. LoadMoreButton.tsx

**Opis komponentu:**
Przycisk "Załaduj więcej" z licznikiem pozostałych zapytań. Wyświetla się na dole listy gdy są jeszcze zapytania do załadowania.

**Główne elementy:**

- `<button aria-label="Załaduj więcej zapytań">` - Przycisk z tekstem i licznikiem
- Tekst: "Załaduj więcej ({remaining} pozostałych)"
- Loading state: Spinner podczas ładowania
- Disabled state: Gdy wszystkie zapytania zostały załadowane

**Obsługiwane zdarzenia:**

- `onClick: () => Promise<void>` - Callback po kliknięciu (ładuje kolejną stronę)
- Zachowanie scroll position po załadowaniu nowych elementów

**Obsługiwana walidacja:**

- Sprawdzanie czy są jeszcze zapytania do załadowania (`pagination.page < pagination.total_pages`)
- Sprawdzanie czy nie trwa już ładowanie (`isLoadingMore === false`)

**Typy:**

- **Props:**
  ```typescript
  interface LoadMoreButtonProps {
    remaining: number; // Liczba pozostałych zapytań
    isLoading: boolean; // Flaga wskazująca ładowanie
    onLoadMore: () => Promise<void>; // Callback po kliknięciu
  }
  ```
- Brak state (komponent kontrolowany przez rodzica)

**Custom Hooks:**

- Brak (komponent kontrolowany)

**Integracja z API:**

- Brak (delegowane do HistoryList)

### 4.6. RatingButtons.tsx

**Opis komponentu:**
Przyciski oceny (kciuk w górę/dół) z optimistic updates, rollback przy błędzie oraz wizualną zmianą stanu po oddaniu głosu. Komponent jest reuse z Chat View.

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
    currentRating?: RatingSummary; // Aktualna ocena (jeśli istnieje)
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

## 5. Typy

### 5.1. DTO (Data Transfer Objects)

Wszystkie typy DTO są zdefiniowane w `src/lib/types.ts` i pochodzą z backend API:

**QueryListResponse:**

```typescript
interface QueryListResponse {
  queries: QueryListItem[];
  pagination: PaginationMetadata;
}
```

**QueryListItem:**

```typescript
interface QueryListItem {
  query_id: string;
  query_text: string;
  created_at: string;
  fast_response: {
    content: string;
    model_name: string;
    generation_time_ms: number;
    sources_count: number;
    rating?: RatingSummary;
  };
  accurate_response: {
    exists: boolean;
    model_name?: string;
    generation_time_ms?: number;
    rating?: RatingSummary;
  } | null;
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

**PaginationMetadata:**

```typescript
interface PaginationMetadata {
  page: number;
  per_page: number;
  total_pages: number;
  total_count: number;
}
```

**RatingSummary:**

```typescript
interface RatingSummary {
  value: RatingValue; // 'up' | 'down'
}
```

**RatingDetail:**

```typescript
interface RatingDetail extends RatingSummary {
  rating_id: string;
  created_at: string;
}
```

**RatingCreateRequest:**

```typescript
interface RatingCreateRequest {
  response_type: ResponseType; // 'fast' | 'accurate'
  rating_value: RatingValue; // 'up' | 'down'
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

**QueryListParams:**

```typescript
interface QueryListParams {
  page?: number; // default=1, min=1
  per_page?: number; // default=20, max=100
  order?: "desc" | "asc"; // default="desc"
}
```

**QueryProcessingStatus:**

```typescript
type QueryProcessingStatus = "pending" | "processing" | "completed" | "failed";
```

**SourceReference:**

```typescript
interface SourceReference {
  act_title: string;
  article: string;
  link: string;
  chunk_id: string;
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
  | "LLM_SERVICE_UNAVAILABLE";
```

### 5.2. ViewModel (Modele widoku)

ViewModel to typy używane wewnętrznie w komponentach, które mogą różnić się od DTO:

**QueryCardViewModel:**

```typescript
interface QueryCardViewModel {
  queryId: string;
  queryText: string;
  createdAt: Date; // Parsed z ISO string
  relativeTimestamp: string; // "2 godz. temu", "wczoraj", "3 dni temu"
  status: QueryProcessingStatus;
  fastResponse: {
    content: string;
    modelName: string;
    generationTimeMs: number;
    sourcesCount: number;
    rating?: RatingSummary;
    isExpanded: boolean; // Stan UI
  };
  accurateResponse: {
    exists: boolean;
    modelName?: string;
    generationTimeMs?: number;
    rating?: RatingSummary;
    isExpanded: boolean; // Stan UI
  } | null;
}
```

**HistoryListViewModel:**

```typescript
interface HistoryListViewModel {
  queries: QueryCardViewModel[];
  pagination: {
    currentPage: number;
    perPage: number;
    totalPages: number;
    totalCount: number;
    remaining: number; // totalCount - (currentPage * perPage)
  };
  isLoading: boolean;
  isLoadingMore: boolean;
  error: ApiError | null;
  isEmpty: boolean; // queries.length === 0
}
```

## 6. Zarządzanie stanem

### 6.1. Stan lokalny komponentów

Każdy komponent zarządza swoim lokalnym stanem przy użyciu React hooks:

**HistoryList:**

- `useState<QueryListItem[]>` - Lista zapytań
- `useState<PaginationMetadata | null>` - Metadane paginacji
- `useState<boolean>` - Flagi `isLoading`, `isLoadingMore`
- `useState<ApiError | null>` - Błąd API
- `useRef<number>` - Scroll position przed załadowaniem nowych elementów

**QueryCard:**

- `useState<boolean>` - Flagi `isFastResponseExpanded`, `isAccurateResponseExpanded`, `isDeleting`

**DeleteQueryButton:**

- `useState<boolean>` - Flagi `isModalOpen`, `isDeleting`
- `useState<ApiError | null>` - Błąd API

**RatingButtons:**

- `useState<RatingValue | null>` - Optimistic rating
- `useState<boolean>` - Flaga `isSubmitting`

### 6.2. Custom Hooks

**useQueryList:**

```typescript
function useQueryList(
  page: number,
  perPage: number,
  order: "desc" | "asc"
): {
  data: QueryListResponse | null;
  isLoading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
};
```

- Hook do pobierania listy zapytań z API
- Obsługuje cache i refetch
- Zwraca dane, stan ładowania i błąd

**useScrollPosition:**

```typescript
function useScrollPosition(): {
  save: () => void;
  restore: () => void;
};
```

- Hook do zachowania i przywracania pozycji scroll
- Używany przy paginacji "Załaduj więcej"

**useOptimisticDelete:**

```typescript
function useOptimisticDelete(
  queryId: string,
  onDelete: (id: string) => Promise<void>
): {
  deleteQuery: () => Promise<void>;
  isDeleting: boolean;
  error: ApiError | null;
};
```

- Hook do optimistic update przy usuwaniu zapytania
- Natychmiastowe usunięcie z listy przed API call
- Rollback przy błędzie

**useCollapsible:**

```typescript
function useCollapsible(initialExpanded: boolean): {
  isExpanded: boolean;
  toggle: () => void;
  expand: () => void;
  collapse: () => void;
};
```

- Hook do zarządzania stanem rozwinięcia/zwinięcia
- Używany w QueryCard dla collapsible responses

**useOptimisticRating:**

```typescript
function useOptimisticRating(
  queryId: string,
  responseType: ResponseType
): {
  submitRating: (ratingValue: RatingValue) => Promise<void>;
  optimisticRating: RatingValue | null;
  isSubmitting: boolean;
  error: ApiError | null;
};
```

- Hook do optimistic update przy ocenianiu odpowiedzi
- Natychmiastowa zmiana stanu wizualnego przed API call
- Rollback przy błędzie

**useFocusTrap:**

```typescript
function useFocusTrap(isActive: boolean): void;
```

- Hook do zarządzania focus trap w modalu
- Utrzymuje focus w modalu, przywraca po zamknięciu

**useQueryDetails:**

```typescript
function useQueryDetails(queryId: string): {
  data: QueryDetailResponse | null;
  isLoading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
};
```

- Hook do pobierania szczegółów zapytania (opcjonalnie, dla refresh)
- Używany dla zapytań w statusie "processing"

### 6.3. Globalny stan (opcjonalnie)

Jeśli potrzebny jest globalny stan (np. dla synchronizacji między widokami), można użyć React Context (`AppContext`), ale dla MVP History View nie jest wymagany.

## 7. Integracja API

### 7.1. List User Queries

**Endpoint:** `GET /api/v1/queries`  
**Autentykacja:** Wymagana (JWT token w headerze `Authorization: Bearer {token}`)

**Request:**

- Method: `GET`
- Query Parameters:
  - `page` (number, default=1, min=1)
  - `per_page` (number, default=20, max=100)
  - `order` (string, default="desc", values: "desc" | "asc")
- Headers:
  - `Authorization: Bearer {token}` (z Supabase session)
  - `Content-Type: application/json`

**Response (200 OK):**

```typescript
QueryListResponse {
  queries: QueryListItem[];
  pagination: PaginationMetadata;
}
```

**Error Responses:**

- `401 Unauthorized` - Przekierowanie do `/login?expired=true`
- `422 Unvalidation Error` - Nieprawidłowe parametry paginacji
- `500 Internal Server Error` - Błąd serwera

**Implementacja w API Client:**

```typescript
// src/lib/apiClient.ts
export async function getQueries(params: QueryListParams = {}): Promise<QueryListResponse> {
  const queryString = new URLSearchParams({
    page: String(params.page || 1),
    per_page: String(params.per_page || 20),
    order: params.order || "desc",
  }).toString();

  return apiGet<QueryListResponse>(`/api/v1/queries?${queryString}`);
}
```

### 7.2. Get Query Details

**Endpoint:** `GET /api/v1/queries/{query_id}`  
**Autentykacja:** Wymagana

**Request:**

- Method: `GET`
- Path Parameters:
  - `query_id` (UUID)
- Headers:
  - `Authorization: Bearer {token}`

**Response (200 OK):**

```typescript
QueryDetailResponse;
```

**Error Responses:**

- `401 Unauthorized` - Przekierowanie do `/login`
- `403 Forbidden` - Użytkownik nie jest właścicielem zapytania
- `404 Not Found` - Zapytanie nie istnieje

**Implementacja w API Client:**

```typescript
export async function getQueryDetails(queryId: string): Promise<QueryDetailResponse> {
  return apiGet<QueryDetailResponse>(`/api/v1/queries/${queryId}`);
}
```

### 7.3. Delete Query

**Endpoint:** `DELETE /api/v1/queries/{query_id}`  
**Autentykacja:** Wymagana

**Request:**

- Method: `DELETE`
- Path Parameters:
  - `query_id` (UUID)
- Headers:
  - `Authorization: Bearer {token}`

**Response (204 No Content):**

- Brak body

**Error Responses:**

- `401 Unauthorized` - Przekierowanie do `/login`
- `403 Forbidden` - Użytkownik nie jest właścicielem zapytania
- `404 Not Found` - Zapytanie nie istnieje

**Implementacja w API Client:**

```typescript
export async function deleteQuery(queryId: string): Promise<void> {
  return apiDelete<void>(`/api/v1/queries/${queryId}`);
}
```

### 7.4. Create/Update Rating

**Endpoint:** `POST /api/v1/queries/{query_id}/ratings`  
**Autentykacja:** Wymagana

**Request:**

- Method: `POST`
- Path Parameters:
  - `query_id` (UUID)
- Body:
  ```typescript
  RatingCreateRequest {
    response_type: ResponseType; // 'fast' | 'accurate'
    rating_value: RatingValue; // 'up' | 'down'
  }
  ```
- Headers:
  - `Authorization: Bearer {token}`
  - `Content-Type: application/json`

**Response (201 Created / 200 OK):**

```typescript
RatingResponse;
```

- `201 Created` - Nowa ocena utworzona
- `200 OK` - Istniejąca ocena zaktualizowana

**Error Responses:**

- `401 Unauthorized` - Przekierowanie do `/login`
- `403 Forbidden` - Użytkownik nie jest właścicielem zapytania
- `404 Not Found` - Zapytanie nie istnieje
- `422 Validation Error` - Nieprawidłowe `response_type` lub `rating_value`

**Implementacja w API Client:**

```typescript
export async function createRating(queryId: string, request: RatingCreateRequest): Promise<RatingResponse> {
  return apiPost<RatingResponse>(`/api/v1/queries/${queryId}/ratings`, request);
}
```

## 8. Interakcje użytkownika

### 8.1. Przeglądanie historii zapytań (US-006)

**Scenariusz:**

1. Użytkownik otwiera widok `/app/history`
2. System pobiera pierwszą stronę zapytań (20 najnowszych)
3. Lista zapytań wyświetla się z domyślnie zwiniętymi odpowiedziami
4. Użytkownik może rozwinąć szybką odpowiedź klikając przycisk expand (▼)
5. Jeśli istnieje dokładna odpowiedź, wyświetla się ikona 🔬
6. Użytkownik może rozwinąć dokładną odpowiedź klikając ikonę 🔬

**Implementacja:**

- `HistoryList` pobiera dane przez `useQueryList` przy mount
- `QueryCard` zarządza stanem rozwinięcia przez `useCollapsible`
- Smooth expand/collapse animation przez CSS transitions

### 8.2. Paginacja "Załaduj więcej"

**Scenariusz:**

1. Użytkownik przewija listę do dołu
2. Wyświetla się przycisk "Załaduj więcej (45 pozostałych)"
3. Użytkownik klika przycisk
4. System zachowuje pozycję scroll
5. System pobiera kolejną stronę zapytań
6. Nowe zapytania są dodawane do listy
7. Pozycja scroll jest przywracana

**Implementacja:**

- `LoadMoreButton` wyświetla się gdy `pagination.page < pagination.total_pages`
- `HistoryList` używa `useScrollPosition` do zachowania pozycji
- Po załadowaniu nowych elementów, scroll position jest przywracana przez `scrollIntoView`

### 8.3. Usuwanie zapytania z historii (US-007)

**Scenariusz:**

1. Użytkownik klika ikonę 🗑️ na karcie zapytania
2. Otwiera się confirmation modal
3. Użytkownik potwierdza usunięcie klikając "Usuń"
4. Zapytanie jest natychmiast usuwane z listy (optimistic update)
5. System wysyła request `DELETE /api/v1/queries/{id}`
6. Jeśli sukces (204), zapytanie pozostaje usunięte
7. Jeśli błąd, zapytanie jest przywracane do listy (rollback)

**Implementacja:**

- `DeleteQueryButton` zarządza modalem przez `useState`
- `useOptimisticDelete` wykonuje optimistic update z rollback
- Focus trap przez `useFocusTrap` w modalu

### 8.4. Ocenianie odpowiedzi (US-008)

**Scenariusz:**

1. Użytkownik rozwija odpowiedź (szybką lub dokładną)
2. Użytkownik klika przycisk 👍 lub 👎
3. Przycisk natychmiast zmienia stan wizualny (optimistic update)
4. System wysyła request `POST /api/v1/queries/{id}/ratings`
5. Jeśli sukces, ocena jest zapisywana i przycisk pozostaje aktywny
6. Jeśli błąd, przycisk wraca do poprzedniego stanu (rollback)

**Implementacja:**

- `RatingButtons` używa `useOptimisticRating` dla optimistic updates
- Rollback przy błędzie API
- Wizualna zmiana stanu: aktywny (kolor), nieaktywny (disabled, szary)

### 8.5. Odświeżenie zapytania w statusie "processing"

**Scenariusz:**

1. Zapytanie ma status "processing"
2. Wyświetla się badge "Przetwarzanie..." z przyciskiem odświeżenia
3. Użytkownik klika przycisk odświeżenia
4. System pobiera szczegóły zapytania przez `GET /api/v1/queries/{id}`
5. Jeśli status zmienił się na "completed", odpowiedź jest wyświetlana

**Implementacja:**

- `QueryCard` używa `useQueryDetails` dla refresh (opcjonalnie)
- Auto-refresh można zaimplementować przez `setInterval` (opcjonalnie)

### 8.6. Empty state

**Scenariusz:**

1. Użytkownik nie ma jeszcze żadnych zapytań
2. Wyświetla się empty state z ikoną, nagłówkiem, opisem i CTA
3. Użytkownik klika "Przejdź do czatu"
4. System przekierowuje do `/app`

**Implementacja:**

- `EmptyState` wyświetla się gdy `queries.length === 0`
- Link do `/app` przez `<a href="/app">` lub `window.location.href`

## 9. Warunki i walidacja

### 9.1. Walidacja po stronie frontendu

**QueryListParams:**

- `page`: min=1, default=1
- `per_page`: min=1, max=100, default=20
- `order`: values: "desc" | "asc", default="desc"

**Walidacja w HistoryList:**

- Sprawdzanie czy `page >= 1` przed API call
- Sprawdzanie czy `per_page >= 1 && per_page <= 100` przed API call
- Sprawdzanie czy `order === "desc" || order === "asc"` przed API call

**Walidacja w DeleteQueryButton:**

- Sprawdzanie czy `queryId` jest prawidłowym UUID (opcjonalnie, backend weryfikuje)
- Sprawdzanie czy użytkownik jest zalogowany (token w session)

**Walidacja w RatingButtons:**

- Sprawdzanie czy `responseType === "fast" || responseType === "accurate"`
- Sprawdzanie czy `ratingValue === "up" || ratingValue === "down"`
- Sprawdzanie czy odpowiedź jest kompletna (status === "completed")

### 9.2. Walidacja po stronie backendu

**GET /api/v1/queries:**

- RLS policy: Użytkownik widzi tylko swoje zapytania
- Walidacja parametrów: `page >= 1`, `per_page >= 1 && per_page <= 100`, `order IN ("desc", "asc")`

**DELETE /api/v1/queries/{query_id}:**

- RLS policy: Użytkownik może usuwać tylko swoje zapytania
- Weryfikacja ownership przed usunięciem (403 Forbidden jeśli nie)
- Kaskadowe usuwanie ocen (handled by database)

**POST /api/v1/queries/{query_id}/ratings:**

- RLS policy: Użytkownik może oceniać tylko swoje zapytania
- Walidacja: `response_type IN ("fast", "accurate")`, `rating_value IN ("up", "down")`
- Weryfikacja czy odpowiedź istnieje i jest kompletna

### 9.3. Warunki wpływające na stan UI

**HistoryList:**

- `queries.length === 0` → Wyświetl `EmptyState`
- `pagination.page < pagination.total_pages` → Wyświetl `LoadMoreButton`
- `isLoading === true` → Wyświetl `SkeletonLoader`
- `error !== null` → Wyświetl komunikat błędu

**QueryCard:**

- `fast_response.status === "completed"` → Wyświetl odpowiedź
- `fast_response.status === "processing"` → Wyświetl badge "Przetwarzanie..." z przyciskiem odświeżenia
- `accurate_response.exists === true` → Wyświetl ikonę 🔬
- `isFastResponseExpanded === true` → Rozwiń sekcję szybkiej odpowiedzi
- `isAccurateResponseExpanded === true` → Rozwiń sekcję dokładnej odpowiedzi

**DeleteQueryButton:**

- `isModalOpen === true` → Wyświetl confirmation modal
- `isDeleting === true` → Disable przycisk "Usuń" i wyświetl spinner
- `error !== null` → Wyświetl komunikat błędu w modalu

**RatingButtons:**

- `currentRating !== undefined` → Wyświetl aktywny przycisk dla `currentRating.value`
- `optimisticRating !== null` → Wyświetl optimistic rating (tymczasowy stan)
- `isSubmitting === true` → Disable przyciski podczas wysyłania

## 10. Obsługa błędów

### 10.1. Błędy API

**401 Unauthorized:**

- Przyczyna: Token JWT wygasł lub jest nieprawidłowy
- Obsługa: Automatyczne przekierowanie do `/login?expired=true` przez `apiClient.ts`
- Implementacja: `apiClient.ts` sprawdza status 401 i próbuje odświeżyć session, jeśli nie udaje się, przekierowuje do login

**403 Forbidden:**

- Przyczyna: Użytkownik próbuje usunąć/ocenić zapytanie, które nie należy do niego
- Obsługa: Wyświetlenie komunikatu błędu "Nie masz uprawnień do wykonania tej operacji"
- Implementacja: `DeleteQueryButton` i `RatingButtons` wyświetlają toast notification z błędem

**404 Not Found:**

- Przyczyna: Zapytanie nie istnieje (np. zostało usunięte przez innego użytkownika)
- Obsługa: Usunięcie zapytania z listy (jeśli było w liście) i wyświetlenie komunikatu
- Implementacja: `HistoryList` filtruje usunięte zapytania z listy

**422 Validation Error:**

- Przyczyna: Nieprawidłowe parametry paginacji lub rating
- Obsługa: Wyświetlenie komunikatu błędu z szczegółami walidacji
- Implementacja: Walidacja po stronie frontendu przed API call

**429 Rate Limit Exceeded:**

- Przyczyna: Zbyt wiele requestów w krótkim czasie
- Obsługa: Wyświetlenie komunikatu "Zbyt wiele żądań. Spróbuj ponownie za chwilę."
- Implementacja: `apiClient.ts` zwraca `ApiError` z kodem `RATE_LIMIT_EXCEEDED`

**500 Internal Server Error:**

- Przyczyna: Błąd serwera
- Obsługa: Wyświetlenie komunikatu "Wystąpił błąd serwera. Spróbuj ponownie później."
- Implementacja: `HistoryList` wyświetla komunikat błędu z możliwością retry

**503 Service Unavailable:**

- Przyczyna: Backend jest niedostępny
- Obsługa: Wyświetlenie komunikatu "Serwis jest tymczasowo niedostępny. Spróbuj ponownie później."
- Implementacja: `apiClient.ts` zwraca `ApiError` z kodem `SERVICE_UNAVAILABLE`

### 10.2. Błędy sieciowe

**Network Error:**

- Przyczyna: Brak połączenia z internetem lub backend jest niedostępny
- Obsługa: Wyświetlenie komunikatu "Brak połączenia z serwerem. Sprawdź połączenie internetowe."
- Implementacja: `apiClient.ts` wykrywa `TypeError: fetch failed` i zwraca `SERVICE_UNAVAILABLE`

### 10.3. Błędy walidacji po stronie frontendu

**Nieprawidłowe parametry paginacji:**

- Przyczyna: `page < 1` lub `per_page < 1 || per_page > 100`
- Obsługa: Użycie wartości domyślnych (page=1, per_page=20)
- Implementacja: Walidacja w `HistoryList` przed API call

**Nieprawidłowy UUID:**

- Przyczyna: `queryId` nie jest prawidłowym UUID
- Obsługa: Wyświetlenie komunikatu błędu (opcjonalnie, backend weryfikuje)

### 10.4. Rollback przy błędach

**Optimistic Delete:**

- Jeśli `DELETE /api/v1/queries/{id}` zwraca błąd, zapytanie jest przywracane do listy
- Implementacja: `useOptimisticDelete` przechowuje kopię zapytania i przywraca przy błędzie

**Optimistic Rating:**

- Jeśli `POST /api/v1/queries/{id}/ratings` zwraca błąd, ocena wraca do poprzedniego stanu
- Implementacja: `useOptimisticRating` przechowuje poprzednią ocenę i przywraca przy błędzie

### 10.5. Komunikaty błędów dla użytkownika

Wszystkie komunikaty błędów powinny być:

- Zrozumiałe dla użytkownika (nie techniczne)
- W języku polskim
- Z możliwością retry (jeśli dotyczy)
- Wyświetlane przez toast notification lub inline message

**Przykłady komunikatów:**

- "Nie udało się usunąć zapytania. Spróbuj ponownie."
- "Nie udało się zapisać oceny. Spróbuj ponownie."
- "Nie udało się załadować historii. Odśwież stronę."

## 11. Kroki implementacji

### 11.1. Przygotowanie środowiska

1. **Sprawdzenie zależności:**
   - Upewnij się, że wszystkie zależności są zainstalowane (`npm install`)
   - Sprawdź czy `src/lib/types.ts` zawiera wszystkie wymagane typy
   - Sprawdź czy `src/lib/apiClient.ts` zawiera funkcje pomocnicze

2. **Sprawdzenie backendu:**
   - Upewnij się, że backend ma zaimplementowane endpointy:
     - `GET /api/v1/queries`
     - `GET /api/v1/queries/{query_id}`
     - `DELETE /api/v1/queries/{query_id}`
     - `POST /api/v1/queries/{query_id}/ratings`

### 11.2. Utworzenie utility functions

3. **Utworzenie `src/lib/utils/formatRelativeTime.ts`:**
   - Funkcja formatująca datę jako relative timestamp ("2 godz. temu", "wczoraj", "3 dni temu")
   - Używa `Intl.RelativeTimeFormat` lub własnej implementacji
   - Testy jednostkowe dla różnych przypadków

4. **Utworzenie `src/lib/utils/truncateText.ts`:**
   - Funkcja skracająca tekst do określonej długości z ellipsis
   - Używa `String.slice()` i `String.trim()`
   - Testy jednostkowe

### 11.3. Utworzenie komponentów React (islands)

5. **Utworzenie `src/components/history/HistoryList.tsx`:**
   - Główny kontener z paginacją
   - Fetch `GET /api/v1/queries?page=1&per_page=20`
   - Integracja z `useQueryList` hook
   - Wyświetlanie `QueryCard` w pętli
   - Integracja z `LoadMoreButton`
   - Wyświetlanie `EmptyState` gdy lista jest pusta
   - Obsługa błędów z retry
   - ARIA attributes (`role="list"`)

6. **Utworzenie `src/components/history/QueryCard.tsx`:**
   - Karta pojedynczego zapytania
   - Collapsible responses (domyślnie zwinięte)
   - Expand/collapse animation przez CSS transitions
   - Status badge ("Ukończone" / "Przetwarzanie...")
   - Relative timestamp przez `formatRelativeTime`
   - Truncated question text (100 znaków) z możliwością rozwinięcia
   - Integracja z `FastResponseSection` i `AccurateResponseIndicator`
   - Integracja z `DeleteQueryButton`
   - Semantic HTML (`<article>`)
   - ARIA attributes (`aria-expanded`)

7. **Utworzenie `src/components/history/FastResponseSection.tsx`:**
   - Sekcja szybkiej odpowiedzi (collapsible)
   - `ExpandButton` z `aria-expanded`
   - `MarkdownContent` z sanitizacją (`react-markdown` + `rehype-sanitize`)
   - `SourcesList` (Astro component, reuse z Chat View)
   - `RatingButtons` (reuse z Chat View)
   - `GenerationTimeBadge`

8. **Utworzenie `src/components/history/AccurateResponseIndicator.tsx`:**
   - Wskaźnik dokładnej odpowiedzi (ikona 🔬)
   - Collapsed by default
   - Expand on click → wyświetl `AccurateResponseSection`

9. **Utworzenie `src/components/history/AccurateResponseSection.tsx`:**
   - Sekcja dokładnej odpowiedzi (collapsible)
   - Podobna struktura jak `FastResponseSection`
   - `MarkdownContent`, `SourcesList`, `RatingButtons`, `GenerationTimeBadge`

10. **Utworzenie `src/components/history/DeleteQueryButton.tsx`:**
    - Przycisk usuwania (ikona 🗑️)
    - Confirmation modal przez `ConfirmationModal`
    - Integracja z `useOptimisticDelete`
    - Obsługa błędów z rollback
    - ARIA labels

11. **Utworzenie `src/components/history/ConfirmationModal.tsx`:**
    - Modal potwierdzenia z focus trap
    - Nagłówek, treść, przyciski "Anuluj" i "Usuń"
    - Integracja z `useFocusTrap`
    - ARIA attributes (`role="dialog"`, `aria-modal="true"`)
    - Obsługa ESC i kliknięcia backdrop

12. **Utworzenie `src/components/history/LoadMoreButton.tsx`:**
    - Przycisk "Załaduj więcej" z licznikiem
    - Loading state (spinner)
    - Disabled state gdy wszystkie zapytania załadowane
    - ARIA labels

13. **Utworzenie `src/components/history/EmptyState.tsx`:**
    - Stan pusty z ikoną, nagłówkiem, opisem i CTA
    - Link do `/app`
    - ARIA attributes (`role="status"`)

### 11.4. Utworzenie custom hooks

14. **Utworzenie `src/hooks/useQueryList.ts`:**
    - Hook do pobierania listy zapytań z API
    - Obsługa cache i refetch
    - Zwraca dane, stan ładowania i błąd

15. **Utworzenie `src/hooks/useScrollPosition.ts`:**
    - Hook do zachowania i przywracania pozycji scroll
    - Używany przy paginacji "Załaduj więcej"

16. **Utworzenie `src/hooks/useOptimisticDelete.ts`:**
    - Hook do optimistic update przy usuwaniu zapytania
    - Rollback przy błędzie

17. **Utworzenie `src/hooks/useCollapsible.ts`:**
    - Hook do zarządzania stanem rozwinięcia/zwinięcia
    - Używany w `QueryCard`

18. **Utworzenie `src/hooks/useQueryDetails.ts`:**
    - Hook do pobierania szczegółów zapytania (opcjonalnie, dla refresh)
    - Używany dla zapytań w statusie "processing"

19. **Utworzenie `src/hooks/useFocusTrap.ts`:**
    - Hook do zarządzania focus trap w modalu
    - Używany w `ConfirmationModal`

### 11.5. Integracja komponentów w Astro page

20. **Utworzenie `src/pages/app/history.astro`:**
    - Astro SSR page z middleware auth check
    - Layout: `AppLayout.astro` (lub `BaseLayout.astro`)
    - Statyczny nagłówek "Historia zapytań" przez `PageHeader.astro`
    - Integracja `HistoryList` z `client:load`
    - Integracja `EmptyState` (warunkowo)
    - Meta tags (title, description)

### 11.6. Integracja z API Client

21. **Aktualizacja `src/lib/apiClient.ts`:**
    - Dodanie funkcji `getQueries(params: QueryListParams): Promise<QueryListResponse>`
    - Dodanie funkcji `getQueryDetails(queryId: string): Promise<QueryDetailResponse>`
    - Dodanie funkcji `deleteQuery(queryId: string): Promise<void>`
    - Funkcja `createRating` już istnieje (reuse z Chat View)

### 11.7. Styling i dostępność

22. **Styling komponentów:**
    - Użycie Tailwind CSS dla stylów
    - Użycie Shadcn/ui dla komponentów (Button, Modal, Badge)
    - Smooth expand/collapse animation przez CSS transitions
    - Responsive design (mobile-first)

23. **Dostępność:**
    - ARIA labels dla wszystkich przycisków
    - ARIA expanded dla collapsible items
    - Keyboard navigation (Tab, Enter, Escape)
    - Focus management w modalu
    - Semantic HTML (`<article>`, `<button>`, `<nav>`)
    - Screen reader support (test z NVDA/JAWS)

### 11.8. Testowanie

24. **Testy jednostkowe:**
    - Test `formatRelativeTime` dla różnych przypadków
    - Test `truncateText` dla różnych długości
    - Test `useQueryList` hook (mock API)
    - Test `useOptimisticDelete` hook (mock API)

25. **Testy integracyjne:**
    - Test listowania zapytań z paginacją
    - Test expand/collapse responses
    - Test usuwania zapytania (z confirmation modal)
    - Test ratingów w historii
    - Test empty state
    - Test accessibility (keyboard navigation, screen reader)

### 11.9. Dokumentacja i cleanup

26. **Dokumentacja:**
    - JSDoc comments dla wszystkich funkcji i komponentów
    - README dla komponentów (opcjonalnie)
    - Aktualizacja `.ai/view-implementation-index.md` (jeśli istnieje)

27. **Cleanup:**
    - Usunięcie `console.log` i `console.debug` (użyj logger)
    - Sprawdzenie czy wszystkie importy są używane
    - Sprawdzenie czy nie ma nieużywanych plików
    - Sprawdzenie czy kod jest zgodny z ESLint i Prettier

### 11.10. Weryfikacja końcowa

28. **Weryfikacja funkcjonalności:**
    - [ ] Listowanie zapytań z paginacją działa poprawnie
    - [ ] Collapsible responses rozwijają się i zwijają płynnie
    - [ ] Usuwanie zapytania działa z confirmation modal
    - [ ] Ratingi działają z optimistic updates
    - [ ] Empty state wyświetla się gdy lista jest pusta
    - [ ] Scroll position jest zachowywany przy paginacji
    - [ ] Wszystkie błędy są obsługiwane poprawnie
    - [ ] Accessibility jest zgodna z WCAG AA
    - [ ] Responsive design działa na mobile i desktop
    - [ ] Performance jest akceptowalna (<2s page load)

29. **Weryfikacja zgodności z PRD:**
    - [ ] US-006: Przeglądanie historii zapytań - ✅
    - [ ] US-007: Usuwanie zapytania z historii - ✅
    - [ ] US-008: Udzielanie informacji zwrotnej na temat odpowiedzi - ✅

30. **Code review:**
    - [ ] Kod jest zgodny z style guidelines (ESLint, Prettier)
    - [ ] Wszystkie typy są zdefiniowane poprawnie
    - [ ] Wszystkie błędy są obsługiwane
    - [ ] Accessibility jest zgodna z WCAG AA
    - [ ] Performance jest akceptowalna
    - [ ] Dokumentacja jest kompletna

---

**Powrót do:** [View Implementation Index](../view-implementation-index.md) | [UI Plan](../ui-plan.md) | [PRD](../prd.md) | [API Implementation Index](../api-implementation-index.md)
