# View Implementation Plan - Index

**Wersja:** 1.0 (MVP)  
**Data utworzenia:** 2025-12-08  
**Tech Stack:** Astro 5, React 19, TypeScript, Tailwind CSS, Shadcn/ui

---

## 📚 Struktura Dokumentacji

Ze względu na rozbudowaną dokumentację, plan implementacji został podzielony na logiczne moduły. Każdy plik zawiera szczegółowy plan dla konkretnego widoku aplikacji.

---

## 🗂️ Plany Implementacji Widoków

### Publiczne Widoki (Nie wymagają autentykacji)

1. **[Landing Page](./view-implementations/landing-page-view-implementation-plan-note.md)**
   - **Ścieżka:** `/`
   - **Typ:** Astro SSG (statyczna generacja)
   - Marketing i onboarding nowych użytkowników
   - Hero section, features, przykładowe pytania
   - ~168 linii

2. **[Login Page](./view-implementations/login-page-view-implementation-plan-note.md)**
   - **Ścieżka:** `/login`
   - **Typ:** Astro SSR + React island (formularz)
   - Logowanie istniejących użytkowników
   - Supabase Auth SDK (bez backend API)
   - User Story: US-002
   - ~203 linie

3. **[Register Page](./view-implementations/register-page-view-implementation-plan-note.md)**
   - **Ścieżka:** `/register`
   - **Typ:** Astro SSR + React island (formularz)
   - Rejestracja nowych użytkowników
   - Auto-login po rejestracji
   - Supabase Auth SDK (bez backend API)
   - User Story: US-001
   - ~227 linii

### Chronione Widoki (Wymagają autentykacji)

4. **[Chat View](./view-implementations/chat-view-implementation-plan-note.md)** ⭐ **NAJWAŻNIEJSZY**
   - **Ścieżka:** `/app` lub `/app/chat`
   - **Typ:** Astro SSR + React islands (główny interaktywny widok)
   - Główny interfejs aplikacji - zadawanie pytań i otrzymywanie odpowiedzi
   - RAG Pipeline integration
   - Endpointy: Submit Query, Get Query Details, Accurate Response, Ratings, Example Questions
   - User Stories: US-003, US-004, US-005, US-008, US-009, US-010
   - ~434 linie

5. **[History View](./view-implementations/history-view-implementation-plan-note.md)**
   - **Ścieżka:** `/app/history`
   - **Typ:** Astro SSR + React islands
   - Przeglądanie chronologicznej historii zapytań
   - Endpointy: List Queries, Get Query Details, Delete Query, Ratings
   - User Stories: US-006, US-007, US-008
   - ~379 linii

6. **[Settings View](./view-implementations/settings-view-implementation-plan-note.md)**
   - **Ścieżka:** `/app/settings`
   - **Typ:** Astro SSR + React islands (formularze)
   - Zarządzanie kontem użytkownika
   - Zmiana hasła, usunięcie konta
   - Supabase Auth SDK (opcjonalnie backend endpoint)
   - ~272 linie

---

## 🎯 Priorytety Implementacji

### Faza 1: Publiczne Widoki (Tydzień 1)

**Krok 1: Landing Page**
- [ ] Implementacja: [Landing Page](./view-implementations/landing-page-view-implementation-plan-note.md)
  - Statyczna strona (SSG)
  - Hero section, features, footer
  - Linki do rejestracji
- [ ] SEO optimization (meta tags, og:image)
- [ ] Responsywność (mobile-first)

**Krok 2: Autentykacja**
- [ ] Implementacja: [Login Page](./view-implementations/login-page-view-implementation-plan-note.md)
  - Formularz logowania
  - Supabase Auth SDK integration
  - Error handling
- [ ] Implementacja: [Register Page](./view-implementations/register-page-view-implementation-plan-note.md)
  - Formularz rejestracji
  - Walidacja hasła
  - Auto-login po rejestracji
- [ ] Testy autentykacji (logowanie, rejestracja, błędy)

### Faza 2: Główny Widok (Tydzień 2-3) ⭐

**Krok 3: Chat View - Fundamenty**
- [ ] Implementacja: [Chat View](./view-implementations/chat-view-implementation-plan-note.md)
  - Layout i struktura
  - ChatInput component
  - ChatMessagesContainer component
  - Welcome message i przykładowe pytania
- [ ] Supabase Auth setup
- [ ] API client setup

**Krok 4: Chat View - RAG Integration**
- [ ] Submit Query integration
- [ ] Polling dla szybkich odpowiedzi (exponential backoff)
- [ ] ResponseCard component (Markdown rendering)
- [ ] Sources list z linkami do ISAP
- [ ] Error handling (NoRelevantActsError, timeout)

**Krok 5: Chat View - Rozszerzenia**
- [ ] Accurate Response modal (długi polling, timeout 240s)
- [ ] Rating buttons (optimistic updates)
- [ ] RAG context timer (5 min cache)
- [ ] Rate limiting feedback
- [ ] Accessibility (ARIA, keyboard navigation)

### Faza 3: Historia i Ustawienia (Tydzień 4)

**Krok 6: History View**
- [ ] Implementacja: [History View](./view-implementations/history-view-implementation-plan-note.md)
  - Lista zapytań z paginacją
  - QueryCard component (collapsible)
  - Delete functionality (confirmation modal)
  - Rating buttons (reuse z Chat View)
- [ ] Empty state
- [ ] Relative timestamps

**Krok 7: Settings View**
- [ ] Implementacja: [Settings View](./view-implementations/settings-view-implementation-plan-note.md)
  - Change password form
  - Delete account button (confirmation modal)
  - Profile section (email read-only)
- [ ] Supabase Auth integration
- [ ] Security best practices

---

## 🏗️ Architektura Frontend

### Struktura Katalogów

```
src/
├── layouts/                 # Astro layouts
│   ├── BaseLayout.astro    # Publiczne widoki
│   └── AppLayout.astro      # Chronione widoki
│
├── pages/                   # Astro pages (routing)
│   ├── index.astro          # Landing page
│   ├── login.astro          # Login page
│   ├── register.astro       # Register page
│   └── app/                 # Chronione widoki
│       ├── index.astro      # Chat view
│       ├── history.astro     # History view
│       └── settings.astro   # Settings view
│
├── components/              # Komponenty
│   ├── layout/              # Layout components (Astro)
│   │   ├── Header.astro
│   │   └── Footer.astro
│   ├── auth/                # Auth components (React islands)
│   │   ├── LoginForm.tsx
│   │   └── RegisterForm.tsx
│   ├── chat/                # Chat components (React islands)
│   │   ├── ChatInput.tsx
│   │   ├── ChatMessagesContainer.tsx
│   │   ├── ResponseCard.tsx
│   │   ├── RatingButtons.tsx
│   │   ├── DetailedAnswerModal.tsx
│   │   └── NoRelevantActsCard.tsx
│   ├── history/             # History components (React islands)
│   │   ├── HistoryList.tsx
│   │   ├── QueryCard.tsx
│   │   └── DeleteQueryButton.tsx
│   ├── settings/            # Settings components (React islands)
│   │   ├── ChangePasswordForm.tsx
│   │   └── DeleteAccountButton.tsx
│   ├── ui/                  # Shadcn/ui components (React)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   └── ...
│   └── onboarding/          # Onboarding components (Astro)
│       ├── WelcomeMessage.astro
│       └── ExampleQuestions.astro
│
├── lib/                     # Utilities
│   ├── supabase.ts          # Supabase client setup
│   ├── apiClient.ts         # API client (fetch wrapper)
│   ├── types.ts             # TypeScript types (DTOs)
│   └── database.types.ts    # Supabase generated types
│
├── hooks/                   # Custom React hooks
│   ├── useQueryPolling.ts
│   ├── useLongPolling.ts
│   ├── useActiveQueries.ts
│   ├── useRAGContextTimer.ts
│   └── useOptimisticRating.ts
│
├── middleware/              # Astro middleware
│   └── auth.ts              # Auth check middleware
│
└── assets/                  # Static assets
    └── images/
```

---

## 🔗 Powiązane Dokumenty

### Dokumentacja Architektoniczna
- **[ui-plan.md](./ui-plan.md)** - Plan interfejsu użytkownika (szczegółowy opis widoków)
- **[api-implementation-index.md](./api-implementation-index.md)** - Plany implementacji endpointów API
- **[tech-stack.md](./tech-stack.md)** - Stack technologiczny i deployment

### Dokumentacja Projektu
- **[prd.md](./prd.md)** - Product Requirements Document
- **[api-plan.md](./api-plan.md)** - Specyfikacja REST API

### Typy i Konfiguracja
- **Frontend:** `src/lib/types.ts` - TypeScript types (DTOs)
- **Frontend:** `src/lib/database.types.ts` - Supabase generated types
- **Backend:** `backend/models/` - Pydantic models

---

## 📖 Jak Używać Tej Dokumentacji

### Dla Programisty Implementującego Frontend:

1. **Zacznij od tego pliku** (index) - zrozum ogólną strukturę
2. **Przeczytaj [UI Plan](./ui-plan.md)** - poznaj szczegóły widoków
3. **Przeczytaj [Tech Stack](./tech-stack.md)** - poznaj technologie
4. **Przeczytaj [API Implementation Index](./api-implementation-index.md)** - zrozum endpointy API
5. **Implementuj w kolejności:**
   - [Landing Page](./view-implementations/landing-page-view-implementation-plan-note.md) - prosty start
   - [Login/Register](./view-implementations/login-page-view-implementation-plan-note.md) - autentykacja
   - [Chat View](./view-implementations/chat-view-implementation-plan-note.md) - kluczowy widok ⭐
   - [History View](./view-implementations/history-view-implementation-plan-note.md) - historia
   - [Settings View](./view-implementations/settings-view-implementation-plan-note.md) - ustawienia

### Dla Każdego Widoku:

Każdy plik implementacji zawiera:
1. **Opis widoku** - szczegóły z UI Plan
2. **User Stories** - powiązane historyjki użytkownika z PRD
3. **Endpoint Description** - endpointy API używane przez widok
4. **Endpoint Implementation** - referencje do implementacji backend
5. **Type Definitions** - typy TypeScript z `src/lib/types.ts`
6. **Tech Stack** - technologie używane w widoku
7. **Checklist Implementacji** - zadania do wykonania
8. **Uwagi Implementacyjne** - wskazówki i best practices

### Best Practices:

- ✅ Czytaj cały plan widoku przed rozpoczęciem implementacji
- ✅ Implementuj komponenty w kolejności: Astro → React islands → Hooks
- ✅ Testuj każdy widok przed przejściem do kolejnego
- ✅ Używaj checklisty do śledzenia postępów
- ✅ Odnoś się do [ui-plan.md](./ui-plan.md) dla szczegółów UX/UI
- ✅ Sprawdzaj [api-implementation-index.md](./api-implementation-index.md) dla szczegółów API
- ✅ Zapewnij pełną zgodność z WCAG AA (accessibility)

---

## 🚀 Quick Start

### 1. Setup Environment

```bash
cd /path/to/prawnik_v01
npm install
```

### 2. Configure Services

```bash
cp .env.example .env
# Edit .env with your configuration:
# - PUBLIC_SUPABASE_URL
# - PUBLIC_SUPABASE_ANON_KEY
# - PUBLIC_API_BASE_URL
```

### 3. Run Frontend

```bash
npm run dev
# Astro dev server: http://localhost:4321
```

### 4. Test Widoków

```bash
# Landing page
open http://localhost:4321

# Login
open http://localhost:4321/login

# Register
open http://localhost:4321/register

# App (wymaga autentykacji)
open http://localhost:4321/app
```

---

## 💡 Wskazówki Implementacyjne

### Kolejność Tworzenia Komponentów:

1. **Astro Pages** → `src/pages/` (routing)
2. **Astro Layouts** → `src/layouts/` (BaseLayout, AppLayout)
3. **Astro Components** → `src/components/` (statyczne komponenty)
4. **React Islands** → `src/components/` (interaktywne komponenty)
5. **Custom Hooks** → `src/hooks/` (logika wielokrotnego użytku)
6. **Utilities** → `src/lib/` (API client, Supabase setup)
7. **Middleware** → `src/middleware/` (auth check)

### Testowanie:

```bash
# Run Astro dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check

# Linting
npm run lint
```

### Accessibility Testing:

- Test z klawiaturą (Tab, Enter, Escape)
- Test z screen readerem (NVDA, JAWS)
- Lighthouse accessibility audit
- WAVE browser extension

---

## 📊 Metryki Sukcesu MVP

- [ ] Wszystkie 6 widoków zaimplementowane i działają
- [ ] Responsywność (mobile-first) na wszystkich widokach
- [ ] Accessibility (WCAG AA compliance)
- [ ] Performance (Lighthouse score >90)
- [ ] Type safety (TypeScript strict mode)
- [ ] Error handling (wszystkie scenariusze błędów)
- [ ] Loading states (skeleton loaders, spinners)
- [ ] Empty states (przyjazne komunikaty)

---

## 🎨 Design System

### Komponenty UI (Shadcn/ui)

- **Button** - Podstawowy przycisk (primary, secondary, destructive)
- **Input** - Pole tekstowe (email, password, textarea)
- **Card** - Karta kontenerowa
- **Modal** - Modal dialog (confirmation, detailed answer)
- **Toast** - Powiadomienia (success, error, info)
- **Badge** - Status badges (completed, processing)

### Kolory i Styling

- **Primary:** Niebieski (główny kolor aplikacji)
- **Secondary:** Szary (drugorzędne elementy)
- **Destructive:** Czerwony (usuwanie, błędy)
- **Success:** Zielony (sukces, pozytywne akcje)
- **Warning:** Żółty (ostrzeżenia)

### Typografia

- **Font:** System font stack (Inter, Roboto, sans-serif)
- **Headings:** Bold, różne rozmiary
- **Body:** Regular, czytelne rozmiary
- **Code:** Monospace (dla przykładów kodu)

---

**Powodzenia z implementacją! 🎉**

*Ostatnia aktualizacja: 2025-12-08*

