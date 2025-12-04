[2x5] Generowanie interfejsu użytkownika

**Data rozpoczęcia:** 2025-12-02  
**Status:** PLANOWANIE

---

## 📋 Sesja Planistyczna - UI Implementation

### Kontekst projektu
- **Backend:** ✅ Zaimplementowany (API endpoints, RAG pipeline, rating system)
- **Frontend:** 🔄 W trakcie - podstawowe strony Astro (placeholdery)
- **Shadcn/ui:** ✅ Skonfigurowany i zainstalowany (10 komponentów + sonner)
- **Infrastruktura:** ✅ Gotowa (Supabase, OLLAMA, FastAPI)

### Cel sesji
Zaplanowanie i implementacja pełnego interfejsu użytkownika zgodnie z `.ai/ui-plan.md`:
- React islands dla interaktywnych komponentów
- Integracja z backendem (API client)
- Middleware autoryzacji
- Responsywny design z Tailwind CSS

---

## 🎯 Zakres implementacji

### Faza 1: Podstawowe komponenty autoryzacji
- [ ] `LoginForm.tsx` - formularz logowania (React island)
- [ ] `RegisterForm.tsx` - formularz rejestracji (React island)
- [ ] Middleware autoryzacji (`src/middleware/index.ts`)
- [ ] Integracja z Supabase Auth

### Faza 2: Interfejs czatu
- [ ] `ChatInput.tsx` - pole do zadawania pytań
- [ ] `ChatMessagesContainer.tsx` - obszar wiadomości
- [ ] `ResponseCard.tsx` - karta odpowiedzi
- [ ] `RatingButtons.tsx` - przyciski oceny (👍/👎)
- [ ] `DetailedAnswerButton.tsx` - przycisk "Uzyskaj dokładniejszą odpowiedź"
- [ ] `WelcomeMessage.astro` - wiadomość powitalna (statyczna)
- [ ] `ExampleQuestions.astro` - przykładowe pytania (statyczna)

### Faza 3: Historia zapytań
- [ ] `HistoryList.tsx` - lista historii z paginacją
- [ ] `QueryCard.tsx` - karta pojedynczego zapytania
- [ ] `DeleteQueryButton.tsx` - przycisk usuwania z potwierdzeniem

### Faza 4: Layout i nawigacja
- [ ] `AppLayout.astro` - layout dla chronionych stron
- [ ] `Header.astro` - nagłówek z nawigacją
- [ ] `UserMenu.tsx` - menu użytkownika (React island)
- [ ] `Footer.astro` - stopka (opcjonalnie)

### Faza 5: Landing page
- [ ] `HeroSection.astro` - sekcja hero
- [ ] `FeaturesSection.astro` - sekcja funkcji
- [ ] Styling i responsywność

### Faza 6: Integracja i optymalizacja
- [ ] Integracja z API client (`src/lib/apiClient.ts`)
- [ ] Obsługa błędów i loading states
- [ ] Toast notifications (sonner)
- [ ] Testy komponentów (opcjonalnie)

---

## 📝 Notatki z sesji planistycznej

### Decyzje techniczne:
- **React islands:** Używamy `client:load` dla formularzy i interaktywnych komponentów
- **State management:** React hooks (useState, useCallback, useMemo) - bez Redux/Zustand
- **API calls:** Custom hooks (`useAuth`, `useQueries`, `useRatings`)
- **Error handling:** Try-catch w komponentach + toast notifications
- **Loading states:** Skeleton loaders z shadcn/ui

### Priorytety implementacji:
1. **Najpierw:** Auth (LoginForm, RegisterForm, middleware) - bez tego nie ma dostępu do app
2. **Potem:** Chat interface (ChatInput, ChatMessagesContainer) - core funkcjonalność
3. **Następnie:** Historia i layout - uzupełnienie UX
4. **Na końcu:** Landing page - marketing

---

## ✅ Zatwierdzone Decyzje Projektowe (2025-12-02)

### 1. Polling dla Asynchronicznych Odpowiedzi
- ✅ Exponential backoff polling (1s → 2s max)
- ✅ Skeleton loader z progress barem
- ✅ Komunikat po 15s o możliwym opóźnieniu
- ✅ Implementacja: `useQueryPolling()` hook

### 2. Równoczesne Zapytania
- ✅ Limit: 3 aktywne zapytania
- ✅ Wskaźnik w nagłówku: Badge z liczbą aktywnych
- ✅ Blokada tylko pola input (nie całego interfejsu)
- ✅ Implementacja: `useActiveQueries()` hook

### 3. Modal dla Dokładnej Odpowiedzi
- ✅ Modal z progress barem (można zamknąć)
- ✅ Długi polling co 5s (timeout 240s)
- ✅ Toast powiadomienie po zakończeniu (jeśli modal zamknięty)
- ✅ Implementacja: `DetailedAnswerModal.tsx` + `useLongPolling()`

### 4. Timer Cache RAG Context
- ✅ Timer odliczający czas (format: "4:32")
- ✅ Wizualny wskaźnik: zielony → żółty (<1 min) → czerwony (wygasło)
- ✅ Auto-retry po wygaśnięciu (410 Gone)
- ✅ Implementacja: `useRAGContextTimer()` hook

### 5. Optimistic Updates dla Ratingów
- ✅ Natychmiastowa aktualizacja UI
- ✅ Wizualna różnica: rated (kolor + checkmark) vs not rated (szary)
- ✅ Toast potwierdzający zapisanie
- ✅ Rollback przy błędzie API
- ✅ Implementacja: `useOptimisticRating()` hook

### 6. Paginacja w Historii
- ✅ Przycisk "Załaduj więcej" (nie infinite scroll w MVP)
- ✅ Licznik pozostałych: "Załaduj więcej (45 pozostałych)"
- ✅ Zachować scroll position
- ✅ Implementacja: `HistoryList.tsx` z `usePagination()`

### 7. Przykładowe Pytania
- ✅ Statyczne komponenty Astro (hardcoded) w MVP
- ✅ Klikalne → automatycznie wypełniają ChatInput
- ✅ Event delegation z `data-question` attribute
- ✅ Przyszłość: React island jeśli personalizowane

### 8. Obsługa Błędów NoRelevantActsError
- ✅ Przyjazny komunikat w formie karty odpowiedzi
- ✅ Przycisk "Zobacz przykładowe pytania"
- ✅ Nie pokazywać pustego stanu błędu
- ✅ Implementacja: `NoRelevantActsCard.tsx`

### 9. Zarządzanie Sesją i Tokenami
- ✅ Supabase Auth SDK (automatyczny refresh)
- ✅ Middleware Astro: sprawdzanie `auth.getSession()`
- ✅ Globalny error handler w API client (401 → refresh → redirect)
- ✅ Komunikat: "Sesja wygasła. Zaloguj się ponownie."
- ✅ Implementacja: `apiClient.ts` + `middleware/index.ts`

### 10. Szczegóły Dostępności
- ✅ `aria-live="polite"` na kontenerze wiadomości
- ✅ `aria-busy="true"` + `aria-label` dla długich operacji
- ✅ Pełna nawigacja klawiaturą (Tab, Enter, Escape)
- ✅ Focus management w modalach (trap + restore)
- ✅ Skip link do głównej zawartości
- ✅ Semantic HTML (`<main>`, `<nav>`, `<article>`)

---

## ✅ Postęp implementacji

### Zrealizowane:
- ✅ Konfiguracja shadcn/ui (components.json, tailwind.config.ts)
- ✅ Instalacja komponentów shadcn/ui (button, input, textarea, card, alert, badge, dropdown-menu, dialog, skeleton, tooltip)
- ✅ Instalacja sonner (toast notifications)
- ✅ Utworzenie `.npmrc` z legacy-peer-deps (rozwiązanie konfliktu Tailwind v3/v4)

### W trakcie:
- 🔄 Planowanie struktury komponentów

### Do zrobienia:
- [ ] Implementacja komponentów (zgodnie z fazami powyżej)

---

## 🔗 Powiązane dokumenty
- `.ai/ui-plan.md` - pełny plan architektury UI (zawiera sekcję 14: Podsumowanie Sesji Planistycznej)
- `.ai/notatki/note_01.12.2025.md` - implementacja backendu
- `src/lib/apiClient.ts` - klient API dla FastAPI
- `src/lib/supabase.ts` - konfiguracja Supabase client

---

## 📋 Podsumowanie Sesji Planistycznej (2025-12-02)

### Status: ✅ ZAKOŃCZONE

**Data zakończenia:** 2025-12-02  
**Liczba pytań omówionych:** 30  
**Decyzje projektowe:** Wszystkie zatwierdzone i udokumentowane

### Kluczowe Osiągnięcia:

1. **Kompletna architektura UI** - wszystkie widoki, komponenty i przepływy użytkownika zdefiniowane
2. **Strategia integracji z API** - polling, optimistic updates, error handling, rate limiting
3. **State management** - Context API dla globalnego stanu, lokalny state dla komponentów
4. **Optymalizacje wydajności** - code splitting, lazy loading, memoization, debouncing
5. **Dostępność (A11y)** - ARIA attributes, keyboard navigation, focus management, semantic HTML
6. **Bezpieczeństwo** - sanitization, secure token handling, ogólne komunikaty błędów
7. **Testowanie** - strategia testów (Vitest, React Testing Library, MSW), coverage target >50%

### Dokumentacja:

Wszystkie decyzje i szczegóły implementacji zostały zapisane w:
- **`.ai/ui-plan.md`** - sekcja 14: Podsumowanie Sesji Planistycznej zawiera:
  - 30 zatwierdzonych decyzji projektowych
  - 10 dopasowanych zaleceń
  - Szczegółowe podsumowanie architektury UI
  - Brak nierozwiązanych kwestii

### Następne Kroki:

1. **Faza 1:** Implementacja podstawowych komponentów autoryzacji (LoginForm, RegisterForm, middleware)
2. **Faza 2:** Interfejs czatu (ChatInput, ChatMessagesContainer, ResponseCard, RatingButtons)
3. **Faza 3:** Historia zapytań (HistoryList, QueryCard, DeleteQueryButton)
4. **Faza 4:** Layout i nawigacja (AppLayout, Header, UserMenu)
5. **Faza 5:** Landing page (HeroSection, FeaturesSection)
6. **Faza 6:** Integracja i optymalizacja (API client, error handling, toast notifications)

**Gotowe do rozpoczęcia implementacji!** 🚀

---
