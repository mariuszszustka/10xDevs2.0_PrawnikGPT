# Plan implementacji widoku Register Page

## 1. Przegląd

Widok Register Page (Strona rejestracji) umożliwia nowym użytkownikom utworzenie konta w aplikacji PrawnikGPT. Widok składa się z formularza rejestracji z walidacją po stronie klienta i integracją z Supabase Auth SDK. Po pomyślnej rejestracji użytkownik jest automatycznie logowany i przekierowywany do aplikacji.

**Główne funkcjonalności:**
- Formularz rejestracji z polami: email, hasło, potwierdzenie hasła
- Checkbox akceptacji regulaminu (wymagany)
- Walidacja hasła w czasie rzeczywistym (minimum 8 znaków)
- Wskaźnik siły hasła (opcjonalny)
- Sprawdzanie zgodności haseł
- Toggle widoczności hasła
- Auto-login po rejestracji
- Obsługa błędów z Supabase Auth

**Stack technologiczny:**
- Astro 5 (SSR) dla strony
- React 19 (React island) dla formularza
- Supabase Auth SDK (client-side)
- React Hook Form + Zod (walidacja)
- Tailwind CSS + Shadcn/ui (styling)

## 2. Routing widoku

**Ścieżka:** `/register`

**Plik:** `src/pages/register.astro`

**Autentykacja:** Nie wymagana (widok publiczny)

**Middleware:** Brak (widok dostępny dla wszystkich)

**Redirect logic:** Jeśli użytkownik jest już zalogowany, można opcjonalnie przekierować do `/app` (implementacja opcjonalna w MVP)

## 3. Struktura komponentów

```
register.astro (Astro page)
└── BaseLayout.astro (Layout wrapper)
    └── RegisterForm.tsx (React island, client:load)
        ├── Input (email)
        ├── Input (password) + Eye/EyeOff toggle
        ├── Input (passwordConfirm) + Eye/EyeOff toggle
        ├── PasswordStrengthIndicator (opcjonalny)
        ├── Checkbox (acceptTerms)
        ├── Button (submit)
        ├── Alert (errors.general)
        └── Link (do /login)
```

**Hierarchia:**
1. **register.astro** - Strona Astro z podstawową strukturą HTML
2. **BaseLayout.astro** - Layout z meta tags i podstawową strukturą HTML
3. **RegisterForm.tsx** - Główny komponent React z logiką formularza

## 4. Szczegóły komponentów

### register.astro

**Opis komponentu:** Strona Astro renderująca widok rejestracji. Zawiera podstawową strukturę HTML i importuje komponent React jako island.

**Główne elementy:**
- `<BaseLayout>` - Wrapper z meta tags
- `<main>` - Kontener głównej treści
- `<RegisterForm client:load />` - React island z formularzem

**Obsługiwane zdarzenia:** Brak (statyczna struktura)

**Warunki walidacji:** Brak (walidacja w komponencie React)

**Typy:** Brak (komponent Astro)

**Props:** Brak

### RegisterForm.tsx

**Opis komponentu:** Główny komponent React zawierający formularz rejestracji z pełną walidacją, integracją z Supabase Auth i obsługą błędów. Komponent jest renderowany jako React island (`client:load`).

**Główne elementy:**
- `<form>` - Formularz HTML z `onSubmit` handler
- `<Input>` (Shadcn/ui) - Pole email z walidacją
- `<Input>` (Shadcn/ui) - Pole hasła z toggle widoczności
- `<Input>` (Shadcn/ui) - Pole potwierdzenia hasła z toggle widoczności
- `<PasswordStrengthIndicator>` (opcjonalny) - Wskaźnik siły hasła
- `<Checkbox>` (Shadcn/ui) - Checkbox akceptacji regulaminu
- `<Button>` (Shadcn/ui) - Przycisk submit z loading state
- `<Alert>` (Shadcn/ui) - Komunikat ogólnego błędu
- `<Link>` - Link do strony logowania

**Obsługiwane zdarzenia:**
- `onSubmit` - Wysyłanie formularza (z `preventDefault()`)
- `onChange` - Aktualizacja wartości pól i walidacja w czasie rzeczywistym
- `onBlur` - Walidacja po opuszczeniu pola (opcjonalnie)
- `onClick` - Toggle widoczności hasła (dla obu pól hasła)
- `onFocus` - Auto-focus na pole email przy mount

**Obsługiwana walidacja:**

**Client-side (przed wysłaniem):**
1. **Email:**
   - Format email: regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` lub HTML5 `type="email"`
   - Pole wymagane: `email.trim().length > 0`
   - Komunikat: `"Podaj prawidłowy adres email"` lub `"Email jest wymagany"`

2. **Hasło:**
   - Minimum 8 znaków: `password.length >= 8`
   - Pole wymagane: `password.length > 0`
   - Komunikat: `"Hasło musi mieć minimum 8 znaków"` lub `"Hasło jest wymagane"`

3. **Potwierdzenie hasła:**
   - Zgodność z hasłem: `passwordConfirm === password`
   - Pole wymagane: `passwordConfirm.length > 0`
   - Komunikat: `"Hasła nie są zgodne"` lub `"Potwierdzenie hasła jest wymagane"`

4. **Akceptacja regulaminu:**
   - Checkbox musi być zaznaczony: `acceptTerms === true`
   - Komunikat: `"Musisz zaakceptować regulamin"`

**Server-side (Supabase Auth):**
1. **Email zajęty:**
   - Błąd: `"User already registered"`
   - Komunikat użytkownika: `"Ten adres email jest już zarejestrowany"`

2. **Słabe hasło:**
   - Błąd: `"Password should be at least 6 characters"` (Supabase domyślnie)
   - Komunikat użytkownika: `"Hasło jest zbyt słabe"`

3. **Rate limiting:**
   - Błąd: `"Too many requests"`
   - Komunikat użytkownika: `"Zbyt wiele prób. Spróbuj ponownie za chwilę"`

**Typy:**
- `RegisterFormData` - Dane formularza
- `RegisterFormErrors` - Błędy walidacji
- `RegisterFormProps` - Propsy komponentu
- `PasswordStrength` - Typ siły hasła (opcjonalny)

**Props:**
- `redirectTo?: string` - URL do przekierowania po rejestracji (domyślnie `/app?firstLogin=true`)

**Stan komponentu:**
- `formData: RegisterFormData` - Wartości pól formularza
- `errors: RegisterFormErrors` - Komunikaty błędów walidacji
- `isLoading: boolean` - Stan ładowania podczas rejestracji
- `showPassword: boolean` - Widoczność hasła (pierwsze pole)
- `showPasswordConfirm: boolean` - Widoczność potwierdzenia hasła (drugie pole)
- `passwordStrength: PasswordStrength` - Siła hasła (opcjonalny)

**Hooki:**
- `useState` - Zarządzanie stanem formularza, błędów, loading, showPassword
- `useEffect` - Auto-focus na pole email przy mount
- `useCallback` - Memoizacja funkcji submit, onChange, toggle
- `useRef` - Referencja do inputa email dla auto-focus

## 5. Typy

### RegisterFormData

**Opis:** DTO reprezentujący dane formularza rejestracji.

**Pola:**
- `email: string` - Adres email użytkownika (wymagany, format email)
- `password: string` - Hasło użytkownika (wymagane, minimum 8 znaków)
- `passwordConfirm: string` - Potwierdzenie hasła (wymagane, musi być zgodne z hasłem)
- `acceptTerms: boolean` - Akceptacja regulaminu (wymagane, musi być `true`)

**Użycie:** Przekazywane do `supabase.auth.signUp()`

**Definicja:**
```typescript
export interface RegisterFormData {
  email: string;
  password: string;
  passwordConfirm: string;
  acceptTerms: boolean;
}
```

### RegisterFormErrors

**Opis:** ViewModel reprezentujący błędy walidacji formularza.

**Pola:**
- `email?: string` - Komunikat błędu dla pola email (opcjonalny)
- `password?: string` - Komunikat błędu dla pola hasła (opcjonalny)
- `passwordConfirm?: string` - Komunikat błędu dla pola potwierdzenia hasła (opcjonalny)
- `acceptTerms?: string` - Komunikat błędu dla checkboxa akceptacji regulaminu (opcjonalny)
- `general?: string` - Ogólny komunikat błędu (np. z Supabase Auth, opcjonalny)

**Użycie:** Wyświetlanie komunikatów błędów w UI

**Definicja:**
```typescript
export interface RegisterFormErrors {
  email?: string;
  password?: string;
  passwordConfirm?: string;
  acceptTerms?: string;
  general?: string;
}
```

### RegisterFormProps

**Opis:** Propsy komponentu RegisterForm.

**Pola:**
- `redirectTo?: string` - URL do przekierowania po rejestracji (opcjonalny, domyślnie `/app?firstLogin=true`)

**Użycie:** Przekazywane z register.astro do RegisterForm.tsx

**Definicja:**
```typescript
export interface RegisterFormProps {
  redirectTo?: string;
}
```

### PasswordStrength

**Opis:** Typ reprezentujący siłę hasła (opcjonalny, dla wskaźnika siły hasła).

**Wartości:**
- `'weak'` - Słabe hasło (mniej niż 8 znaków lub tylko litery/cyfry)
- `'medium'` - Średnie hasło (8+ znaków, mieszanka liter i cyfr)
- `'strong'` - Silne hasło (8+ znaków, mieszanka liter, cyfr i znaków specjalnych)

**Użycie:** Wyświetlanie wskaźnika siły hasła w UI

**Definicja:**
```typescript
export type PasswordStrength = 'weak' | 'medium' | 'strong';
```

### Supabase Auth Types (używane, nie definiowane lokalnie)

**Session:**
- Typ z `@supabase/supabase-js`
- Zawiera `access_token`, `refresh_token`, `user`, `expires_at`

**AuthError:**
- Typ z `@supabase/supabase-js`
- Zawiera `message`, `status`, `name`

**AuthResponse:**
- Typ z `@supabase/supabase-js`
- Zawiera `data: { session, user }`, `error: AuthError | null`

**SignUpResponse:**
- Typ z `@supabase/supabase-js`
- Rozszerza `AuthResponse` z dodatkowymi polami specyficznymi dla rejestracji

## 6. Zarządzanie stanem

**Strategia:** Lokalny stan w komponencie React (`useState`)

**Stan komponentu RegisterForm:**

1. **formData: RegisterFormData**
   - Cel: Przechowywanie wartości pól formularza (email, password, passwordConfirm, acceptTerms)
   - Inicjalizacja: `{ email: '', password: '', passwordConfirm: '', acceptTerms: false }`
   - Aktualizacja: `onChange` w polach input i checkbox

2. **errors: RegisterFormErrors**
   - Cel: Przechowywanie komunikatów błędów walidacji
   - Inicjalizacja: `{}`
   - Aktualizacja:
     - Client-side: podczas walidacji w `onChange` lub `onSubmit`
     - Server-side: po otrzymaniu błędu z Supabase Auth

3. **isLoading: boolean**
   - Cel: Wskaźnik stanu ładowania podczas rejestracji
   - Inicjalizacja: `false`
   - Aktualizacja: `true` przed wywołaniem API, `false` po zakończeniu (sukces lub błąd)

4. **showPassword: boolean**
   - Cel: Kontrola widoczności hasła (pierwsze pole)
   - Inicjalizacja: `false`
   - Aktualizacja: `onClick` przycisku toggle

5. **showPasswordConfirm: boolean**
   - Cel: Kontrola widoczności potwierdzenia hasła (drugie pole)
   - Inicjalizacja: `false`
   - Aktualizacja: `onClick` przycisku toggle

6. **passwordStrength: PasswordStrength** (opcjonalny)
   - Cel: Przechowywanie siły hasła dla wskaźnika
   - Inicjalizacja: `'weak'`
   - Aktualizacja: Funkcja `calculatePasswordStrength()` wywoływana przy zmianie hasła

**Brak custom hooków:** Prosty formularz nie wymaga custom hooków. Wszystka logika jest zawarta w komponencie.

**Brak globalnego stanu:** Sesja użytkownika jest zarządzana przez Supabase SDK (localStorage/cookies).

**Helper functions:**
- `validateForm(): RegisterFormErrors` - Walidacja wszystkich pól formularza
- `validateEmail(email: string): string | undefined` - Walidacja formatu email
- `validatePassword(password: string): string | undefined` - Walidacja hasła (min 8 znaków)
- `validatePasswordConfirm(password: string, passwordConfirm: string): string | undefined` - Walidacja zgodności haseł
- `calculatePasswordStrength(password: string): PasswordStrength` - Obliczanie siły hasła (opcjonalny)
- `mapSupabaseError(error: AuthError | null): string` - Mapowanie błędów Supabase na komunikaty użytkownika

## 7. Integracja API

**Brak bezpośrednich endpointów API** - widok używa bezpośrednio **Supabase Auth SDK** po stronie klienta.

### Supabase Auth Methods

**1. `supabase.auth.signUp({ email, password })`**

**Opis:** Rejestracja nowego użytkownika w Supabase Auth.

**Typ żądania:**
```typescript
{
  email: string;
  password: string;
  options?: {
    emailRedirectTo?: string | undefined; // undefined w MVP (brak weryfikacji email)
    data?: Record<string, unknown>; // Opcjonalne metadane użytkownika
  }
}
```

**Typ odpowiedzi:**
```typescript
{
  data: {
    user: User | null;
    session: Session | null;
  };
  error: AuthError | null;
}
```

**Obsługa odpowiedzi:**
- **Sukces (`error === null`):**
  - Sprawdzenie, czy `session` istnieje
  - Jeśli tak → przekierowanie do `redirectTo` (lub `/app?firstLogin=true`)
  - Jeśli nie → wyświetlenie komunikatu błędu (nie powinno się zdarzyć w MVP bez weryfikacji email)

- **Błąd (`error !== null`):**
  - Mapowanie błędu na komunikat użytkownika
  - Ustawienie `errors.general` lub `errors.email`/`errors.password`
  - Wyświetlenie komunikatu w UI

**2. `supabase.auth.getSession()`**

**Opis:** Sprawdzenie aktywnej sesji po rejestracji (opcjonalnie, dla weryfikacji).

**Typ odpowiedzi:**
```typescript
{
  data: {
    session: Session | null;
  };
  error: AuthError | null;
}
```

**Użycie:** Po pomyślnej rejestracji, aby upewnić się, że sesja została utworzona przed przekierowaniem.

**3. `supabase.auth.onAuthStateChange()`**

**Opis:** Listener zmian stanu autentykacji (opcjonalnie, dla zaawansowanej obsługi).

**Użycie:** W MVP nie jest wymagany, ponieważ używamy bezpośredniego przekierowania po rejestracji.

### Konfiguracja Supabase Client

**Plik:** `src/lib/supabase.ts`

**Użycie:**
```typescript
import { supabaseClient } from '../lib/supabase';

// W RegisterForm.tsx
const { data, error } = await supabaseClient.auth.signUp({
  email: formData.email,
  password: formData.password,
  options: {
    emailRedirectTo: undefined // Brak weryfikacji email w MVP
  }
});
```

### Environment Variables

**Wymagane zmienne:**
- `PUBLIC_SUPABASE_URL` - URL do instancji Supabase
- `PUBLIC_SUPABASE_ANON_KEY` - Anonimowy klucz API Supabase

**Konfiguracja:** W pliku `.env` w katalogu głównym projektu.

## 8. Interakcje użytkownika

### 1. Wprowadzanie danych do formularza

**Akcja:** Użytkownik wprowadza dane do pól formularza (email, hasło, potwierdzenie hasła)

**Oczekiwany wynik:**
- Wartości są aktualizowane w stanie `formData`
- Walidacja w czasie rzeczywistym (opcjonalnie, przy `onBlur` lub `onChange`)
- Komunikaty błędów są czyszczone dla danego pola po wprowadzeniu poprawnej wartości
- Wskaźnik siły hasła jest aktualizowany (jeśli zaimplementowany)

**Obsługa:** Handler `handleChange` dla każdego pola input

### 2. Toggle widoczności hasła

**Akcja:** Użytkownik klika przycisk z ikoną oka obok pola hasła

**Oczekiwany wynik:**
- Typ inputa zmienia się z `password` na `text` (lub odwrotnie)
- Ikona zmienia się z `Eye` na `EyeOff` (lub odwrotnie)
- Hasło jest widoczne/niewidoczne

**Obsługa:** Handler `handleTogglePassword` dla pierwszego pola, `handleTogglePasswordConfirm` dla drugiego

### 3. Toggle widoczności potwierdzenia hasła

**Akcja:** Użytkownik klika przycisk z ikoną oka obok pola potwierdzenia hasła

**Oczekiwany wynik:**
- Typ inputa zmienia się z `password` na `text` (lub odwrotnie)
- Ikona zmienia się z `Eye` na `EyeOff` (lub odwrotnie)
- Potwierdzenie hasła jest widoczne/niewidoczne

**Obsługa:** Handler `handleTogglePasswordConfirm`

### 4. Zaznaczenie/odznaczenie checkboxa akceptacji regulaminu

**Akcja:** Użytkownik klika checkbox akceptacji regulaminu

**Oczekiwany wynik:**
- Checkbox jest zaznaczony/odznaczony
- Wartość `acceptTerms` w `formData` jest aktualizowana
- Komunikat błędu jest czyszczony (jeśli istniał)

**Obsługa:** Handler `handleChange` dla checkboxa

### 5. Wysłanie formularza

**Akcja:** Użytkownik klika przycisk "Zarejestruj się" lub naciska Enter

**Oczekiwany wynik:**
- Formularz jest walidowany (wszystkie pola)
- Jeśli błędy → wyświetlenie komunikatów, zatrzymanie procesu
- Jeśli OK → ustawienie `isLoading = true`, wyłączenie pól i przycisku
- Wywołanie `supabase.auth.signUp()`
- Po sukcesie → przekierowanie do `/app?firstLogin=true`
- Po błędzie → wyświetlenie komunikatu, ustawienie `isLoading = false`

**Obsługa:** Handler `handleSubmit` z `preventDefault()`

### 6. Przejście do strony logowania

**Akcja:** Użytkownik klika link "Masz już konto? Zaloguj się"

**Oczekiwany wynik:**
- Przekierowanie do `/login`

**Obsługa:** Standardowy link HTML `<a href="/login">`

### 7. Keyboard navigation

**Akcja:** Użytkownik używa klawiatury do nawigacji

**Oczekiwany wynik:**
- `Tab` - Przejście między polami (email → hasło → toggle → potwierdzenie → toggle → checkbox → przycisk → link)
- `Enter` - Submit formularza (gdy focus na polu lub przycisku)
- `Escape` - Czyszczenie błędów (opcjonalnie)

**Obsługa:** Standardowa obsługa HTML5 (nie wymaga dodatkowej logiki)

## 9. Warunki i walidacja

### Warunki client-side (weryfikowane przed wysłaniem)

**1. Format email**
- **Warunek:** Email musi mieć format `user@domain.com`
- **Komponent:** `RegisterForm.tsx` (pole email)
- **Walidacja:** Regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` lub HTML5 `type="email"`
- **Komunikat:** `"Podaj prawidłowy adres email"`
- **Wpływ na stan:** `errors.email` jest ustawiane, pole ma czerwoną ramkę (`aria-invalid="true"`)

**2. Pole email wymagane**
- **Warunek:** Pole email nie może być puste
- **Komponent:** `RegisterForm.tsx` (pole email)
- **Walidacja:** `formData.email.trim().length > 0`
- **Komunikat:** `"Email jest wymagany"`
- **Wpływ na stan:** `errors.email` jest ustawiane, pole ma czerwoną ramkę

**3. Hasło minimum 8 znaków**
- **Warunek:** Hasło musi mieć minimum 8 znaków
- **Komponent:** `RegisterForm.tsx` (pole hasło)
- **Walidacja:** `formData.password.length >= 8`
- **Komunikat:** `"Hasło musi mieć minimum 8 znaków"`
- **Wpływ na stan:** `errors.password` jest ustawiane, pole ma czerwoną ramkę

**4. Pole hasło wymagane**
- **Warunek:** Pole hasło nie może być puste
- **Komponent:** `RegisterForm.tsx` (pole hasło)
- **Walidacja:** `formData.password.length > 0`
- **Komunikat:** `"Hasło jest wymagane"`
- **Wpływ na stan:** `errors.password` jest ustawiane, pole ma czerwoną ramkę

**5. Zgodność haseł**
- **Warunek:** Potwierdzenie hasła musi być identyczne z hasłem
- **Komponent:** `RegisterForm.tsx` (pole potwierdzenia hasła)
- **Walidacja:** `formData.passwordConfirm === formData.password`
- **Komunikat:** `"Hasła nie są zgodne"`
- **Wpływ na stan:** `errors.passwordConfirm` jest ustawiane, pole ma czerwoną ramkę

**6. Pole potwierdzenia hasła wymagane**
- **Warunek:** Pole potwierdzenia hasła nie może być puste
- **Komponent:** `RegisterForm.tsx` (pole potwierdzenia hasła)
- **Walidacja:** `formData.passwordConfirm.length > 0`
- **Komunikat:** `"Potwierdzenie hasła jest wymagane"`
- **Wpływ na stan:** `errors.passwordConfirm` jest ustawiane, pole ma czerwoną ramkę

**7. Akceptacja regulaminu wymagana**
- **Warunek:** Checkbox akceptacji regulaminu musi być zaznaczony
- **Komponent:** `RegisterForm.tsx` (checkbox)
- **Walidacja:** `formData.acceptTerms === true`
- **Komunikat:** `"Musisz zaakceptować regulamin"`
- **Wpływ na stan:** `errors.acceptTerms` jest ustawiane, checkbox ma czerwoną ramkę

**8. Przycisk submit wyłączony podczas ładowania**
- **Warunek:** `isLoading === true`
- **Komponent:** `RegisterForm.tsx` (przycisk submit)
- **Walidacja:** `disabled={isLoading}`
- **Wpływ na stan:** Przycisk jest nieaktywny, pola są wyłączone (`disabled={isLoading}`)

### Warunki server-side (weryfikowane przez Supabase Auth)

**1. Email zajęty**
- **Warunek:** Email nie może być już zarejestrowany w systemie
- **Weryfikacja:** Supabase Auth sprawdza, czy użytkownik z danym emailem już istnieje
- **Błąd:** `"User already registered"` lub `"Email already registered"`
- **Komunikat użytkownika:** `"Ten adres email jest już zarejestrowany"`
- **Wpływ na stan:** `errors.email` lub `errors.general` jest ustawiane

**2. Słabe hasło (Supabase)**
- **Warunek:** Supabase wymaga minimum 6 znaków (ale my walidujemy 8 po stronie klienta)
- **Weryfikacja:** Supabase sprawdza siłę hasła
- **Błąd:** `"Password should be at least 6 characters"` (nie powinno się zdarzyć, jeśli walidujemy 8 znaków)
- **Komunikat użytkownika:** `"Hasło jest zbyt słabe"`
- **Wpływ na stan:** `errors.password` jest ustawiane

**3. Rate limiting**
- **Warunek:** Zbyt wiele prób rejestracji w krótkim czasie
- **Weryfikacja:** Supabase Auth lub backend middleware
- **Błąd:** `"Too many requests"` lub `"Rate limit exceeded"`
- **Komunikat użytkownika:** `"Zbyt wiele prób. Spróbuj ponownie za chwilę"`
- **Wpływ na stan:** `errors.general` jest ustawiane

**4. Nieprawidłowy format email (server-side)**
- **Warunek:** Email nie przechodzi walidacji po stronie serwera (rzadkie, bo walidujemy po stronie klienta)
- **Weryfikacja:** Supabase Auth sprawdza format email
- **Błąd:** `"Invalid email"`
- **Komunikat użytkownika:** `"Podaj prawidłowy adres email"`
- **Wpływ na stan:** `errors.email` jest ustawiane

## 10. Obsługa błędów

### Scenariusze błędów i ich obsługa

**1. Błąd walidacji client-side**

**Scenariusz:** Użytkownik wprowadza nieprawidłowe dane (np. zły format email, za krótkie hasło)

**Obsługa:**
- Walidacja jest wykonywana przed wysłaniem formularza
- Komunikaty błędów są wyświetlane pod odpowiednimi polami
- Pola z błędami mają czerwoną ramkę i `aria-invalid="true"`
- Przycisk submit jest zablokowany, dopóki wszystkie pola są poprawne (opcjonalnie)

**Komunikaty:**
- `"Podaj prawidłowy adres email"` - dla nieprawidłowego formatu email
- `"Email jest wymagany"` - dla pustego pola email
- `"Hasło musi mieć minimum 8 znaków"` - dla za krótkiego hasła
- `"Hasło jest wymagane"` - dla pustego pola hasła
- `"Hasła nie są zgodne"` - dla niezgodnych haseł
- `"Potwierdzenie hasła jest wymagane"` - dla pustego pola potwierdzenia
- `"Musisz zaakceptować regulamin"` - dla niezaznaczonego checkboxa

**2. Email już zarejestrowany**

**Scenariusz:** Użytkownik próbuje zarejestrować się z emailem, który już istnieje w systemie

**Obsługa:**
- Błąd jest zwracany przez Supabase Auth
- Komunikat jest mapowany na przyjazny komunikat użytkownika
- Komunikat jest wyświetlany w `<Alert variant="destructive">` lub pod polem email
- Pole email jest oznaczone jako błędne

**Komunikat:** `"Ten adres email jest już zarejestrowany"`

**3. Błąd sieci/połączenia**

**Scenariusz:** Brak połączenia z internetem lub problem z Supabase

**Obsługa:**
- Błąd jest przechwytywany w `try-catch` lub przez `error` z Supabase
- Komunikat jest wyświetlany w `<Alert variant="destructive">`
- `isLoading` jest ustawiane na `false`
- Użytkownik może spróbować ponownie

**Komunikat:** `"Wystąpił problem z połączeniem. Spróbuj ponownie."`

**4. Rate limiting**

**Scenariusz:** Zbyt wiele prób rejestracji w krótkim czasie

**Obsługa:**
- Błąd jest zwracany przez Supabase Auth lub backend
- Komunikat jest wyświetlany w `<Alert variant="destructive">`
- Przycisk submit jest zablokowany na określony czas (opcjonalnie)

**Komunikat:** `"Zbyt wiele prób. Spróbuj ponownie za chwilę."`

**5. Nieoczekiwany błąd**

**Scenariusz:** Nieznany błąd z Supabase Auth

**Obsługa:**
- Błąd jest przechwytywany i logowany (w konsoli, w trybie deweloperskim)
- Ogólny komunikat jest wyświetlany użytkownikowi
- `isLoading` jest ustawiane na `false`

**Komunikat:** `"Wystąpił nieoczekiwany błąd. Spróbuj ponownie później."`

**6. Brak sesji po rejestracji**

**Scenariusz:** Rejestracja zakończyła się sukcesem, ale sesja nie została utworzona (nie powinno się zdarzyć w MVP bez weryfikacji email)

**Obsługa:**
- Sprawdzenie `session` w odpowiedzi z `signUp()`
- Jeśli `session === null`, wyświetlenie komunikatu błędu
- Użytkownik może spróbować zalogować się ręcznie

**Komunikat:** `"Rejestracja zakończyła się sukcesem, ale nie udało się zalogować. Spróbuj zalogować się ręcznie."`

### Strategia obsługi błędów

**1. Walidacja przed wysłaniem:**
- Wszystkie pola są walidowane przed wywołaniem API
- Komunikaty błędów są wyświetlane natychmiast
- Formularz nie jest wysyłany, jeśli są błędy

**2. Mapowanie błędów Supabase:**
- Funkcja `mapSupabaseError()` mapuje błędy Supabase na przyjazne komunikaty
- Ogólne komunikaty błędów (nie ujawniamy szczegółów technicznych)
- Bezpieczne komunikaty (nie ujawniamy, czy email istnieje, jeśli to możliwe)

**3. Wyświetlanie błędów:**
- Błędy pól → pod odpowiednimi polami (`errors.email`, `errors.password`, etc.)
- Ogólne błędy → w `<Alert variant="destructive">` na górze formularza
- Błędy są czyszczone po wprowadzeniu poprawnej wartości

**4. Logowanie błędów:**
- W trybie deweloperskim błędy są logowane w konsoli
- W produkcji błędy mogą być wysyłane do systemu monitoringu (opcjonalnie)

## 11. Kroki implementacji

### Krok 1: Przygotowanie struktury plików

1. Utworzenie katalogu `src/components/auth/` (jeśli nie istnieje)
2. Sprawdzenie, czy plik `src/pages/register.astro` istnieje (już istnieje, ale wymaga aktualizacji)
3. Sprawdzenie, czy plik `src/lib/supabase.ts` istnieje (już istnieje)

### Krok 2: Definicja typów

1. Otwarcie pliku `src/lib/types.ts`
2. Dodanie typów:
   - `RegisterFormData`
   - `RegisterFormErrors`
   - `RegisterFormProps`
   - `PasswordStrength` (opcjonalny)
3. Eksport typów

### Krok 3: Aktualizacja register.astro

1. Otwarcie pliku `src/pages/register.astro`
2. Import `BaseLayout` (już istnieje)
3. Import komponentu `RegisterForm` (będzie utworzony w następnym kroku)
4. Zastąpienie statycznego formularza komponentem React:
   ```astro
   <RegisterForm client:load />
   ```
5. Usunięcie statycznego formularza HTML
6. Zachowanie linku do `/login`

### Krok 4: Utworzenie komponentu RegisterForm.tsx - Podstawowa struktura

1. Utworzenie pliku `src/components/auth/RegisterForm.tsx`
2. Import zależności:
   - React hooks (`useState`, `useEffect`, `useCallback`, `useRef`)
   - Supabase client (`supabaseClient` z `src/lib/supabase`)
   - Shadcn/ui komponenty (`Input`, `Button`, `Alert`, `Checkbox`)
   - Typy (`RegisterFormData`, `RegisterFormErrors`, `RegisterFormProps`)
   - Ikony (`Eye`, `EyeOff` z `lucide-react`)
3. Definicja komponentu z props
4. Inicjalizacja stanu (`formData`, `errors`, `isLoading`, `showPassword`, `showPasswordConfirm`)
5. Renderowanie podstawowej struktury formularza (bez logiki)

### Krok 5: Implementacja RegisterForm.tsx - Walidacja client-side

1. Funkcja `isValidEmail(email: string): boolean` z regex
2. Funkcja `validatePassword(password: string): string | undefined` sprawdzająca minimum 8 znaków
3. Funkcja `validatePasswordConfirm(password: string, passwordConfirm: string): string | undefined` sprawdzająca zgodność
4. Funkcja `validateForm(): RegisterFormErrors` sprawdzająca wszystkie pola
5. Handler `handleChange` dla pól input:
   - Aktualizacja `formData`
   - Czyszczenie błędów dla danego pola
   - Walidacja w czasie rzeczywistym (opcjonalnie)
6. Handler `handleSubmit` z `preventDefault()`:
   - Walidacja przed submit
   - Zatrzymanie, jeśli błędy

### Krok 6: Implementacja RegisterForm.tsx - Funkcja obliczania siły hasła (opcjonalny)

1. Funkcja `calculatePasswordStrength(password: string): PasswordStrength`
2. Logika:
   - `'weak'` - mniej niż 8 znaków lub tylko litery/cyfry
   - `'medium'` - 8+ znaków, mieszanka liter i cyfr
   - `'strong'` - 8+ znaków, mieszanka liter, cyfr i znaków specjalnych
3. Aktualizacja `passwordStrength` w `handleChange` dla pola hasła

### Krok 7: Implementacja RegisterForm.tsx - Komponent PasswordStrengthIndicator (opcjonalny)

1. Utworzenie komponentu `PasswordStrengthIndicator.tsx` (jeśli używamy wskaźnika)
2. Przyjmuje prop `strength: PasswordStrength`
3. Renderuje wizualny wskaźnik (np. pasek z kolorami: czerwony/słaby, żółty/średni, zielony/silny)
4. Import i użycie w `RegisterForm.tsx`

### Krok 8: Implementacja RegisterForm.tsx - Integracja z Supabase Auth

1. Funkcja `mapSupabaseError(error: AuthError | null): string` mapująca błędy
2. W `handleSubmit`:
   - Ustawienie `isLoading = true`
   - Wywołanie `supabaseClient.auth.signUp()`
   - Obsługa odpowiedzi:
     - Sukces → sprawdzenie `session`, przekierowanie do `redirectTo` (lub `/app?firstLogin=true`)
     - Błąd → mapowanie i wyświetlenie komunikatu
   - Ustawienie `isLoading = false`

### Krok 9: Implementacja RegisterForm.tsx - Toggle hasła

1. Handler `handleTogglePassword` przełączający `showPassword`
2. Handler `handleTogglePasswordConfirm` przełączający `showPasswordConfirm`
3. Renderowanie przycisków z ikonami `Eye`/`EyeOff` obok pól hasła
4. Zmiana `type` inputa z `password` na `text` (i odwrotnie)

### Krok 10: Implementacja RegisterForm.tsx - Auto-focus

1. `useRef` dla inputa email
2. `useEffect` z `focus()` przy mount
3. Renderowanie inputa z `ref`

### Krok 11: Implementacja RegisterForm.tsx - Komunikaty błędów

1. Renderowanie `<Alert variant="destructive">` dla `errors.general` (jeśli istnieje)
2. Renderowanie `<span>` z komunikatami błędów pod polami (`errors.email`, `errors.password`, `errors.passwordConfirm`, `errors.acceptTerms`)
3. Dodanie `aria-invalid="true"` do pól z błędami
4. Dodanie `aria-describedby` dla komunikatów pomocy (wymagania hasła)

### Krok 12: Implementacja RegisterForm.tsx - Loading state

1. Wyłączenie pól input (`disabled={isLoading}`)
2. Wyłączenie przycisku submit (`disabled={isLoading}`)
3. Wyświetlenie spinnera lub tekstu "Rejestrowanie..." w przycisku podczas ładowania

### Krok 13: Implementacja RegisterForm.tsx - Accessibility

1. Dodanie `aria-label` do przycisków toggle hasła
2. Dodanie `aria-describedby` dla komunikatów pomocy
3. Dodanie `aria-invalid` dla pól z błędami
4. Sprawdzenie kolejności Tab (email → hasło → toggle → potwierdzenie → toggle → checkbox → przycisk → link)
5. Test z klawiaturą (Tab, Enter, Escape)

### Krok 14: Implementacja RegisterForm.tsx - Responsywność

1. Sprawdzenie, czy formularz jest responsywny (mobile-first)
2. Test na różnych rozdzielczościach (mobile, tablet, desktop)
3. Dostosowanie stylów, jeśli potrzeba

### Krok 15: Testowanie

1. Test rejestracji z prawidłowymi danymi
2. Test błędnych danych (zajęty email, słabe hasło)
3. Test walidacji hasła (min 8 znaków)
4. Test zgodności haseł
5. Test checkboxa akceptacji regulaminu
6. Test auto-login i redirect po sukcesie
7. Test accessibility (keyboard navigation, screen reader)
8. Test loading state
9. Test toggle hasła
10. Test obsługi błędów (sieć, rate limiting, etc.)

### Krok 16: Dokumentacja i cleanup

1. Dodanie komentarzy JSDoc do funkcji (jeśli potrzeba)
2. Usunięcie nieużywanych importów
3. Sprawdzenie, czy kod jest zgodny z linterem (ESLint)
4. Formatowanie kodu (Prettier)
5. Aktualizacja checklisty w pliku `.ai/view-implementations/register-page-view-implementation-plan-note.md`

