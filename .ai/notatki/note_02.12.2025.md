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
- `.ai/ui-plan.md` - pełny plan architektury UI
- `.ai/notatki/note_01.12.2025.md` - implementacja backendu
- `src/lib/apiClient.ts` - klient API dla FastAPI
- `src/lib/supabase.ts` - konfiguracja Supabase client

---
