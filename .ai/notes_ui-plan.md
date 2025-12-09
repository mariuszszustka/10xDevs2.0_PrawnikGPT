# UI Architecture Plan – PrawnikGPT (Astro + React Islands)

## 1. Przegląd struktury UI

Interfejs użytkownika jest zbudowany wokół głównego widoku czatu (chat interface) dostępnego po autoryzacji. Struktura wykorzystuje Astro dla statycznych elementów layoutu oraz React islands dla interaktywnych komponentów. Całość oparta na responsywnym designie z Tailwind CSS i komponentami Shadcn/ui.

**Architektura:** Content-first z minimalistycznym JS bundle (~40KB)

---

## 2. Lista widoków (Views/Pages)

### 2.1. Landing Page (Strona główna)
- **Ścieżka:** `/` (public)
- **Typ:** Astro SSG (statyczny)
- **Główny cel:** Marketing, onboarding nowych użytkowników
- **Kluczowe sekcje:**
  - Hero section z call-to-action (CTA): "Wypróbuj za darmo"
  - Opis funkcjonalności (3 kolumny: Szybko, Dokładnie, Wiarygodnie)
  - Przykładowe pytania (screenshot interfejsu)
  - Pricing (opcjonalnie, w MVP może być "Free Beta")
  - Footer z linkami (Regulamin, Polityka prywatności, Kontakt)
- **Komponenty:** Wszystkie statyczne (Astro) - brak React

---

### 2.2. Login Page (Strona logowania)
- **Ścieżka:** `/login` (public)
- **Typ:** Astro SSR + React island (formularz)
- **Główny cel:** Logowanie istniejących użytkowników
- **Kluczowe komponenty:**
  - `LoginForm` (React island) - email + password + submit button
  - Link do rejestracji: "Nie masz konta? Zarejestruj się"
  - Komunikaty błędów (inline, z Shadcn/ui Alert)
- **Dane:** Supabase Auth (JWT token zwracany do cookies/localStorage)
- **Redirect:** Po sukcesie → `/app` (główny widok aplikacji)
- **Dostępność:** Focus management, Enter to submit

---

### 2.3. Register Page (Strona rejestracji)
- **Ścieżka:** `/register` (public)
- **Typ:** Astro SSR + React island (formularz)
- **Główny cel:** Rejestracja nowych użytkowników
- **Kluczowe komponenty:**
  - `RegisterForm` (React island) - email + password + confirm password + submit
  - Walidacja hasła (min 8 znaków, komunikat inline)
  - Link do logowania: "Masz już konto? Zaloguj się"
  - Checkbox z akceptacją regulaminu (required)
- **Dane:** Supabase Auth (auto-login po rejestracji)
- **Redirect:** Po sukcesie → `/app` z komunikatem powitalnym
- **Uwaga:** Brak weryfikacji email w MVP (by design)

---

### 2.4. App Layout (Główny layout aplikacji)
- **Ścieżka:** `/app/*` (protected)
- **Typ:** Astro layout z React islands
- **Struktura:**
  ```
  ┌─────────────────────────────────────┐
  │ Header (Astro)                      │
  │ Logo | Nawigacja | User Menu       │
  ├─────────────────────────────────────┤
  │                                     │
  │         <slot /> (content)          │
  │                                     │
  ├─────────────────────────────────────┤
  │ Footer (Astro) - opcjonalny         │
  └─────────────────────────────────────┘
  ```
- **Header components:**
  - Logo (link do `/app`)
  - Navigation links: "Chat" | "Historia"
  - User menu (React island): Avatar + dropdown z "Ustawienia" | "Wyloguj"
- **Middleware:** Check auth.uid() - redirect to `/login` if not authenticated
- **Responsywność:** Mobile: hamburger menu, Desktop: horizontal nav

---

### 2.5. Chat View (Główny widok czatu)
- **Ścieżka:** `/app` lub `/app/chat` (protected)
- **Typ:** Astro SSR + React islands (główny interaktywny widok)
- **Layout:**
  ```
  ┌─────────────────────────────────────┐
  │ Chat Messages Area                  │
  │ - Welcome message (first time)      │
  │ - Example questions (if empty)      │
  │ - Query/Response pairs (scrollable) │
  │   └─ Response with rating buttons   │
  │   └─ "Get detailed answer" button   │
  └─────────────────────────────────────┘
  ┌─────────────────────────────────────┐
  │ Chat Input (React island)           │
  │ [Type your question...] [Send btn]  │
  └─────────────────────────────────────┘
  ```

#### 2.5.1. Welcome Message (onboarding)
- **Warunek:** Pokazuj gdy użytkownik nie ma historii zapytań
- **Treść:**
  ```
  Witaj w PrawnikGPT! 👋

  Jestem twoim asystentem prawnym. Mogę odpowiadać na pytania
  dotyczące 20 000 najnowszych polskich ustaw.

  Zadaj pytanie lub wybierz jeden z przykładów poniżej:
  ```
- **Przykładowe pytania (klikalne):**
  - "Jakie są podstawowe prawa konsumenta?"
  - "Co to jest przedawnienie w prawie cywilnym?"
  - "Jakie są zasady wypowiedzenia umowy o pracę?"
  - "Kiedy można odwołać się od wyroku sądu?"

#### 2.5.2. Chat Messages Area
- **Komponenty:**
  - `ChatMessagesContainer` (React island)
    - Auto-scroll do najnowszej wiadomości
    - Skeleton loader podczas ładowania
    - Lista query/response pairs:
      - User question (right-aligned bubble, light bg)
      - Fast response (left-aligned, white bg):
        - Response content (Markdown rendering)
        - Sources list (clickable links)
        - Rating buttons: 👍 👎 (React island)
        - "Uzyskaj dokładniejszą odpowiedź" button (if not requested)
      - Detailed response (if requested):
        - Label: "Dokładniejsza odpowiedź (gpt-oss:120b)"
        - Response content (Markdown)
        - Sources list
        - Rating buttons: 👍 👎
        - Generation time badge: "Wygenerowano w 187s"

#### 2.5.3. Chat Input Component (React island)
- **Komponent:** `ChatInput.tsx`
- **Funkcjonalność:**
  - Textarea z auto-resize (max 5 linii)
  - Character counter: "45 / 1000"
  - Send button (disabled jeśli <10 lub >1000 znaków)
  - Enter to submit, Shift+Enter for newline
  - Loading state podczas generowania (disable input + show spinner)
- **Walidacja:** Client-side (10-1000 znaków)
- **API call:** POST `/queries` → optimistic UI update

#### 2.5.4. Rating Component (React island)
- **Komponent:** `RatingButtons.tsx`
- **Props:** `responseId`, `initialRating` (if already rated)
- **State:**
  - `rating`: 'up' | 'down' | null
  - `isSubmitting`: boolean
- **Behavior:**
  - Click 👍 → POST `/responses/{id}/ratings` with rating='up'
  - Click 👎 → POST `/responses/{id}/ratings` with rating='down'
  - After submit: change button color, disable opposite button
  - Show checkmark or color change on success
- **Accessibility:** aria-label, keyboard navigation

#### 2.5.5. Detailed Answer Button (React island)
- **Komponent:** `DetailedAnswerButton.tsx`
- **Props:** `queryId`
- **State:**
  - `isLoading`: boolean (loading spinner)
  - `error`: string | null (error message)
- **Behavior:**
  - Click → POST `/queries/{id}/detailed-response`
  - Show loading spinner (can take up to 240s)
  - On success: append detailed response below fast response
  - On timeout: show error with "Spróbuj ponownie" button
  - Button disappears after successful request

---

### 2.6. History View (Widok historii zapytań)
- **Ścieżka:** `/app/history` (protected)
- **Typ:** Astro SSR + React islands
- **Główny cel:** Przeglądanie historii zapytań i odpowiedzi
- **Layout:**
  ```
  ┌─────────────────────────────────────┐
  │ Historia zapytań                    │
  ├─────────────────────────────────────┤
  │ [Query 1] - 2 godz. temu       [🗑️] │
  │   ↓ Fast response (collapsible)     │
  │   ↓ Detailed response (if exists)   │
  ├─────────────────────────────────────┤
  │ [Query 2] - wczoraj            [🗑️] │
  │   ...                               │
  ├─────────────────────────────────────┤
  │ [Load more] button                  │
  └─────────────────────────────────────┘
  ```

#### Components:
- **`HistoryList` (React island):**
  - Fetch GET `/queries?page=1&limit=20`
  - Pagination: "Załaduj więcej" button (infinite scroll optional)
  - Each query card:
    - Question text (truncated to 100 chars, expand on click)
    - Timestamp (relative: "2 godz. temu")
    - Fast response (collapsed by default, expand icon ▼)
    - Detailed response indicator (icon 🔬 if exists)
    - Delete button (icon 🗑️) → confirmation modal → DELETE `/queries/{id}`
- **Empty state:** "Nie masz jeszcze żadnych zapytań. Wróć do czatu i zadaj pierwsze pytanie!"
- **Accessibility:** Keyboard navigation, focus management

---

### 2.7. Settings View (Widok ustawień)
- **Ścieżka:** `/app/settings` (protected)
- **Typ:** Astro SSR + React islands (formularze)
- **Główny cel:** Zarządzanie kontem użytkownika
- **Sekcje:**
  1. **Profil:**
     - Email (read-only, z Supabase Auth)
     - Zmiana hasła (React form)
  2. **Preferencje:** (opcjonalnie w MVP)
     - Dark mode toggle (localStorage)
  3. **Konto:**
     - Przycisk "Usuń konto" (modal z confirmation) → usunięcie konta + wszystkich danych

---

## 3. Mapa podróży użytkownika (User Journey)

### Scenario 1: Nowy użytkownik
1. Landing page (`/`) → kliknięcie CTA "Wypróbuj za darmo"
2. Register page (`/register`) → wypełnienie formularza → auto-login
3. Redirect do `/app` → welcome message + example questions
4. Kliknięcie przykładowego pytania → wysłanie query
5. Otrzymanie fast response w <15s → przeglądanie źródeł
6. Kliknięcie "Uzyskaj dokładniejszą odpowiedź" → oczekiwanie (loading)
7. Otrzymanie detailed response → porównanie obu odpowiedzi
8. Ocena odpowiedzi (👍/👎)
9. Przejście do "Historia" → przeglądanie poprzednich zapytań

### Scenario 2: Powracający użytkownik
1. Login page (`/login`) → zalogowanie
2. Redirect do `/app` → lista poprzednich zapytań (jeśli były)
3. Zadanie nowego pytania → natychmiastowa fast response
4. Przejście do historii → usunięcie starego zapytania

---

## 4. Komponenty React Islands (Interaktywne)

### 4.1. Core Components

| Component | File | Props | Purpose |
|-----------|------|-------|---------|
| `LoginForm` | `src/components/auth/LoginForm.tsx` | - | Email/password login |
| `RegisterForm` | `src/components/auth/RegisterForm.tsx` | - | User registration |
| `UserMenu` | `src/components/layout/UserMenu.tsx` | `user` | Avatar + dropdown menu |
| `ChatInput` | `src/components/chat/ChatInput.tsx` | `onSubmit` | Question input textarea |
| `ChatMessagesContainer` | `src/components/chat/ChatMessagesContainer.tsx` | `queryId?` | Main chat area |
| `ResponseCard` | `src/components/chat/ResponseCard.tsx` | `response`, `showDetailedButton` | Single response display |
| `RatingButtons` | `src/components/chat/RatingButtons.tsx` | `responseId`, `initialRating` | Thumbs up/down |
| `DetailedAnswerButton` | `src/components/chat/DetailedAnswerButton.tsx` | `queryId` | Request detailed response |
| `HistoryList` | `src/components/history/HistoryList.tsx` | - | Query history pagination |
| `QueryCard` | `src/components/history/QueryCard.tsx` | `query` | Single history item |
| `DeleteQueryButton` | `src/components/history/DeleteQueryButton.tsx` | `queryId`, `onDelete` | Delete query with confirmation |

### 4.2. Shadcn/ui Components (używane)

| Component | Usage |
|-----------|-------|
| `Button` | All CTA buttons, submit buttons |
| `Input` | Email, password fields |
| `Textarea` | Chat input |
| `Card` | Response cards, history items |
| `Alert` | Error messages, warnings |
| `Badge` | Generation time, model name tags |
| `Dropdown Menu` | User menu, settings |
| `Dialog` | Confirmation modals (delete query, delete account) |
| `Skeleton` | Loading states for responses |
| `Tooltip` | Help text on icons |
| `Toast` | Success/error notifications (via sonner) |

---

## 5. Astro Components (Statyczne)

| Component | File | Purpose |
|-----------|------|---------|
| `BaseLayout` | `src/layouts/BaseLayout.astro` | Root HTML structure, meta tags |
| `AppLayout` | `src/layouts/AppLayout.astro` | Authenticated app layout (header + footer) |
| `Header` | `src/components/layout/Header.astro` | Navigation bar |
| `Footer` | `src/components/layout/Footer.astro` | Footer with links |
| `WelcomeMessage` | `src/components/chat/WelcomeMessage.astro` | Onboarding message + examples |
| `ExampleQuestions` | `src/components/chat/ExampleQuestions.astro` | Clickable example questions |
| `SourcesList` | `src/components/chat/SourcesList.astro` | Legal act sources (clickable) |
| `HeroSection` | `src/components/landing/HeroSection.astro` | Landing page hero |
| `FeaturesSection` | `src/components/landing/FeaturesSection.astro` | Features showcase |

---

## 6. Struktura katalogów (Directory Structure)

```
src/
├── layouts/
│   ├── BaseLayout.astro          # Root layout (HTML, meta tags)
│   └── AppLayout.astro            # Authenticated app layout
├── pages/
│   ├── index.astro                # Landing page (/)
│   ├── login.astro                # Login page (/login)
│   ├── register.astro             # Register page (/register)
│   └── app/
│       ├── index.astro            # Chat view (/app)
│       ├── history.astro          # History view (/app/history)
│       └── settings.astro         # Settings view (/app/settings)
├── components/
│   ├── layout/
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   └── UserMenu.tsx           # React island
│   ├── auth/
│   │   ├── LoginForm.tsx          # React island
│   │   └── RegisterForm.tsx       # React island
│   ├── chat/
│   │   ├── ChatInput.tsx          # React island
│   │   ├── ChatMessagesContainer.tsx  # React island
│   │   ├── ResponseCard.tsx       # React island
│   │   ├── RatingButtons.tsx      # React island
│   │   ├── DetailedAnswerButton.tsx   # React island
│   │   ├── WelcomeMessage.astro   # Static
│   │   ├── ExampleQuestions.astro # Static
│   │   └── SourcesList.astro      # Static
│   ├── history/
│   │   ├── HistoryList.tsx        # React island
│   │   ├── QueryCard.tsx          # React island
│   │   └── DeleteQueryButton.tsx  # React island
│   ├── landing/
│   │   ├── HeroSection.astro
│   │   └── FeaturesSection.astro
│   └── ui/                        # Shadcn/ui components
│       ├── button.tsx
│       ├── input.tsx
│       ├── textarea.tsx
│       ├── card.tsx
│       ├── alert.tsx
│       ├── badge.tsx
│       ├── dropdown-menu.tsx
│       ├── dialog.tsx
│       ├── skeleton.tsx
│       ├── tooltip.tsx
│       └── toast.tsx
├── lib/
│   ├── supabase.ts                # Supabase client setup
│   ├── api.ts                     # API helper functions (fetch wrappers)
│   └── utils.ts                   # Utility functions (cn, formatDate, etc.)
├── middleware/
│   └── index.ts                   # Auth middleware (check session)
├── assets/
│   ├── logo.svg
│   └── images/
└── styles/
    └── global.css                 # Tailwind imports + custom CSS
```

---

## 7. Responsywność (Responsive Design)

### Breakpoints (Tailwind defaults)
- `sm`: 640px (mobile landscape)
- `md`: 768px (tablet)
- `lg`: 1024px (desktop)
- `xl`: 1280px (large desktop)

### Mobile-first approach
- Chat input: full-width, sticky bottom
- Header: hamburger menu (collapsed)
- Response cards: full-width, stack vertically
- Example questions: 1 column (stack vertically)

### Desktop enhancements
- Chat input: max-width 800px, centered
- Header: horizontal navigation
- Response cards: max-width 800px, centered
- Example questions: 2x2 grid

---

## 8. Dostępność (Accessibility)

### ARIA Best Practices
- Use semantic HTML (`<main>`, `<nav>`, `<article>`)
- ARIA landmarks for screen readers
- `aria-label` for icon buttons (trash, thumbs up/down)
- `aria-live="polite"` for chat messages area (announce new responses)
- `aria-expanded` for collapsible history items
- Focus management: trap focus in modals, restore after close

### Keyboard Navigation
- Tab order: logical flow (header → chat input → messages → footer)
- Enter to submit forms
- Escape to close modals
- Arrow keys for dropdown menus

### Color Contrast
- WCAG AA compliance (4.5:1 for text)
- Use Tailwind's color palette (built-in contrast ratios)
- Test with axe DevTools or Lighthouse

---

## 9. Performance Optimizations

### Astro Optimizations
- Static generation for public pages (landing, login, register)
- Partial hydration: only React islands load JS
- Image optimization: `<Image />` component with lazy loading
- CSS inlining: critical CSS inline, rest deferred

### React Optimizations
- `React.memo()` for `ResponseCard`, `QueryCard`
- `useCallback` for event handlers (prevent re-renders)
- `useMemo` for expensive formatting (Markdown rendering)
- `React.lazy()` + `<Suspense>` for large components (history list)

### API Optimizations
- Debounce chat input (300ms) to prevent excessive API calls
- Optimistic UI updates: show message immediately, confirm async
- Cache API responses (React Query or SWR in future)

### Bundle Size
- Target: <50KB JS for main bundle
- Code splitting: per-page bundles
- Tree-shaking: remove unused Shadcn components

---

## 10. Styling Guidelines

### Tailwind Utility Classes
- Use `@apply` for reusable patterns (e.g., `.btn-primary`)
- Prefer utility classes over custom CSS
- Dark mode: use `dark:` variant (prepare for future)

### Component Styling
- Shadcn/ui components: customize via Tailwind config
- Response cards: white bg, subtle shadow, rounded corners
- User messages: light blue bg, right-aligned
- System messages: gray bg, left-aligned

### Typography
- Font family: Inter or System UI (via Tailwind)
- Headings: font-bold, tracking-tight
- Body text: font-normal, leading-relaxed (for readability)
- Legal text: slightly smaller, serif font for authenticity

---

## 11. Error Handling & Edge Cases

### Network Errors
- Show toast notification: "Błąd połączenia. Sprawdź internet."
- Retry button for failed API calls

### Empty States
- No history: "Nie masz jeszcze żadnych zapytań."
- No search results: "Moja baza wiedzy jest ograniczona..."
- No sources: "Nie znaleziono źródeł dla tej odpowiedzi."

### Loading States
- Skeleton loaders for chat messages
- Spinner for "Get detailed answer" button (can take 240s)
- Disable input during API calls

### Validation Errors
- Inline error messages under input fields
- Red border on invalid inputs
- Character counter turns red when exceeded

---

## 12. Szczegółowe Specyfikacje Implementacji

### 12.1. Obsługa Asynchronicznych Odpowiedzi API (Polling)

**Problem:** API zwraca `202 Accepted` dla zapytań RAG, które mogą trwać do 15 sekund.

**Rozwiązanie:**
- Po otrzymaniu `202 Accepted` z `query_id`, UI rozpoczyna polling z exponential backoff
- Interwał: start 1s, max 2s, backoff: `min(interval * 1.5, 2000)`
- Endpoint polling: `GET /api/v1/queries/{query_id}` co 1-2s
- Warunek zakończenia: `status` zmienia się z `"processing"` na `"completed"`
- UI wyświetla:
  - Skeleton loader z paskiem postępu (indeterminate)
  - Przycisk "Anuluj" (opcjonalnie, jeśli backend wspiera)
  - Po 15 sekundach: komunikat "Odpowiedź może potrwać dłużej niż zwykle..."
- Implementacja: Custom hook `useQueryPolling(queryId, options)`

**Przykład kodu:**
```typescript
// src/hooks/useQueryPolling.ts
const useQueryPolling = (queryId: string) => {
  const [status, setStatus] = useState<'processing' | 'completed' | 'error'>('processing');
  const [elapsed, setElapsed] = useState(0);
  
  useEffect(() => {
    let interval = 1000;
    let timeout: NodeJS.Timeout;
    
    const poll = async () => {
      const response = await apiFetch(`/api/v1/queries/${queryId}`);
      setStatus(response.status);
      
      if (response.status === 'processing') {
        interval = Math.min(interval * 1.5, 2000);
        timeout = setTimeout(poll, interval);
        setElapsed(prev => prev + interval);
      }
    };
    
    poll();
    return () => clearTimeout(timeout);
  }, [queryId]);
  
  return { status, elapsed };
};
```

---

### 12.2. Równoczesne Zapytania

**Problem:** Użytkownik może wysłać wiele zapytań jednocześnie.

**Rozwiązanie:**
- Limit: **3 aktywne zapytania** jednocześnie
- Każde zapytanie ma własny stan ładowania
- Wyświetlanie: Osobna para query/response w `ChatMessagesContainer`
- Wskaźnik w nagłówku: Badge z liczbą aktywnych zapytań (np. "2 przetwarzane")
- Blokada: Tylko pole `ChatInput` jest disabled podczas przetwarzania (nie cały interfejs)
- Implementacja: `useActiveQueries()` hook zarządzający kolejką

**Przykład:**
```typescript
// src/hooks/useActiveQueries.ts
const MAX_CONCURRENT_QUERIES = 3;

const useActiveQueries = () => {
  const [activeQueries, setActiveQueries] = useState<Set<string>>(new Set());
  
  const canSubmit = activeQueries.size < MAX_CONCURRENT_QUERIES;
  
  const addQuery = (queryId: string) => {
    setActiveQueries(prev => new Set([...prev, queryId]));
  };
  
  const removeQuery = (queryId: string) => {
    setActiveQueries(prev => {
      const next = new Set(prev);
      next.delete(queryId);
      return next;
    });
  };
  
  return { activeQueries, canSubmit, addQuery, removeQuery };
};
```

---

### 12.3. Modal dla Dokładnej Odpowiedzi (240s Timeout)

**Problem:** Generowanie dokładnej odpowiedzi może trwać do 240 sekund.

**Rozwiązanie:**
- Po kliknięciu "Uzyskaj dokładniejszą odpowiedź":
  1. Otwórz modal z progress barem (indeterminate)
  2. Modal można zamknąć (zapytanie kontynuuje w tle)
  3. Użyj długiego polling (co 5s) z timeoutem 240s
  4. Endpoint: `GET /api/v1/queries/{query_id}` (sprawdzanie `accurate_response.status`)
- Po przekroczeniu timeoutu:
  - Zamknij modal
  - Pokaż komunikat: "Generowanie przekroczyło limit czasu (4 minuty)"
  - Przycisk "Spróbuj ponownie"
- Powiadomienie: Toast po zakończeniu generowania (jeśli użytkownik zamknął modal)
- Implementacja: `DetailedAnswerModal.tsx` z `useLongPolling()`

**Przykład:**
```typescript
// src/components/chat/DetailedAnswerModal.tsx
const DetailedAnswerModal = ({ queryId, isOpen, onClose }) => {
  const { status, error } = useLongPolling(
    () => apiFetch(`/api/v1/queries/${queryId}`),
    { interval: 5000, timeout: 240000 }
  );
  
  useEffect(() => {
    if (status === 'completed' && !isOpen) {
      toast.success('Dokładna odpowiedź została wygenerowana');
    }
  }, [status, isOpen]);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <Progress value={undefined} /> {/* Indeterminate */}
        <p>Generowanie dokładnej odpowiedzi...</p>
        {error && <Alert variant="destructive">{error}</Alert>}
      </DialogContent>
    </Dialog>
  );
};
```

---

### 12.4. Timer Cache RAG Context (5 minut)

**Problem:** Cache RAG context wygasa po 5 minutach.

**Rozwiązanie:**
- Wyświetlaj timer odliczający czas do wygaśnięcia
- Format: "Dostępne przez 4:32" (mm:ss)
- Wizualny wskaźnik:
  - Zielony: >1 minuta
  - Żółty: <1 minuta (ikona ⚠️)
  - Czerwony: wygasło
- Po wygaśnięciu (410 Gone):
  - Komunikat: "Kontekst wygasł. Kliknij, aby ponownie przeszukać bazę"
  - Przycisk "Ponów zapytanie" → automatycznie ponawia `POST /api/v1/queries`
- Implementacja: `useRAGContextTimer(queryId, createdAt)` hook

**Przykład:**
```typescript
// src/hooks/useRAGContextTimer.ts
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minut

const useRAGContextTimer = (createdAt: string) => {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  
  useEffect(() => {
    const updateTimer = () => {
      const elapsed = Date.now() - new Date(createdAt).getTime();
      const remaining = CACHE_TTL_MS - elapsed;
      setTimeRemaining(remaining > 0 ? remaining : 0);
    };
    
    const interval = setInterval(updateTimer, 1000);
    updateTimer();
    
    return () => clearInterval(interval);
  }, [createdAt]);
  
  const minutes = timeRemaining ? Math.floor(timeRemaining / 60000) : 0;
  const seconds = timeRemaining ? Math.floor((timeRemaining % 60000) / 1000) : 0;
  const isExpiring = timeRemaining !== null && timeRemaining < 60000;
  
  return { timeRemaining, minutes, seconds, isExpiring };
};
```

---

### 12.5. Optimistic Updates dla Ratingów

**Problem:** Rating system używa upsert logic - użytkownik może zmienić ocenę.

**Rozwiązanie:**
- **Optimistic update:** Natychmiast zaktualizuj UI po kliknięciu
- **API call:** `POST /api/v1/queries/{query_id}/ratings` w tle
- **Zmiana oceny:** Zaktualizuj stan bez dodatkowego potwierdzenia
- **Wizualna różnica:**
  - "Rated" (up/down): Kolor (zielony/czerwony) + checkmark ✓
  - "Not rated": Szary, bez checkmarka
- **Toast:** "Ocena zapisana" po sukcesie
- **Rollback:** Jeśli API zwróci błąd, przywróć poprzedni stan + toast błędu
- Implementacja: `useOptimisticRating()` hook

**Przykład:**
```typescript
// src/hooks/useOptimisticRating.ts
const useOptimisticRating = (queryId: string, responseType: 'fast' | 'accurate') => {
  const [rating, setRating] = useState<'up' | 'down' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleRating = async (value: 'up' | 'down') => {
    const previousRating = rating;
    
    // Optimistic update
    setRating(value);
    setIsSubmitting(true);
    
    try {
      await apiFetch(`/api/v1/queries/${queryId}/ratings`, {
        method: 'POST',
        body: JSON.stringify({ response_type: responseType, rating_value: value }),
      });
      toast.success('Ocena zapisana');
    } catch (error) {
      // Rollback
      setRating(previousRating);
      toast.error('Nie udało się zapisać oceny');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return { rating, isSubmitting, handleRating };
};
```

---

### 12.6. Paginacja w Historii

**Problem:** Historia zapytań może zawierać setki wpisów.

**Rozwiązanie (MVP):**
- Przycisk "Załaduj więcej" zamiast infinite scroll
- Paginacja: 20 elementów na stronę
- Przycisk widoczny na dole listy
- Licznik: "Załaduj więcej (45 pozostałych)"
- Zachować scroll position po załadowaniu nowych elementów
- Implementacja: `HistoryList.tsx` z `usePagination()` hook

**Przyszłość (Post-MVP):**
- Infinite scroll z `Intersection Observer API`
- Lazy loading obrazów i markdown rendering

**Przykład:**
```typescript
// src/components/history/HistoryList.tsx
const HistoryList = () => {
  const [page, setPage] = useState(1);
  const [queries, setQueries] = useState<Query[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  
  const loadMore = async () => {
    const response = await apiFetch(`/api/v1/queries?page=${page + 1}&per_page=20`);
    setQueries(prev => [...prev, ...response.queries]);
    setPagination(response.pagination);
    setPage(prev => prev + 1);
  };
  
  const remaining = pagination ? pagination.total_count - queries.length : 0;
  
  return (
    <div>
      {queries.map(query => <QueryCard key={query.query_id} query={query} />)}
      {remaining > 0 && (
        <Button onClick={loadMore}>
          Załaduj więcej ({remaining} pozostałych)
        </Button>
      )}
    </div>
  );
};
```

---

### 12.7. Przykładowe Pytania (Onboarding)

**Problem:** Czy używać statycznych komponentów Astro czy dynamicznych React islands?

**Rozwiązanie (MVP):**
- **Statyczne komponenty Astro** z hardcoded pytaniami
- Powód: Lepsza wydajność (brak JS, instant render)
- Plik: `src/components/chat/ExampleQuestions.astro`
- Pytania klikalne: Automatycznie wypełniają `ChatInput` i wywołują `onSubmit`
- Implementacja: Event delegation z `data-question` attribute

**Przyszłość:**
- Jeśli pytania będą personalizowane → React island z fetch z API
- Endpoint: `GET /api/v1/onboarding/example-questions`

**Przykład:**
```astro
<!-- src/components/chat/ExampleQuestions.astro -->
<div class="example-questions">
  <h3>Przykładowe pytania:</h3>
  <div class="questions-grid">
    <button
      data-question="Jakie są podstawowe prawa konsumenta w Polsce?"
      class="question-card"
    >
      Jakie są podstawowe prawa konsumenta w Polsce?
    </button>
    <!-- ... więcej pytań ... -->
  </div>
</div>

<script>
  document.querySelectorAll('[data-question]').forEach(button => {
    button.addEventListener('click', () => {
      const question = button.dataset.question;
      // Dispatch custom event do ChatInput
      window.dispatchEvent(new CustomEvent('fillQuestion', { detail: question }));
    });
  });
</script>
```

---

### 12.8. Obsługa Błędów NoRelevantActsError

**Problem:** System nie znajduje relewantnych aktów prawnych w bazie.

**Rozwiązanie:**
- **Nie pokazywać pustego stanu błędu**
- Wyświetlić przyjazny komunikat w formie karty odpowiedzi:
  ```
  Przepraszam, moja baza wiedzy jest na razie ograniczona i nie zawiera tego aktu.
  Aktualnie dysponuję informacjami o 20 000 najnowszych ustaw.
  ```
- Dodać przycisk: "Zobacz przykładowe pytania"
- Przycisk przekierowuje do sekcji onboarding (scroll do `ExampleQuestions`)
- Implementacja: `NoRelevantActsCard.tsx` komponent

**Przykład:**
```typescript
// src/components/chat/NoRelevantActsCard.tsx
const NoRelevantActsCard = ({ onShowExamples }: { onShowExamples: () => void }) => {
  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardContent className="pt-6">
        <p className="text-sm text-gray-700">
          Przepraszam, moja baza wiedzy jest na razie ograniczona i nie zawiera tego aktu.
          Aktualnie dysponuję informacjami o 20 000 najnowszych ustaw.
        </p>
        <Button variant="outline" onClick={onShowExamples} className="mt-4">
          Zobacz przykładowe pytania
        </Button>
      </CardContent>
    </Card>
  );
};
```

---

### 12.9. Zarządzanie Sesją i Tokenami JWT

**Problem:** Tokeny JWT wygasają, wymagają refresh.

**Rozwiązanie:**
- **Supabase Auth SDK:** Automatyczne zarządzanie refresh tokenami
- **Middleware Astro:** Sprawdzać `auth.getSession()` przed renderowaniem
- **Redirect:** Jeśli sesja wygasła → `/login` z query param `?expired=true`
- **API Client:** Globalny error handler dla 401:
  1. Przechwytuj 401 Unauthorized
  2. Próbuj odświeżyć token: `supabase.auth.refreshSession()`
  3. Jeśli refresh się nie powiedzie → redirect do `/login?expired=true`
- **Komunikat:** "Sesja wygasła. Zaloguj się ponownie."
- Implementacja: `src/lib/apiClient.ts` + `src/middleware/index.ts`

**Przykład:**
```typescript
// src/lib/apiClient.ts
export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeaders();
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: { ...headers, ...options.headers },
    });
    
    if (response.status === 401) {
      // Try refresh
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error || !session) {
        // Redirect to login
        window.location.href = '/login?expired=true';
        throw new Error('Session expired');
      }
      
      // Retry with new token
      return apiFetch(endpoint, options);
    }
    
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('API fetch error:', error);
    throw error;
  }
}
```

```typescript
// src/middleware/index.ts
export const onRequest = defineMiddleware(async (context, next) => {
  const supabase = supabaseClient;
  const { data: { session } } = await supabase.auth.getSession();
  
  // Check protected routes
  if (context.url.pathname.startsWith('/app') && !session) {
    return context.redirect('/login');
  }
  
  context.locals.supabase = supabase;
  context.locals.session = session;
  
  return next();
});
```

---

### 12.10. Szczegóły Dostępności (A11y)

**Problem:** Długie operacje (do 240s) i dynamiczne treści wymagają specjalnej obsługi dla czytników ekranu.

**Rozwiązanie:**
- **ARIA Live Regions:**
  - `aria-live="polite"` na kontenerze wiadomości czatu
  - Ogłaszanie nowych odpowiedzi: "Nowa odpowiedź otrzymana"
- **Długie operacje:**
  - `aria-busy="true"` na przycisku "Uzyskaj dokładniejszą odpowiedź"
  - `aria-label="Generowanie dokładnej odpowiedzi, może potrwać do 4 minut"`
  - Progress bar z `aria-valuemin="0"`, `aria-valuemax="240"`, `aria-valuenow={elapsed}`
- **Nawigacja klawiaturą:**
  - Tab: logical flow (header → chat input → messages → footer)
  - Enter: submit forms, activate buttons
  - Escape: close modals, cancel operations
  - Arrow keys: dropdown menus
- **Focus Management:**
  - Trap focus w modalach (Tab nie wychodzi poza modal)
  - Restore focus po zamknięciu modala
  - Skip link do głównej zawartości: `<a href="#main-content" class="sr-only focus:not-sr-only">Przejdź do treści</a>`
- **Semantic HTML:**
  - `<main id="main-content">` dla głównej zawartości
  - `<nav>` dla nawigacji
  - `<article>` dla każdej odpowiedzi
  - `<button>` zamiast `<div>` dla klikalnych elementów

**Przykład:**
```tsx
// src/components/chat/ChatMessagesContainer.tsx
<div
  role="log"
  aria-live="polite"
  aria-label="Wiadomości czatu"
  className="chat-messages"
>
  {messages.map((msg, idx) => (
    <article key={idx} aria-label={`Odpowiedź ${idx + 1}`}>
      {/* ... */}
    </article>
  ))}
</div>

// src/components/chat/DetailedAnswerButton.tsx
<Button
  aria-busy={isLoading}
  aria-label={isLoading 
    ? "Generowanie dokładnej odpowiedzi, może potrwać do 4 minut" 
    : "Uzyskaj dokładniejszą odpowiedź"
  }
  disabled={isLoading}
>
  {isLoading ? <Spinner /> : "Uzyskaj dokładniejszą odpowiedź"}
</Button>
```

---

## 13. Future Enhancements (Post-MVP)

- Real-time updates (Supabase subscriptions)
- Dark mode toggle
- Export query history to PDF
- Share query/response link (public URL)
- Advanced filters in history (date range, rating)
- Voice input for questions (Web Speech API)
- Markdown editor for custom follow-up questions
- Keyboard shortcuts (Cmd+K to focus input)

---

## 14. Podsumowanie Sesji Planistycznej - Architektura UI

<conversation_summary>

<decisions>

1. **Polling dla Asynchronicznych Odpowiedzi:** Exponential backoff polling (1s → 2s max), skeleton loader z progress barem, komunikat po 15s, implementacja `useQueryPolling()` hook
2. **Równoczesne Zapytania:** Limit 3 aktywne zapytania, wskaźnik w nagłówku, blokada tylko pola input, implementacja `useActiveQueries()` hook
3. **Modal dla Dokładnej Odpowiedzi:** Modal zamykalny z progress barem, długi polling co 5s (timeout 240s), toast powiadomienie po zakończeniu, badge w nagłówku dla aktywnych generowań
4. **Timer Cache RAG Context:** Timer odliczający czas (format "4:32"), wizualny wskaźnik (zielony → żółty → czerwony), auto-retry po wygaśnięciu (410 Gone), implementacja `useRAGContextTimer()` hook
5. **Optimistic Updates dla Ratingów:** Natychmiastowa aktualizacja UI, wizualna różnica (rated: kolor + checkmark), toast potwierdzający, rollback przy błędzie, implementacja `useOptimisticRating()` hook
6. **Paginacja w Historii:** Przycisk "Załaduj więcej" (nie infinite scroll w MVP), licznik pozostałych, zachowanie scroll position, implementacja `HistoryList.tsx` z `usePagination()`
7. **Przykładowe Pytania:** Statyczne komponenty Astro (hardcoded) w MVP, klikalne z event delegation, automatyczne wypełnianie ChatInput, przyszłość: React island jeśli personalizowane
8. **Obsługa Błędów NoRelevantActsError:** Przyjazny komunikat w formie karty odpowiedzi, przycisk "Zobacz przykładowe pytania", nie pokazywać pustego stanu błędu, implementacja `NoRelevantActsCard.tsx`
9. **Zarządzanie Sesją i Tokenami:** Supabase Auth SDK (automatyczny refresh), middleware Astro sprawdzający `auth.getSession()`, globalny error handler w API client (401 → refresh → redirect), komunikat "Sesja wygasła"
10. **Szczegóły Dostępności:** `aria-live="polite"` na kontenerze wiadomości, `aria-busy="true"` + `aria-label` dla długich operacji, pełna nawigacja klawiaturą, focus management w modalach, skip link, semantic HTML
11. **Markdown Rendering:** Biblioteka `react-markdown` z pluginami `remark-gfm` i `rehype-sanitize`, customizacja stylów Tailwind, lazy loading dla długich odpowiedzi, rozważenie streaming (post-MVP)
12. **Wyświetlanie Źródeł:** Sekcja "Źródła" pod treścią odpowiedzi, klikalne linki do ISAP (target="_blank"), ikona zewnętrznego linku, maksymalnie 10 źródeł z możliwością rozwinięcia
13. **Rate Limiting Feedback:** Toast notification z komunikatem i czasem do resetu, wizualny wskaźnik w ChatInput (7/10 zapytań), disabled przycisk przy przekroczeniu limitu, parser nagłówków `X-RateLimit-*`
14. **State Management:** React Context API dla danych globalnych (AppContext), props dla danych statycznych, lokalny `useState` dla prostych danych, `useMemo` + localStorage dla cache, synchronizacja z Supabase Auth SDK
15. **Obsługa Błędów Sieciowych:** Toast z komunikatem i przyciskiem retry, automatyczny retry z exponential backoff (max 3 próby) dla krytycznych operacji, banner przy całkowitej utracie połączenia
16. **Code Splitting i Lazy Loading:** `React.lazy()` dla dużych komponentów, `client:load`/`client:visible`/`client:idle` w Astro, Suspense boundaries, cel: <50KB JS dla initial bundle
17. **Scroll Position Management:** Auto-scroll do najnowszej wiadomości, zachowanie scroll position przy paginacji, `sessionStorage` dla nawigacji, smooth scroll dla długich odpowiedzi
18. **Formatowanie Czasu Generowania:** Badge z formatem czytelnym ("<1s", "8.5s", "2m 15s"), kolory (zielony <5s, żółty 5-15s, szary >15s), funkcja `formatGenerationTime()`
19. **Status "Processing" w Historii:** Badge "Przetwarzanie..." z możliwością odświeżenia, pulsujący spinner, automatyczne wznowienie polling przy powrocie do czatu, komunikat dla zapytań >5 min
20. **Error Boundary:** Komponent `ErrorBoundary` opakowujący React islands, przyjazny komunikat z przyciskiem odświeżenia, logowanie błędów (konsola w dev, Sentry w prod), fallback UI dla krytycznych komponentów
21. **Walidacja Formularzy:** Błędy inline pod polami (czerwona ramka + komunikat), Alert na górze dla błędów globalnych, parser `validation_errors` z API, czyszczenie błędów po onChange, ogólne komunikaty dla błędów bezpieczeństwa
22. **Empty States:** Spójny design (centered layout, ikona, nagłówek, opis, CTA), komponent `EmptyState` z props, różne stany dla czatu/historii/wyszukiwania
23. **Debouncing:** `useDebouncedCallback` (300ms) dla character counter, NIE dla walidacji, różne delay dla różnych funkcji (100ms rate limit, 400ms search), custom hook `useDebounce()`
24. **Przekazywanie Danych:** Props dla danych statycznych, Context API dla danych dynamicznych, unikanie prop drilling, localStorage backup dla cache
25. **Focus Management w Modalach:** Dialog z Shadcn/ui (automatyczny focus trap), focus na pierwszy element przy otwarciu, restore focus po zamknięciu, `aria-modal="true"` i `role="dialog"`
26. **View Transitions:** Astro View Transitions API w BaseLayout, `transition:animate="slide"` dla przejść w app, `transition:persist` dla zachowania elementów, `transition:name` dla animacji, fallback do standardowej nawigacji
27. **Memoization:** `React.memo()` dla ResponseCard, QueryCard, RatingButtons, `useMemo` dla listy wiadomości i formatowania, `useCallback` dla event handlers, mierzenie performance przed optymalizacją
28. **Integracja Supabase Auth:** `getSession()` w middleware Astro, `onAuthStateChange()` w React islands, Context dla userSession, automatyczne odświeżanie tokenów (5 min przed exp), redirect przy wygaśnięciu
29. **Testowanie:** Vitest + React Testing Library, MSW dla mockowania API, `@testing-library/jest-dom` dla accessibility, `userEvent` dla interakcji, coverage target >50%, struktura `__tests__/`
30. **Loading States:** SSG dla publicznych stron, SSR z skeleton loader dla chronionych, `client:load`/`client:visible`/`client:idle` dla React islands, inline critical CSS, preload critical resources

</decisions>

<matched_recommendations>

1. **Architektura React Islands:** Strategiczne użycie React islands tylko dla interaktywnych komponentów, statyczne komponenty Astro dla treści, partial hydration dla minimalnego JS bundle
2. **Asynchroniczne Operacje:** Polling z exponential backoff dla szybkich odpowiedzi, długi polling dla dokładnych odpowiedzi, wizualne wskaźniki postępu i timeout handling
3. **State Management Strategy:** Context API dla globalnego stanu, lokalny state dla komponentów, unikanie prop drilling, synchronizacja z Supabase Auth
4. **Error Handling Pattern:** Toast notifications dla błędów użytkownika, inline errors dla walidacji, error boundaries dla nieoczekiwanych błędów, przyjazne komunikaty bez ujawniania szczegółów bezpieczeństwa
5. **Performance Optimization:** Code splitting per component, lazy loading dla non-critical components, memoization dla często renderowanych komponentów, debouncing dla input handlers
6. **Accessibility First:** ARIA attributes dla screen readers, pełna nawigacja klawiaturą, focus management w modalach, semantic HTML, skip links
7. **Responsive Design:** Mobile-first approach, breakpoints Tailwind, sticky elements dla mobile, centered max-width dla desktop
8. **User Experience:** Optimistic updates dla lepszego UX, empty states z CTA, loading states z skeleton loaders, smooth transitions między widokami
9. **Security Best Practices:** Sanitizacja markdown (rehype-sanitize), ogólne komunikaty błędów auth, walidacja po stronie klienta i serwera, secure token handling
10. **Testing Strategy:** Unit tests dla komponentów, integration tests z MSW, accessibility tests, coverage target >50% dla MVP

</matched_recommendations>

<ui_architecture_planning_summary>

### Główne Wymagania Architektury UI

Architektura UI dla PrawnikGPT MVP oparta jest na **Astro 5 + React 19 islands** z minimalistycznym podejściem do JavaScript (~40KB initial bundle). Kluczowe założenia:

- **Content-first:** Statyczne komponenty Astro dla treści, React islands tylko dla interaktywności
- **Partial Hydration:** Strategiczne użycie `client:load`, `client:visible`, `client:idle` dla optymalizacji
- **Type Safety:** TypeScript dla całego frontendu, wspólne typy z backendem
- **Component Library:** Shadcn/ui dla dostępnych komponentów, Tailwind CSS dla stylowania

### Kluczowe Widoki i Przepływy Użytkownika

**Publiczne Widoki:**
- Landing page (`/`) - SSG, marketing, CTA do rejestracji
- Login (`/login`) - SSR + React island (LoginForm), redirect do `/app`
- Register (`/register`) - SSR + React island (RegisterForm), auto-login po rejestracji

**Chronione Widoki (`/app/*`):**
- Chat View (`/app`) - główny interfejs czatu z polling dla asynchronicznych odpowiedzi
- History View (`/app/history`) - lista zapytań z paginacją "Załaduj więcej"
- Settings View (`/app/settings`) - zarządzanie kontem (opcjonalnie w MVP)

**Przepływy Użytkownika:**
1. **Nowy użytkownik:** Landing → Register → Welcome Message → Przykładowe pytania → Fast response → Detailed response → Rating
2. **Powracający użytkownik:** Login → Chat z historią → Nowe zapytanie → Historia

### Strategia Integracji z API i Zarządzania Stanem

**API Integration:**
- Custom `apiClient.ts` z globalnym error handler (401 → refresh token → retry)
- Polling hooks: `useQueryPolling()` (fast), `useLongPolling()` (accurate)
- Rate limiting feedback z parserem nagłówków `X-RateLimit-*`
- Optimistic updates dla ratingów z rollback przy błędzie

**State Management:**
- **Global State:** React Context API (`AppContext`) dla: `activeQueries`, `userSession`, `rateLimitInfo`
- **Local State:** `useState` dla komponentów (ChatInput value, QueryCard expanded)
- **Cache:** `useMemo` + localStorage backup dla odpowiedzi
- **Synchronizacja:** Supabase Auth SDK przez Context, `onAuthStateChange()` subscription

**Asynchroniczne Operacje:**
- Fast response: Polling co 1-2s (exponential backoff), timeout 15s
- Accurate response: Długi polling co 5s, timeout 240s, modal zamykalny
- RAG context cache: Timer odliczający 5 minut, auto-retry po wygaśnięciu

### Responsywność, Dostępność i Bezpieczeństwo

**Responsywność:**
- Mobile-first approach z breakpoints Tailwind (sm: 640px, md: 768px, lg: 1024px)
- Chat input: full-width sticky bottom (mobile), max-width 800px centered (desktop)
- Header: hamburger menu (mobile), horizontal nav (desktop)
- Example questions: 1 column (mobile), 2x2 grid (desktop)

**Dostępność (WCAG AA):**
- ARIA attributes: `aria-live="polite"` dla chat messages, `aria-busy="true"` dla długich operacji
- Keyboard navigation: Tab order (header → input → messages → footer), Enter/Escape handlers
- Focus management: Trap focus w modalach, restore focus po zamknięciu, skip link do main content
- Semantic HTML: `<main>`, `<nav>`, `<article>`, `<button>` zamiast `<div>`
- Color contrast: 4.5:1 dla tekstu (Tailwind palette)

**Bezpieczeństwo:**
- Markdown sanitization: `rehype-sanitize` dla XSS prevention
- Auth errors: Ogólne komunikaty ("Nieprawidłowy email lub hasło") bez ujawniania szczegółów
- Token handling: Automatyczne odświeżanie przez Supabase SDK, secure storage
- Input validation: Client-side (10-1000 chars) + server-side validation
- Rate limiting: Feedback w UI, disabled przycisk przy przekroczeniu limitu

### Szczegóły Implementacji Komponentów

**Core React Islands:**
- `ChatInput.tsx` - textarea z auto-resize, character counter, debounced dla counter (300ms), natychmiastowy submit
- `ChatMessagesContainer.tsx` - auto-scroll, skeleton loaders, lista query/response pairs z polling
- `ResponseCard.tsx` - markdown rendering (`react-markdown`), sources list, rating buttons, detailed answer button
- `RatingButtons.tsx` - optimistic updates, wizualna różnica (rated: kolor + checkmark), rollback przy błędzie
- `DetailedAnswerModal.tsx` - modal zamykalny, progress bar, długi polling, toast po zakończeniu
- `HistoryList.tsx` - paginacja "Załaduj więcej", zachowanie scroll position, empty state
- `QueryCard.tsx` - collapsible responses, status "processing" z odświeżeniem, delete button

**Astro Components:**
- `WelcomeMessage.astro` - onboarding message dla nowych użytkowników
- `ExampleQuestions.astro` - statyczne klikalne pytania z event delegation
- `SourcesList.astro` - lista linków do ISAP z ikoną zewnętrznego linku
- `NoRelevantActsCard.tsx` - przyjazny komunikat błędu z CTA do przykładów

**Custom Hooks:**
- `useQueryPolling()` - exponential backoff polling dla fast response
- `useLongPolling()` - długi polling dla accurate response (240s timeout)
- `useActiveQueries()` - zarządzanie limitem 3 aktywnych zapytań
- `useRAGContextTimer()` - timer odliczający cache TTL (5 minut)
- `useOptimisticRating()` - optimistic updates z rollback
- `useDebounce()` - reusable debounce logic
- `usePagination()` - paginacja z zachowaniem scroll position

**Middleware i Integracja:**
- `middleware/index.ts` - Astro middleware sprawdzający `auth.getSession()` dla `/app/*`
- `apiClient.ts` - globalny error handler, refresh token logic, rate limit parsing
- `AppContext.tsx` - Context provider dla globalnego stanu w `AppLayout.astro`

### Optymalizacje Wydajności

**Bundle Size:**
- Cel: <50KB JS dla initial bundle
- Code splitting: Per-page bundles, lazy loading dla non-critical components
- Tree-shaking: Usuwanie nieużywanych Shadcn components

**Rendering:**
- `React.memo()` dla ResponseCard, QueryCard, RatingButtons
- `useMemo` dla listy wiadomości i formatowania czasu
- `useCallback` dla event handlers
- Virtual scrolling dla długich list (post-MVP)

**Loading States:**
- SSG dla publicznych stron (landing, login, register)
- SSR z skeleton loader dla chronionych stron podczas auth check
- Skeleton loaders dla chat messages podczas initial fetch
- Placeholder podczas hydration React islands

**Network:**
- Debouncing dla input handlers (300ms character counter, 400ms search)
- Optimistic UI updates dla lepszego UX
- Cache API responses (useMemo + localStorage)
- Preload critical resources (`<link rel="preload">`)

### Testowanie i Jakość

**Testing Strategy:**
- **Unit Tests:** Vitest + React Testing Library dla komponentów
- **Integration Tests:** MSW (Mock Service Worker) dla mockowania API calls
- **Accessibility Tests:** `@testing-library/jest-dom` z matchers (`toBeInTheDocument`, `toHaveAccessibleName`)
- **User Interactions:** `userEvent` z `@testing-library/user-event`
- **Coverage Target:** >50% dla frontend (MVP)
- **E2E Tests:** Playwright/Cypress (post-MVP)

**Struktura Testów:**
```
src/components/__tests__/
├── ChatInput.test.tsx
├── ChatMessagesContainer.test.tsx
├── ResponseCard.test.tsx
├── RatingButtons.test.tsx
└── ...
```

**Test Cases:**
- Renderowanie komponentów
- Walidacja input (10-1000 chars)
- Submit handlers
- Error states (network, validation, rate limit)
- Loading states (skeleton, spinner)
- Optimistic updates z rollback
- Accessibility (keyboard navigation, ARIA)

</ui_architecture_planning_summary>

<unresolved_issues>

Brak nierozwiązanych kwestii. Wszystkie 30 pytań dotyczących architektury UI zostało omówionych i zatwierdzonych z konkretnymi decyzjami implementacyjnymi. Dokumentacja zawiera szczegółowe specyfikacje dla wszystkich komponentów, hooków, strategii state management, optymalizacji wydajności, dostępności i bezpieczeństwa.

**Gotowe do implementacji:**
- Wszystkie decyzje projektowe są udokumentowane
- Struktura komponentów jest zdefiniowana
- Custom hooks mają określone implementacje
- Integracja z API jest szczegółowo opisana
- Strategie optymalizacji są określone
- Wymagania dostępności są sprecyzowane

**Następne kroki:**
1. Implementacja zgodnie z fazami w `.ai/notatki/note_02.12.2025.md`
2. Rozpoczęcie od Fazy 1: Podstawowe komponenty autoryzacji
3. Stopniowe dodawanie funkcjonalności zgodnie z priorytetami

</unresolved_issues>

</conversation_summary>
