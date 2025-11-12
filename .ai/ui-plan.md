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

## 12. Future Enhancements (Post-MVP)

- Real-time updates (Supabase subscriptions)
- Dark mode toggle
- Export query history to PDF
- Share query/response link (public URL)
- Advanced filters in history (date range, rating)
- Voice input for questions (Web Speech API)
- Markdown editor for custom follow-up questions
- Keyboard shortcuts (Cmd+K to focus input)
