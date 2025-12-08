[2x6] Generowanie szczegółowego planu implementacji widoku Logowania

**Data rozpoczęcia:** 2025-12-09  
**Status:** UKOŃCZONY

---

## 📋 Sesja Planistyczna - Login View Implementation Plan

### Kontekst projektu
- **Backend:** ✅ Zaimplementowany (API endpoints, RAG pipeline, rating system)
- **Frontend:** 🔄 W trakcie - podstawowe strony Astro (placeholdery)
- **UI Plan:** ✅ Istniejący (`.ai/ui-plan.md`) - architektura UI wysokiego poziomu
- **PRD:** ✅ Kompletny (`.ai/prd.md`) - wymagania produktu
- **View Implementation Plans:** ✅ Chat View, History View, Landing Page (wzory formatu)

### Cel sesji
Stworzenie kompleksowego, szczegółowego planu implementacji widoku logowania na podstawie:
- Podstawowego planu widoku (`.ai/view-implementations/login-page-view-implementation-plan-note.md`)
- Dokumentu wymagań produktu (PRD) - User Story US-002
- Wzorów formatu planów implementacji (Chat View, History View, Landing Page)
- Stack technologiczny (Astro 5, React 19, Supabase Auth SDK)

**Wynik:** Nowy dokument `.ai/login-view-implementation-plan.md` z kompleksowym planem implementacji zawierającym:
- Przegląd widoku i jego funkcjonalności
- Routing i strukturę komponentów
- Szczegółową specyfikację każdego komponentu
- Typy DTO i ViewModel
- Zarządzanie stanem
- Integrację z Supabase Auth SDK
- Interakcje użytkownika i obsługę błędów
- 16 kroków implementacji

---

## 🎯 Zakres pracy

### Analiza dokumentów źródłowych
- [x] Przegląd podstawowego planu widoku (`.ai/view-implementations/login-page-view-implementation-plan-note.md`)
- [x] Przegląd PRD (`.ai/prd.md`) - User Story US-002 (Logowanie do aplikacji)
- [x] Przegląd wzorów formatu (`.ai/chat-view-implementation-plan.md`, `.ai/history-view-implementation-plan.md`, `.ai/landing-page-view-implementation-plan.md`)
- [x] Przegląd konfiguracji Supabase (`.src/lib/supabase.ts`)
- [x] Przegląd istniejących komponentów UI (Shadcn/ui)
- [x] Przegląd typów TypeScript (`.src/lib/types.ts`)

### Wyodrębnienie wymagań
- [x] Kluczowe wymagania z User Story US-002
- [x] Wymagania bezpieczeństwa (ogólne komunikaty błędów, CSRF, rate limiting)
- [x] Wymagania UX (auto-focus, loading state, toggle hasła)
- [x] Wymagania dostępności (ARIA labels, keyboard navigation)

### Projektowanie szczegółów implementacji
- [x] Struktura komponentów (login.astro, BaseLayout.astro, LoginForm.tsx)
- [x] Typy DTO i ViewModel (LoginFormData, LoginFormErrors, LoginFormProps)
- [x] Zarządzanie stanem (4 stany: formData, errors, isLoading, showPassword)
- [x] Integracja z Supabase Auth SDK (signInWithPassword, mapowanie błędów)
- [x] Interakcje użytkownika (7 scenariuszy)
- [x] Warunki walidacji (client-side i server-side)
- [x] Obsługa błędów (6 scenariuszy błędów)

### Mapowanie wymagań
- [x] User Story US-002 → komponenty i przepływ logowania
- [x] Wymagania bezpieczeństwa → mapowanie błędów Supabase
- [x] Wymagania UX → interakcje użytkownika i stany UI

---

## 📝 Notatki z sesji planistycznej

### Analiza dokumentów:

**Z podstawowego planu widoku wyodrębniono:**
- Widok: Login Page (`/login`)
- Typ: Astro SSR + React island (formularz)
- Autentykacja: Nie wymagana (publiczny)
- Główne komponenty: `LoginForm.tsx` (React island), `BaseLayout.astro`
- Wymagania UX: auto-focus, loading state, toggle hasła, redirect po sukcesie
- Wymagania bezpieczeństwa: ogólne komunikaty błędów, CSRF protection, rate limiting

**Z PRD wyodrębniono:**
- **User Story US-002:** Logowanie do aplikacji
  - Po podaniu prawidłowego e-maila i hasła, użytkownik zostaje zalogowany
  - Token sesji (JWT) jest zapisywany w przeglądarce
  - W przypadku błędnych danych logowania, użytkownik widzi stosowny komunikat
- **Wymagania autentykacji:**
  - Supabase Auth (email/hasło)
  - Sesja zarządzana przez tokeny JWT
  - Brak weryfikacji email w MVP

**Z wzorów formatu wyodrębniono:**
- **11 sekcji szczegółów:**
  1. Przegląd
  2. Routing widoku
  3. Struktura komponentów
  4. Szczegóły komponentów
  5. Typy
  6. Zarządzanie stanem
  7. Integracja API
  8. Interakcje użytkownika
  9. Warunki i walidacja
  10. Obsługa błędów
  11. Kroki implementacji
- **Szczegółowość:** Każdy komponent z pełną specyfikacją (props, state, events, walidacja)
- **Mapowanie wymagań:** User stories → komponenty, endpointy → integracja

**Z konfiguracji Supabase wyodrębniono:**
- Client setup: `src/lib/supabase.ts` z `supabaseClient`
- Environment variables: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`
- Auth methods: `signInWithPassword()`, `getSession()`, `onAuthStateChange()`
- Typy: `Session`, `AuthError`, `AuthResponse` z `@supabase/supabase-js`

**Z istniejących komponentów UI wyodrębniono:**
- Shadcn/ui komponenty: `Input`, `Button`, `Alert` (dostępne w `src/components/ui/`)
- Ikony: `lucide-react` (Eye, EyeOff)
- Stylowanie: Tailwind CSS

### Projektowanie szczegółów implementacji:

**Struktura komponentów:**
```
login.astro (Astro page)
├── BaseLayout.astro (wrapper z meta tags)
└── LoginForm.tsx (React island - client:load)
    ├── Alert (Shadcn/ui) - komunikaty błędów
    ├── Input (Shadcn/ui) - pole email
    ├── Input (Shadcn/ui) - pole hasła z toggle
    ├── Button (Shadcn/ui) - przycisk "Zaloguj się"
    └── Link (Astro) - link do rejestracji
```

**Typy DTO i ViewModel:**
- `LoginFormData` - Dane formularza (email, password)
- `LoginFormErrors` - Błędy walidacji (email?, password?, general?)
- `LoginFormProps` - Propsy komponentu (redirectTo?)

**Zarządzanie stanem:**
- `formData: LoginFormData` - Wartości pól formularza
- `errors: LoginFormErrors` - Komunikaty błędów walidacji
- `isLoading: boolean` - Stan ładowania podczas logowania
- `showPassword: boolean` - Kontrola widoczności hasła

**Integracja z Supabase Auth SDK:**
- **Główna metoda:** `supabase.auth.signInWithPassword({ email, password })`
- **Mapowanie błędów:**
  - `"Invalid login credentials"` → `"Nieprawidłowy email lub hasło"` (ogólny komunikat bezpieczeństwa)
  - `"Email not confirmed"` → `"Nieprawidłowy email lub hasło"` (nie ujawniamy szczegółów)
  - `"Too many requests"` → `"Zbyt wiele prób logowania. Spróbuj ponownie za chwilę."`
  - Inne błędy → `"Wystąpił błąd podczas logowania. Spróbuj ponownie."`
- **Rate limiting:** Automatyczny przez Supabase (10 prób/min)

**Interakcje użytkownika (7 scenariuszy):**
1. Wprowadzanie danych w pole email
2. Wprowadzanie danych w pole hasła
3. Toggle pokazywania hasła
4. Submit formularza (przycisk lub Enter)
5. Kliknięcie linku do rejestracji
6. Auto-focus na pole email
7. Keyboard navigation (Tab, Enter, Escape)

**Warunki walidacji:**
- **Client-side:**
  - Format email (regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` lub HTML5)
  - Pole email wymagane
  - Pole hasło wymagane
- **Server-side (Supabase Auth):**
  - Email istnieje w systemie
  - Hasło jest poprawne
  - Rate limiting (10 prób/min)

**Obsługa błędów (6 scenariuszy):**
1. Nieprawidłowy email lub hasło
2. Rate limiting (zbyt wiele prób)
3. Błąd sieci (brak połączenia)
4. Nieoczekiwany błąd Supabase
5. Błąd walidacji client-side
6. Sesja wygasła (redirect z parametrem `expired=true`)

---

## ✅ Zatwierdzone Decyzje (2025-12-09)

### 1. Format planu implementacji
- ✅ **11 sekcji szczegółów** - od przeglądu do kroków implementacji (zgodnie z wzorem Chat View, History View, Landing Page)
- ✅ **Kompletność** - każdy komponent z pełną specyfikacją (props, state, events, walidacja)
- ✅ **Mapowanie wymagań** - User Story US-002 → komponenty, Supabase Auth → integracja

### 2. Szczegółowość dokumentacji
- ✅ **Typy DTO i ViewModel** - LoginFormData, LoginFormErrors, LoginFormProps z podziałem pól
- ✅ **Zarządzanie stanem** - 4 stany z opisem celu i aktualizacji
- ✅ **Integracja API** - szczegółowy opis Supabase Auth SDK z mapowaniem błędów
- ✅ **Interakcje użytkownika** - 7 scenariuszy z oczekiwanymi wynikami
- ✅ **Warunki walidacji** - client-side i server-side z komunikatami
- ✅ **Obsługa błędów** - 6 scenariuszy z kodami obsługi
- ✅ **Kroki implementacji** - 16 kroków od struktury plików do integracji

### 3. Bezpieczeństwo
- ✅ **Ogólne komunikaty błędów** - nie ujawniające, czy email istnieje w systemie
- ✅ **Mapowanie błędów Supabase** - wszystkie błędy autentykacji → ogólny komunikat bezpieczeństwa
- ✅ **Rate limiting** - automatyczny przez Supabase (10 prób/min)

### 4. UX i dostępność
- ✅ **Auto-focus** - automatyczny focus na pole email przy mount
- ✅ **Loading state** - wyłączenie pól i przycisku podczas logowania
- ✅ **Toggle hasła** - możliwość pokazania/ukrycia hasła
- ✅ **Accessibility** - ARIA labels, keyboard navigation, aria-invalid, aria-live

### 5. Gotowość do implementacji
- ✅ Plan wystarczająco szczegółowy dla programisty frontendowego
- ✅ Wszystkie komponenty, typy, integracje szczegółowo opisane
- ✅ Warunki walidacji, obsługa błędów, interakcje użytkownika zmapowane
- ✅ 16 kroków implementacji od przygotowania do integracji

---

## ✅ Postęp pracy

### Zrealizowane:
- ✅ Analiza wszystkich dokumentów źródłowych (plan widoku, PRD, wzory formatu, konfiguracja Supabase)
- ✅ Wyodrębnienie wymagań (User Story US-002, wymagania bezpieczeństwa, UX, dostępności)
- ✅ Projektowanie szczegółów implementacji (struktura, typy, stan, API, interakcje, błędy)
- ✅ Utworzenie kompleksowego planu implementacji (838 linii)

### Dokumentacja:

**Nowy plik:**
- `.ai/login-view-implementation-plan.md` - Kompleksowy plan implementacji widoku Logowania (838 linii) zawiera:
  - Przegląd widoku i główne funkcjonalności (Astro SSR + React island)
  - Routing i parametry URL (redirectTo, expired)
  - Strukturę komponentów z hierarchią (login.astro, BaseLayout.astro, LoginForm.tsx)
  - Szczegóły 3 komponentów (Astro page, layout, React island)
  - Typy DTO i ViewModel (LoginFormData, LoginFormErrors, LoginFormProps)
  - Zarządzanie stanem (4 stany: formData, errors, isLoading, showPassword)
  - Integrację z Supabase Auth SDK (signInWithPassword, mapowanie błędów)
  - 7 interakcji użytkownika z oczekiwanymi wynikami
  - Warunki walidacji (client-side i server-side)
  - Obsługę 6 scenariuszy błędów z kodami obsługi
  - 16 kroków implementacji

**Korzyści:**
1. **Kompletność** - plan zawiera wszystkie szczegóły potrzebne do implementacji
2. **Jasność** - każdy komponent, typ, integracja szczegółowo opisana
3. **Gotowość** - plan wystarczająco szczegółowy dla programisty frontendowego
4. **Spójność** - zgodność z PRD, User Story US-002, tech stack
5. **Bezpieczeństwo** - ogólne komunikaty błędów, mapowanie błędów Supabase
6. **Praktyczność** - 16 kroków implementacji od struktury plików do integracji
7. **UX i A11y** - uwzględnione wymagania UX i accessibility

---

## 🔗 Powiązane dokumenty

- `.ai/login-view-implementation-plan.md` - **NOWY** - Kompleksowy plan implementacji widoku Logowania
- `.ai/view-implementations/login-page-view-implementation-plan-note.md` - Podstawowy plan widoku Logowania
- `.ai/chat-view-implementation-plan.md` - Wzór formatu planu implementacji (Chat View)
- `.ai/history-view-implementation-plan.md` - Wzór formatu planu implementacji (History View)
- `.ai/landing-page-view-implementation-plan.md` - Wzór formatu planu implementacji (Landing Page)
- `.ai/ui-plan.md` - Architektura UI wysokiego poziomu
- `.ai/prd.md` - Dokument wymagań produktu (User Story US-002)
- `src/lib/supabase.ts` - Konfiguracja Supabase client
- `src/lib/types.ts` - Typy TypeScript (możliwość dodania typów LoginFormData, LoginFormErrors)

---

## 📋 Podsumowanie Sesji Tworzenia Szczegółowego Planu Implementacji Login View (2025-12-09)

### Status: ✅ ZAKOŃCZONE

**Data zakończenia:** 2025-12-09  
**Czas trwania:** 1 sesja  
**Wynik:** Kompleksowy plan implementacji widoku Logowania (838 linii)

### Kluczowe Osiągnięcia:

1. **Kompleksowy plan implementacji** - 11 sekcji szczegółów technicznych
2. **Szczegółowa specyfikacja komponentów** - 3 komponenty z pełną specyfikacją
3. **Mapowanie wymagań** - User Story US-002 → komponenty, Supabase Auth → integracja
4. **Bezpieczeństwo** - ogólne komunikaty błędów, mapowanie błędów Supabase
5. **Gotowość do implementacji** - plan wystarczająco szczegółowy dla programisty frontendowego
6. **UX i A11y** - uwzględnione wymagania UX i accessibility
7. **Dokumentacja** - 838 linii szczegółowego planu implementacji

### Następne Kroki:

1. **Implementacja widoku Logowania** - zgodnie z planem w `.ai/login-view-implementation-plan.md`
2. **Odwoływanie się do planu** - jako główne źródło szczegółów implementacji
3. **Iteracyjne podejście** - implementacja zgodnie z 16 krokami z planu
4. **Priorytetyzacja** - rozpoczęcie od struktury plików i podstawowych komponentów

**Gotowe do rozpoczęcia implementacji widoku Logowania zgodnie z kompleksowym planem!** 🚀

---

## 📋 Sesja Planistyczna - Register View Implementation Plan

**Data rozpoczęcia:** 2025-12-09  
**Status:** UKOŃCZONY

### Kontekst projektu
- **Backend:** ✅ Zaimplementowany (API endpoints, RAG pipeline, rating system)
- **Frontend:** 🔄 W trakcie - podstawowe strony Astro (placeholdery)
- **UI Plan:** ✅ Istniejący (`.ai/ui-plan.md`) - architektura UI wysokiego poziomu
- **PRD:** ✅ Kompletny (`.ai/prd.md`) - wymagania produktu
- **View Implementation Plans:** ✅ Chat View, History View, Landing Page, Login View (wzory formatu)

### Cel sesji
Stworzenie kompleksowego, szczegółowego planu implementacji widoku rejestracji na podstawie:
- Podstawowego planu widoku (`.ai/view-implementations/register-page-view-implementation-plan-note.md`)
- Dokumentu wymagań produktu (PRD) - User Story US-001
- Wzorów formatu planów implementacji (Login View jako najnowszy wzór)
- Stack technologiczny (Astro 5, React 19, Supabase Auth SDK, React Hook Form + Zod)

**Wynik:** Nowy dokument `.ai/register-page-view-implementation-plan.md` z kompleksowym planem implementacji zawierającym:
- Przegląd widoku i jego funkcjonalności
- Routing i strukturę komponentów
- Szczegółową specyfikację każdego komponentu
- Typy DTO i ViewModel (RegisterFormData, RegisterFormErrors, RegisterFormProps, PasswordStrength)
- Zarządzanie stanem (6 stanów: formData, errors, isLoading, showPassword, showPasswordConfirm, passwordStrength)
- Integrację z Supabase Auth SDK (signUp, brak weryfikacji email w MVP)
- Interakcje użytkownika i obsługę błędów
- 16 kroków implementacji

---

## 🎯 Zakres pracy - Register View

### Analiza dokumentów źródłowych
- [x] Przegląd podstawowego planu widoku (`.ai/view-implementations/register-page-view-implementation-plan-note.md`)
- [x] Przegląd PRD (`.ai/prd.md`) - User Story US-001 (Rejestracja nowego użytkownika)
- [x] Przegląd wzoru formatu (`.ai/login-view-implementation-plan.md` - najnowszy wzór)
- [x] Przegląd konfiguracji Supabase (`.src/lib/supabase.ts`)
- [x] Przegląd istniejących komponentów UI (Shadcn/ui: Input, Button, Alert, Checkbox)
- [x] Przegląd typów TypeScript (`.src/lib/types.ts`)

### Wyodrębnienie wymagań
- [x] Kluczowe wymagania z User Story US-001
- [x] Wymagania bezpieczeństwa (walidacja hasła min 8 znaków, ogólne komunikaty błędów)
- [x] Wymagania UX (auto-focus, loading state, toggle hasła, wskaźnik siły hasła, zgodność haseł)
- [x] Wymagania dostępności (ARIA labels, keyboard navigation, aria-invalid, aria-describedby)

### Projektowanie szczegółów implementacji
- [x] Struktura komponentów (register.astro, BaseLayout.astro, RegisterForm.tsx)
- [x] Typy DTO i ViewModel (RegisterFormData, RegisterFormErrors, RegisterFormProps, PasswordStrength)
- [x] Zarządzanie stanem (6 stanów: formData, errors, isLoading, showPassword, showPasswordConfirm, passwordStrength)
- [x] Integracja z Supabase Auth SDK (signUp, brak weryfikacji email w MVP, auto-login)
- [x] Interakcje użytkownika (7 scenariuszy)
- [x] Warunki walidacji (client-side: email, hasło min 8 znaków, zgodność haseł, checkbox; server-side: email zajęty, rate limiting)
- [x] Obsługa błędów (6 scenariuszy błędów)

### Mapowanie wymagań
- [x] User Story US-001 → komponenty i przepływ rejestracji
- [x] Wymagania bezpieczeństwa → walidacja hasła, mapowanie błędów Supabase
- [x] Wymagania UX → interakcje użytkownika i stany UI (toggle hasła, wskaźnik siły hasła)

---

## 📝 Notatki z sesji planistycznej - Register View

### Analiza dokumentów:

**Z podstawowego planu widoku wyodrębniono:**
- Widok: Register Page (`/register`)
- Typ: Astro SSR + React island (formularz)
- Autentykacja: Nie wymagana (publiczny)
- Główne komponenty: `RegisterForm.tsx` (React island), `BaseLayout.astro`
- Wymagania UX: auto-focus, loading state, toggle hasła, wskaźnik siły hasła (opcjonalny), zgodność haseł, auto-login po rejestracji
- Wymagania bezpieczeństwa: walidacja hasła min 8 znaków (client + server), ogólne komunikaty błędów, brak weryfikacji email w MVP

**Z PRD wyodrębniono:**
- **User Story US-001:** Rejestracja nowego użytkownika
  - Po podaniu prawidłowego adresu e-mail i hasła, konto zostaje utworzone w systemie Supabase Auth
  - Użytkownik jest automatycznie zalogowany po pomyślnej rejestracji
  - Proces nie wymaga potwierdzenia adresu e-mail
  - W przypadku błędu (np. zajęty e-mail) użytkownik widzi stosowny komunikat
- **Wymagania autentykacji:**
  - Supabase Auth (email/hasło)
  - Brak weryfikacji email w MVP (by design, minimalizacja barier wejścia)
  - Auto-login po rejestracji

**Z wzoru formatu (Login View) wyodrębniono:**
- **11 sekcji szczegółów:**
  1. Przegląd
  2. Routing widoku
  3. Struktura komponentów
  4. Szczegóły komponentów
  5. Typy
  6. Zarządzanie stanem
  7. Integracja API
  8. Interakcje użytkownika
  9. Warunki i walidacja
  10. Obsługa błędów
  11. Kroki implementacji
- **Szczegółowość:** Każdy komponent z pełną specyfikacją (props, state, events, walidacja)
- **Mapowanie wymagań:** User stories → komponenty, Supabase Auth → integracja

**Z konfiguracji Supabase wyodrębniono:**
- Client setup: `src/lib/supabase.ts` z `supabaseClient`
- Environment variables: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`
- Auth methods: `signUp()`, `getSession()`, `onAuthStateChange()`
- Typy: `Session`, `AuthError`, `AuthResponse`, `SignUpResponse` z `@supabase/supabase-js`

**Z istniejących komponentów UI wyodrębniono:**
- Shadcn/ui komponenty: `Input`, `Button`, `Alert`, `Checkbox` (dostępne w `src/components/ui/`)
- Ikony: `lucide-react` (Eye, EyeOff)
- Stylowanie: Tailwind CSS

### Projektowanie szczegółów implementacji:

**Struktura komponentów:**
```
register.astro (Astro page)
├── BaseLayout.astro (wrapper z meta tags)
└── RegisterForm.tsx (React island - client:load)
    ├── Alert (Shadcn/ui) - komunikaty błędów
    ├── Input (Shadcn/ui) - pole email
    ├── Input (Shadcn/ui) - pole hasła z toggle
    ├── Input (Shadcn/ui) - pole potwierdzenia hasła z toggle
    ├── PasswordStrengthIndicator (opcjonalny) - wskaźnik siły hasła
    ├── Checkbox (Shadcn/ui) - akceptacja regulaminu
    ├── Button (Shadcn/ui) - przycisk "Zarejestruj się"
    └── Link (Astro) - link do logowania
```

**Typy DTO i ViewModel:**
- `RegisterFormData` - Dane formularza (email, password, passwordConfirm, acceptTerms)
- `RegisterFormErrors` - Błędy walidacji (email?, password?, passwordConfirm?, acceptTerms?, general?)
- `RegisterFormProps` - Propsy komponentu (redirectTo?)
- `PasswordStrength` - Typ siły hasła (weak, medium, strong) - opcjonalny

**Zarządzanie stanem:**
- `formData: RegisterFormData` - Wartości pól formularza
- `errors: RegisterFormErrors` - Komunikaty błędów walidacji
- `isLoading: boolean` - Stan ładowania podczas rejestracji
- `showPassword: boolean` - Kontrola widoczności hasła (pierwsze pole)
- `showPasswordConfirm: boolean` - Kontrola widoczności potwierdzenia hasła (drugie pole)
- `passwordStrength: PasswordStrength` - Siła hasła (opcjonalny)

**Integracja z Supabase Auth SDK:**
- **Główna metoda:** `supabase.auth.signUp({ email, password, options: { emailRedirectTo: undefined } })`
- **Mapowanie błędów:**
  - `"User already registered"` → `"Ten adres email jest już zarejestrowany"`
  - `"Password should be at least 6 characters"` → `"Hasło jest zbyt słabe"` (nie powinno się zdarzyć, bo walidujemy 8 znaków)
  - `"Too many requests"` → `"Zbyt wiele prób. Spróbuj ponownie za chwilę."`
  - Inne błędy → `"Wystąpił nieoczekiwany błąd. Spróbuj ponownie później."`
- **Auto-login:** Po sukcesie `signUp()`, sprawdzenie `session` i przekierowanie do `/app?firstLogin=true`
- **Brak weryfikacji email:** W MVP wyłączona (by design), `emailRedirectTo: undefined`

**Interakcje użytkownika (7 scenariuszy):**
1. Wprowadzanie danych do formularza (email, hasło, potwierdzenie hasła)
2. Toggle widoczności hasła (pierwsze pole)
3. Toggle widoczności potwierdzenia hasła (drugie pole)
4. Zaznaczenie/odznaczenie checkboxa akceptacji regulaminu
5. Wysłanie formularza (przycisk lub Enter)
6. Przejście do strony logowania
7. Keyboard navigation (Tab, Enter, Escape)

**Warunki walidacji:**
- **Client-side:**
  - Format email (regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` lub HTML5)
  - Pole email wymagane
  - Hasło minimum 8 znaków
  - Pole hasło wymagane
  - Zgodność haseł (passwordConfirm === password)
  - Pole potwierdzenia hasła wymagane
  - Akceptacja regulaminu wymagana (acceptTerms === true)
- **Server-side (Supabase Auth):**
  - Email nie może być już zarejestrowany
  - Hasło musi spełniać wymagania Supabase (min 6 znaków, ale walidujemy 8 po stronie klienta)
  - Rate limiting (10 prób/min)

**Obsługa błędów (6 scenariuszy):**
1. Błąd walidacji client-side (nieprawidłowy format email, za krótkie hasło, niezgodne hasła)
2. Email już zarejestrowany
3. Błąd sieci/połączenia
4. Rate limiting (zbyt wiele prób)
5. Nieoczekiwany błąd Supabase
6. Brak sesji po rejestracji (nie powinno się zdarzyć w MVP bez weryfikacji email)

---

## ✅ Zatwierdzone Decyzje - Register View (2025-12-09)

### 1. Format planu implementacji
- ✅ **11 sekcji szczegółów** - od przeglądu do kroków implementacji (zgodnie z wzorem Login View)
- ✅ **Kompletność** - każdy komponent z pełną specyfikacją (props, state, events, walidacja)
- ✅ **Mapowanie wymagań** - User Story US-001 → komponenty, Supabase Auth → integracja

### 2. Szczegółowość dokumentacji
- ✅ **Typy DTO i ViewModel** - RegisterFormData, RegisterFormErrors, RegisterFormProps, PasswordStrength z podziałem pól
- ✅ **Zarządzanie stanem** - 6 stanów z opisem celu i aktualizacji
- ✅ **Integracja API** - szczegółowy opis Supabase Auth SDK (signUp) z mapowaniem błędów
- ✅ **Interakcje użytkownika** - 7 scenariuszy z oczekiwanymi wynikami
- ✅ **Warunki walidacji** - client-side (8 warunków) i server-side (3 warunki) z komunikatami
- ✅ **Obsługa błędów** - 6 scenariuszy z kodami obsługi
- ✅ **Kroki implementacji** - 16 kroków od struktury plików do testowania

### 3. Bezpieczeństwo
- ✅ **Walidacja hasła** - minimum 8 znaków (client + server)
- ✅ **Ogólne komunikaty błędów** - nie ujawniające szczegółów technicznych
- ✅ **Mapowanie błędów Supabase** - wszystkie błędy autentykacji → przyjazne komunikaty
- ✅ **Rate limiting** - automatyczny przez Supabase (10 prób/min)

### 4. UX i dostępność
- ✅ **Auto-focus** - automatyczny focus na pole email przy mount
- ✅ **Loading state** - wyłączenie pól i przycisku podczas rejestracji
- ✅ **Toggle hasła** - możliwość pokazania/ukrycia hasła (dla obu pól)
- ✅ **Wskaźnik siły hasła** - opcjonalny (weak/medium/strong)
- ✅ **Zgodność haseł** - walidacja w czasie rzeczywistym z komunikatem
- ✅ **Accessibility** - ARIA labels, keyboard navigation, aria-invalid, aria-describedby

### 5. Gotowość do implementacji
- ✅ Plan wystarczająco szczegółowy dla programisty frontendowego
- ✅ Wszystkie komponenty, typy, integracje szczegółowo opisane
- ✅ Warunki walidacji, obsługa błędów, interakcje użytkownika zmapowane
- ✅ 16 kroków implementacji od przygotowania do testowania

---

## ✅ Postęp pracy - Register View

### Zrealizowane:
- ✅ Analiza wszystkich dokumentów źródłowych (plan widoku, PRD, wzór formatu Login View, konfiguracja Supabase)
- ✅ Wyodrębnienie wymagań (User Story US-001, wymagania bezpieczeństwa, UX, dostępności)
- ✅ Projektowanie szczegółów implementacji (struktura, typy, stan, API, interakcje, błędy)
- ✅ Utworzenie kompleksowego planu implementacji (812 linii)

### Dokumentacja:

**Nowy plik:**
- `.ai/register-page-view-implementation-plan.md` - Kompleksowy plan implementacji widoku Rejestracji (812 linii) zawiera:
  - Przegląd widoku i główne funkcjonalności (Astro SSR + React island)
  - Routing i parametry URL (redirectTo z firstLogin=true)
  - Strukturę komponentów z hierarchią (register.astro, BaseLayout.astro, RegisterForm.tsx)
  - Szczegóły 2 komponentów (Astro page, React island)
  - Typy DTO i ViewModel (RegisterFormData, RegisterFormErrors, RegisterFormProps, PasswordStrength)
  - Zarządzanie stanem (6 stanów: formData, errors, isLoading, showPassword, showPasswordConfirm, passwordStrength)
  - Integrację z Supabase Auth SDK (signUp, brak weryfikacji email, auto-login)
  - 7 interakcji użytkownika z oczekiwanymi wynikami
  - Warunki walidacji (client-side: 8 warunków, server-side: 3 warunki)
  - Obsługę 6 scenariuszy błędów z kodami obsługi
  - 16 kroków implementacji

**Korzyści:**
1. **Kompletność** - plan zawiera wszystkie szczegóły potrzebne do implementacji
2. **Jasność** - każdy komponent, typ, integracja szczegółowo opisana
3. **Gotowość** - plan wystarczająco szczegółowy dla programisty frontendowego
4. **Spójność** - zgodność z PRD, User Story US-001, tech stack
5. **Bezpieczeństwo** - walidacja hasła min 8 znaków, ogólne komunikaty błędów
6. **Praktyczność** - 16 kroków implementacji od struktury plików do testowania
7. **UX i A11y** - uwzględnione wymagania UX (toggle hasła, wskaźnik siły hasła) i accessibility

---

## 🔗 Powiązane dokumenty - Register View

- `.ai/register-page-view-implementation-plan.md` - **NOWY** - Kompleksowy plan implementacji widoku Rejestracji
- `.ai/view-implementations/register-page-view-implementation-plan-note.md` - Podstawowy plan widoku Rejestracji
- `.ai/login-view-implementation-plan.md` - Wzór formatu planu implementacji (Login View - najnowszy wzór)
- `.ai/ui-plan.md` - Architektura UI wysokiego poziomu
- `.ai/prd.md` - Dokument wymagań produktu (User Story US-001)
- `src/lib/supabase.ts` - Konfiguracja Supabase client
- `src/lib/types.ts` - Typy TypeScript (możliwość dodania typów RegisterFormData, RegisterFormErrors, PasswordStrength)

---

## 📋 Podsumowanie Sesji Tworzenia Szczegółowego Planu Implementacji Register View (2025-12-09)

### Status: ✅ ZAKOŃCZONE

**Data zakończenia:** 2025-12-09  
**Czas trwania:** 1 sesja  
**Wynik:** Kompleksowy plan implementacji widoku Rejestracji (812 linii)

### Kluczowe Osiągnięcia:

1. **Kompleksowy plan implementacji** - 11 sekcji szczegółów technicznych
2. **Szczegółowa specyfikacja komponentów** - 2 komponenty z pełną specyfikacją
3. **Mapowanie wymagań** - User Story US-001 → komponenty, Supabase Auth → integracja
4. **Bezpieczeństwo** - walidacja hasła min 8 znaków, ogólne komunikaty błędów
5. **Gotowość do implementacji** - plan wystarczająco szczegółowy dla programisty frontendowego
6. **UX i A11y** - uwzględnione wymagania UX (toggle hasła, wskaźnik siły hasła) i accessibility
7. **Dokumentacja** - 812 linii szczegółowego planu implementacji

### Następne Kroki:

1. **Implementacja widoku Rejestracji** - zgodnie z planem w `.ai/register-page-view-implementation-plan.md`
2. **Odwoływanie się do planu** - jako główne źródło szczegółów implementacji
3. **Iteracyjne podejście** - implementacja zgodnie z 16 krokami z planu
4. **Priorytetyzacja** - rozpoczęcie od struktury plików i podstawowych komponentów

**Gotowe do rozpoczęcia implementacji widoku Rejestracji zgodnie z kompleksowym planem!** 🚀

---

