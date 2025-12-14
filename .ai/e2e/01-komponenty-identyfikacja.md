# E2E Testing - Identyfikacja Komponentów i Stron
**Data:** 2025-01-11
**Faza:** 1/5 - Identyfikacja
**Status:** ✅ Kompletna

---

## 📋 Spis Treści
1. [Kluczowe scenariusze E2E](#kluczowe-scenariusze-e2e)
2. [Mapowanie stron i komponentów](#mapowanie-stron-i-komponentów)
3. [Diagram przepływu użytkownika](#diagram-przepływu-użytkownika)
4. [Szczegółowa analiza scenariuszy](#szczegółowa-analiza-scenariuszy)
5. [Priorytetyzacja](#priorytetyzacja)

---

## 🎯 Kluczowe scenariusze E2E

Zgodnie z PRD i wymaganiami biznesowymi, zidentyfikowano następujące kluczowe scenariusze:

### 1. **Authentication Flow** (Autentykacja)
- ✅ User Registration (Rejestracja użytkownika)
- ✅ User Login (Logowanie)
- ✅ User Logout (Wylogowanie)
- ✅ Session Expiry Handling (Obsługa wygasłej sesji)
- ⚠️ Password Reset (Post-MVP, ale komponenty już istnieją)

### 2. **Chat Flow** (Główny przepływ czatu)
- ✅ Submit Query (Wysłanie zapytania)
- ✅ View Fast Response (Wyświetlenie szybkiej odpowiedzi)
- ✅ Request Detailed Response (Żądanie dokładnej odpowiedzi)
- ✅ Rate Response (Ocena odpowiedzi - thumbs up/down)
- ✅ Click Example Questions (Kliknięcie przykładowych pytań)
- ✅ Error Handling (Obsługa błędów - timeout, brak wyników)

### 3. **History Flow** (Historia zapytań)
- ✅ View Query History (Przeglądanie historii)
- ✅ Expand/Collapse Query Details (Rozwijanie szczegółów)
- ✅ Delete Query (Usuwanie zapytania)
- ⚠️ Load More Queries (Paginacja - jeśli zaimplementowana)

### 4. **Navigation & Layout** (Nawigacja)
- ✅ Navigate between Chat and History (Przełączanie widoków)
- ✅ User Menu Interactions (Menu użytkownika)
- ✅ Mobile Responsive Navigation (Nawigacja mobilna)

---

## 🗺️ Mapowanie stron i komponentów

### A. **Strony (Pages)** - Punkty wejścia dla testów

| Strona | Ścieżka | Typ | Auth Required | Kluczowe komponenty |
|--------|---------|-----|---------------|---------------------|
| **Landing** | `/` | SSG | ❌ | HeroSection, FeaturesSection |
| **Login** | `/login` | SSR | ❌ | LoginForm |
| **Register** | `/register` | SSR | ❌ | RegisterForm |
| **Signup** | `/signup` | SSR | ❌ | SignupForm |
| **Forgot Password** | `/forgot-password` | SSR | ❌ | ForgotPasswordForm |
| **Reset Password** | `/reset-password` | SSR | ❌ | ResetPasswordForm |
| **App Home** | `/app` | SSR | ✅ | ChatMessagesContainer, ChatInput |
| **Chat** | `/app/chat` | SSR | ✅ | ChatMessagesContainer, ChatInput |
| **History** | `/app/history` | SSR | ✅ | HistoryList, QueryCard |
| **Settings** | `/app/settings` | SSR | ✅ | Settings components |

### B. **Komponenty React Islands** - Interaktywne elementy

#### 🔐 Authentication Components
| Komponent | Lokalizacja | Używany na stronie | Client Hydration |
|-----------|-------------|-------------------|------------------|
| LoginForm | `src/components/auth/LoginForm.tsx` | `/login` | `client:load` |
| RegisterForm | `src/components/auth/RegisterForm.tsx` | `/register` | `client:load` |
| SignupForm | `src/components/auth/SignupForm.tsx` | `/signup` | `client:load` |
| LogoutButton | `src/components/auth/LogoutButton.tsx` | Header/UserMenu | `client:load` |
| ForgotPasswordForm | `src/components/auth/ForgotPasswordForm.tsx` | `/forgot-password` | `client:load` |
| ResetPasswordForm | `src/components/auth/ResetPasswordForm.tsx` | `/reset-password` | `client:load` |

#### 💬 Chat Components
| Komponent | Lokalizacja | Używany na stronie | Client Hydration |
|-----------|-------------|-------------------|------------------|
| ChatMessagesContainer | `src/components/chat/ChatMessagesContainer.tsx` | `/app`, `/app/chat` | `client:load` |
| ChatInput | `src/components/chat/ChatInput.tsx` | `/app`, `/app/chat` | `client:load` |
| ResponseCard | `src/components/chat/ResponseCard.tsx` | W ChatMessagesContainer | `client:load` |
| RatingButtons | `src/components/chat/RatingButtons.tsx` | W ResponseCard | `client:load` |
| DetailedAnswerModal | `src/components/chat/DetailedAnswerModal.tsx` | W ResponseCard | `client:load` |
| QueryBubble | `src/components/chat/QueryBubble.tsx` | W ChatMessagesContainer | `client:load` |
| MarkdownContent | `src/components/chat/MarkdownContent.tsx` | W ResponseCard | `client:load` |
| NoRelevantActsCard | `src/components/chat/NoRelevantActsCard.tsx` | W ChatMessagesContainer | `client:load` |

#### 📋 History Components
| Komponent | Lokalizacja | Używany na stronie | Client Hydration |
|-----------|-------------|-------------------|------------------|
| HistoryList | `src/components/history/HistoryList.tsx` | `/app/history` | `client:load` |
| QueryCard | `src/components/history/QueryCard.tsx` | W HistoryList | `client:load` |
| DeleteQueryButton | `src/components/history/DeleteQueryButton.tsx` | W QueryCard | `client:load` |
| EmptyState | `src/components/history/EmptyState.tsx` | W HistoryList | `client:load` |
| LoadMoreButton | `src/components/history/LoadMoreButton.tsx` | W HistoryList | `client:load` |

#### 🎨 Layout Components
| Komponent | Lokalizacja | Używany na stronie | Client Hydration |
|-----------|-------------|-------------------|------------------|
| UserMenu | `src/components/layout/UserMenu.tsx` | Header (wszystkie /app/*) | `client:load` |
| Header | `src/components/layout/Header.astro` | Wszystkie /app/* | Static |
| Footer | `src/components/layout/Footer.astro` | Wszystkie | Static |

#### 🎯 Static Astro Components
| Komponent | Lokalizacja | Używany na stronie |
|-----------|-------------|-------------------|
| WelcomeMessage | `src/components/chat/WelcomeMessage.astro` | `/app` (first visit) |
| ExampleQuestions | `src/components/chat/ExampleQuestions.astro` | `/app` (first visit) |
| SourcesList | `src/components/chat/SourcesList.astro` | W ResponseCard (opcjonalnie) |

---

## 🔄 Diagram przepływu użytkownika

```
┌─────────────────────────────────────────────────────────────────────┐
│                         LANDING PAGE (/)                             │
│                                                                       │
│  ┌─────────────────┐                    ┌─────────────────┐         │
│  │ Wypróbuj za     │                    │ Zaloguj się     │         │
│  │ darmo           │                    │                 │         │
│  └────────┬────────┘                    └────────┬────────┘         │
└───────────┼──────────────────────────────────────┼──────────────────┘
            │                                       │
            ▼                                       ▼
   ┌─────────────────┐                    ┌─────────────────┐
   │  REGISTER (/register)                 │  LOGIN (/login)  │
   │                 │                    │                 │
   │  ┌─────────┐    │                    │  ┌─────────┐    │
   │  │Register │    │                    │  │Login    │    │
   │  │Form     │    │                    │  │Form     │    │
   │  └────┬────┘    │                    │  └────┬────┘    │
   └───────┼─────────┘                    └───────┼─────────┘
           │                                       │
           │        Auto-login on success         │
           └──────────────┬──────────────────────┘
                          ▼
                 ┌────────────────────┐
                 │  AUTH MIDDLEWARE   │
                 │  Check Session     │
                 └─────────┬──────────┘
                           │
                ┌──────────┴──────────┐
                │                     │
         ✅ Valid Session      ❌ Invalid/Expired
                │                     │
                ▼                     ▼
       ┌─────────────────┐   Redirect to /login?expired=true
       │   APP HOME       │
       │   (/app)         │
       │                  │
       │  ┌────────────┐  │
       │  │Welcome     │  │ (First visit only)
       │  │Message     │  │
       │  └────────────┘  │
       │                  │
       │  ┌────────────┐  │
       │  │Example     │  │ (First visit only)
       │  │Questions   │  │
       │  └────────────┘  │
       │                  │
       │  ┌────────────┐  │
       │  │ChatMessages│  │ (Query history)
       │  │Container   │  │
       │  └────────────┘  │
       │                  │
       │  ┌────────────┐  │
       │  │ChatInput   │  │
       │  └─────┬──────┘  │
       └────────┼─────────┘
                │
                │ Submit Query
                ▼
       ┌─────────────────┐
       │  QUERY FLOW      │
       │                  │
       │  1. Submit       │──▶ API: POST /api/v1/queries
       │                  │
       │  2. Loading      │──▶ Skeleton loader
       │     (Fast)       │
       │                  │
       │  3. Fast         │──▶ ResponseCard (fast)
       │     Response     │    - Content (Markdown)
       │                  │    - Sources list
       │                  │    - Rating buttons
       │                  │    - "Get detailed" button
       │                  │    - RAG cache timer (5min)
       │                  │
       │  4. Optional:    │──▶ DetailedAnswerModal
       │     Detailed     │    - Loading state (up to 240s)
       │     Response     │    - Progress indicator
       │                  │
       │  5. Detailed     │──▶ ResponseCard (accurate)
       │     Shown        │    - Content (Markdown)
       │                  │    - Sources list
       │                  │    - Rating buttons
       │                  │
       │  6. Rate         │──▶ API: POST /api/v1/ratings
       │     Response     │    - Optimistic update
       │                  │    - One-time rating (disabled after)
       └──────────────────┘

       ┌─────────────────┐
       │  NAVIGATION      │
       │                  │
       │  Header Links:   │
       │  - Chat (/app)   │──────────┐
       │  - History       │          │
       │    (/app/history)│──┐       │
       │                  │  │       │
       │  User Menu:      │  │       │
       │  - Settings      │  │       │
       │  - Logout        │  │       │
       └──────────────────┘  │       │
                             │       │
                             ▼       ▼
              ┌──────────────────────────────┐
              │  HISTORY (/app/history)      │
              │                              │
              │  ┌────────────────────────┐  │
              │  │ HistoryList            │  │
              │  │                        │  │
              │  │  ┌──────────────────┐  │  │
              │  │  │ QueryCard        │  │  │
              │  │  │ - Query text     │  │  │
              │  │  │ - Fast response  │  │  │
              │  │  │ - Expand/Collapse│  │  │
              │  │  │ - Delete button  │  │  │
              │  │  │ - Rating buttons │  │  │
              │  │  └──────────────────┘  │  │
              │  │                        │  │
              │  │  ┌──────────────────┐  │  │
              │  │  │ LoadMoreButton   │  │  │
              │  │  └──────────────────┘  │  │
              │  └────────────────────────┘  │
              └──────────────────────────────┘
```

---

## 📊 Szczegółowa analiza scenariuszy

### Scenariusz 1: **User Registration & Login Flow**

#### 1.1. User Registration (Happy Path)
**Strony:** `/` → `/register` → `/app`

**Komponenty biorące udział:**
1. **Landing Page** (`/`)
   - Button: "Wypróbuj za darmo" → redirect to `/register`

2. **Register Page** (`/register`)
   - `RegisterForm.tsx`:
     - Input: Email (type="email")
     - Input: Password (type="password")
     - Input: Confirm Password (type="password")
     - Checkbox: Terms acceptance
     - Button: "Zarejestruj się"
     - Link: "Masz już konto? Zaloguj się" → `/login`

3. **App Home Page** (`/app`)
   - Redirect after successful registration
   - `WelcomeMessage.astro` - pokazuje się dla nowych użytkowników
   - `ExampleQuestions.astro` - klikalne przykładowe pytania

**Kroki testowe:**
1. Navigate to `/`
2. Click "Wypróbuj za darmo" button
3. Fill email field with valid email
4. Fill password field with valid password (min 8 chars)
5. Fill confirm password field with matching password
6. Check terms acceptance checkbox
7. Click "Zarejestruj się" button
8. **Expect:** Redirect to `/app`
9. **Expect:** Welcome message visible
10. **Expect:** Example questions visible

**Data-testid selectors needed:**
- `cta-register-button` (Landing page)
- `email-input` (RegisterForm)
- `password-input` (RegisterForm)
- `confirm-password-input` (RegisterForm)
- `terms-checkbox` (RegisterForm)
- `submit-button` (RegisterForm)
- `login-link` (RegisterForm)
- `welcome-message` (WelcomeMessage)
- `example-questions` (ExampleQuestions)
- `example-question-{index}` (Individual questions)

#### 1.2. User Login (Happy Path)
**Strony:** `/login` → `/app`

**Komponenty biorące udział:**
1. **Login Page** (`/login`)
   - `LoginForm.tsx`:
     - Input: Email
     - Input: Password (with show/hide toggle)
     - Button: "Zaloguj się"
     - Link: "Nie masz konta? Zarejestruj się" → `/register`

2. **App Home Page** (`/app`)
   - Redirect after successful login

**Kroki testowe:**
1. Navigate to `/login`
2. Fill email field
3. Fill password field
4. Click "Zaloguj się" button
5. **Expect:** Redirect to `/app`
6. **Expect:** User menu visible with email

**Data-testid selectors needed:**
- `email-input` (LoginForm)
- `password-input` (LoginForm)
- `password-toggle-button` (LoginForm)
- `submit-button` (LoginForm)
- `register-link` (LoginForm)
- `user-menu` (UserMenu)
- `user-email` (UserMenu)

#### 1.3. User Logout
**Strony:** `/app/*` → `/login`

**Komponenty biorące udział:**
1. **User Menu** (`UserMenu.tsx`)
   - Dropdown with:
     - User email (read-only)
     - "Ustawienia" link
     - "Wyloguj" button

**Kroki testowe:**
1. Navigate to `/app` (logged in)
2. Click user menu button
3. Click "Wyloguj" button
4. **Expect:** Redirect to `/login`
5. **Expect:** Session cleared
6. Try to access `/app` → **Expect:** Redirect to `/login`

**Data-testid selectors needed:**
- `user-menu-button` (UserMenu)
- `user-menu-dropdown` (UserMenu)
- `logout-button` (UserMenu)

#### 1.4. Session Expiry Handling
**Strony:** `/app` → `/login?expired=true`

**Komponenty biorące udział:**
1. **Auth Middleware** (server-side)
2. **Login Page** (`/login`)
   - Alert: "Twoja sesja wygasła. Zaloguj się ponownie."

**Kroki testowe:**
1. Login successfully
2. Manually clear session/cookies OR wait for expiry
3. Navigate to `/app`
4. **Expect:** Redirect to `/login?expired=true`
5. **Expect:** Session expiry message visible

**Data-testid selectors needed:**
- `session-expired-alert` (LoginForm)

---

### Scenariusz 2: **Chat Flow - Submit Query & View Responses**

#### 2.1. Submit Query (First Time User - Happy Path)
**Strony:** `/app`

**Komponenty biorące udział:**
1. **WelcomeMessage** (`WelcomeMessage.astro`)
2. **ExampleQuestions** (`ExampleQuestions.astro`)
   - 3-4 clickable example questions
3. **ChatInput** (`ChatInput.tsx`)
   - Textarea (auto-resize)
   - Character counter (10-1000 chars)
   - Rate limit indicator (10/min)
   - Send button
4. **ChatMessagesContainer** (`ChatMessagesContainer.tsx`)
   - Polling for response status
   - Displays QueryBubble + ResponseCard

**Kroki testowe (Manual Input):**
1. Navigate to `/app` (first visit, logged in)
2. **Expect:** Welcome message visible
3. **Expect:** Example questions visible
4. Type valid query in ChatInput (10-1000 chars)
5. **Expect:** Character counter updates
6. **Expect:** Send button enabled
7. Click Send button
8. **Expect:** QueryBubble appears (right-aligned)
9. **Expect:** Loading skeleton appears (left-aligned)
10. Wait for fast response (max 15s)
11. **Expect:** ResponseCard appears with:
    - Content (Markdown)
    - Sources list
    - Rating buttons (inactive)
    - "Uzyskaj dokładniejszą odpowiedź" button
    - RAG cache timer (5:00)
    - Generation time badge

**Kroki testowe (Example Question Click):**
1. Navigate to `/app` (first visit, logged in)
2. Click one of example questions
3. **Expect:** Query submitted automatically
4. Same flow as manual input from step 8

**Data-testid selectors needed:**
- `chat-input` (ChatInput textarea)
- `character-counter` (ChatInput)
- `rate-limit-info` (ChatInput)
- `send-button` (ChatInput)
- `query-bubble` (QueryBubble)
- `loading-skeleton` (ChatMessagesContainer)
- `response-card` (ResponseCard)
- `response-content` (ResponseCard)
- `sources-list` (ResponseCard)
- `rating-buttons` (RatingButtons)
- `detailed-answer-button` (ResponseCard)
- `rag-cache-timer` (ResponseCard)
- `generation-time-badge` (ResponseCard)

#### 2.2. Request Detailed Response
**Strony:** `/app`

**Komponenty biorące udział:**
1. **ResponseCard** (`ResponseCard.tsx`)
   - "Uzyskaj dokładniejszą odpowiedź" button
2. **DetailedAnswerModal** (`DetailedAnswerModal.tsx`)
   - Modal overlay
   - Progress indicator (indeterminate)
   - Message after 15s: "Odpowiedź może potrwać dłużej..."
   - Timeout at 240s: Error message
3. **ResponseCard** (accurate response)
   - Label: "Dokładniejsza odpowiedź (gpt-oss:120b)"
   - Content, sources, rating buttons

**Kroki testowe:**
1. After fast response is visible
2. **Expect:** RAG cache timer showing (e.g., 4:58)
3. Click "Uzyskaj dokładniejszą odpowiedź" button
4. **Expect:** Modal opens with loading indicator
5. Wait for detailed response (max 240s)
6. **Expect:** Modal closes
7. **Expect:** Second ResponseCard appears (accurate)
8. **Expect:** "Dokładniejsza odpowiedź" label visible
9. **Expect:** Generation time badge shows longer time

**Data-testid selectors needed:**
- `detailed-answer-modal` (DetailedAnswerModal)
- `detailed-answer-loading` (DetailedAnswerModal)
- `detailed-answer-progress-message` (DetailedAnswerModal after 15s)
- `accurate-response-card` (ResponseCard for accurate)
- `accurate-response-label` (ResponseCard)

#### 2.3. Rate Response (Optimistic Update)
**Strony:** `/app`

**Komponenty biorące udział:**
1. **RatingButtons** (`RatingButtons.tsx`)
   - Thumbs up button
   - Thumbs down button
   - Optimistic update (immediate visual feedback)
   - Rollback on error

**Kroki testowe:**
1. After response is visible
2. **Expect:** Both rating buttons enabled
3. Click thumbs up button
4. **Expect:** Thumbs up button highlighted (immediate)
5. **Expect:** Thumbs down button disabled
6. **Expect:** API call sent (POST /api/v1/ratings)
7. On success: State remains
8. On error: Rollback to initial state + error toast

**Data-testid selectors needed:**
- `rating-button-up` (RatingButtons)
- `rating-button-down` (RatingButtons)
- `rating-button-up-active` (when selected)
- `rating-button-down-active` (when selected)

#### 2.4. Error Scenarios

##### 2.4.1. No Relevant Acts Found
**Komponenty biorące udział:**
1. **NoRelevantActsCard** (`NoRelevantActsCard.tsx`)
   - Friendly message
   - "Zobacz przykładowe pytania" button

**Kroki testowe:**
1. Submit query with no matching acts (e.g., "What is the capital of France?")
2. **Expect:** NoRelevantActsCard appears
3. Click "Zobacz przykładowe pytania"
4. **Expect:** Scroll to ExampleQuestions

**Data-testid selectors needed:**
- `no-relevant-acts-card` (NoRelevantActsCard)
- `show-examples-button` (NoRelevantActsCard)

##### 2.4.2. Timeout (240s for detailed response)
**Komponenty biorące udział:**
1. **DetailedAnswerModal** (`DetailedAnswerModal.tsx`)
   - Timeout error message
   - "Spróbuj ponownie" button

**Kroki testowe:**
1. Click "Uzyskaj dokładniejszą odpowiedź"
2. Wait for 240s (or mock timeout)
3. **Expect:** Error message in modal
4. **Expect:** "Spróbuj ponownie" button visible
5. Click "Spróbuj ponownie"
6. **Expect:** Request resubmitted

**Data-testid selectors needed:**
- `timeout-error-message` (DetailedAnswerModal)
- `retry-button` (DetailedAnswerModal)

##### 2.4.3. Network Error
**Komponenty biorące udział:**
1. **ChatMessagesContainer** or global error handler
   - Toast notification
   - "Retry" button

**Kroki testowe:**
1. Submit query
2. Simulate network error (offline mode)
3. **Expect:** Error toast appears
4. Click "Retry" button
5. **Expect:** Request resubmitted

**Data-testid selectors needed:**
- `error-toast` (Global or ChatMessagesContainer)
- `error-retry-button` (Toast)

---

### Scenariusz 3: **History Flow**

#### 3.1. View Query History
**Strony:** `/app/history`

**Komponenty biorące udział:**
1. **HistoryList** (`HistoryList.tsx`)
   - List of QueryCard components
   - LoadMoreButton (pagination)
2. **QueryCard** (`QueryCard.tsx`)
   - Query text
   - Fast response (collapsed by default)
   - Expand/Collapse button
   - Delete button
   - Rating buttons (if rated, shows current rating)

**Kroki testowe:**
1. Navigate to `/app/history`
2. **Expect:** HistoryList visible
3. **Expect:** QueryCard items visible (most recent first)
4. **Expect:** Each QueryCard shows:
   - Query text
   - Timestamp
   - Fast response preview (truncated)
   - "Rozwiń" button
   - Delete button
5. Scroll to bottom
6. **Expect:** LoadMoreButton visible (if more queries)

**Data-testid selectors needed:**
- `history-list` (HistoryList)
- `query-card` (QueryCard)
- `query-card-{id}` (Individual cards)
- `query-text` (QueryCard)
- `query-timestamp` (QueryCard)
- `fast-response-preview` (QueryCard)
- `expand-button` (QueryCard)
- `delete-button` (QueryCard)
- `load-more-button` (LoadMoreButton)

#### 3.2. Expand/Collapse Query Details
**Strony:** `/app/history`

**Komponenty biorące udział:**
1. **QueryCard** (`QueryCard.tsx`)
   - Expand button
   - Collapsed: Shows preview
   - Expanded: Shows full response + sources + rating

**Kroki testowe:**
1. Navigate to `/app/history`
2. Click "Rozwiń" on a QueryCard
3. **Expect:** Card expands
4. **Expect:** Full response content visible
5. **Expect:** Sources list visible
6. **Expect:** Rating buttons visible (with current rating if rated)
7. **Expect:** Button text changes to "Zwiń"
8. Click "Zwiń"
9. **Expect:** Card collapses
10. **Expect:** Only preview visible

**Data-testid selectors needed:**
- `expand-button` (changes to "Zwiń")
- `full-response-content` (visible when expanded)
- `collapsed-preview` (visible when collapsed)

#### 3.3. Delete Query
**Strony:** `/app/history`

**Komponenty biorące udział:**
1. **QueryCard** (`QueryCard.tsx`)
2. **DeleteQueryButton** (`DeleteQueryButton.tsx`)
   - Confirmation dialog (optional)
   - Optimistic removal

**Kroki testowe:**
1. Navigate to `/app/history`
2. Count total queries
3. Click delete button on first QueryCard
4. **Expect:** Confirmation dialog appears (optional)
5. Confirm deletion
6. **Expect:** QueryCard disappears immediately (optimistic)
7. **Expect:** API call sent (DELETE /api/v1/queries/{id})
8. On success: State remains
9. On error: Card reappears + error toast

**Data-testid selectors needed:**
- `delete-button` (DeleteQueryButton)
- `delete-confirmation-dialog` (if implemented)
- `confirm-delete-button` (Dialog)
- `cancel-delete-button` (Dialog)

#### 3.4. Empty State
**Strony:** `/app/history`

**Komponenty biorące udział:**
1. **EmptyState** (`EmptyState.tsx`)
   - Message: "Nie masz jeszcze historii zapytań"
   - "Zadaj pierwsze pytanie" button → redirect to `/app`

**Kroki testowe:**
1. Login as new user (no queries)
2. Navigate to `/app/history`
3. **Expect:** EmptyState visible
4. Click "Zadaj pierwsze pytanie" button
5. **Expect:** Redirect to `/app`
6. **Expect:** ChatInput focused

**Data-testid selectors needed:**
- `empty-state` (EmptyState)
- `ask-first-question-button` (EmptyState)

---

### Scenariusz 4: **Navigation & Layout**

#### 4.1. Navigate Between Chat and History
**Strony:** `/app` ↔ `/app/history`

**Komponenty biorące udział:**
1. **Header** (`Header.astro`)
   - Navigation links:
     - "Chat" → `/app`
     - "Historia" → `/app/history`
   - Active link highlighting

**Kroki testowe:**
1. Navigate to `/app`
2. **Expect:** "Chat" link highlighted (active)
3. Click "Historia" link
4. **Expect:** Redirect to `/app/history`
5. **Expect:** "Historia" link highlighted
6. Click "Chat" link
7. **Expect:** Redirect to `/app`
8. **Expect:** "Chat" link highlighted

**Data-testid selectors needed:**
- `nav-chat-link` (Header)
- `nav-history-link` (Header)
- `nav-link-active` (class or attribute)

#### 4.2. User Menu Interactions
**Strony:** Wszystkie `/app/*`

**Komponenty biorące udział:**
1. **UserMenu** (`UserMenu.tsx`)
   - User avatar/email button
   - Dropdown menu:
     - User email (read-only)
     - "Ustawienia" → `/app/settings`
     - "Wyloguj"

**Kroki testowe:**
1. Navigate to `/app`
2. Click user menu button
3. **Expect:** Dropdown opens
4. **Expect:** User email visible
5. Click outside dropdown
6. **Expect:** Dropdown closes
7. Click user menu button again
8. Click "Ustawienia"
9. **Expect:** Redirect to `/app/settings`

**Data-testid selectors needed:**
- `user-menu-button` (UserMenu)
- `user-menu-dropdown` (UserMenu)
- `user-email-display` (UserMenu)
- `settings-link` (UserMenu)
- `logout-button` (UserMenu)

#### 4.3. Mobile Responsive Navigation
**Strony:** Wszystkie `/app/*`

**Komponenty biorące udział:**
1. **Header** (`Header.astro`)
   - Hamburger menu button (mobile)
   - Mobile navigation drawer

**Kroki testowe:**
1. Set viewport to mobile (e.g., 375px)
2. Navigate to `/app`
3. **Expect:** Hamburger menu button visible
4. **Expect:** Navigation links hidden
5. Click hamburger button
6. **Expect:** Mobile menu opens
7. **Expect:** Navigation links visible
8. Click "Historia" link
9. **Expect:** Menu closes
10. **Expect:** Redirect to `/app/history`

**Data-testid selectors needed:**
- `hamburger-menu-button` (Header)
- `mobile-nav-menu` (Header)
- `mobile-nav-chat-link` (Header)
- `mobile-nav-history-link` (Header)

---

## 🎯 Priorytetyzacja scenariuszy

### Priority 1: KRYTYCZNE (Muszą działać)
1. **Authentication Flow**
   - User Login (1.2)
   - User Logout (1.3)
   - Session Expiry (1.4)

2. **Core Chat Flow**
   - Submit Query - Manual Input (2.1)
   - View Fast Response (2.1)
   - Rate Response (2.3)

3. **Navigation**
   - Navigate between Chat and History (4.1)

**Uzasadnienie:** To podstawowe funkcjonalności, bez których aplikacja jest bezużyteczna.

### Priority 2: WYSOKIE (Kluczowe dla UX)
1. **Authentication Flow**
   - User Registration (1.1)

2. **Chat Flow**
   - Submit Query - Example Question Click (2.1)
   - Request Detailed Response (2.2)
   - No Relevant Acts Error (2.4.1)

3. **History Flow**
   - View Query History (3.1)
   - Expand/Collapse Details (3.2)
   - Delete Query (3.3)

4. **Navigation**
   - User Menu Interactions (4.2)

**Uzasadnienie:** Funkcjonalności wymagane przez PRD i często używane przez użytkowników.

### Priority 3: ŚREDNIE (Nice to have)
1. **Chat Flow**
   - Timeout Handling (2.4.2)
   - Network Error (2.4.3)

2. **History Flow**
   - Empty State (3.4)

3. **Navigation**
   - Mobile Responsive (4.3)

**Uzasadnienie:** Scenariusze edge case i responsywność mobilna.

### Priority 4: NISKIE (Post-MVP lub opcjonalne)
1. **Password Reset Flow** (komponenty istnieją, ale nie w MVP)
2. **Load More Pagination** (jeśli zaimplementowane)
3. **Settings Page** (jeśli zaimplementowane)

**Uzasadnienie:** Funkcjonalności które mogą być dodane po MVP.

---

## 📝 Podsumowanie

### Liczba zidentyfikowanych:
- **Scenariuszy głównych:** 4 (Auth, Chat, History, Navigation)
- **Pod-scenariuszy:** 20+
- **Stron:** 10 (6 publicznych + 4 chronione)
- **Komponentów React Islands:** 24+
- **Komponentów Astro (static):** 5+

### Następne kroki:
1. ✅ **DONE:** Identyfikacja komponentów i stron
2. **NEXT:** Dodanie `data-testid` selektorów do wszystkich zidentyfikowanych komponentów
3. **NEXT:** Zbudowanie Page Object Models dla każdej strony
4. **NEXT:** Wygenerowanie scenariuszy testowych Playwright
5. **NEXT:** Korekta i uruchomienie testów

---

**Dokument gotowy do użycia w kolejnych fazach implementacji testów E2E.**
