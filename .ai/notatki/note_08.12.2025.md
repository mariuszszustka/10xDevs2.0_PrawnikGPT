[2x6] Generowanie wysokopoziomowego planu UI

**Data rozpoczęcia:** 2025-12-08  
**Status:** UKOŃCZONY

---

## 📋 Sesja Planistyczna - UI Architecture Planning

### Kontekst projektu
- **Backend:** ✅ Zaimplementowany (API endpoints, RAG pipeline, rating system)
- **Frontend:** 🔄 W trakcie - podstawowe strony Astro (placeholdery)
- **UI Plan:** ✅ Istniejący (`.ai/notes_ui-plan.md`) - szczegółowa dokumentacja techniczna
- **PRD:** ✅ Kompletny (`.ai/prd.md`) - wymagania produktu
- **API Plan:** ✅ Kompletny (`.ai/api-implementation-index.md`) - specyfikacja endpointów

### Cel sesji
Stworzenie kompleksowej, wysokopoziomowej architektury interfejsu użytkownika na podstawie:
- Dokumentu wymagań produktu (PRD)
- Planu API i endpointów
- Notatek z sesji planowania (`.ai/notes_ui-plan.md`)

**Wynik:** Nowy dokument `.ai/ui-plan.md` z architekturą UI wysokiego poziomu, skupiony na:
- Widokach i ich celach
- Mapie podróży użytkownika
- Strukturze nawigacji
- Kluczowych komponentach

---

## 🎯 Zakres pracy

### Analiza dokumentów źródłowych
- [x] Przegląd PRD (`.ai/prd.md`) - wymagania funkcjonalne, user stories
- [x] Przegląd API Plan (`.ai/api-implementation-index.md`) - endpointy i ich cele
- [x] Przegląd Session Notes (`.ai/notes_ui-plan.md`) - decyzje techniczne i implementacyjne
- [x] Przegląd implementacji endpointów (`.ai/implementations/*.md`)

### Wyodrębnienie wymagań
- [x] Kluczowe wymagania z PRD (10 user stories)
- [x] Główne endpointy API (9 endpointów)
- [x] Decyzje z sesji planowania (30 decyzji projektowych)

### Projektowanie architektury UI
- [x] Lista wszystkich widoków (7 widoków)
- [x] Główny cel i kluczowe informacje dla każdego widoku
- [x] Mapa podróży użytkownika (nowy użytkownik, powracający, edge cases)
- [x] Struktura nawigacji (desktop/mobile, user menu, breadcrumbs)
- [x] Kluczowe komponenty (React islands, Astro components, hooks, Context)

### Mapowanie wymagań
- [x] User stories z PRD → widoki i komponenty
- [x] Endpointy API → integracja w komponentach
- [x] Decyzje techniczne → implementacja w architekturze

---

## 📝 Notatki z sesji planistycznej

### Analiza dokumentów:

**Z PRD wyodrębniono:**
- 10 user stories (US-001 do US-010)
- Wymagania funkcjonalne: auth, chat, historia, oceny, onboarding
- Dwupoziomowy system odpowiedzi (szybka <15s, dokładna do 240s)
- Obsługa błędów (NoRelevantActsError, timeouty)

**Z API Plan wyodrębniono:**
- 9 głównych endpointów:
  1. `POST /api/v1/queries` - Submit query (RAG pipeline)
  2. `GET /api/v1/queries` - List queries (paginacja)
  3. `GET /api/v1/queries/{id}` - Query details
  4. `DELETE /api/v1/queries/{id}` - Delete query
  5. `POST /api/v1/queries/{id}/accurate-response` - Detailed response
  6. `POST /api/v1/queries/{id}/ratings` - Create/update rating
  7. `GET /api/v1/queries/{id}/ratings` - Get ratings
  8. `GET /api/v1/onboarding/example-questions` - Example questions
  9. `GET /health` - Health check

**Z Session Notes wyodrębniono:**
- 30 zatwierdzonych decyzji projektowych
- Strategie: polling, optimistic updates, error handling
- Komponenty: React islands, Astro components, custom hooks
- Optymalizacje: code splitting, lazy loading, memoization

### Projektowanie widoków:

**7 głównych widoków:**
1. **Landing Page** (`/`) - Marketing, onboarding nowych użytkowników
2. **Login Page** (`/login`) - Logowanie istniejących użytkowników
3. **Register Page** (`/register`) - Rejestracja nowych użytkowników
4. **App Layout** (`/app/*`) - Wspólny layout dla chronionych widoków
5. **Chat View** (`/app`) - Główny interfejs czatu z RAG
6. **History View** (`/app/history`) - Historia zapytań z paginacją
7. **Settings View** (`/app/settings`) - Zarządzanie kontem

**Dla każdego widoku określono:**
- Ścieżkę URL
- Typ (SSG/SSR/React islands)
- Główny cel
- Kluczowe informacje do wyświetlenia
- Komponenty (React islands + Astro)
- UX, dostępność i bezpieczeństwo

### Mapa podróży użytkownika:

**Nowy użytkownik (7 kroków):**
1. Landing page → CTA "Wypróbuj za darmo"
2. Register → Auto-login
3. Chat View → Welcome message + przykładowe pytania
4. Otrzymanie szybkiej odpowiedzi (<15s)
5. Żądanie dokładniejszej odpowiedzi (opcjonalnie, do 240s)
6. Ocena odpowiedzi (optimistic updates)
7. Przejście do historii

**Powracający użytkownik (4 kroki):**
1. Login
2. Chat View z historią
3. Zadanie nowego pytania
4. Zarządzanie historią

**Edge cases (7 scenariuszy):**
- NoRelevantActsError
- Timeout szybkiej odpowiedzi (>15s)
- Timeout dokładnej odpowiedzi (>240s)
- Wygasnięcie cache RAG context (>5 min)
- Rate limit exceeded
- Sesja wygasła
- Network errors

### Struktura nawigacji:

**Desktop (≥1024px):**
- Pozioma nawigacja: Logo | Chat | Historia | User Avatar ▼
- User Menu dropdown: Email | Ustawienia | Wyloguj

**Mobile (<1024px):**
- Hamburger menu: ☰ | Logo | Avatar
- Rozwijane menu: Chat | Historia | Ustawienia | Wyloguj

**Skip Links:**
- "Przejdź do treści" (dla dostępności)

### Kluczowe komponenty:

**React Islands (8 komponentów):**
- `ChatInput.tsx` - Pole wprowadzania pytań
- `ChatMessagesContainer.tsx` - Kontener wiadomości z polling
- `ResponseCard.tsx` - Karta odpowiedzi
- `RatingButtons.tsx` - Przyciski oceny
- `DetailedAnswerModal.tsx` - Modal dla dokładnej odpowiedzi
- `HistoryList.tsx` - Lista historii z paginacją
- `QueryCard.tsx` - Karta zapytania w historii
- `UserMenu.tsx` - Menu użytkownika

**Astro Components (5 komponentów):**
- `WelcomeMessage.astro` - Komunikat powitalny
- `ExampleQuestions.astro` - Przykładowe pytania
- `SourcesList.astro` - Lista źródeł
- `Header.astro` - Nagłówek z nawigacją
- `Footer.astro` - Stopka

**Custom Hooks (6 hooków):**
- `useQueryPolling.ts` - Polling dla szybkich odpowiedzi
- `useLongPolling.ts` - Długi polling dla dokładnych odpowiedzi
- `useActiveQueries.ts` - Zarządzanie limitem 3 aktywnych zapytań
- `useRAGContextTimer.ts` - Timer cache RAG context (5 min)
- `useOptimisticRating.ts` - Optimistic updates dla ratingów
- `useDebounce.ts` - Reusable debounce logic

**Context Providers:**
- `AppContext.tsx` - Globalny stan (activeQueries, userSession, rateLimitInfo)

---

## ✅ Zatwierdzone Decyzje Architektoniczne (2025-12-08)

### 1. Struktura dokumentacji UI
- ✅ **Wysokopoziomowy plan** (`.ai/ui-plan.md`) - architektura, widoki, przepływy
- ✅ **Szczegółowa dokumentacja** (`.ai/notes_ui-plan.md`) - implementacja, komponenty, hooks
- ✅ **Rozdzielenie odpowiedzialności:** Plan wysokopoziomowy vs szczegóły techniczne

### 2. Widoki i ich cele
- ✅ 7 głównych widoków z jasno określonymi celami
- ✅ Mapowanie user stories → widoki
- ✅ Mapowanie endpointów API → komponenty
- ✅ Publiczne vs chronione widoki (middleware auth)

### 3. Mapa podróży użytkownika
- ✅ Nowy użytkownik: 7 kroków od landing do historii
- ✅ Powracający użytkownik: 4 kroki (login → chat → pytanie → historia)
- ✅ Edge cases: 7 scenariuszy błędów z rozwiązaniami

### 4. Struktura nawigacji
- ✅ Responsywna nawigacja (desktop/mobile)
- ✅ User Menu z dropdown
- ✅ Skip links dla dostępności
- ✅ Breadcrumbs (opcjonalnie, post-MVP)

### 5. Kluczowe komponenty
- ✅ 8 React islands dla interaktywności
- ✅ 5 Astro components dla statycznej treści
- ✅ 6 custom hooks dla logiki biznesowej
- ✅ Context API dla globalnego stanu

### 6. Integracja z API
- ✅ Mapowanie endpointów → komponenty
- ✅ Polling dla asynchronicznych odpowiedzi
- ✅ Optimistic updates dla ratingów
- ✅ Error handling dla wszystkich scenariuszy

### 7. UX i dostępność
- ✅ WCAG AA compliance (ARIA, keyboard navigation, semantic HTML)
- ✅ Loading states (skeleton loaders, progress bars)
- ✅ Error states (przyjazne komunikaty, retry buttons)
- ✅ Empty states (CTA do akcji)

### 8. Bezpieczeństwo
- ✅ Sanitizacja Markdown (XSS prevention)
- ✅ Secure token handling (Supabase Auth SDK)
- ✅ Rate limiting feedback w UI
- ✅ Ogólne komunikaty błędów (bez ujawniania szczegółów)

---

## ✅ Postęp pracy

### Zrealizowane:
- ✅ Przegląd wszystkich dokumentów źródłowych (PRD, API Plan, Session Notes)
- ✅ Wyodrębnienie kluczowych wymagań (10 user stories, 9 endpointów, 30 decyzji)
- ✅ Projektowanie 7 widoków z pełną specyfikacją
- ✅ Stworzenie mapy podróży użytkownika (nowy, powracający, edge cases)
- ✅ Projektowanie struktury nawigacji (desktop/mobile)
- ✅ Określenie kluczowych komponentów (React islands, Astro, hooks)
- ✅ Mapowanie wymagań na elementy UI
- ✅ Utworzenie dokumentu `.ai/ui-plan.md` (852 linie)

### Dokumentacja:
- ✅ **`.ai/ui-plan.md`** - Kompletna architektura UI wysokiego poziomu:
  - Przegląd struktury UI
  - Lista 7 widoków z pełną specyfikacją
  - Mapa podróży użytkownika (3 scenariusze)
  - Układ i struktura nawigacji
  - Kluczowe komponenty (19 komponentów + 6 hooks + Context)

---

## 🔗 Powiązane dokumenty
- `.ai/ui-plan.md` - **NOWY** - Wysokopoziomowy plan architektury UI
- `.ai/notes_ui-plan.md` - Szczegółowa dokumentacja techniczna (implementacja)
- `.ai/prd.md` - Dokument wymagań produktu (10 user stories)
- `.ai/api-implementation-index.md` - Plan API (9 endpointów)
- `.ai/notatki/note_02.12.2025.md` - Implementacja UI (fazy)
- `.ai/notatki/note_01.12.2025.md` - Implementacja backendu

---

## 📋 Podsumowanie Sesji Planistycznej (2025-12-08)

### Status: ✅ ZAKOŃCZONE

**Data zakończenia:** 2025-12-08  
**Czas trwania:** 1 sesja  
**Wynik:** Kompletna architektura UI wysokiego poziomu

### Kluczowe Osiągnięcia:

1. **Kompletna architektura widoków** - 7 widoków z pełną specyfikacją
2. **Mapa podróży użytkownika** - 3 scenariusze (nowy, powracający, edge cases)
3. **Struktura nawigacji** - Responsywna, dostępna, bezpieczna
4. **Kluczowe komponenty** - 19 komponentów + 6 hooks + Context API
5. **Mapowanie wymagań** - User stories → widoki, endpointy → komponenty
6. **Dokumentacja** - 852 linie szczegółowej architektury

### Dokumentacja:

Wszystkie decyzje architektoniczne zostały zapisane w:
- **`.ai/ui-plan.md`** - Wysokopoziomowy plan architektury UI zawiera:
  - Przegląd struktury UI
  - Lista 7 widoków z celami, informacjami, komponentami, UX/A11y/security
  - Mapa podróży użytkownika (3 scenariusze, 18 kroków łącznie)
  - Układ i struktura nawigacji (desktop/mobile, user menu, skip links)
  - Kluczowe komponenty (React islands, Astro, hooks, Context, utilities)

### Różnica między dokumentami:

- **`.ai/ui-plan.md`** (NOWY) - Architektura wysokiego poziomu:
  - Widoki i ich cele
  - Przepływy użytkownika
  - Struktura nawigacji
  - Kluczowe komponenty (bez szczegółów implementacji)

- **`.ai/notes_ui-plan.md`** (ISTNIEJĄCY) - Szczegółowa dokumentacja techniczna:
  - Implementacja komponentów
  - Custom hooks z kodem
  - Strategie state management
  - Optymalizacje wydajności
  - Testowanie

### Następne Kroki:

1. **Implementacja zgodnie z `.ai/ui-plan.md`** - rozpoczęcie od Fazy 1 (podstawowe komponenty autoryzacji)
2. **Szczegóły techniczne** - odwoływanie się do `.ai/notes_ui-plan.md` podczas implementacji
3. **Iteracyjne podejście** - implementacja widoków zgodnie z fazami z `note_02.12.2025.md`

**Gotowe do rozpoczęcia implementacji zgodnie z architekturą!** 🚀

---

