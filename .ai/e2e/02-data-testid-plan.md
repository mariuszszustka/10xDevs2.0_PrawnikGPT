# E2E Testing - Plan dodania selektorów data-testid
**Data:** 2025-01-11
**Faza:** 2/5 - Dodanie selektorów
**Status:** 🚧 W trakcie

---

## 📋 Zasady dodawania data-testid

### ✅ DOBRE PRAKTYKI:
1. **Dodawaj wewnątrz komponentu** - nie na zewnątrz (w miejscu użycia)
2. **Używaj kebab-case** - `data-testid="user-menu-button"`
3. **Bądź opisowy** - `submit-button` zamiast `btn`
4. **Dodawaj do elementów interaktywnych** - buttons, inputs, links, forms
5. **Dodawaj do kontenerów** - dla strukturalnych elementów (cards, lists)
6. **Indeksowanie gdy potrzebne** - `example-question-${index}`

### ❌ UNIKAJ:
1. ❌ Dodawania na zewnątrz: `<LoginForm data-testid="login-form" />`
2. ❌ Generycznych nazw: `button-1`, `div-2`
3. ❌ CamelCase: `submitButton`
4. ❌ Nadmiernego dodawania - tylko to co będzie używane w testach

---

## 🎯 Priorytetyzacja komponentów

### Priority 1: KRYTYCZNE (Auth + Core Chat)
- [x] LoginForm.tsx
- [x] ChatInput.tsx
- [ ] ResponseCard.tsx
- [ ] RatingButtons.tsx
- [ ] Header.astro

### Priority 2: WYSOKIE (Registration + History)
- [ ] RegisterForm.tsx
- [ ] SignupForm.tsx
- [ ] ChatMessagesContainer.tsx
- [ ] HistoryList.tsx
- [ ] QueryCard.tsx
- [ ] UserMenu.tsx

### Priority 3: ŚREDNIE (Supporting components)
- [ ] DetailedAnswerModal.tsx
- [ ] DeleteQueryButton.tsx
- [ ] ExampleQuestions.astro
- [ ] WelcomeMessage.astro
- [ ] NoRelevantActsCard.tsx

---

## 📊 Mapa selektorów według komponentów

### 🔐 Authentication Components

#### LoginForm.tsx
**Lokalizacja:** `src/components/auth/LoginForm.tsx`

| Element | Selektor | Typ | Opis |
|---------|----------|-----|------|
| Form element | `login-form` | form | Główny formularz |
| Email input | `email-input` | input | Pole email |
| Password input | `password-input` | input | Pole hasła |
| Password toggle | `password-toggle-button` | button | Pokaż/ukryj hasło |
| Submit button | `submit-button` | button | Zaloguj się |
| Register link | `register-link` | a | Link do rejestracji |
| Session expired alert | `session-expired-alert` | div | Alert o wygasłej sesji |
| Error message | `error-message` | div | Komunikat błędu |

#### RegisterForm.tsx
**Lokalizacja:** `src/components/auth/RegisterForm.tsx`

| Element | Selektor | Typ | Opis |
|---------|----------|-----|------|
| Form element | `register-form` | form | Główny formularz |
| Email input | `email-input` | input | Pole email |
| Password input | `password-input` | input | Pole hasła |
| Confirm password input | `confirm-password-input` | input | Potwierdzenie hasła |
| Terms checkbox | `terms-checkbox` | input | Akceptacja regulaminu |
| Submit button | `submit-button` | button | Zarejestruj się |
| Login link | `login-link` | a | Link do logowania |
| Error message | `error-message` | div | Komunikat błędu |

#### SignupForm.tsx
**Lokalizacja:** `src/components/auth/SignupForm.tsx`

| Element | Selektor | Typ | Opis |
|---------|----------|-----|------|
| Form element | `signup-form` | form | Główny formularz |
| Email input | `email-input` | input | Pole email |
| Password input | `password-input` | input | Pole hasła |
| Submit button | `submit-button` | button | Zapisz się |
| Login link | `login-link` | a | Link do logowania |

---

### 💬 Chat Components

#### ChatInput.tsx
**Lokalizacja:** `src/components/chat/ChatInput.tsx`

| Element | Selektor | Typ | Opis |
|---------|----------|-----|------|
| Form element | `chat-input-form` | form | Formularz czatu |
| Textarea | `chat-input` | textarea | Pole wprowadzania |
| Character counter | `character-counter` | div | Licznik znaków |
| Rate limit info | `rate-limit-info` | div | Info o limicie |
| Active queries info | `active-queries-info` | div | Info o aktywnych |
| Send button | `send-button` | button | Wyślij pytanie |
| Error message | `error-message` | div | Komunikat błędu |

#### ChatMessagesContainer.tsx
**Lokalizacja:** `src/components/chat/ChatMessagesContainer.tsx`

| Element | Selektor | Typ | Opis |
|---------|----------|-----|------|
| Container | `chat-messages-container` | div | Główny kontener |
| Messages list | `messages-list` | div | Lista wiadomości |
| Loading skeleton | `loading-skeleton` | div | Skeleton loader |
| Query bubble | `query-bubble` | div | Bąbelek pytania |
| Query bubble (indexed) | `query-bubble-${index}` | div | Konkretne pytanie |

#### ResponseCard.tsx
**Lokalizacja:** `src/components/chat/ResponseCard.tsx`

| Element | Selektor | Typ | Opis |
|---------|----------|-----|------|
| Card container | `response-card` | article | Główna karta |
| Fast response card | `response-card-fast` | article | Szybka odpowiedź |
| Accurate response card | `response-card-accurate` | article | Dokładna odpowiedź |
| Response type badge | `response-type-badge` | span | Badge typu |
| Model name badge | `model-name-badge` | span | Badge modelu |
| Generation time badge | `generation-time-badge` | span | Czas generowania |
| RAG cache timer | `rag-cache-timer` | div | Timer cache (5min) |
| Cache expired badge | `cache-expired-badge` | span | Cache wygasł |
| Response content | `response-content` | div | Treść odpowiedzi |
| Sources list | `sources-list` | div | Lista źródeł |
| Source item | `source-item-${index}` | li | Pojedyncze źródło |
| Source link | `source-link-${index}` | a | Link do źródła |
| Rating buttons container | `rating-buttons` | div | Kontener ocen |
| Detailed answer button | `detailed-answer-button` | button | Przycisk dokładnej |

#### RatingButtons.tsx
**Lokalizacja:** `src/components/chat/RatingButtons.tsx`

| Element | Selektor | Typ | Opis |
|---------|----------|-----|------|
| Container | `rating-buttons` | div | Główny kontener |
| Thumbs up button | `rating-button-up` | button | Kciuk w górę |
| Thumbs down button | `rating-button-down` | button | Kciuk w dół |
| Thumbs up (active) | `rating-button-up-active` | button | Aktywny pozytywny |
| Thumbs down (active) | `rating-button-down-active` | button | Aktywny negatywny |

#### DetailedAnswerModal.tsx
**Lokalizacja:** `src/components/chat/DetailedAnswerModal.tsx`

| Element | Selektor | Typ | Opis |
|---------|----------|-----|------|
| Modal overlay | `detailed-answer-modal` | div | Modal overlay |
| Modal content | `detailed-answer-modal-content` | div | Treść modala |
| Loading indicator | `detailed-answer-loading` | div | Loading state |
| Progress message | `detailed-answer-progress-message` | p | "Może potrwać..." |
| Timeout error | `timeout-error-message` | div | Błąd timeout |
| Retry button | `retry-button` | button | Spróbuj ponownie |
| Close button | `close-button` | button | Zamknij modal |

#### QueryBubble.tsx
**Lokalizacja:** `src/components/chat/QueryBubble.tsx`

| Element | Selektor | Typ | Opis |
|---------|----------|-----|------|
| Bubble container | `query-bubble` | div | Główny kontener |
| Query text | `query-text` | p | Tekst zapytania |
| Timestamp | `query-timestamp` | span | Znacznik czasu |

#### NoRelevantActsCard.tsx
**Lokalizacja:** `src/components/chat/NoRelevantActsCard.tsx`

| Element | Selektor | Typ | Opis |
|---------|----------|-----|------|
| Card container | `no-relevant-acts-card` | div | Główna karta |
| Message text | `no-acts-message` | p | Komunikat |
| Show examples button | `show-examples-button` | button | Zobacz przykłady |

---

### 📋 History Components

#### HistoryList.tsx
**Lokalizacja:** `src/components/history/HistoryList.tsx`

| Element | Selektor | Typ | Opis |
|---------|----------|-----|------|
| Container | `history-list` | div | Główny kontener |
| Query cards list | `query-cards-list` | div | Lista kart |
| Load more button | `load-more-button` | button | Załaduj więcej |

#### QueryCard.tsx
**Lokalizacja:** `src/components/history/QueryCard.tsx`

| Element | Selektor | Typ | Opis |
|---------|----------|-----|------|
| Card container | `query-card` | div | Główna karta |
| Card (indexed) | `query-card-${id}` | div | Konkretna karta |
| Query text | `query-text` | p | Tekst zapytania |
| Timestamp | `query-timestamp` | span | Znacznik czasu |
| Fast response preview | `fast-response-preview` | div | Podgląd szybkiej |
| Full response content | `full-response-content` | div | Pełna odpowiedź |
| Expand button | `expand-button` | button | Rozwiń/Zwiń |
| Delete button | `delete-button` | button | Usuń zapytanie |
| Confirmation dialog | `delete-confirmation-dialog` | div | Dialog potwierdzenia |
| Confirm delete button | `confirm-delete-button` | button | Potwierdź usunięcie |
| Cancel delete button | `cancel-delete-button` | button | Anuluj |

#### DeleteQueryButton.tsx
**Lokalizacja:** `src/components/history/DeleteQueryButton.tsx`

| Element | Selektor | Typ | Opis |
|---------|----------|-----|------|
| Delete button | `delete-button` | button | Przycisk usuń |
| Confirmation dialog | `delete-confirmation-dialog` | div | Dialog (jeśli jest) |

#### EmptyState.tsx
**Lokalizacja:** `src/components/history/EmptyState.tsx`

| Element | Selektor | Typ | Opis |
|---------|----------|-----|------|
| Container | `empty-state` | div | Główny kontener |
| Message | `empty-state-message` | p | Komunikat |
| Ask first question button | `ask-first-question-button` | button | Zadaj pierwsze |

---

### 🎨 Layout Components

#### Header.astro
**Lokalizacja:** `src/components/layout/Header.astro`

| Element | Selektor | Typ | Opis |
|---------|----------|-----|------|
| Header element | `app-header` | header | Główny header |
| Logo link | `logo-link` | a | Link do strony głównej |
| Navigation | `main-navigation` | nav | Nawigacja główna |
| Chat link | `nav-chat-link` | a | Link do czatu |
| History link | `nav-history-link` | a | Link do historii |
| Hamburger button | `hamburger-menu-button` | button | Menu mobilne |
| Mobile nav menu | `mobile-nav-menu` | div | Menu mobilne |
| Mobile chat link | `mobile-nav-chat-link` | a | Chat (mobile) |
| Mobile history link | `mobile-nav-history-link` | a | Historia (mobile) |

#### UserMenu.tsx
**Lokalizacja:** `src/components/layout/UserMenu.tsx`

| Element | Selektor | Typ | Opis |
|---------|----------|-----|------|
| Menu button | `user-menu-button` | button | Przycisk menu |
| Dropdown | `user-menu-dropdown` | div | Rozwijane menu |
| User email display | `user-email-display` | span | Email użytkownika |
| Settings link | `settings-link` | a | Link do ustawień |
| Logout button | `logout-button` | button | Wyloguj |

---

### 🎯 Static Astro Components

#### WelcomeMessage.astro
**Lokalizacja:** `src/components/chat/WelcomeMessage.astro`

| Element | Selektor | Typ | Opis |
|---------|----------|-----|------|
| Container | `welcome-message` | div | Główny kontener |
| Heading | `welcome-heading` | h2 | Nagłówek |
| Description | `welcome-description` | p | Opis |

#### ExampleQuestions.astro
**Lokalizacja:** `src/components/chat/ExampleQuestions.astro`

| Element | Selektor | Typ | Opis |
|---------|----------|-----|------|
| Container | `example-questions` | div | Główny kontener |
| Question button | `example-question-${index}` | button | Konkretne pytanie |
| Question button (0) | `example-question-0` | button | Pierwsze pytanie |
| Question button (1) | `example-question-1` | button | Drugie pytanie |
| Question button (2) | `example-question-2` | button | Trzecie pytanie |
| Question button (3) | `example-question-3` | button | Czwarte pytanie |

---

## 📝 Status implementacji

### ✅ Ukończone (0/25)
- Brak

### 🚧 W trakcie (0/25)
- Brak

### ⏳ Do zrobienia (25/25)
- [ ] LoginForm.tsx (8 selektorów)
- [ ] RegisterForm.tsx (8 selektorów)
- [ ] SignupForm.tsx (5 selektorów)
- [ ] ChatInput.tsx (7 selektorów)
- [ ] ChatMessagesContainer.tsx (5 selektorów)
- [ ] ResponseCard.tsx (16 selektorów)
- [ ] RatingButtons.tsx (5 selektorów)
- [ ] DetailedAnswerModal.tsx (7 selektorów)
- [ ] QueryBubble.tsx (3 selektory)
- [ ] NoRelevantActsCard.tsx (3 selektory)
- [ ] HistoryList.tsx (3 selektory)
- [ ] QueryCard.tsx (10 selektorów)
- [ ] DeleteQueryButton.tsx (2 selektory)
- [ ] EmptyState.tsx (3 selektory)
- [ ] Header.astro (9 selektorów)
- [ ] UserMenu.tsx (5 selektorów)
- [ ] WelcomeMessage.astro (3 selektory)
- [ ] ExampleQuestions.astro (5 selektorów)

**Total:** ~106 selektorów do dodania

---

## 🚀 Kolejność implementacji

### Faza 1: KRYTYCZNE (Priority 1)
1. LoginForm.tsx - Auth flow
2. ChatInput.tsx - Core functionality
3. ResponseCard.tsx - View responses
4. RatingButtons.tsx - User feedback
5. Header.astro - Navigation

### Faza 2: WYSOKIE (Priority 2)
6. RegisterForm.tsx - New users
7. ChatMessagesContainer.tsx - Messages display
8. HistoryList.tsx - Query history
9. QueryCard.tsx - History items
10. UserMenu.tsx - User actions

### Faza 3: ŚREDNIE (Priority 3)
11. DetailedAnswerModal.tsx - Advanced feature
12. DeleteQueryButton.tsx - CRUD operation
13. ExampleQuestions.astro - Onboarding
14. WelcomeMessage.astro - First visit
15. NoRelevantActsCard.tsx - Error handling

---

## 📋 Checklist weryfikacji

Po dodaniu selektorów do każdego komponentu:

- [ ] Wszystkie interaktywne elementy mają data-testid
- [ ] Selektory są dodane WEWNĄTRZ komponentu (nie na zewnątrz)
- [ ] Używany jest kebab-case
- [ ] Nazwy są opisowe i jednoznaczne
- [ ] Indeksowane elementy używają `${index}` lub `${id}`
- [ ] Sprawdzono że component renders poprawnie po zmianach
- [ ] Zaktualizowano dokumentację (ten plik)

---

**Status:** 🚧 Rozpoczynam implementację - Faza 1
**Następny krok:** Dodanie selektorów do LoginForm.tsx
