# Specyfikacja techniczna modułu autentykacji - PrawnikGPT

**Data utworzenia:** 2025-01-11  
**Wersja:** 1.0  
**Status:** Specyfikacja techniczna

## 1. Przegląd

Niniejsza specyfikacja opisuje szczegółową architekturę modułu rejestracji, logowania i odzyskiwania hasła użytkowników dla aplikacji PrawnikGPT. Moduł jest oparty na Supabase Auth i integruje się z istniejącą architekturą Astro 5 + React 19 oraz FastAPI backend.

### 1.1. Zakres funkcjonalności

Moduł autentykacji obejmuje:
- **Rejestracja użytkownika** (US-001)
- **Logowanie użytkownika** (US-002)
- **Wylogowywanie użytkownika**
- **Odzyskiwanie hasła** (forgot password / reset password)
- **Zarządzanie sesją** (JWT tokens, refresh tokens)
- **Ochrona przed atakami** (rate limiting, enumeracja użytkowników)

### 1.2. Wymagania z PRD

**US-001: Rejestracja nowego użytkownika**
- Rejestracja przez email/hasło
- Automatyczne logowanie po rejestracji
- Brak weryfikacji email w MVP
- Walidacja hasła: minimum 12 znaków, małe/duże litery, cyfry, znaki specjalne
- Rate limiting: 5 prób na 15 minut z jednego IP
- Ogólne komunikaty błędów (brak enumeracji)

**US-002: Logowanie do aplikacji**
- Logowanie przez email/hasło
- Access Token JWT: 15 minut
- Refresh Token: HttpOnly cookie, Secure, SameSite
- Rate limiting: 5 nieudanych prób = blokada na 15 minut
- Obsługa MFA/2FA (TOTP) - opcjonalnie
- Wylogowanie unieważnia refresh token
- Ogólne komunikaty błędów

**Odzyskiwanie hasła (z PRD 9.2.5)**
- Reset hasła przez email z tokenem
- Ważność tokenu: 15-30 minut
- Zmiana hasła wylogowuje z innych sesji
- Zapobieganie enumeracji użytkowników

---

## 2. Architektura interfejsu użytkownika

### 2.1. Struktura stron i routingu

#### 2.1.1. Strony publiczne (non-auth)

**`/login` - Strona logowania**
- **Plik:** `src/pages/login.astro`
- **Layout:** `BaseLayout`
- **Komponent React:** `LoginForm` (client:load)
- **Parametry URL:**
  - `redirect_to` (opcjonalny): URL przekierowania po zalogowaniu (domyślnie `/app`)
  - `expired` (opcjonalny): `true` jeśli sesja wygasła
- **Funkcjonalność:**
  - Formularz logowania (email, hasło)
  - Link do rejestracji (`/register`)
  - Link do odzyskiwania hasła (`/forgot-password`)
  - Obsługa komunikatów błędów
  - Przekierowanie zalogowanych użytkowników (middleware)

**`/register` - Strona rejestracji**
- **Plik:** `src/pages/register.astro`
- **Layout:** `BaseLayout`
- **Komponent React:** `RegisterForm` (client:load)
- **Parametry URL:**
  - `redirect_to` (opcjonalny): URL przekierowania po rejestracji (domyślnie `/app?firstLogin=true`)
- **Funkcjonalność:**
  - Formularz rejestracji (email, hasło, potwierdzenie hasła, akceptacja regulaminu)
  - Wskaźnik siły hasła
  - Link do logowania (`/login`)
  - Przekierowanie zalogowanych użytkowników (middleware)

**`/forgot-password` - Strona żądania resetu hasła**
- **Plik:** `src/pages/forgot-password.astro` (NOWY)
- **Layout:** `BaseLayout`
- **Komponent React:** `ForgotPasswordForm` (client:load) (NOWY)
- **Funkcjonalność:**
  - Formularz z polem email
  - Wysyłka linku resetującego hasło
  - Komunikat sukcesu (nawet jeśli email nie istnieje - zapobieganie enumeracji)
  - Link powrotu do logowania (`/login`)

**`/reset-password` - Strona resetu hasła**
- **Plik:** `src/pages/reset-password.astro` (NOWY)
- **Layout:** `BaseLayout`
- **Komponent React:** `ResetPasswordForm` (client:load) (NOWY)
- **Parametry URL:**
  - `token` (wymagany): Token resetujący hasło z emaila
- **Funkcjonalność:**
  - Formularz resetu hasła (nowe hasło, potwierdzenie hasła)
  - Walidacja tokenu
  - Wskaźnik siły hasła
  - Przekierowanie do logowania po sukcesie

#### 2.1.2. Strony chronione (auth required)

**`/app/*` - Wszystkie strony aplikacji**
- **Middleware:** Przekierowanie niezalogowanych użytkowników do `/login`
- **Layout:** `AppLayout` (jeśli istnieje) lub `BaseLayout`
- **Dostęp:** Tylko dla zalogowanych użytkowników

### 2.2. Komponenty React (React Islands)

#### 2.2.1. LoginForm (istniejący - do rozszerzenia)

**Plik:** `src/components/auth/LoginForm.tsx`

**Aktualny stan:**
- ✅ Formularz logowania (email, hasło)
- ✅ Walidacja client-side
- ✅ Obsługa błędów
- ✅ Toggle widoczności hasła
- ✅ Loading states

**Wymagane rozszerzenia:**
- ✅ Link do `/forgot-password` (dodany w `login.astro`)
- ⚠️ Obsługa MFA/2FA (opcjonalnie, jeśli wymagane w przyszłości)
- ✅ Komunikat o wygasłej sesji (`showExpiredMessage` prop)

**Props:**
```typescript
interface LoginFormProps {
  redirectTo?: string; // Domyślnie '/app'
  showExpiredMessage?: boolean; // Domyślnie false
}
```

**State:**
```typescript
interface LoginFormData {
  email: string;
  password: string;
}

interface LoginFormErrors {
  email?: string;
  password?: string;
  general?: string;
}
```

**Walidacja:**
- Email: format email (regex)
- Hasło: wymagane pole
- Ogólne komunikaty błędów (brak enumeracji)

**Integracja z Supabase:**
```typescript
const { data, error } = await supabaseClient.auth.signInWithPassword({
  email: formData.email.trim(),
  password: formData.password,
});
```

**Obsługa błędów:**
- `Invalid login credentials` → `"Nieprawidłowy email lub hasło"`
- `Email not confirmed` → `"Nieprawidłowy email lub hasło"` (brak enumeracji)
- `Too many requests` → `"Zbyt wiele prób logowania. Spróbuj ponownie za chwilę."`
- Network errors → `"Błąd połączenia. Sprawdź połączenie internetowe."`

#### 2.2.2. RegisterForm (istniejący - do rozszerzenia)

**Plik:** `src/components/auth/RegisterForm.tsx`

**Aktualny stan:**
- ✅ Formularz rejestracji (email, hasło, potwierdzenie hasła, akceptacja regulaminu)
- ✅ Walidacja client-side
- ✅ Wskaźnik siły hasła
- ✅ Obsługa błędów
- ✅ Toggle widoczności hasła

**Wymagane rozszerzenia:**
- ⚠️ Walidacja hasła zgodna z PRD: minimum 12 znaków, małe/duże litery, cyfry, znaki specjalne (obecnie minimum 8 znaków)
- ✅ Ogólne komunikaty błędów (brak enumeracji)

**Props:**
```typescript
interface RegisterFormProps {
  redirectTo?: string; // Domyślnie '/app?firstLogin=true'
}
```

**State:**
```typescript
interface RegisterFormData {
  email: string;
  password: string;
  passwordConfirm: string;
  acceptTerms: boolean;
}

interface RegisterFormErrors {
  email?: string;
  password?: string;
  passwordConfirm?: string;
  acceptTerms?: string;
  general?: string;
}
```

**Walidacja hasła (zgodnie z PRD):**
- Minimum 12 znaków
- Co najmniej jedna mała litera
- Co najmniej jedna duża litera
- Co najmniej jedna cyfra
- Co najmniej jeden znak specjalny

**Integracja z Supabase:**
```typescript
const { data, error } = await supabaseClient.auth.signUp({
  email: formData.email.trim(),
  password: formData.password,
  options: {
    emailRedirectTo: undefined, // Brak weryfikacji email w MVP
  },
});
```

**Obsługa błędów:**
- `User already registered` → `"Nie można utworzyć konta"` (ogólny komunikat)
- `Password should be at least X characters` → `"Hasło jest zbyt słabe"`
- `Too many requests` → `"Zbyt wiele prób. Spróbuj ponownie za chwilę."`
- Network errors → `"Wystąpił problem z połączeniem. Spróbuj ponownie."`

#### 2.2.3. ForgotPasswordForm (NOWY)

**Plik:** `src/components/auth/ForgotPasswordForm.tsx` (NOWY)

**Funkcjonalność:**
- Formularz z polem email
- Wysyłka linku resetującego hasło
- Komunikat sukcesu (nawet jeśli email nie istnieje - zapobieganie enumeracji)
- Link powrotu do logowania

**Props:**
```typescript
interface ForgotPasswordFormProps {
  // Brak props (komponent standalone)
}
```

**State:**
```typescript
interface ForgotPasswordFormData {
  email: string;
}

interface ForgotPasswordFormErrors {
  email?: string;
  general?: string;
}

interface ForgotPasswordFormState {
  formData: ForgotPasswordFormData;
  errors: ForgotPasswordFormErrors;
  isLoading: boolean;
  isSuccess: boolean; // Po wysłaniu emaila
}
```

**Walidacja:**
- Email: format email (regex)
- Email: wymagane pole

**Integracja z Supabase:**
```typescript
const { error } = await supabaseClient.auth.resetPasswordForEmail(
  formData.email.trim(),
  {
    redirectTo: `${window.location.origin}/reset-password`,
  }
);
```

**Obsługa błędów:**
- `Invalid email` → `"Podaj prawidłowy adres email"`
- `Too many requests` → `"Zbyt wiele prób. Spróbuj ponownie za chwilę."`
- Network errors → `"Błąd połączenia. Sprawdź połączenie internetowe."`
- **Sukces:** Zawsze wyświetlany komunikat sukcesu (nawet jeśli email nie istnieje)

**Komunikat sukcesu:**
```
"Jeśli podany adres email istnieje w systemie, otrzymasz wiadomość z linkiem do resetu hasła."
```

#### 2.2.4. ResetPasswordForm (NOWY)

**Plik:** `src/components/auth/ResetPasswordForm.tsx` (NOWY)

**Funkcjonalność:**
- Formularz resetu hasła (nowe hasło, potwierdzenie hasła)
- Walidacja tokenu z URL
- Wskaźnik siły hasła
- Przekierowanie do logowania po sukcesie

**Props:**
```typescript
interface ResetPasswordFormProps {
  token: string; // Token z URL parametru
}
```

**State:**
```typescript
interface ResetPasswordFormData {
  password: string;
  passwordConfirm: string;
}

interface ResetPasswordFormErrors {
  password?: string;
  passwordConfirm?: string;
  token?: string; // Błąd walidacji tokenu
  general?: string;
}
```

**Walidacja:**
- Hasło: zgodnie z PRD (minimum 12 znaków, małe/duże litery, cyfry, znaki specjalne)
- Potwierdzenie hasła: musi być zgodne z hasłem
- Token: walidacja przez Supabase Auth

**Integracja z Supabase:**
```typescript
// 1. Weryfikacja tokenu (opcjonalnie, Supabase obsługuje to automatycznie)
// 2. Reset hasła
const { error } = await supabaseClient.auth.updateUser({
  password: formData.password,
});
```

**Obsługa błędów:**
- `Invalid token` → `"Link resetujący hasło jest nieprawidłowy lub wygasł. Poproś o nowy link."`
- `Password should be at least X characters` → `"Hasło jest zbyt słabe"`
- `Too many requests` → `"Zbyt wiele prób. Spróbuj ponownie za chwilę."`
- Network errors → `"Błąd połączenia. Sprawdź połączenie internetowe."`

**Przepływ:**
1. Użytkownik otwiera link z emaila (`/reset-password?token=...`)
2. Komponent odczytuje token z URL
3. Użytkownik wprowadza nowe hasło
4. Po sukcesie: przekierowanie do `/login?passwordReset=true`

#### 2.2.5. LogoutButton (opcjonalny, jeśli potrzebny)

**Plik:** `src/components/auth/LogoutButton.tsx` (opcjonalny)

**Funkcjonalność:**
- Przycisk wylogowania w headerze aplikacji
- Potwierdzenie wylogowania (opcjonalnie)
- Przekierowanie do `/login` po wylogowaniu

**Integracja z Supabase:**
```typescript
const { error } = await supabaseClient.auth.signOut();
```

### 2.3. Layouty

#### 2.3.1. BaseLayout (istniejący)

**Plik:** `src/layouts/BaseLayout.astro`

**Funkcjonalność:**
- Podstawowy layout dla stron publicznych
- Meta tags (SEO)
- Globalne style
- Toaster dla notyfikacji

**Użycie:**
- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/` (landing page)

#### 2.3.2. AppLayout (jeśli istnieje)

**Plik:** `src/layouts/AppLayout.astro` (jeśli istnieje)

**Funkcjonalność:**
- Layout dla stron chronionych (`/app/*`)
- Header z nawigacją
- Logout button (opcjonalnie)
- Sidebar (opcjonalnie)

**Użycie:**
- `/app` (chat)
- `/app/history`
- `/app/settings`

### 2.4. Middleware autentykacji

#### 2.4.1. Astro Middleware (istniejący - do rozszerzenia)

**Plik:** `src/middleware/index.ts`

**Aktualny stan:**
- ✅ Dodawanie Supabase client do context.locals
- ✅ Sprawdzanie sesji użytkownika
- ✅ Przekierowanie zalogowanych użytkowników z `/login` i `/register` do `/app`
- ✅ Przekierowanie niezalogowanych użytkowników z `/app/*` do `/login`

**Wymagane rozszerzenia:**
- ⚠️ Obsługa przekierowań dla `/forgot-password` i `/reset-password`:
  - Zalogowani użytkownicy z `/forgot-password` → `/app`
  - Zalogowani użytkownicy z `/reset-password` → `/app` (opcjonalnie, można pozwolić na reset)
  - Niezalogowani użytkownicy z `/reset-password` → dozwolone (reset hasła)

**Logika przekierowań:**
```typescript
// Strony publiczne - przekieruj zalogowanych użytkowników
if (session && ['/login', '/register', '/forgot-password'].includes(context.url.pathname)) {
  return context.redirect('/app', 302);
}

// Strony chronione - przekieruj niezalogowanych użytkowników
if (!session && context.url.pathname.startsWith('/app')) {
  return context.redirect('/login', 302);
}

// /reset-password - dozwolone dla wszystkich (z tokenem)
// (brak przekierowań)
```

### 2.5. Walidacja i komunikaty błędów

#### 2.5.1. Walidacja client-side

**Email:**
- Format: regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Wymagane pole
- Trim whitespace

**Hasło (rejestracja i reset):**
- Minimum 12 znaków
- Co najmniej jedna mała litera (`[a-z]`)
- Co najmniej jedna duża litera (`[A-Z]`)
- Co najmniej jedna cyfra (`[0-9]`)
- Co najmniej jeden znak specjalny (`[^a-zA-Z0-9]`)

**Hasło (logowanie):**
- Wymagane pole
- Brak walidacji formatu (walidacja po stronie serwera)

**Potwierdzenie hasła:**
- Wymagane pole
- Musi być zgodne z hasłem

**Akceptacja regulaminu (rejestracja):**
- Wymagane zaznaczenie checkboxa

#### 2.5.2. Komunikaty błędów

**Zasady ogólne:**
- Brak enumeracji użytkowników (nie ujawniamy, czy email istnieje)
- Ogólne komunikaty błędów
- Przyjazne komunikaty w języku polskim
- ARIA labels dla dostępności

**Przykłady komunikatów:**
- Logowanie: `"Nieprawidłowy email lub hasło"` (niezależnie od przyczyny)
- Rejestracja: `"Nie można utworzyć konta"` (jeśli email zajęty)
- Rate limiting: `"Zbyt wiele prób. Spróbuj ponownie za chwilę."`
- Network errors: `"Błąd połączenia. Sprawdź połączenie internetowe."`

### 2.6. Obsługa scenariuszy

#### 2.6.1. Rejestracja → Auto-login → Aplikacja

1. Użytkownik wypełnia formularz rejestracji
2. Walidacja client-side
3. Wywołanie `supabase.auth.signUp()`
4. Jeśli sukces i `data.session` istnieje:
   - Automatyczne logowanie
   - Przekierowanie do `/app?firstLogin=true`
5. Jeśli błąd:
   - Wyświetlenie komunikatu błędu
   - Formularz pozostaje wypełniony (opcjonalnie)

#### 2.6.2. Logowanie → Aplikacja

1. Użytkownik wypełnia formularz logowania
2. Walidacja client-side
3. Wywołanie `supabase.auth.signInWithPassword()`
4. Jeśli sukces:
   - Zapisanie sesji (Supabase SDK)
   - Przekierowanie do `/app` (lub `redirectTo` z URL)
5. Jeśli błąd:
   - Wyświetlenie komunikatu błędu
   - Formularz pozostaje wypełniony (opcjonalnie)

#### 2.6.3. Wylogowanie

1. Użytkownik klika przycisk wylogowania
2. Wywołanie `supabase.auth.signOut()`
3. Unieważnienie sesji po stronie serwera (Supabase)
4. Przekierowanie do `/login`

#### 2.6.4. Odzyskiwanie hasła

**Krok 1: Żądanie resetu**
1. Użytkownik wypełnia formularz na `/forgot-password`
2. Walidacja email
3. Wywołanie `supabase.auth.resetPasswordForEmail()`
4. Wyświetlenie komunikatu sukcesu (nawet jeśli email nie istnieje)
5. Link powrotu do `/login`

**Krok 2: Reset hasła**
1. Użytkownik otwiera link z emaila (`/reset-password?token=...`)
2. Komponent odczytuje token z URL
3. Użytkownik wprowadza nowe hasło
4. Walidacja client-side
5. Wywołanie `supabase.auth.updateUser({ password })`
6. Jeśli sukces:
   - Wylogowanie z innych sesji (automatycznie przez Supabase)
   - Przekierowanie do `/login?passwordReset=true`
7. Jeśli błąd:
   - Wyświetlenie komunikatu błędu

#### 2.6.5. Wygasła sesja

1. API zwraca `401 Unauthorized`
2. Próba odświeżenia tokenu: `supabase.auth.refreshSession()`
3. Jeśli refresh się powiedzie:
   - Retry request z nowym tokenem
4. Jeśli refresh się nie powiedzie:
   - Przekierowanie do `/login?expired=true`
   - Wyświetlenie komunikatu: `"Sesja wygasła. Zaloguj się ponownie."`

---

## 3. Logika backendowa

### 3.1. Struktura endpointów API

#### 3.1.1. Endpointy autentykacji (Supabase Auth)

**UWAGA:** Większość operacji autentykacji jest obsługiwana bezpośrednio przez Supabase Auth SDK po stronie frontendu. Backend FastAPI nie wymaga dedykowanych endpointów autentykacji, ponieważ:

1. Rejestracja i logowanie są obsługiwane przez Supabase Auth API
2. Backend weryfikuje JWT tokeny w middleware
3. Odzyskiwanie hasła jest obsługiwane przez Supabase Auth

**Jednak, jeśli wymagane są dodatkowe funkcje:**

**POST /api/v1/auth/logout** (opcjonalny)
- **Cel:** Wylogowanie użytkownika z unieważnieniem tokenu po stronie serwera
- **Auth:** Wymagane (JWT token)
- **Request Body:** Brak
- **Response:** `204 No Content`
- **Uwaga:** W większości przypadków wystarczy `supabase.auth.signOut()` po stronie klienta

#### 3.1.2. Endpointy chronione (istniejące)

Wszystkie endpointy w `/api/v1/queries/*` i `/api/v1/ratings/*` wymagają autentykacji przez middleware `get_current_user`.

### 3.2. Modele danych

#### 3.2.1. Request Models (Pydantic)

**Brak dedykowanych modeli dla autentykacji** - Supabase Auth obsługuje to bezpośrednio.

**Jeśli wymagane są dodatkowe endpointy:**

```python
# backend/models/auth.py (opcjonalnie)

from pydantic import BaseModel, EmailStr

class LogoutRequest(BaseModel):
    """Request model for logout endpoint (opcjonalny)"""
    pass  # Brak pól
```

#### 3.2.2. Response Models

**Brak dedykowanych modeli odpowiedzi dla autentykacji** - Supabase Auth zwraca standardowe odpowiedzi.

### 3.3. Walidacja danych wejściowych

#### 3.3.1. Walidacja po stronie backendu (Supabase Auth)

Supabase Auth automatycznie waliduje:
- Format email
- Siłę hasła (konfigurowalne w Supabase Dashboard)
- Rate limiting (konfigurowalne w Supabase Dashboard)

**Konfiguracja Supabase Auth (wymagana):**
- **Password Policy:**
  - Minimum length: 12 characters
  - Require uppercase: true
  - Require lowercase: true
  - Require numbers: true
  - Require special characters: true

**Rate Limiting (konfiguracja w Supabase):**
- Login attempts: 5 per 15 minutes per IP
- Registration attempts: 5 per 15 minutes per IP
- Password reset attempts: 5 per 15 minutes per IP

#### 3.3.2. Walidacja JWT tokenów (backend middleware)

**Plik:** `backend/middleware/auth.py` (istniejący)

**Funkcjonalność:**
- Dekodowanie JWT tokenu
- Walidacja sygnatury (Supabase JWT secret)
- Ekstrakcja `user_id` z payload (`sub` claim)
- Obsługa wygasłych tokenów

**Użycie:**
```python
from backend.middleware.auth import get_current_user

@app.get("/api/v1/queries")
async def get_queries(user_id: str = Depends(get_current_user)):
    # user_id jest automatycznie ekstrahowany z JWT
    pass
```

### 3.4. Obsługa wyjątków

#### 3.4.1. Wyjątki autentykacji (backend)

**Plik:** `backend/middleware/auth.py`

**Wyjątki:**
- `JWTError`: Nieprawidłowy lub wygasły token
- `HTTPException(401)`: Brak tokenu lub nieprawidłowy token

**Obsługa:**
```python
try:
    payload = decode_jwt(token)
    user_id = extract_user_id(payload)
except JWTError as e:
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"}
    )
```

#### 3.4.2. Error handlers (istniejące)

**Plik:** `backend/middleware/error_handlers.py` (jeśli istnieje)

**Obsługa błędów:**
- `401 Unauthorized`: Brak autentykacji
- `403 Forbidden`: Brak autoryzacji (opcjonalnie)
- `429 Too Many Requests`: Rate limiting (jeśli zaimplementowany w backendzie)

### 3.5. Aktualizacja renderowania stron server-side

#### 3.5.1. Astro SSR Configuration

**Plik:** `astro.config.mjs`

**Aktualna konfiguracja:**
```javascript
export default defineConfig({
  output: 'server', // SSR dla dynamicznych stron
  adapter: node({
    mode: 'standalone',
  }),
  // ...
});
```

**Uwagi:**
- Konfiguracja jest już poprawna dla SSR
- Middleware działa na poziomie Astro (przed renderowaniem)
- Sesja użytkownika jest dostępna w `context.locals.session`

#### 3.5.2. Server-side data fetching

**Przykład użycia w stronach Astro:**
```astro
---
// src/pages/app/chat.astro
import { supabaseClient } from '@/lib/supabase';

// Sesja jest już dostępna w context.locals.session (middleware)
const session = Astro.locals.session;

if (!session) {
  return Astro.redirect('/login', 302);
}

// Pobierz dane użytkownika (opcjonalnie)
const { data: user } = await supabaseClient.auth.getUser(session.access_token);
---
```

---

## 4. System autentykacji (Supabase Auth)

### 4.1. Konfiguracja Supabase Auth

#### 4.1.1. Environment Variables

**Frontend (.env):**
```bash
PUBLIC_SUPABASE_URL=http://localhost:8444  # lub URL produkcji
PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Backend (.env):**
```bash
SUPABASE_URL=http://localhost:8444  # lub URL produkcji
SUPABASE_SERVICE_KEY=your-service-role-key-here
SUPABASE_JWT_SECRET=your-jwt-secret-here
```

#### 4.1.2. Supabase Client Setup

**Frontend:**
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabaseClient = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);
```

**Backend:**
```python
# backend/db/supabase_client.py
from supabase import create_client, Client

supabase: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_KEY
)
```

### 4.2. Rejestracja użytkownika

#### 4.2.1. Przepływ rejestracji

1. **Frontend:** Użytkownik wypełnia formularz rejestracji
2. **Frontend:** Walidacja client-side (email, hasło, potwierdzenie hasła)
3. **Frontend:** Wywołanie `supabase.auth.signUp({ email, password })`
4. **Supabase Auth API:**
   - Walidacja danych (email format, password policy)
   - Hashowanie hasła (Bcrypt z unikalną solą)
   - Tworzenie użytkownika w `auth.users`
   - Generowanie JWT tokenu
   - Zwrócenie sesji (jeśli email verification wyłączone)
5. **Frontend:** Jeśli `data.session` istnieje:
   - Zapisanie sesji (localStorage/cookies przez Supabase SDK)
   - Przekierowanie do `/app?firstLogin=true`
6. **Frontend:** Jeśli błąd:
   - Wyświetlenie komunikatu błędu

#### 4.2.2. Konfiguracja Supabase (wymagana)

**W Supabase Dashboard:**
- **Authentication → Settings:**
  - `Enable email confirmations`: **OFF** (MVP nie wymaga weryfikacji email)
  - `Enable email change confirmations`: **OFF**
  - `Enable phone confirmations`: **OFF**

**Password Policy:**
- `Min password length`: 12
- `Require uppercase letters`: true
- `Require lowercase letters`: true
- `Require numbers`: true
- `Require special characters`: true

**Rate Limiting:**
- `Max signups per hour per IP`: 5
- `Max signups per hour`: 100 (opcjonalnie)

### 4.3. Logowanie użytkownika

#### 4.3.1. Przepływ logowania

1. **Frontend:** Użytkownik wypełnia formularz logowania
2. **Frontend:** Walidacja client-side (email, hasło)
3. **Frontend:** Wywołanie `supabase.auth.signInWithPassword({ email, password })`
4. **Supabase Auth API:**
   - Weryfikacja hasła (porównanie z hashem w bazie)
   - Generowanie JWT access token (15 minut)
   - Generowanie refresh token
   - Zwrócenie sesji
5. **Frontend:** Jeśli sukces:
   - Zapisanie sesji (localStorage/cookies przez Supabase SDK)
   - Przekierowanie do `/app` (lub `redirectTo`)
6. **Frontend:** Jeśli błąd:
   - Wyświetlenie ogólnego komunikatu błędu (brak enumeracji)

#### 4.3.2. Konfiguracja tokenów

**JWT Access Token:**
- **Czas życia:** 15 minut (konfigurowalne w Supabase)
- **Przechowywanie:** localStorage (Supabase SDK)
- **Użycie:** W headerze `Authorization: Bearer {token}`

**Refresh Token:**
- **Czas życia:** 7 dni (konfigurowalne w Supabase)
- **Przechowywanie:** HttpOnly cookie (Secure, SameSite) - **WYMAGANE**
- **Użycie:** Automatyczne odświeżanie przez Supabase SDK

**Konfiguracja w Supabase Dashboard:**
- **Authentication → Settings → JWT Settings:**
  - `JWT expiry`: 900 seconds (15 minut)
  - `Refresh token rotation`: Enabled (zalecane)
  - `Refresh token expiry`: 604800 seconds (7 dni)

**Konfiguracja cookies (wymagana):**
```typescript
// src/lib/supabase.ts
export const supabaseClient = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: typeof window !== 'undefined' 
        ? window.localStorage 
        : undefined,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      // Cookies dla refresh token (wymagane)
      storageKey: 'supabase.auth.token',
    },
  }
);
```

**UWAGA:** Supabase SDK domyślnie używa localStorage. Aby użyć HttpOnly cookies dla refresh token, wymagana jest dodatkowa konfiguracja lub użycie Supabase Auth Helpers.

### 4.4. Wylogowywanie użytkownika

#### 4.4.1. Przepływ wylogowania

1. **Frontend:** Użytkownik klika przycisk wylogowania
2. **Frontend:** Wywołanie `supabase.auth.signOut()`
3. **Supabase Auth API:**
   - Unieważnienie refresh token po stronie serwera
   - Usunięcie sesji z localStorage/cookies
4. **Frontend:** Przekierowanie do `/login`

**Implementacja:**
```typescript
const handleLogout = async () => {
  const { error } = await supabaseClient.auth.signOut();
  
  if (error) {
    console.error('Logout error:', error);
    // Wyświetlenie komunikatu błędu (opcjonalnie)
  } else {
    window.location.href = '/login';
  }
};
```

### 4.5. Odzyskiwanie hasła

#### 4.5.1. Przepływ odzyskiwania hasła

**Krok 1: Żądanie resetu hasła**

1. **Frontend:** Użytkownik wypełnia formularz na `/forgot-password`
2. **Frontend:** Walidacja email
3. **Frontend:** Wywołanie `supabase.auth.resetPasswordForEmail(email, { redirectTo })`
4. **Supabase Auth API:**
   - Generowanie unikalnego tokenu resetującego hasło
   - Wysłanie emaila z linkiem resetującym
   - Ważność tokenu: 15-30 minut (konfigurowalne)
5. **Frontend:** Wyświetlenie komunikatu sukcesu (nawet jeśli email nie istnieje - zapobieganie enumeracji)

**Implementacja:**
```typescript
const { error } = await supabaseClient.auth.resetPasswordForEmail(
  formData.email.trim(),
  {
    redirectTo: `${window.location.origin}/reset-password`,
  }
);

// Zawsze wyświetl komunikat sukcesu (nawet jeśli email nie istnieje)
setIsSuccess(true);
```

**Krok 2: Reset hasła**

1. **Frontend:** Użytkownik otwiera link z emaila (`/reset-password?token=...`)
2. **Frontend:** Komponent odczytuje token z URL
3. **Frontend:** Użytkownik wprowadza nowe hasło
4. **Frontend:** Walidacja client-side (hasło zgodne z PRD)
5. **Frontend:** Wywołanie `supabase.auth.updateUser({ password })`
6. **Supabase Auth API:**
   - Weryfikacja tokenu resetującego
   - Hashowanie nowego hasła
   - Aktualizacja hasła w bazie
   - Unieważnienie wszystkich innych sesji użytkownika (automatycznie)
7. **Frontend:** Jeśli sukces:
   - Przekierowanie do `/login?passwordReset=true`
8. **Frontend:** Jeśli błąd:
   - Wyświetlenie komunikatu błędu

**Implementacja:**
```typescript
// Token jest automatycznie odczytywany z URL przez Supabase SDK
// (jeśli redirectTo zawiera token w hash)
const { error } = await supabaseClient.auth.updateUser({
  password: formData.password,
});
```

#### 4.5.2. Konfiguracja email templates (Supabase)

**W Supabase Dashboard:**
- **Authentication → Email Templates:**
  - `Reset Password`: Dostosuj template emaila
  - Link resetujący: `{{ .ConfirmationURL }}`

**Konfiguracja ważności tokenu:**
- **Authentication → Settings:**
  - `Password reset token expiry`: 1800 seconds (30 minut) - zalecane

### 4.6. Zarządzanie sesją

#### 4.6.1. Odświeżanie tokenu

**Automatyczne odświeżanie (Supabase SDK):**
- Supabase SDK automatycznie odświeża access token przed wygaśnięciem
- Używa refresh token z HttpOnly cookie
- Przezroczyste dla aplikacji

**Ręczne odświeżanie (jeśli wymagane):**
```typescript
const { data: { session }, error } = await supabaseClient.auth.refreshSession();

if (error || !session) {
  // Sesja wygasła - przekieruj do logowania
  window.location.href = '/login?expired=true';
}
```

#### 4.6.2. Sprawdzanie sesji

**Frontend:**
```typescript
const { data: { session } } = await supabaseClient.auth.getSession();

if (session) {
  // Użytkownik jest zalogowany
  const userId = session.user.id;
  const accessToken = session.access_token;
}
```

**Backend (middleware):**
```python
# backend/middleware/auth.py
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    token = credentials.credentials
    payload = decode_jwt(token)  # Walidacja JWT
    user_id = extract_user_id(payload)
    return user_id
```

### 4.7. Ochrona przed atakami

#### 4.7.1. Rate Limiting

**Supabase Auth (automatyczne):**
- Login attempts: 5 per 15 minutes per IP
- Registration attempts: 5 per 15 minutes per IP
- Password reset attempts: 5 per 15 minutes per IP

**Konfiguracja w Supabase Dashboard:**
- **Authentication → Settings → Rate Limits:**
  - `Max sign in attempts per hour per IP`: 5
  - `Max sign up attempts per hour per IP`: 5
  - `Max password reset attempts per hour per IP`: 5

**Backend (opcjonalnie, dodatkowa warstwa):**
- Rate limiting middleware w FastAPI (jeśli wymagane)
- Użycie Redis lub in-memory store

#### 4.7.2. Zapobieganie enumeracji użytkowników

**Zasady:**
- Ogólne komunikaty błędów (nie ujawniamy, czy email istnieje)
- Komunikat sukcesu dla resetu hasła (nawet jeśli email nie istnieje)

**Implementacja:**
```typescript
// Logowanie
if (error) {
  // Zawsze ogólny komunikat
  setErrors({ general: 'Nieprawidłowy email lub hasło' });
}

// Rejestracja
if (error && error.message.includes('already registered')) {
  // Ogólny komunikat (nie ujawniamy, że email istnieje)
  setErrors({ general: 'Nie można utworzyć konta' });
}

// Reset hasła
// Zawsze wyświetl komunikat sukcesu
setIsSuccess(true);
```

#### 4.7.3. CSRF Protection

**Supabase Auth (automatyczne):**
- Supabase Auth domyślnie obsługuje CSRF protection dla sesji
- Używa SameSite cookies

**Konfiguracja:**
- Cookies: `SameSite=Strict` (lub `Lax` dla cross-site)
- Secure flag: Wymagane w produkcji (HTTPS)

#### 4.7.4. XSS Protection

**Frontend:**
- React automatycznie escapuje dane użytkownika
- Sanityzacja danych wejściowych (opcjonalnie, dodatkowa warstwa)

**Cookies:**
- HttpOnly flag dla refresh token (zapobiega dostępowi przez JavaScript)
- Secure flag w produkcji (HTTPS)

---

## 5. Integracja z istniejącą aplikacją

### 5.1. Kompatybilność z istniejącymi komponentami

#### 5.1.1. LoginForm i RegisterForm

**Status:** Istniejące komponenty wymagają minimalnych zmian:
- ✅ Podstawowa funkcjonalność jest już zaimplementowana
- ⚠️ Walidacja hasła zgodna z PRD (minimum 12 znaków zamiast 8)
- ✅ Komunikaty błędów zgodne z wymaganiami (brak enumeracji)

#### 5.1.2. Middleware

**Status:** Istniejący middleware wymaga rozszerzenia:
- ✅ Podstawowa funkcjonalność jest już zaimplementowana
- ⚠️ Obsługa przekierowań dla `/forgot-password` i `/reset-password`

#### 5.1.3. API Client

**Status:** Istniejący API client obsługuje autentykację:
- ✅ Automatyczne dodawanie JWT tokenu do requestów
- ✅ Obsługa 401 Unauthorized z próbą odświeżenia tokenu
- ✅ Przekierowanie do `/login?expired=true` przy wygasłej sesji

### 5.2. Nowe komponenty do utworzenia

#### 5.2.1. ForgotPasswordForm

**Plik:** `src/components/auth/ForgotPasswordForm.tsx` (NOWY)

**Zależności:**
- `@/lib/supabase` - Supabase client
- `@/components/ui/input` - Shadcn/ui Input
- `@/components/ui/button` - Shadcn/ui Button
- `@/components/ui/alert` - Shadcn/ui Alert

**Funkcjonalność:**
- Formularz z polem email
- Wysyłka linku resetującego hasło
- Komunikat sukcesu
- Link powrotu do logowania

#### 5.2.2. ResetPasswordForm

**Plik:** `src/components/auth/ResetPasswordForm.tsx` (NOWY)

**Zależności:**
- `@/lib/supabase` - Supabase client
- `@/components/ui/input` - Shadcn/ui Input
- `@/components/ui/button` - Shadcn/ui Button
- `@/components/ui/alert` - Shadcn/ui Alert
- `@/components/auth/PasswordStrengthIndicator` - Wskaźnik siły hasła (istniejący)

**Funkcjonalność:**
- Formularz resetu hasła (hasło, potwierdzenie hasła)
- Walidacja tokenu z URL
- Wskaźnik siły hasła
- Przekierowanie do logowania po sukcesie

#### 5.2.3. Nowe strony Astro

**Plik:** `src/pages/forgot-password.astro` (NOWY)
**Plik:** `src/pages/reset-password.astro` (NOWY)

### 5.3. Aktualizacje istniejących plików

#### 5.3.1. Middleware

**Plik:** `src/middleware/index.ts`

**Wymagane zmiany:**
- Dodanie obsługi przekierowań dla `/forgot-password`
- Obsługa `/reset-password` (dozwolone dla wszystkich z tokenem)

#### 5.3.2. RegisterForm

**Plik:** `src/components/auth/RegisterForm.tsx`

**Wymagane zmiany:**
- Aktualizacja walidacji hasła: minimum 12 znaków zamiast 8
- Dodanie walidacji: małe/duże litery, cyfry, znaki specjalne

#### 5.3.3. LoginForm

**Plik:** `src/components/auth/LoginForm.tsx`

**Wymagane zmiany:**
- Dodanie linku do `/forgot-password` (można dodać w `login.astro` zamiast w komponencie)

---

## 6. Testowanie

### 6.1. Scenariusze testowe

#### 6.1.1. Rejestracja

1. **Sukces:**
   - Wypełnienie formularza prawidłowymi danymi
   - Sprawdzenie automatycznego logowania
   - Sprawdzenie przekierowania do `/app?firstLogin=true`

2. **Błędy:**
   - Email już zarejestrowany → ogólny komunikat błędu
   - Słabe hasło → komunikat o wymaganiach hasła
   - Rate limiting → komunikat o zbyt wielu próbach

#### 6.1.2. Logowanie

1. **Sukces:**
   - Wypełnienie formularza prawidłowymi danymi
   - Sprawdzenie zapisania sesji
   - Sprawdzenie przekierowania do `/app`

2. **Błędy:**
   - Nieprawidłowy email/hasło → ogólny komunikat błędu
   - Rate limiting → komunikat o zbyt wielu próbach
   - Wygasła sesja → komunikat o wygasłej sesji

#### 6.1.3. Odzyskiwanie hasła

1. **Żądanie resetu:**
   - Wypełnienie formularza z prawidłowym emailem
   - Sprawdzenie wysłania emaila
   - Sprawdzenie komunikatu sukcesu (nawet jeśli email nie istnieje)

2. **Reset hasła:**
   - Otwarcie linku z emaila
   - Wypełnienie formularza nowym hasłem
   - Sprawdzenie zmiany hasła
   - Sprawdzenie przekierowania do logowania

#### 6.1.4. Wylogowanie

1. **Sukces:**
   - Kliknięcie przycisku wylogowania
   - Sprawdzenie unieważnienia sesji
   - Sprawdzenie przekierowania do `/login`

#### 6.1.5. Ochrona przed atakami

1. **Rate limiting:**
   - 5 nieudanych prób logowania → blokada na 15 minut
   - 5 prób rejestracji → blokada na 15 minut

2. **Enumeracja użytkowników:**
   - Nieprawidłowy email przy logowaniu → ogólny komunikat
   - Nieistniejący email przy resetowaniu hasła → komunikat sukcesu

---

## 7. Wnioski i rekomendacje

### 7.1. Kluczowe komponenty

**Frontend:**
- `LoginForm` (istniejący, wymaga minimalnych zmian)
- `RegisterForm` (istniejący, wymaga aktualizacji walidacji hasła)
- `ForgotPasswordForm` (NOWY)
- `ResetPasswordForm` (NOWY)
- `src/pages/forgot-password.astro` (NOWY)
- `src/pages/reset-password.astro` (NOWY)
- `src/middleware/index.ts` (istniejący, wymaga rozszerzenia)

**Backend:**
- `backend/middleware/auth.py` (istniejący, bez zmian)
- Konfiguracja Supabase Auth (wymagana w Dashboard)

### 7.2. Priorytety implementacji

1. **Wysoki priorytet:**
   - Utworzenie `ForgotPasswordForm` i `ResetPasswordForm`
   - Utworzenie stron `/forgot-password` i `/reset-password`
   - Aktualizacja walidacji hasła w `RegisterForm` (minimum 12 znaków)
   - Rozszerzenie middleware o obsługę nowych stron

2. **Średni priorytet:**
   - Konfiguracja Supabase Auth (password policy, rate limiting)
   - Testowanie scenariuszy odzyskiwania hasła
   - Optymalizacja komunikatów błędów

3. **Niski priorytet:**
   - Obsługa MFA/2FA (opcjonalnie, jeśli wymagane w przyszłości)
   - Dodatkowe endpointy backendowe (jeśli wymagane)

### 7.3. Uwagi implementacyjne

1. **Supabase Auth SDK:**
   - Większość funkcjonalności jest obsługiwana przez Supabase Auth SDK
   - Minimalna integracja z backendem FastAPI (tylko weryfikacja JWT)

2. **Bezpieczeństwo:**
   - HttpOnly cookies dla refresh token (wymagane)
   - Rate limiting przez Supabase Auth (automatyczne)
   - Ogólne komunikaty błędów (zapobieganie enumeracji)

3. **UX:**
   - Przyjazne komunikaty błędów w języku polskim
   - Loading states podczas operacji
   - Automatyczne przekierowania po sukcesie

4. **Testowanie:**
   - Testy jednostkowe dla komponentów React
   - Testy integracyjne dla przepływów autentykacji
   - Testy bezpieczeństwa (rate limiting, enumeracja)

---

## 8. Załączniki

### 8.1. Diagramy przepływu

**Przepływ rejestracji:**
```
Użytkownik → RegisterForm → Supabase Auth API → Sesja → Przekierowanie do /app
```

**Przepływ logowania:**
```
Użytkownik → LoginForm → Supabase Auth API → Sesja → Przekierowanie do /app
```

**Przepływ odzyskiwania hasła:**
```
Użytkownik → ForgotPasswordForm → Supabase Auth API → Email → ResetPasswordForm → Supabase Auth API → Przekierowanie do /login
```

### 8.2. Referencje

- **Supabase Auth Documentation:** https://supabase.com/docs/guides/auth
- **Astro Middleware:** https://docs.astro.build/en/guides/middleware/
- **React Islands:** https://docs.astro.build/en/guides/integrations-guide/react/
- **PRD:** `.ai/prd.md` (US-001, US-002)
- **Tech Stack:** `.ai/tech-stack.md`

---

**Koniec specyfikacji**
