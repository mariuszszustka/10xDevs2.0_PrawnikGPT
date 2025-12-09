# Register Page View - Implementation Plan

**Widok:** Register Page (Strona rejestracji)  
**Ścieżka:** `/register`  
**Typ:** Astro SSR + React island (formularz)  
**Autentykacja:** Nie wymagana (publiczny)

---

## 1. Product Requirements Document (PRD)

@.ai/prd.md

---

## 2. Opis widoku

### 2.3. Register Page (Strona rejestracji)

**Ścieżka:** `/register`  
**Typ:** Astro SSR + React island (formularz)  
**Autentykacja:** Nie wymagana (publiczny)

**Główny cel:**
Rejestracja nowych użytkowników. Auto-login po pomyślnej rejestracji.

**Kluczowe informacje do wyświetlenia:**
- Formularz rejestracji z polami:
  - Email (input type="email")
  - Hasło (input type="password" z wskaźnikiem siły hasła)
  - Potwierdzenie hasła (input type="password")
- Checkbox z akceptacją regulaminu (required)
- Przycisk "Zarejestruj się"
- Link do logowania: "Masz już konto? Zaloguj się" → `/login`
- Komunikaty błędów (walidacja hasła, zajęty email)

**Kluczowe komponenty widoku:**
- `RegisterForm.tsx` (React island) - Formularz z walidacją
- `BaseLayout.astro` - Wrapper

**UX, dostępność i względy bezpieczeństwa:**
- **UX:**
  - Walidacja hasła w czasie rzeczywistym (min 8 znaków, komunikat inline)
  - Wskaźnik siły hasła (opcjonalnie)
  - Sprawdzanie zgodności haseł (komunikat pod polem)
  - Auto-login po rejestracji → redirect do `/app` z welcome message
  - Loading state podczas rejestracji
- **Dostępność:**
  - `aria-describedby` dla komunikatów pomocy (wymagania hasła)
  - `aria-invalid` dla błędów walidacji
  - Focus management (auto-focus na email, Tab order)
- **Bezpieczeństwo:**
  - Walidacja hasła: min 8 znaków (client + server)
  - Ogólne komunikaty błędów
  - Brak weryfikacji email w MVP (by design, minimalizacja barier wejścia)
  - Rate limiting na backendzie

---

## 3. User Stories

**US-001: Rejestracja nowego użytkownika**
**Opis:** Jako nowy użytkownik, chcę móc utworzyć konto w aplikacji za pomocą mojego adresu e-mail i hasła, aby uzyskać dostęp do jej funkcjonalności.

**Kryteria akceptacji:**
- Po podaniu prawidłowego adresu e-mail i hasła, konto zostaje utworzone w systemie Supabase Auth.
- Użytkownik jest automatycznie zalogowany po pomyślnej rejestracji.
- Proces nie wymaga potwierdzenia adresu e-mail.
- W przypadku błędu (np. zajęty e-mail) użytkownik widzi stosowny komunikat.

---

## 4. Endpoint Description

**Ten widok nie korzysta z backend API** - używa bezpośrednio **Supabase Auth SDK** po stronie klienta.

**Supabase Auth Methods:**
- `supabase.auth.signUp({ email, password })` - Rejestracja nowego użytkownika
- `supabase.auth.getSession()` - Sprawdzenie aktywnej sesji po rejestracji
- `supabase.auth.onAuthStateChange()` - Listener zmian stanu autentykacji

**Rate Limiting:**
- Backend może wymagać rate limiting dla prób rejestracji (10 prób/min)
- Implementacja w middleware: `backend/middleware/rate_limit.py`

---

## 5. Endpoint Implementation

**Brak bezpośrednich endpointów API** - autentykacja przez Supabase Auth SDK.

**Supabase Client Setup:**
- **Frontend:** `src/lib/supabase.ts` - Konfiguracja Supabase client
- **Auth methods:** Używane bezpośrednio w `RegisterForm.tsx`

**Przykład użycia:**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);

// W RegisterForm.tsx
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: undefined // Brak weryfikacji email w MVP
  }
});
```

---

## 6. Type Definitions

**Brak typów API** - widok używa Supabase Auth types.

**Supabase Types:**
- `Session` - Typ sesji użytkownika z Supabase
- `AuthError` - Typ błędu autentykacji
- `User` - Typ użytkownika z Supabase

**Frontend Types (opcjonalnie):**
- Własne typy dla formularza można zdefiniować w `src/lib/types.ts`:
```typescript
export interface RegisterFormData {
  email: string;
  password: string;
  passwordConfirm: string;
  acceptTerms: boolean;
}

export interface RegisterFormErrors {
  email?: string;
  password?: string;
  passwordConfirm?: string;
  acceptTerms?: string;
  general?: string;
}

export type PasswordStrength = 'weak' | 'medium' | 'strong';
```

---

## 7. Tech Stack

**Frontend:**
- **Framework:** Astro 5 (SSR dla dynamicznego contentu)
- **React Islands:** React 19 dla interaktywnego formularza (`client:load`)
- **Auth:** Supabase Auth SDK (client-side)
- **Styling:** Tailwind CSS + Shadcn/ui (formularze)
- **Validation:** React Hook Form + Zod (walidacja hasła, zgodność haseł)

**Backend:**
- **Auth:** Supabase Auth (hosted service lub self-hosted)
- **Rate Limiting:** Middleware w FastAPI (opcjonalnie, dla dodatkowej ochrony)

**Zobacz:** @.ai/tech-stack.md dla szczegółów infrastruktury

---

## 8. Checklist Implementacji

### Frontend (Astro + React)
- [x] Utworzenie `src/pages/register.astro`
- [x] Komponent `RegisterForm.tsx` (React island)
  - [x] Pola: email, password, passwordConfirm
  - [x] Checkbox akceptacji regulaminu (required)
  - [x] Walidacja formatu email (client-side)
  - [x] Walidacja hasła (min 8 znaków, w czasie rzeczywistym)
  - [x] Wskaźnik siły hasła (opcjonalnie) - `PasswordStrengthIndicator.tsx`
  - [x] Sprawdzanie zgodności haseł (komunikat pod polem)
  - [x] Toggle pokazywania hasła (dla obu pól)
  - [x] Loading state podczas rejestracji
  - [x] Obsługa błędów (Supabase Auth errors)
  - [x] Auto-login po rejestracji → redirect do `/app?firstLogin=true`
- [x] `BaseLayout.astro` z meta tags
- [x] Link do `/login` ("Masz już konto? Zaloguj się")
- [x] Accessibility (ARIA labels, keyboard navigation, auto-focus)
- [x] Responsywność (mobile-first)

### Supabase Setup
- [x] Konfiguracja `src/lib/supabase.ts`
- [x] Environment variables (`.env`):
  - `PUBLIC_SUPABASE_URL`
  - `PUBLIC_SUPABASE_ANON_KEY`
- [x] Konfiguracja Supabase Auth (wyłączenie email verification w MVP)
- [ ] Test połączenia z Supabase Auth (wymaga uruchomienia aplikacji)

### Security
- [x] Walidacja hasła: min 8 znaków (client + server)
- [x] Ogólne komunikaty błędów
- [x] CSRF protection (Supabase SDK)
- [ ] Rate limiting (opcjonalnie w backend middleware)

### Testing
- [ ] Test rejestracji z prawidłowymi danymi (wymaga uruchomienia aplikacji)
- [ ] Test błędnych danych (zajęty email, słabe hasło) (wymaga uruchomienia aplikacji)
- [x] Test walidacji hasła (min 8 znaków) - zaimplementowane
- [x] Test zgodności haseł - zaimplementowane
- [x] Test checkbox akceptacji regulaminu - zaimplementowane
- [ ] Test auto-login i redirect po sukcesie (wymaga uruchomienia aplikacji)
- [x] Test accessibility (keyboard navigation, screen reader) - zaimplementowane (ARIA, Tab order)

---

## 9. Uwagi Implementacyjne

1. **Supabase Auth:** Używamy bezpośrednio Supabase Auth SDK, nie przez backend API
2. **Email Verification:** W MVP wyłączona (by design) - użytkownik jest automatycznie zalogowany
3. **Password Validation:** Minimum 8 znaków, walidacja po stronie klienta i serwera
4. **Password Strength:** Opcjonalny wskaźnik siły hasła (weak/medium/strong)
5. **Error Handling:** Supabase zwraca szczegółowe błędy - mapuj je na przyjazne komunikaty
6. **Session Management:** Token JWT jest automatycznie zarządzany przez Supabase SDK
7. **Redirect Logic:** Po rejestracji przekieruj do `/app` z flagą `firstLogin=true` (dla welcome message)
8. **Loading States:** Wyłącz inputy i pokaż spinner podczas rejestracji
9. **Auto-focus:** Automatycznie ustaw focus na pole email przy załadowaniu strony

---

**Powrót do:** [View Implementation Index](../view-implementation-index.md) | [UI Plan](../ui-plan.md) | [PRD](../prd.md)

