# Login Page View - Implementation Plan

**Widok:** Login Page (Strona logowania)  
**Ścieżka:** `/login`  
**Typ:** Astro SSR + React island (formularz)  
**Autentykacja:** Nie wymagana (publiczny)

---

## 1. Product Requirements Document (PRD)

@.ai/prd.md

---

## 2. Opis widoku

### 2.2. Login Page (Strona logowania)

**Ścieżka:** `/login`  
**Typ:** Astro SSR + React island (formularz)  
**Autentykacja:** Nie wymagana (publiczny)

**Główny cel:**
Logowanie istniejących użytkowników do aplikacji.

**Kluczowe informacje do wyświetlenia:**
- Formularz logowania z polami:
  - Email (input type="email")
  - Hasło (input type="password" z możliwością pokazania/ukrycia)
- Przycisk "Zaloguj się"
- Link do rejestracji: "Nie masz konta? Zarejestruj się" → `/register`
- Komunikaty błędów (inline pod polami lub Alert na górze formularza)
- Opcjonalnie: "Zapomniałeś hasła?" (post-MVP)

**Kluczowe komponenty widoku:**
- `LoginForm.tsx` (React island) - Formularz z walidacją i obsługą błędów
- `BaseLayout.astro` - Wrapper z meta tags

**UX, dostępność i względy bezpieczeństwa:**
- **UX:** 
  - Auto-focus na pole email przy załadowaniu
  - Enter do submit, Shift+Enter dla nowej linii (jeśli textarea)
  - Loading state podczas logowania (disabled input + spinner)
  - Redirect do `/app` po sukcesie
- **Dostępność:**
  - `aria-label` dla pól formularza
  - `aria-invalid` dla błędów walidacji
  - `aria-live="polite"` dla komunikatów błędów
  - Keyboard navigation (Tab, Enter, Escape)
- **Bezpieczeństwo:**
  - Ogólne komunikaty błędów ("Nieprawidłowy email lub hasło") bez ujawniania, czy email istnieje
  - Walidacja po stronie klienta (format email) i serwera
  - CSRF protection przez Supabase Auth SDK
  - Rate limiting na backendzie (10 prób/min)

---

## 3. User Stories

**US-002: Logowanie do aplikacji**
**Opis:** Jako zarejestrowany użytkownik, chcę móc zalogować się na swoje konto, aby kontynuować pracę z aplikacją.

**Kryteria akceptacji:**
- Po podaniu prawidłowego e-maila i hasła, użytkownik zostaje zalogowany.
- Token sesji (JWT) jest zapisywany w przeglądarce.
- W przypadku błędnych danych logowania, użytkownik widzi stosowny komunikat.

---

## 4. Endpoint Description

**Ten widok nie korzysta z backend API** - używa bezpośrednio **Supabase Auth SDK** po stronie klienta.

**Supabase Auth Methods:**
- `supabase.auth.signInWithPassword({ email, password })` - Logowanie użytkownika
- `supabase.auth.getSession()` - Sprawdzenie aktywnej sesji
- `supabase.auth.onAuthStateChange()` - Listener zmian stanu autentykacji

**Rate Limiting:**
- Backend może wymagać rate limiting dla prób logowania (10 prób/min)
- Implementacja w middleware: `backend/middleware/rate_limit.py`

---

## 5. Endpoint Implementation

**Brak bezpośrednich endpointów API** - autentykacja przez Supabase Auth SDK.

**Supabase Client Setup:**
- **Frontend:** `src/lib/supabase.ts` - Konfiguracja Supabase client
- **Auth methods:** Używane bezpośrednio w `LoginForm.tsx`

**Przykład użycia:**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);

// W LoginForm.tsx
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
});
```

---

## 6. Type Definitions

**Brak typów API** - widok używa Supabase Auth types.

**Supabase Types:**
- `Session` - Typ sesji użytkownika z Supabase
- `AuthError` - Typ błędu autentykacji

**Frontend Types (opcjonalnie):**
- Własne typy dla formularza można zdefiniować w `src/lib/types.ts`:
```typescript
export interface LoginFormData {
  email: string;
  password: string;
}

export interface LoginFormErrors {
  email?: string;
  password?: string;
  general?: string;
}
```

---

## 7. Tech Stack

**Frontend:**
- **Framework:** Astro 5 (SSR dla dynamicznego contentu)
- **React Islands:** React 19 dla interaktywnego formularza (`client:load`)
- **Auth:** Supabase Auth SDK (client-side)
- **Styling:** Tailwind CSS + Shadcn/ui (formularze)
- **Validation:** React Hook Form + Zod (opcjonalnie)

**Backend:**
- **Auth:** Supabase Auth (hosted service lub self-hosted)
- **Rate Limiting:** Middleware w FastAPI (opcjonalnie, dla dodatkowej ochrony)

**Zobacz:** @.ai/tech-stack.md dla szczegółów infrastruktury

---

## 8. Checklist Implementacji

### Frontend (Astro + React)
- [ ] Utworzenie `src/pages/login.astro`
- [ ] Komponent `LoginForm.tsx` (React island)
  - [ ] Pola: email, password
  - [ ] Walidacja formatu email (client-side)
  - [ ] Toggle pokazywania hasła
  - [ ] Loading state podczas logowania
  - [ ] Obsługa błędów (Supabase Auth errors)
  - [ ] Redirect do `/app` po sukcesie
- [ ] `BaseLayout.astro` z meta tags
- [ ] Link do `/register` ("Nie masz konta? Zarejestruj się")
- [ ] Accessibility (ARIA labels, keyboard navigation)
- [ ] Responsywność (mobile-first)

### Supabase Setup
- [ ] Konfiguracja `src/lib/supabase.ts`
- [ ] Environment variables (`.env`):
  - `PUBLIC_SUPABASE_URL`
  - `PUBLIC_SUPABASE_ANON_KEY`
- [ ] Test połączenia z Supabase Auth

### Security
- [ ] Ogólne komunikaty błędów (nie ujawniające, czy email istnieje)
- [ ] CSRF protection (Supabase SDK)
- [ ] Rate limiting (opcjonalnie w backend middleware)

### Testing
- [ ] Test logowania z prawidłowymi danymi
- [ ] Test błędnych danych (nieprawidłowy email/hasło)
- [ ] Test redirect po sukcesie
- [ ] Test accessibility (keyboard navigation, screen reader)

---

## 9. Uwagi Implementacyjne

1. **Supabase Auth:** Używamy bezpośrednio Supabase Auth SDK, nie przez backend API
2. **Error Handling:** Supabase zwraca szczegółowe błędy - mapuj je na przyjazne komunikaty dla użytkownika
3. **Session Management:** Token JWT jest automatycznie zarządzany przez Supabase SDK
4. **Redirect Logic:** Po zalogowaniu przekieruj do `/app` (lub do URL z parametru `redirect_to`)
5. **Loading States:** Wyłącz inputy i pokaż spinner podczas logowania
6. **Auto-focus:** Automatycznie ustaw focus na pole email przy załadowaniu strony

---

**Powrót do:** [View Implementation Index](../view-implementation-index.md) | [UI Plan](../ui-plan.md) | [PRD](../prd.md)

