# Sesja: Implementacja signup z weryfikacją email

**Data:** 2025-12-12  
**Czas:** 00:41  
**Asystent:** Auto (Cursor AI)

---

## 📋 Cel sesji

Implementacja backendu dla strony `signup.astro` i komponentu `SignupForm.tsx` z obsługą weryfikacji email przez Supabase. Logika powinna być spójna z `login.astro` i `LoginForm.tsx`. Po rejestracji użytkownik otrzymuje link do potwierdzenia konta.

---

## 🎯 Wykonane zadania

### 1. Utworzenie strony signup.astro

**Lokalizacja:** `src/pages/signup.astro`

**Funkcjonalność:**
- ✅ Strona rejestracji z formularzem SignupForm
- ✅ Komunikat informujący o wysłaniu linku weryfikacyjnego (gdy `emailSent=true`)
- ✅ Link do logowania dla użytkowników, którzy już mają konto
- ✅ Spójny design z `login.astro`

**Implementacja:**
```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { SignupForm } from '../components/auth/SignupForm';

const url = Astro.url;
const redirectTo = url.searchParams.get('redirect_to') || '/app';
const emailSent = url.searchParams.get('emailSent') === 'true';
---

<BaseLayout title="Rejestracja - PrawnikGPT">
  <main class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
      <h1 class="text-3xl font-bold text-gray-900 mb-6 text-center">
        Rejestracja
      </h1>
      <p class="text-gray-600 mb-8 text-center">
        Utwórz konto, aby rozpocząć korzystanie z PrawnikGPT
      </p>
      
      {emailSent && (
        <div class="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p class="text-sm text-blue-800 text-center">
            Link do potwierdzenia konta został wysłany na Twój adres email. 
            Sprawdź skrzynkę pocztową i kliknij link, aby aktywować konto.
          </p>
        </div>
      )}
      
      <SignupForm client:load redirectTo={redirectTo} showEmailSentMessage={emailSent} />
      
      <p class="mt-6 text-center text-sm text-gray-600">
        Masz już konto?{' '}
        <a href="/login" class="text-blue-600 hover:text-blue-700 font-medium">
          Zaloguj się
        </a>
      </p>
    </div>
  </main>
</BaseLayout>
```

### 2. Utworzenie komponentu SignupForm.tsx

**Lokalizacja:** `src/components/auth/SignupForm.tsx`

**Funkcjonalność:**
- ✅ Formularz rejestracji z polami: email, hasło, potwierdzenie hasła, akceptacja regulaminu
- ✅ Walidacja email (format regex)
- ✅ Walidacja hasła zgodnie z PRD (min. 12 znaków, małe/duże litery, cyfry, znaki specjalne)
- ✅ Wskaźnik siły hasła (PasswordStrengthIndicator)
- ✅ Toggle widoczności hasła dla obu pól
- ✅ Obsługa weryfikacji email - komunikat po wysłaniu linku
- ✅ Auto-focus na polu email
- ✅ Loading states i obsługa błędów
- ✅ Pełna dostępność (ARIA labels, keyboard navigation)

**Walidacja hasła (PRD):**
```typescript
function validatePasswordStrength(password: string): { isValid: boolean; error?: string } {
  if (password.length < 12) {
    return { isValid: false, error: 'Hasło musi mieć minimum 12 znaków' };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Hasło musi zawierać co najmniej jedną małą literę' };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Hasło musi zawierać co najmniej jedną dużą literę' };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Hasło musi zawierać co najmniej jedną cyfrę' };
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    return { isValid: false, error: 'Hasło musi zawierać co najmniej jeden znak specjalny' };
  }
  return { isValid: true };
}
```

**Obsługa sukcesu (weryfikacja email):**
```typescript
// Success: email verification link has been sent
// Show success message and redirect to signup page with emailSent parameter
setEmailSent(true);
window.location.href = `/signup?emailSent=true&redirect_to=${encodeURIComponent(redirectTo)}`;
```

**Komunikat sukcesu:**
Po pomyślnej rejestracji użytkownik widzi komunikat:
```
Link do potwierdzenia konta został wysłany!
Sprawdź skrzynkę pocztową na adresie [email] i kliknij link, aby aktywować konto.
Po potwierdzeniu konta będziesz mógł się zalogować.
```

### 3. Utworzenie endpointu API /api/auth/signup.ts

**Lokalizacja:** `src/pages/api/auth/signup.ts`

**Funkcjonalność:**
- ✅ Rejestracja użytkownika przez Supabase Auth
- ✅ Włączona weryfikacja email (`emailRedirectTo`)
- ✅ Mapowanie błędów na komunikaty po polsku
- ✅ Zabezpieczenie przed enumeracją użytkowników (generic error messages)
- ✅ Obsługa błędów sieciowych i walidacji

**Implementacja:**
```typescript
// Get the origin URL for email redirect (confirmation link)
const origin = request.headers.get('origin') || `${url.protocol}//${url.host}`;
const emailRedirectTo = `${origin}/login?emailConfirmed=true`;

// Sign up new user with email verification enabled
const { data, error } = await supabase.auth.signUp({
  email: email.trim(),
  password,
  options: {
    emailRedirectTo, // URL to redirect after email confirmation
  },
});
```

**Mapowanie błędów:**
- `User already registered` → `"Nie można utworzyć konta"` (generic, no enumeration)
- `Password should be at least` → `"Hasło jest zbyt słabe. Minimum 12 znaków..."`
- `Invalid email` → `"Podaj prawidłowy adres email"`
- `Too many requests` → `"Zbyt wiele prób. Spróbuj ponownie za chwilę."`
- Network errors → `"Wystąpił problem z połączeniem. Spróbuj ponownie."`

**Odpowiedź sukcesu:**
```json
{
  "user": { "id": "...", "email": "..." },
  "message": "Link do potwierdzenia konta został wysłany na Twój adres email. Sprawdź skrzynkę pocztową i kliknij link, aby aktywować konto."
}
```

**Uwaga:** W Supabase, gdy weryfikacja email jest włączona, `session` jest `null` do momentu potwierdzenia email przez użytkownika.

### 4. Aktualizacja middleware

**Lokalizacja:** `src/middleware/index.ts`

**Zmiany:**
- ✅ Dodano `/signup` do `PUBLIC_PATHS`
- ✅ Dodano `/api/auth/signup` do `AUTH_API_PATHS`
- ✅ Zaktualizowano logikę przekierowań dla zalogowanych użytkowników (dodano `/signup` do listy stron, z których zalogowani są przekierowywani)

**Implementacja:**
```typescript
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/signup',  // Dodane
  '/forgot-password',
  '/reset-password',
];

const AUTH_API_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/signup',  // Dodane
  '/api/auth/logout',
  '/api/auth/refresh',
];

// Redirect logged-in users away from login/register/signup/forgot-password pages
if (user && ['/login', '/register', '/signup', '/forgot-password'].includes(pathname)) {
  return context.redirect('/app/chat', 302);
}
```

---

## 🔧 Zgodność z zasadami projektu

### Supabase Auth Guidelines (`.ai/supabase-auth.mdc`)
- ✅ Użycie `createSupabaseServerClient` z `@supabase/ssr`
- ✅ Właściwe zarządzanie cookies (HttpOnly)
- ✅ Weryfikacja email przez `emailRedirectTo`
- ✅ Spójna logika z `login.astro` i `LoginForm.tsx`

### Code Quality
- ✅ TypeScript type safety
- ✅ Walidacja po stronie klienta i serwera
- ✅ Obsługa błędów z user-friendly messages
- ✅ Guard clauses i wczesne zwracanie
- ✅ Zgodność z konwencjami nazewnictwa

### Security
- ✅ Zabezpieczenie przed enumeracją użytkowników (generic error messages)
- ✅ Walidacja hasła zgodnie z PRD (min. 12 znaków, złożoność)
- ✅ HttpOnly cookies dla sesji
- ✅ Bezpieczne przekierowania (`emailRedirectTo`)

### Accessibility
- ✅ ARIA labels dla wszystkich interaktywnych elementów
- ✅ Keyboard navigation support
- ✅ Screen reader friendly messages
- ✅ Proper focus management

---

## 📝 Szczegóły techniczne

### Przepływ rejestracji z weryfikacją email

**Scenariusz 1: Pomyślna rejestracja**
```
1. Użytkownik wypełnia formularz signup (email, hasło, potwierdzenie, akceptacja regulaminu)
2. Walidacja po stronie klienta (format email, siła hasła, zgodność haseł)
3. Wywołanie POST /api/auth/signup
4. Supabase Auth tworzy użytkownika i wysyła email weryfikacyjny
5. API zwraca sukces (session = null, bo email nie jest jeszcze zweryfikowany)
6. Frontend przekierowuje do /signup?emailSent=true
7. Użytkownik widzi komunikat o wysłaniu linku weryfikacyjnego
8. Użytkownik klika link w emailu → przekierowanie do /login?emailConfirmed=true
9. Po zalogowaniu użytkownik może korzystać z aplikacji
```

**Scenariusz 2: Błąd rejestracji**
```
1. Użytkownik wypełnia formularz z błędnymi danymi
2. Walidacja po stronie klienta wykrywa błąd → wyświetlenie komunikatu
3. Lub walidacja po stronie serwera (Supabase) → mapowanie błędu na komunikat po polsku
4. Użytkownik widzi komunikat błędu i może poprawić dane
```

### Różnice między /register a /signup

**/api/auth/register:**
- Weryfikacja email wyłączona (`emailRedirectTo: undefined`)
- Automatyczne logowanie po rejestracji (session jest tworzona od razu)
- Używane w MVP bez weryfikacji email

**/api/auth/signup:**
- Weryfikacja email włączona (`emailRedirectTo: "${origin}/login?emailConfirmed=true"`)
- Brak automatycznego logowania (session = null do momentu potwierdzenia email)
- Użytkownik musi kliknąć link w emailu przed zalogowaniem
- Używane gdy weryfikacja email jest wymagana

### Konfiguracja Supabase

**Wymagane ustawienia w `supabase/config.toml`:**
```toml
[auth.email]
enable_confirmations = true  # Włącza weryfikację email
```

**Domyślnie w projekcie:**
```toml
enable_confirmations = false  # MVP bez weryfikacji
```

**Uwaga:** Aby endpoint `/api/auth/signup` działał poprawnie, należy włączyć `enable_confirmations = true` w konfiguracji Supabase.

---

## ✅ Weryfikacja implementacji

### Sprawdzenie kodu
- ✅ Brak błędów lintowania (poza istniejącym błędem w middleware/index.ts - niezwiązany z tą implementacją)
- ✅ TypeScript type safety
- ✅ Zgodność z konwencjami nazewnictwa
- ✅ Zgodność z zasadami projektu
- ✅ Komentarze w kodzie

### Testy manualne (do wykonania)
- [ ] Rejestracja nowego użytkownika → sprawdzenie czy email weryfikacyjny został wysłany
- [ ] Kliknięcie linku w emailu → sprawdzenie czy przekierowanie do `/login?emailConfirmed=true` działa
- [ ] Próba logowania przed weryfikacją email → sprawdzenie czy użytkownik nie może się zalogować
- [ ] Logowanie po weryfikacji email → sprawdzenie czy użytkownik może się zalogować
- [ ] Walidacja formularza (email, hasło, potwierdzenie hasła, akceptacja regulaminu)
- [ ] Obsługa błędów (duplikat email, słabe hasło, błędy sieciowe)
- [ ] Sprawdzenie czy zalogowani użytkownicy są przekierowywani z `/signup` do `/app/chat`

---

## 🔄 Następne kroki (opcjonalne)

1. **Konfiguracja Supabase:**
   - Włączenie `enable_confirmations = true` w `supabase/config.toml`
   - Konfiguracja SMTP dla wysyłki emaili (produkcja)
   - Dostosowanie szablonów emaili weryfikacyjnych

2. **Obsługa emailConfirmed w login:**
   - Dodanie komunikatu sukcesu w `login.astro` gdy `emailConfirmed=true`
   - Informowanie użytkownika o pomyślnym potwierdzeniu konta

3. **Testy automatyczne:**
   - Test endpointu `/api/auth/signup` (sukces, błędy walidacji, błędy Supabase)
   - Test komponentu `SignupForm` (walidacja, obsługa błędów, sukces)
   - Test middleware dla `/signup` (publiczna ścieżka, przekierowania)

4. **Ulepszenia UX:**
   - Możliwość ponownego wysłania emaila weryfikacyjnego
   - Informacja o czasie ważności linku weryfikacyjnego
   - Spinner podczas oczekiwania na odpowiedź API

---

## 📚 Powiązane pliki

- `src/pages/signup.astro` - Strona rejestracji
- `src/components/auth/SignupForm.tsx` - Komponent formularza rejestracji
- `src/pages/api/auth/signup.ts` - Endpoint API rejestracji z weryfikacją email
- `src/middleware/index.ts` - Middleware z obsługą `/signup`
- `src/components/auth/PasswordStrengthIndicator.tsx` - Wskaźnik siły hasła
- `src/pages/login.astro` - Strona logowania (referencja)
- `src/components/auth/LoginForm.tsx` - Komponent formularza logowania (referencja)
- `.ai/supabase-auth.mdc` - Instrukcje autoryzacji Supabase

---

## 💡 Uwagi i obserwacje

### Spójność z istniejącym kodem
Implementacja jest w pełni spójna z `login.astro` i `LoginForm.tsx`:
- Podobna struktura strony (BaseLayout, podobny layout)
- Podobna struktura komponentu (walidacja, obsługa błędów, loading states)
- Podobne mapowanie błędów Supabase
- Podobna obsługa dostępności (ARIA labels, keyboard navigation)

### Weryfikacja email
- Supabase automatycznie wysyła email weryfikacyjny po rejestracji (gdy `enable_confirmations = true`)
- Link weryfikacyjny przekierowuje do `/login?emailConfirmed=true` po potwierdzeniu
- Użytkownik nie może się zalogować przed potwierdzeniem email (session = null)
- To zapewnia dodatkowe bezpieczeństwo i weryfikację prawdziwości adresu email

### Różnice między /register a /signup
Projekt ma teraz dwie ścieżki rejestracji:
- `/register` - bez weryfikacji email (MVP, automatyczne logowanie)
- `/signup` - z weryfikacją email (wymaga potwierdzenia przed logowaniem)

To pozwala na elastyczność w zależności od wymagań biznesowych.

### Bezpieczeństwo
- Zabezpieczenie przed enumeracją użytkowników (generic error messages)
- Walidacja hasła zgodnie z PRD (min. 12 znaków, złożoność)
- HttpOnly cookies dla sesji (ochrona przed XSS)
- Bezpieczne przekierowania (`emailRedirectTo`)

---

**Status:** ✅ Zakończone  
**Czas trwania:** ~30 minut
