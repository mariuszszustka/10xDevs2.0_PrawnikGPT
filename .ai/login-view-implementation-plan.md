# Plan implementacji widoku Logowania

## 1. Przegląd

Widok logowania (`/login`) to publiczna strona umożliwiająca istniejącym użytkownikom zalogowanie się do aplikacji PrawnikGPT. Widok wykorzystuje architekturę Astro 5 z React island dla interaktywnego formularza logowania. Autentykacja odbywa się bezpośrednio przez Supabase Auth SDK po stronie klienta, bez pośrednictwa backend API.

**Główne funkcjonalności:**
- Formularz logowania z polami email i hasło
- Walidacja danych po stronie klienta (format email)
- Toggle pokazywania/ukrywania hasła
- Obsługa błędów autentykacji z przyjaznymi komunikatami
- Automatyczne przekierowanie do `/app` po pomyślnym zalogowaniu
- Link do strony rejestracji dla nowych użytkowników
- Pełna obsługa dostępności (ARIA, keyboard navigation)

**Wymagania bezpieczeństwa:**
- Ogólne komunikaty błędów (nie ujawniające, czy email istnieje w systemie)
- CSRF protection przez Supabase Auth SDK
- Rate limiting na poziomie Supabase (10 prób/min)

## 2. Routing widoku

**Ścieżka:** `/login`

**Plik:** `src/pages/login.astro`

**Typ routingu:** Astro SSR (Server-Side Rendering)

**Autentykacja:** Nie wymagana (publiczny widok)

**Parametry URL (opcjonalne):**
- `redirect_to` - URL do przekierowania po zalogowaniu (domyślnie `/app`)
- `expired` - Flaga wskazująca wygaśnięcie sesji (wyświetla komunikat)

**Middleware:** Brak (widok publiczny, ale middleware może sprawdzać, czy użytkownik jest już zalogowany i przekierować do `/app`)

## 3. Struktura komponentów

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

**Hierarchia komponentów:**
1. **login.astro** - Główna strona Astro, renderuje layout i React island
2. **BaseLayout.astro** - Wrapper z meta tags, HTML structure
3. **LoginForm.tsx** - React island z logiką formularza (client:load dla natychmiastowej hydratacji)

## 4. Szczegóły komponentów

### login.astro

**Opis komponentu:** Główna strona Astro renderująca widok logowania. Zawiera statyczną strukturę HTML oraz React island dla interaktywnego formularza.

**Główne elementy:**
- `<BaseLayout>` - Wrapper z meta tags i strukturą HTML
- `<main>` - Kontener głównej zawartości z centrowaniem i stylami Tailwind
- `<div class="w-full max-w-md">` - Kontener formularza z maksymalną szerokością
- `<h1>` - Nagłówek "Logowanie"
- `<p>` - Opis strony
- `<LoginForm client:load />` - React island z formularzem (hydratacja natychmiastowa)
- `<p>` - Link do rejestracji ("Nie masz konta? Zarejestruj się")

**Obsługiwane interakcje:**
- Renderowanie statycznego HTML
- Przekazywanie props do React island (opcjonalnie: `redirectTo` z URL params)

**Obsługiwana walidacja:** Brak (walidacja w React island)

**Typy:**
- Props: `{ redirectTo?: string }` (z URL params)

**Props:** Brak (komponent Astro nie przyjmuje props od rodzica)

### BaseLayout.astro

**Opis komponentu:** Wspólny layout dla wszystkich stron publicznych. Zawiera strukturę HTML, meta tags, i globalne style.

**Główne elementy:**
- `<!doctype html>` - Deklaracja typu dokumentu
- `<html lang="pl">` - Element główny z językiem polskim
- `<head>` - Sekcja head z meta tags:
  - `<meta charset="UTF-8" />`
  - `<meta name="description" />`
  - `<meta name="viewport" />`
  - `<link rel="icon" />`
  - `<title>` - Tytuł strony
- `<body>` - Ciało dokumentu z slotem dla zawartości

**Obsługiwane interakcje:** Brak (statyczny layout)

**Obsługiwana walidacja:** Brak

**Typy:**
- Props: `{ title: string; description?: string }`

**Props:**
- `title: string` - Tytuł strony (wymagany)
- `description?: string` - Opis strony dla meta tag (opcjonalny, domyślnie "AI Assistant for Polish Legal Acts")

### LoginForm.tsx

**Opis komponentu:** React island zawierający interaktywny formularz logowania z walidacją, obsługą błędów i integracją z Supabase Auth SDK.

**Główne elementy:**
- `<form>` - Element formularza z obsługą submit
- `<Alert variant="destructive">` - Komunikat błędu ogólnego (jeśli występuje)
- `<div>` - Kontener pola email:
  - `<label>` - Etykieta pola email z `htmlFor="email"`
  - `<Input>` - Pole input typu email z walidacją
  - `<span>` - Komunikat błędu walidacji email (inline)
- `<div>` - Kontener pola hasła:
  - `<label>` - Etykieta pola hasła z `htmlFor="password"`
  - `<div class="relative">` - Wrapper dla input i przycisku toggle:
    - `<Input>` - Pole input typu password/text (zależnie od stanu)
    - `<Button type="button" variant="ghost" size="icon">` - Przycisk toggle pokazywania hasła (ikona Eye/EyeOff)
  - `<span>` - Komunikat błędu walidacji hasła (inline)
- `<Button type="submit">` - Przycisk "Zaloguj się" z loading state
- `<p>` - Link do rejestracji (opcjonalnie, jeśli nie jest w login.astro)

**Obsługiwane interakcje:**
- `onSubmit` - Obsługa submit formularza (preventDefault, walidacja, wywołanie Supabase Auth)
- `onChange` - Obsługa zmian w polach (aktualizacja stanu, czyszczenie błędów)
- `onClick` - Toggle pokazywania hasła
- `onFocus` - Auto-focus na pole email przy mount (useEffect)
- Keyboard navigation:
  - `Enter` - Submit formularza
  - `Tab` - Przejście między polami
  - `Escape` - Czyszczenie błędów (opcjonalnie)

**Obsługiwana walidacja:**
- **Email (client-side):**
  - Format email: regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` lub wbudowana walidacja HTML5
  - Pole wymagane (required)
  - Komunikat: "Podaj prawidłowy adres email"
- **Hasło (client-side):**
  - Pole wymagane (required)
  - Minimum 1 znak (Supabase wymaga non-empty)
  - Komunikat: "Hasło jest wymagane"
- **Server-side (Supabase Auth):**
  - Sprawdzenie, czy email istnieje w systemie
  - Sprawdzenie poprawności hasła
  - Rate limiting (10 prób/min)

**Typy:**
- `LoginFormData` - Dane formularza:
  ```typescript
  {
    email: string;
    password: string;
  }
  ```
- `LoginFormErrors` - Błędy walidacji:
  ```typescript
  {
    email?: string;
    password?: string;
    general?: string;
  }
  ```
- `LoginFormProps` - Propsy komponentu:
  ```typescript
  {
    redirectTo?: string; // URL do przekierowania po zalogowaniu
  }
  ```

**Props:**
- `redirectTo?: string` - URL do przekierowania po pomyślnym zalogowaniu (domyślnie `/app`)

**Stan komponentu:**
- `formData: LoginFormData` - Dane formularza (email, password)
- `errors: LoginFormErrors` - Błędy walidacji
- `isLoading: boolean` - Stan ładowania podczas logowania
- `showPassword: boolean` - Stan widoczności hasła

**Hooki:**
- `useState` - Zarządzanie stanem formularza, błędów, loading, showPassword
- `useEffect` - Auto-focus na pole email przy mount
- `useCallback` - Memoizacja funkcji submit i onChange

## 5. Typy

### LoginFormData

**Opis:** DTO reprezentujący dane formularza logowania.

**Pola:**
- `email: string` - Adres email użytkownika (wymagany, format email)
- `password: string` - Hasło użytkownika (wymagane, minimum 1 znak)

**Użycie:** Przekazywane do `supabase.auth.signInWithPassword()`

**Definicja:**
```typescript
export interface LoginFormData {
  email: string;
  password: string;
}
```

### LoginFormErrors

**Opis:** ViewModel reprezentujący błędy walidacji formularza.

**Pola:**
- `email?: string` - Komunikat błędu dla pola email (opcjonalny)
- `password?: string` - Komunikat błędu dla pola hasła (opcjonalny)
- `general?: string` - Ogólny komunikat błędu (np. z Supabase Auth, opcjonalny)

**Użycie:** Wyświetlanie komunikatów błędów w UI

**Definicja:**
```typescript
export interface LoginFormErrors {
  email?: string;
  password?: string;
  general?: string;
}
```

### LoginFormProps

**Opis:** Propsy komponentu LoginForm.

**Pola:**
- `redirectTo?: string` - URL do przekierowania po zalogowaniu (opcjonalny, domyślnie `/app`)

**Użycie:** Przekazywane z login.astro do LoginForm.tsx

**Definicja:**
```typescript
export interface LoginFormProps {
  redirectTo?: string;
}
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

## 6. Zarządzanie stanem

**Strategia:** Lokalny stan w komponencie React (`useState`)

**Stan komponentu LoginForm:**
1. **formData: LoginFormData**
   - Cel: Przechowywanie wartości pól formularza (email, password)
   - Inicjalizacja: `{ email: '', password: '' }`
   - Aktualizacja: `onChange` w polach input

2. **errors: LoginFormErrors**
   - Cel: Przechowywanie komunikatów błędów walidacji
   - Inicjalizacja: `{}`
   - Aktualizacja:
     - Client-side: podczas walidacji w `onChange` lub `onSubmit`
     - Server-side: po otrzymaniu błędu z Supabase Auth

3. **isLoading: boolean**
   - Cel: Wskaźnik stanu ładowania podczas logowania
   - Inicjalizacja: `false`
   - Aktualizacja: `true` przed wywołaniem API, `false` po zakończeniu (sukces lub błąd)

4. **showPassword: boolean**
   - Cel: Kontrola widoczności hasła (toggle)
   - Inicjalizacja: `false`
   - Aktualizacja: `onClick` przycisku toggle

**Brak custom hooków:** Prosty formularz nie wymaga custom hooków. Wszystka logika jest zawarta w komponencie.

**Brak globalnego stanu:** Sesja użytkownika jest zarządzana przez Supabase SDK (localStorage/cookies).

**Optymalizacja:**
- `useCallback` dla funkcji `handleSubmit` i `handleChange` (memoizacja)
- `useMemo` nie jest potrzebny (brak kosztownych obliczeń)

## 7. Integracja API

**Brak bezpośredniej integracji z backend API** - widok używa **Supabase Auth SDK** po stronie klienta.

### Supabase Auth Methods

**1. signInWithPassword**
- **Metoda:** `supabase.auth.signInWithPassword({ email, password })`
- **Typ żądania:**
  ```typescript
  {
    email: string;
    password: string;
  }
  ```
- **Typ odpowiedzi:**
  ```typescript
  {
    data: {
      session: Session | null;
      user: User | null;
    };
    error: AuthError | null;
  }
  ```
- **Użycie:** Główna metoda logowania użytkownika
- **Obsługa błędów:**
  - `error === null` → Sukces, przekierowanie do `/app`
  - `error !== null` → Mapowanie błędu na komunikat użytkownika

**2. getSession (opcjonalnie)**
- **Metoda:** `supabase.auth.getSession()`
- **Typ odpowiedzi:**
  ```typescript
  {
    data: {
      session: Session | null;
    };
    error: AuthError | null;
  }
  ```
- **Użycie:** Sprawdzenie, czy użytkownik jest już zalogowany (przy mount, opcjonalnie)

**3. onAuthStateChange (opcjonalnie)**
- **Metoda:** `supabase.auth.onAuthStateChange((event, session) => { ... })`
- **Typy:** `event: AuthChangeEvent`, `session: Session | null`
- **Użycie:** Listener zmian stanu autentykacji (opcjonalnie, dla automatycznego przekierowania)

### Mapowanie błędów Supabase na komunikaty użytkownika

**Supabase Auth Error Codes → Komunikaty:**

- `"Invalid login credentials"` → `"Nieprawidłowy email lub hasło"` (ogólny komunikat bezpieczeństwa)
- `"Email not confirmed"` → `"Nieprawidłowy email lub hasło"` (nie ujawniamy, że email istnieje)
- `"Too many requests"` → `"Zbyt wiele prób logowania. Spróbuj ponownie za chwilę."`
- `"Network error"` → `"Błąd połączenia. Sprawdź połączenie internetowe."`
- Inne błędy → `"Wystąpił błąd podczas logowania. Spróbuj ponownie."`

**Implementacja:**
```typescript
function mapSupabaseError(error: AuthError | null): string {
  if (!error) return '';
  
  switch (error.message) {
    case 'Invalid login credentials':
    case 'Email not confirmed':
      return 'Nieprawidłowy email lub hasło';
    case 'Too many requests':
      return 'Zbyt wiele prób logowania. Spróbuj ponownie za chwilę.';
    default:
      return 'Wystąpił błąd podczas logowania. Spróbuj ponownie.';
  }
}
```

### Rate Limiting

**Poziom:** Supabase Auth (automatyczny, 10 prób/min)

**Obsługa:** Supabase zwraca błąd `"Too many requests"`, który jest mapowany na komunikat użytkownika.

**Backend rate limiting:** Opcjonalnie, w middleware FastAPI (nie wymagane dla MVP, ponieważ autentykacja jest po stronie klienta).

## 8. Interakcje użytkownika

### 1. Wprowadzanie danych w pole email

**Akcja:** Użytkownik wpisuje tekst w pole email

**Oczekiwany wynik:**
- Wartość pola jest aktualizowana w stanie `formData.email`
- Jeśli pole miało błąd walidacji, błąd jest czyszczony (`errors.email = undefined`)
- Jeśli pole jest puste po wprowadzeniu, nie wyświetla się błąd (walidacja tylko przy submit)

**Obsługa:** `onChange` handler aktualizuje `formData.email` i czyści `errors.email`

### 2. Wprowadzanie danych w pole hasła

**Akcja:** Użytkownik wpisuje tekst w pole hasła

**Oczekiwany wynik:**
- Wartość pola jest aktualizowana w stanie `formData.password`
- Jeśli pole miało błąd walidacji, błąd jest czyszczony (`errors.password = undefined`)
- Tekst jest ukryty (domyślnie `type="password"`)

**Obsługa:** `onChange` handler aktualizuje `formData.password` i czyści `errors.password`

### 3. Toggle pokazywania hasła

**Akcja:** Użytkownik klika przycisk z ikoną oka obok pola hasła

**Oczekiwany wynik:**
- Typ pola zmienia się z `password` na `text` (lub odwrotnie)
- Ikona zmienia się z `Eye` na `EyeOff` (lub odwrotnie)
- Stan `showPassword` jest przełączany

**Obsługa:** `onClick` handler aktualizuje `showPassword` i zmienia `type` inputa

### 4. Submit formularza (przycisk "Zaloguj się" lub Enter)

**Akcja:** Użytkownik klika przycisk "Zaloguj się" lub naciska Enter w polu formularza

**Oczekiwany wynik:**
1. **Walidacja client-side:**
   - Sprawdzenie, czy email ma prawidłowy format
   - Sprawdzenie, czy hasło nie jest puste
   - Jeśli błędy → wyświetlenie komunikatów, zatrzymanie submit

2. **Jeśli walidacja OK:**
   - Przycisk jest wyłączony (`disabled={isLoading}`)
   - Pola są wyłączone (`disabled={isLoading}`)
   - Spinner jest wyświetlany (opcjonalnie, w przycisku)
   - Wywołanie `supabase.auth.signInWithPassword()`

3. **Po otrzymaniu odpowiedzi:**
   - **Sukces (`error === null`):**
     - Przekierowanie do `/app` (lub `redirectTo` z props)
     - Token JWT jest automatycznie zapisany przez Supabase SDK
   - **Błąd (`error !== null`):**
     - Wyświetlenie ogólnego komunikatu błędu (`errors.general`)
     - Przywrócenie stanu formularza (włączenie przycisku i pól)
     - Focus pozostaje na polu email (lub przycisku submit)

**Obsługa:** `onSubmit` handler z `preventDefault()`, walidacja, wywołanie API, obsługa odpowiedzi

### 5. Kliknięcie linku "Nie masz konta? Zarejestruj się"

**Akcja:** Użytkownik klika link do rejestracji

**Oczekiwany wynik:**
- Przekierowanie do `/register`
- Opcjonalnie: zachowanie parametru `redirectTo` w URL (jeśli był w `/login?redirect_to=...`)

**Obsługa:** Standardowa nawigacja Astro (`<a href="/register">`)

### 6. Auto-focus na pole email

**Akcja:** Strona jest załadowana

**Oczekiwany wynik:**
- Pole email automatycznie otrzymuje focus
- Kursor jest umieszczony w polu email

**Obsługa:** `useEffect` z `ref` na input email i `focus()` przy mount

### 7. Keyboard navigation

**Akcja:** Użytkownik używa klawiatury do nawigacji

**Oczekiwany wynik:**
- `Tab` - Przejście między polami (email → hasło → toggle → przycisk → link)
- `Enter` - Submit formularza (gdy focus na polu lub przycisku)
- `Escape` - Czyszczenie błędów (opcjonalnie)

**Obsługa:** Standardowa obsługa HTML5 (nie wymaga dodatkowej logiki)

## 9. Warunki i walidacja

### Warunki client-side (weryfikowane przed wysłaniem)

**1. Format email**
- **Warunek:** Email musi mieć format `user@domain.com`
- **Komponent:** `LoginForm.tsx` (pole email)
- **Walidacja:** Regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` lub HTML5 `type="email"`
- **Komunikat:** `"Podaj prawidłowy adres email"`
- **Wpływ na stan:** `errors.email` jest ustawiane, pole ma czerwoną ramkę (`aria-invalid="true"`)

**2. Pole email wymagane**
- **Warunek:** Pole email nie może być puste
- **Komponent:** `LoginForm.tsx` (pole email)
- **Walidacja:** `formData.email.trim().length > 0`
- **Komunikat:** `"Email jest wymagany"`
- **Wpływ na stan:** `errors.email` jest ustawiane, pole ma czerwoną ramkę

**3. Pole hasło wymagane**
- **Warunek:** Pole hasło nie może być puste
- **Komponent:** `LoginForm.tsx` (pole hasło)
- **Walidacja:** `formData.password.length > 0`
- **Komunikat:** `"Hasło jest wymagane"`
- **Wpływ na stan:** `errors.password` jest ustawiane, pole ma czerwoną ramkę

**4. Przycisk submit wyłączony podczas ładowania**
- **Warunek:** `isLoading === true`
- **Komponent:** `LoginForm.tsx` (przycisk submit)
- **Walidacja:** `disabled={isLoading}`
- **Wpływ na stan:** Przycisk jest nieaktywny, pola są wyłączone

### Warunki server-side (weryfikowane przez Supabase Auth)

**1. Email istnieje w systemie**
- **Warunek:** Email musi być zarejestrowany w Supabase Auth
- **Weryfikacja:** Supabase Auth sprawdza, czy użytkownik istnieje
- **Błąd:** `"Invalid login credentials"` (nie ujawniamy, czy email istnieje)
- **Komunikat użytkownika:** `"Nieprawidłowy email lub hasło"` (ogólny komunikat bezpieczeństwa)

**2. Hasło jest poprawne**
- **Warunek:** Hasło musi pasować do hasła użytkownika w Supabase Auth
- **Weryfikacja:** Supabase Auth sprawdza hash hasła
- **Błąd:** `"Invalid login credentials"` (nie ujawniamy, czy email istnieje)
- **Komunikat użytkownika:** `"Nieprawidłowy email lub hasło"` (ogólny komunikat bezpieczeństwa)

**3. Rate limiting**
- **Warunek:** Maksymalnie 10 prób logowania na minutę (na IP/email)
- **Weryfikacja:** Supabase Auth automatycznie blokuje po przekroczeniu limitu
- **Błąd:** `"Too many requests"`
- **Komunikat użytkownika:** `"Zbyt wiele prób logowania. Spróbuj ponownie za chwilę."`

**4. Email potwierdzony (opcjonalnie, jeśli włączone w Supabase)**
- **Warunek:** Email musi być potwierdzony (jeśli włączona weryfikacja email)
- **Weryfikacja:** Supabase Auth sprawdza flagę `email_confirmed_at`
- **Błąd:** `"Email not confirmed"` (w MVP wyłączone, ale obsługa jest)
- **Komunikat użytkownika:** `"Nieprawidłowy email lub hasło"` (nie ujawniamy szczegółów)

### Wpływ błędów na stan interfejsu

**Błędy client-side:**
- Wyświetlane inline pod odpowiednim polem (`errors.email`, `errors.password`)
- Pole ma czerwoną ramkę (`border-red-500`, `aria-invalid="true"`)
- Komunikat jest wyświetlany w `<span>` pod polem z klasą `text-red-600 text-sm`

**Błędy server-side:**
- Wyświetlane w `<Alert variant="destructive">` na górze formularza (`errors.general`)
- Komunikat jest ogólny (nie ujawnia szczegółów bezpieczeństwa)
- Pola pozostają wypełnione (użytkownik może poprawić dane)

**Stan loading:**
- Wszystkie pola są wyłączone (`disabled={isLoading}`)
- Przycisk submit jest wyłączony i pokazuje spinner (opcjonalnie)
- Użytkownik nie może wprowadzać zmian podczas logowania

## 10. Obsługa błędów

### Scenariusze błędów i ich obsługa

**1. Nieprawidłowy email lub hasło**

**Scenariusz:** Użytkownik wprowadza błędne dane logowania

**Obsługa:**
- Supabase zwraca błąd `"Invalid login credentials"` lub `"Email not confirmed"`
- Błąd jest mapowany na ogólny komunikat: `"Nieprawidłowy email lub hasło"`
- Komunikat jest wyświetlany w `<Alert variant="destructive">` na górze formularza
- Pola pozostają wypełnione (użytkownik może poprawić dane)
- Focus pozostaje na polu email (lub przycisku submit)

**Kod:**
```typescript
if (error) {
  setErrors({
    general: mapSupabaseError(error)
  });
  setFormData(prev => ({ ...prev })); // Zachowaj dane
}
```

**2. Rate limiting (zbyt wiele prób)**

**Scenariusz:** Użytkownik przekroczył limit 10 prób/min

**Obsługa:**
- Supabase zwraca błąd `"Too many requests"`
- Błąd jest mapowany na komunikat: `"Zbyt wiele prób logowania. Spróbuj ponownie za chwilę."`
- Komunikat jest wyświetlany w `<Alert variant="destructive">`
- Formularz jest wyłączony na 60 sekund (opcjonalnie, timer)
- Po upływie czasu formularz jest ponownie włączony

**Kod:**
```typescript
if (error?.message === 'Too many requests') {
  setErrors({
    general: 'Zbyt wiele prób logowania. Spróbuj ponownie za chwilę.'
  });
  // Opcjonalnie: timer do ponownego włączenia formularza
}
```

**3. Błąd sieci (brak połączenia)**

**Scenariusz:** Brak połączenia z internetem lub Supabase jest niedostępne

**Obsługa:**
- `fetch` rzuca `TypeError` (network error)
- Błąd jest przechwytywany w `catch` bloku
- Komunikat: `"Błąd połączenia. Sprawdź połączenie internetowe."`
- Komunikat jest wyświetlany w `<Alert variant="destructive">`
- Użytkownik może ponowić próbę

**Kod:**
```typescript
catch (error) {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    setErrors({
      general: 'Błąd połączenia. Sprawdź połączenie internetowe.'
    });
  }
}
```

**4. Nieoczekiwany błąd Supabase**

**Scenariusz:** Supabase zwraca nieznany błąd

**Obsługa:**
- Błąd jest przechwytywany w `catch` bloku
- Komunikat ogólny: `"Wystąpił błąd podczas logowania. Spróbuj ponownie."`
- Komunikat jest wyświetlany w `<Alert variant="destructive">`
- Błąd jest logowany do konsoli (w trybie dev)

**Kod:**
```typescript
catch (error) {
  console.error('Login error:', error);
  setErrors({
    general: 'Wystąpił błąd podczas logowania. Spróbuj ponownie.'
  });
}
```

**5. Błąd walidacji client-side**

**Scenariusz:** Użytkownik próbuje wysłać formularz z nieprawidłowymi danymi

**Obsługa:**
- Walidacja jest wykonywana przed wywołaniem API
- Błędy są wyświetlane inline pod odpowiednimi polami
- Formularz nie jest wysyłany do API
- Użytkownik może poprawić dane

**Kod:**
```typescript
const validationErrors: LoginFormErrors = {};
if (!formData.email || !isValidEmail(formData.email)) {
  validationErrors.email = 'Podaj prawidłowy adres email';
}
if (!formData.password) {
  validationErrors.password = 'Hasło jest wymagane';
}
if (Object.keys(validationErrors).length > 0) {
  setErrors(validationErrors);
  return; // Zatrzymaj submit
}
```

**6. Sesja wygasła (redirect z parametrem `expired=true`)**

**Scenariusz:** Użytkownik został przekierowany z innej strony z powodu wygaśnięcia sesji

**Obsługa:**
- Sprawdzenie parametru URL `expired=true` w `login.astro`
- Wyświetlenie komunikatu: `"Twoja sesja wygasła. Zaloguj się ponownie."`
- Komunikat jest wyświetlany w `<Alert variant="destructive">` (lub info)
- Po zalogowaniu użytkownik jest przekierowany do poprzedniej strony (jeśli `redirectTo`)

**Kod:**
```typescript
// W login.astro
const url = Astro.url;
const expired = url.searchParams.get('expired') === 'true';
const redirectTo = url.searchParams.get('redirect_to') || '/app';

// Przekazanie do LoginForm
<LoginForm client:load redirectTo={redirectTo} showExpiredMessage={expired} />
```

### Edge cases

**1. Użytkownik już zalogowany**
- **Scenariusz:** Użytkownik otwiera `/login`, ale jest już zalogowany
- **Obsługa:** Middleware (opcjonalnie) przekierowuje do `/app` lub komponent sprawdza sesję przy mount i przekierowuje

**2. Puste pola po błędzie**
- **Scenariusz:** Po błędzie użytkownik może chcieć wyczyścić pola
- **Obsługa:** Standardowe zachowanie przeglądarki (użytkownik może ręcznie wyczyścić pola)

**3. Długi czas odpowiedzi**
- **Scenariusz:** Supabase odpowiada bardzo wolno (>5s)
- **Obsługa:** Loading state jest wyświetlany, użytkownik widzi, że trwa logowanie

**4. Równoczesne próby logowania**
- **Scenariusz:** Użytkownik klika przycisk wiele razy
- **Obsługa:** `isLoading` blokuje kolejne próby, przycisk jest wyłączony

## 11. Kroki implementacji

### Krok 1: Przygotowanie struktury plików

1. Utworzenie pliku `src/pages/login.astro`
2. Utworzenie pliku `src/components/auth/LoginForm.tsx`
3. Utworzenie katalogu `src/components/auth/` (jeśli nie istnieje)

### Krok 2: Definicja typów

1. Dodanie typów do `src/lib/types.ts`:
   - `LoginFormData`
   - `LoginFormErrors`
   - `LoginFormProps` (opcjonalnie, jeśli nie w komponencie)

### Krok 3: Implementacja BaseLayout (jeśli nie istnieje)

1. Sprawdzenie, czy `src/layouts/BaseLayout.astro` istnieje
2. Jeśli nie, utworzenie z meta tags i strukturą HTML
3. Dodanie props `title` i `description`

### Krok 4: Implementacja login.astro

1. Import `BaseLayout` i `LoginForm`
2. Pobranie parametrów URL (`redirectTo`, `expired`)
3. Renderowanie struktury HTML:
   - `<BaseLayout>` z tytułem "Logowanie - PrawnikGPT"
   - `<main>` z centrowaniem i stylami
   - `<h1>` z nagłówkiem
   - `<p>` z opisem
   - `<LoginForm client:load />` z props `redirectTo`
   - Link do `/register`
4. Obsługa komunikatu `expired` (opcjonalnie, przekazanie do LoginForm)

### Krok 5: Implementacja LoginForm.tsx - Podstawowa struktura

1. Import zależności:
   - React hooks (`useState`, `useEffect`, `useCallback`)
   - Supabase client (`supabaseClient` z `src/lib/supabase`)
   - Shadcn/ui komponenty (`Input`, `Button`, `Alert`)
   - Typy (`LoginFormData`, `LoginFormErrors`)
   - Ikony (`Eye`, `EyeOff` z `lucide-react`)
2. Definicja komponentu z props
3. Inicjalizacja stanu (`formData`, `errors`, `isLoading`, `showPassword`)
4. Renderowanie podstawowej struktury formularza (bez logiki)

### Krok 6: Implementacja LoginForm.tsx - Walidacja client-side

1. Funkcja `isValidEmail(email: string): boolean` z regex
2. Funkcja `validateForm(): LoginFormErrors` sprawdzająca:
   - Format email
   - Wymagane pola
3. Handler `handleChange` dla pól input:
   - Aktualizacja `formData`
   - Czyszczenie błędów dla danego pola
4. Handler `handleSubmit` z `preventDefault()`:
   - Walidacja przed submit
   - Zatrzymanie, jeśli błędy

### Krok 7: Implementacja LoginForm.tsx - Integracja z Supabase Auth

1. Funkcja `mapSupabaseError(error: AuthError | null): string` mapująca błędy
2. W `handleSubmit`:
   - Ustawienie `isLoading = true`
   - Wywołanie `supabase.auth.signInWithPassword()`
   - Obsługa odpowiedzi:
     - Sukces → przekierowanie do `redirectTo` (lub `/app`)
     - Błąd → mapowanie i wyświetlenie komunikatu
   - Ustawienie `isLoading = false`

### Krok 8: Implementacja LoginForm.tsx - Toggle hasła

1. Handler `handleTogglePassword` przełączający `showPassword`
2. Renderowanie przycisku z ikoną `Eye`/`EyeOff` obok pola hasła
3. Zmiana `type` inputa z `password` na `text` (i odwrotnie)

### Krok 9: Implementacja LoginForm.tsx - Auto-focus

1. `useRef` dla inputa email
2. `useEffect` z `focus()` przy mount
3. Renderowanie inputa z `ref`

### Krok 10: Implementacja LoginForm.tsx - Komunikaty błędów

1. Renderowanie `<Alert variant="destructive">` dla `errors.general` (jeśli istnieje)
2. Renderowanie `<span>` z komunikatami błędów pod polami (`errors.email`, `errors.password`)
3. Dodanie `aria-invalid="true"` do pól z błędami
4. Dodanie `aria-live="polite"` do kontenera z komunikatami błędów

### Krok 11: Implementacja LoginForm.tsx - Loading state

1. Wyłączenie pól input (`disabled={isLoading}`)
2. Wyłączenie przycisku submit (`disabled={isLoading}`)
3. Opcjonalnie: spinner w przycisku podczas ładowania
4. Tekst przycisku: "Logowanie..." podczas `isLoading`

### Krok 12: Implementacja LoginForm.tsx - Accessibility

1. Dodanie `aria-label` do pól input
2. Dodanie `aria-label` do przycisku toggle hasła
3. Dodanie `aria-describedby` do pól z komunikatami błędów
4. Dodanie `role="alert"` do `<Alert>`
5. Testowanie z screen readerem

### Krok 13: Stylowanie i responsywność

1. Użycie klas Tailwind dla layoutu (centrowanie, max-width)
2. Responsywność mobile-first (sprawdzenie na różnych rozdzielczościach)
3. Spójność ze stylem reszty aplikacji (kolory, fonty)

### Krok 14: Testowanie

1. Test logowania z prawidłowymi danymi
2. Test błędnych danych (nieprawidłowy email/hasło)
3. Test walidacji client-side (puste pola, zły format email)
4. Test toggle hasła
5. Test redirect po sukcesie
6. Test komunikatu `expired` (jeśli zaimplementowane)
7. Test accessibility (keyboard navigation, screen reader)
8. Test responsywności (mobile, tablet, desktop)

### Krok 15: Dokumentacja i cleanup

1. Dodanie JSDoc komentarzy do funkcji
2. Sprawdzenie, czy nie ma `console.log` (użyć loggera w prod)
3. Sprawdzenie, czy wszystkie importy są używane
4. Sprawdzenie zgodności z ESLint i Prettier
5. Aktualizacja checklisty w `.ai/view-implementations/login-page-view-implementation-plan-note.md`

### Krok 16: Integracja z resztą aplikacji

1. Sprawdzenie, czy middleware przekierowuje zalogowanych użytkowników z `/login` do `/app`
2. Sprawdzenie, czy linki do `/login` w aplikacji są poprawne
3. Test przepływu: rejestracja → logowanie → aplikacja

---

**Uwagi końcowe:**
- Wszystkie komunikaty błędów powinny być w języku polskim
- Komunikaty bezpieczeństwa nie powinny ujawniać, czy email istnieje w systemie
- Formularz powinien być w pełni dostępny (WCAG AA)
- Kod powinien być zgodny z konwencjami projektu (TypeScript, Tailwind, Shadcn/ui)

