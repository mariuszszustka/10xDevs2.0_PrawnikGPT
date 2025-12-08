# Plan implementacji widoku Settings

## 1. Przegląd

Widok Settings (Ustawienia) umożliwia użytkownikowi zarządzanie kontem i preferencjami aplikacji. Widok składa się z trzech głównych sekcji:

1. **Sekcja "Profil"** - Wyświetla email użytkownika (read-only) oraz formularz zmiany hasła
2. **Sekcja "Preferencje"** - Opcjonalna w MVP (dark mode toggle, post-MVP)
3. **Sekcja "Konto"** - Przycisk usuwania konta z modalem potwierdzenia

Widok jest chroniony i wymaga autentykacji. Wszystkie operacje wykorzystują Supabase Auth SDK po stronie klienta (zmiana hasła) lub opcjonalnie backend endpoint (usunięcie konta dla bezpieczeństwa).

**Główne funkcjonalności:**
- Zmiana hasła z walidacją i wskaźnikiem siły hasła
- Usunięcie konta z podwójnym potwierdzeniem (checkbox + przycisk)
- Wyświetlanie informacji o profilu użytkownika
- Obsługa błędów z przyjaznymi komunikatami
- Pełna dostępność (WCAG AA) - ARIA labels, keyboard navigation, focus trap

## 2. Routing widoku

**Ścieżka:** `/app/settings`

**Plik:** `src/pages/app/settings.astro`

**Middleware:** Wymaga autentykacji (sprawdzanie sesji przez middleware)

**Layout:** `AppLayout.astro` (chroniony layout z headerem i footerem)

## 3. Struktura komponentów

```
settings.astro (Astro SSR page)
├── AppLayout.astro
│   ├── Header.astro
│   └── Footer.astro
└── SettingsLayout.astro (Astro component)
    ├── Section: Profil
    │   ├── Email display (read-only, Astro)
    │   └── ChangePasswordForm.tsx (React island, client:load)
    ├── Section: Preferencje (opcjonalnie, post-MVP)
    └── Section: Konto
        └── DeleteAccountButton.tsx (React island, client:load)
```

**Hierarchia komponentów:**

1. **settings.astro** - Główna strona Astro (SSR)
   - Pobiera dane użytkownika z Supabase (email)
   - Renderuje `SettingsLayout.astro`
   - Przekazuje email do layoutu

2. **SettingsLayout.astro** - Layout z sekcjami (Astro component)
   - Sekcja "Profil" z emailem i formularzem
   - Sekcja "Konto" z przyciskiem usuwania
   - Card-based layout (Shadcn/ui Card)

3. **ChangePasswordForm.tsx** - Formularz zmiany hasła (React island)
   - 3 pola: currentPassword, newPassword, newPasswordConfirm
   - Walidacja w czasie rzeczywistym
   - Wskaźnik siły hasła (opcjonalnie)
   - Integracja z Supabase Auth SDK

4. **DeleteAccountButton.tsx** - Przycisk usuwania konta (React island)
   - Przycisk destructive (czerwony)
   - Modal potwierdzenia (Shadcn/ui Dialog)
   - Podwójne potwierdzenie (checkbox + przycisk)
   - Integracja z Supabase Auth SDK lub backend API

## 4. Szczegóły komponentów

### 4.1. settings.astro

**Opis komponentu:**
Główna strona Astro renderująca widok ustawień. Pobiera dane użytkownika z Supabase (email) i renderuje layout z sekcjami.

**Główne elementy:**
- `<AppLayout>` - Chroniony layout z headerem i footerem
- `<SettingsLayout>` - Layout z sekcjami ustawień
- Import React islands (`ChangePasswordForm`, `DeleteAccountButton`)

**Obsługiwane zdarzenia:**
- Brak (strona statyczna, logika w React islands)

**Obsługiwana walidacja:**
- Sprawdzenie autentykacji (middleware)
- Sprawdzenie, czy użytkownik jest zalogowany

**Typy:**
- `User` - Typ użytkownika z Supabase (pobierany z `Astro.locals.supabase.auth.getUser()`)

**Props:**
- Brak (strona Astro)

### 4.2. SettingsLayout.astro

**Opis komponentu:**
Astro component renderujący layout z sekcjami ustawień. Zawiera trzy sekcje: Profil, Preferencje (opcjonalnie), Konto. Używa Shadcn/ui Card dla każdej sekcji.

**Główne elementy:**
- `<Card>` - Shadcn/ui Card dla każdej sekcji
- `<CardHeader>` - Nagłówek sekcji z tytułem
- `<CardContent>` - Zawartość sekcji
- `<div class="space-y-6">` - Kontener sekcji z odstępami
- Email display (read-only, `<p>` z wartością)
- `<ChangePasswordForm client:load />` - React island dla formularza
- `<DeleteAccountButton client:load />` - React island dla przycisku

**Obsługiwane zdarzenia:**
- Brak (komponent statyczny, logika w React islands)

**Obsługiwana walidacja:**
- Brak (walidacja w React islands)

**Typy:**
- Props:
  ```typescript
  interface SettingsLayoutProps {
    userEmail: string; // Email użytkownika do wyświetlenia
  }
  ```

**Props:**
- `userEmail: string` - Email użytkownika przekazywany z `settings.astro`

### 4.3. ChangePasswordForm.tsx

**Opis komponentu:**
React island renderujący formularz zmiany hasła z trzema polami: obecne hasło, nowe hasło, potwierdzenie nowego hasła. Wykonuje walidację w czasie rzeczywistym, wyświetla wskaźnik siły hasła (opcjonalnie) i integruje się z Supabase Auth SDK. Wymaga ponownego uwierzytelnienia przed zmianą hasła (security best practice).

**Główne elementy:**
- `<form>` - Formularz HTML5 z `onSubmit` handler
- `<Input>` - Shadcn/ui Input dla `currentPassword` (type="password")
- `<Input>` - Shadcn/ui Input dla `newPassword` (type="password", z toggle widoczności)
- `<Input>` - Shadcn/ui Input dla `newPasswordConfirm` (type="password", z toggle widoczności)
- `<Button>` - Shadcn/ui Button (type="submit", disabled podczas loading)
- `<Alert>` - Shadcn/ui Alert dla błędów (variant="destructive")
- `<div>` - Wskaźnik siły hasła (opcjonalnie, progress bar lub badge)
- `<span>` - Komunikaty błędów pod polami
- Ikony `Eye`/`EyeOff` z `lucide-react` dla toggle hasła

**Obsługiwane zdarzenia:**
- `onSubmit: (e: React.FormEvent) => void` - Submit formularza
- `onChange: (e: React.ChangeEvent<HTMLInputElement>) => void` - Zmiana wartości pól
- `onClick: () => void` - Toggle widoczności hasła (dla każdego pola osobno)

**Obsługiwana walidacja:**
- **Obecne hasło (currentPassword):**
  - Pole wymagane (required)
  - Minimum 1 znak (Supabase wymaga non-empty)
  - Komunikat: "Obecne hasło jest wymagane"
- **Nowe hasło (newPassword):**
  - Pole wymagane (required)
  - Minimum 8 znaków
  - Komunikat: "Hasło musi mieć minimum 8 znaków"
  - Wskaźnik siły hasła (opcjonalnie): weak/medium/strong
- **Potwierdzenie hasła (newPasswordConfirm):**
  - Pole wymagane (required)
  - Musi być zgodne z `newPassword`
  - Komunikat: "Hasła muszą być identyczne"
- **Server-side (Supabase Auth):**
  - Ponowne uwierzytelnienie: sprawdzenie, czy `currentPassword` jest poprawne
  - Zmiana hasła: walidacja siły hasła przez Supabase (min 8 znaków)

**Typy:**
- **Props:**
  ```typescript
  interface ChangePasswordFormProps {
    // Brak props (komponent standalone)
  }
  ```
- **State:**
  ```typescript
  interface ChangePasswordFormState {
    formData: ChangePasswordFormData;
    errors: ChangePasswordFormErrors;
    isLoading: boolean;
    showCurrentPassword: boolean;
    showNewPassword: boolean;
    showNewPasswordConfirm: boolean;
    passwordStrength: PasswordStrength | null;
  }
  ```

**Props:**
- Brak (komponent standalone)

**Custom Hooks:**
- `usePasswordStrength(password: string): PasswordStrength` - Obliczanie siły hasła (opcjonalnie)

### 4.4. DeleteAccountButton.tsx

**Opis komponentu:**
React island renderujący przycisk usuwania konta z modalem potwierdzenia. Modal zawiera ostrzeżenie, checkbox "Rozumiem konsekwencje" oraz przyciski "Anuluj" i "Usuń konto". Wykonuje usunięcie konta przez Supabase Auth SDK lub backend endpoint (opcjonalnie, dla bezpieczeństwa).

**Główne elementy:**
- `<Button>` - Shadcn/ui Button (variant="destructive", czerwony)
- `<Dialog>` - Shadcn/ui Dialog (modal potwierdzenia)
- `<DialogContent>` - Zawartość modala
- `<DialogHeader>` - Nagłówek modala z tytułem
- `<DialogDescription>` - Opis ostrzeżenia
- `<Checkbox>` - Shadcn/ui Checkbox ("Rozumiem konsekwencje")
- `<DialogFooter>` - Stopka modala z przyciskami
- `<Button>` - Przycisk "Anuluj" (variant="outline")
- `<Button>` - Przycisk "Usuń konto" (variant="destructive", disabled jeśli checkbox nie zaznaczony)
- Focus trap: Focus pozostaje w modalu, przywrócenie focus po zamknięciu

**Obsługiwane zdarzenia:**
- `onClick: () => void` - Otwarcie modala (przycisk "Usuń konto")
- `onChange: (checked: boolean) => void` - Zmiana stanu checkboxa
- `onClick: () => void` - Zamknięcie modala (przycisk "Anuluj", backdrop, ESC)
- `onClick: () => Promise<void>` - Potwierdzenie usunięcia (przycisk "Usuń konto")

**Obsługiwana walidacja:**
- **Checkbox "Rozumiem konsekwencje":**
  - Musi być zaznaczony przed włączeniem przycisku "Usuń konto"
  - Przycisk "Usuń konto" jest disabled, jeśli checkbox nie zaznaczony
- **Server-side (Supabase Auth lub Backend):**
  - Weryfikacja ownership (tylko właściciel konta może je usunąć)
  - Kaskadowe usunięcie danych (zapytania, oceny)

**Typy:**
- **Props:**
  ```typescript
  interface DeleteAccountButtonProps {
    // Brak props (komponent standalone)
  }
  ```
- **State:**
  ```typescript
  interface DeleteAccountButtonState {
    isModalOpen: boolean;
    isConfirmChecked: boolean;
    isLoading: boolean;
  }
  ```

**Props:**
- Brak (komponent standalone)

## 5. Typy

### 5.1. ChangePasswordFormData

**Opis:** DTO reprezentujący dane formularza zmiany hasła.

**Pola:**
- `currentPassword: string` - Obecne hasło użytkownika (wymagane, minimum 1 znak)
- `newPassword: string` - Nowe hasło użytkownika (wymagane, minimum 8 znaków)
- `newPasswordConfirm: string` - Potwierdzenie nowego hasła (wymagane, musi być zgodne z `newPassword`)

**Użycie:** Przekazywane do funkcji zmiany hasła (ponowne uwierzytelnienie + updateUser)

**Definicja:**
```typescript
export interface ChangePasswordFormData {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
}
```

### 5.2. ChangePasswordFormErrors

**Opis:** ViewModel reprezentujący błędy walidacji formularza zmiany hasła.

**Pola:**
- `currentPassword?: string` - Komunikat błędu dla pola obecnego hasła (opcjonalny)
- `newPassword?: string` - Komunikat błędu dla pola nowego hasła (opcjonalny)
- `newPasswordConfirm?: string` - Komunikat błędu dla pola potwierdzenia hasła (opcjonalny)
- `general?: string` - Ogólny komunikat błędu (np. z Supabase Auth, opcjonalny)

**Użycie:** Wyświetlanie komunikatów błędów w UI

**Definicja:**
```typescript
export interface ChangePasswordFormErrors {
  currentPassword?: string;
  newPassword?: string;
  newPasswordConfirm?: string;
  general?: string;
}
```

### 5.3. PasswordStrength

**Opis:** Enum reprezentujący siłę hasła (opcjonalnie, dla wskaźnika siły hasła).

**Wartości:**
- `'weak'` - Słabe hasło (mniej niż 8 znaków lub tylko litery/cyfry)
- `'medium'` - Średnie hasło (8+ znaków, litery + cyfry lub znaki specjalne)
- `'strong'` - Silne hasło (8+ znaków, litery + cyfry + znaki specjalne)

**Użycie:** Wyświetlanie wskaźnika siły hasła w UI (progress bar lub badge)

**Definicja:**
```typescript
export type PasswordStrength = 'weak' | 'medium' | 'strong';
```

### 5.4. Supabase Auth Types (używane, nie definiowane lokalnie)

**User:**
- Typ z `@supabase/supabase-js`
- Zawiera `id`, `email`, `created_at`, `updated_at`

**Session:**
- Typ z `@supabase/supabase-js`
- Zawiera `access_token`, `refresh_token`, `user`, `expires_at`

**AuthError:**
- Typ z `@supabase/supabase-js`
- Zawiera `message`, `status`, `name`

**AuthResponse:**
- Typ z `@supabase/supabase-js`
- Zawiera `data: { session, user }`, `error: AuthError | null`

**UserResponse:**
- Typ z `@supabase/supabase-js`
- Zawiera `data: { user }`, `error: AuthError | null`

### 5.5. SettingsLayoutProps

**Opis:** Propsy komponentu SettingsLayout.

**Pola:**
- `userEmail: string` - Email użytkownika do wyświetlenia w sekcji "Profil"

**Użycie:** Przekazywane z `settings.astro` do `SettingsLayout.astro`

**Definicja:**
```typescript
export interface SettingsLayoutProps {
  userEmail: string;
}
```

## 6. Zarządzanie stanem

**Strategia:** Lokalny stan w komponentach React (`useState`)

### 6.1. ChangePasswordForm - Stan komponentu

1. **formData: ChangePasswordFormData**
   - Cel: Przechowywanie wartości pól formularza (currentPassword, newPassword, newPasswordConfirm)
   - Inicjalizacja: `{ currentPassword: '', newPassword: '', newPasswordConfirm: '' }`
   - Aktualizacja: `onChange` w polach input

2. **errors: ChangePasswordFormErrors**
   - Cel: Przechowywanie komunikatów błędów walidacji
   - Inicjalizacja: `{}`
   - Aktualizacja:
     - Client-side: podczas walidacji w `onChange` lub `onSubmit`
     - Server-side: po otrzymaniu błędu z Supabase Auth

3. **isLoading: boolean**
   - Cel: Wskaźnik stanu ładowania podczas zmiany hasła
   - Inicjalizacja: `false`
   - Aktualizacja: `true` przed wywołaniem API, `false` po zakończeniu (sukces lub błąd)

4. **showCurrentPassword: boolean**
   - Cel: Kontrola widoczności obecnego hasła (toggle)
   - Inicjalizacja: `false`
   - Aktualizacja: `onClick` przycisku toggle

5. **showNewPassword: boolean**
   - Cel: Kontrola widoczności nowego hasła (toggle)
   - Inicjalizacja: `false`
   - Aktualizacja: `onClick` przycisku toggle

6. **showNewPasswordConfirm: boolean**
   - Cel: Kontrola widoczności potwierdzenia hasła (toggle)
   - Inicjalizacja: `false`
   - Aktualizacja: `onClick` przycisku toggle

7. **passwordStrength: PasswordStrength | null**
   - Cel: Przechowywanie siły hasła (dla wskaźnika, opcjonalnie)
   - Inicjalizacja: `null`
   - Aktualizacja: Obliczanie w `onChange` dla pola `newPassword`

### 6.2. DeleteAccountButton - Stan komponentu

1. **isModalOpen: boolean**
   - Cel: Kontrola widoczności modala potwierdzenia
   - Inicjalizacja: `false`
   - Aktualizacja: `onClick` przycisku "Usuń konto" (otwarcie), `onClick` przycisku "Anuluj" lub zamknięcie (zamknięcie)

2. **isConfirmChecked: boolean**
   - Cel: Stan checkboxa "Rozumiem konsekwencje"
   - Inicjalizacja: `false`
   - Aktualizacja: `onChange` checkboxa

3. **isLoading: boolean**
   - Cel: Wskaźnik stanu ładowania podczas usuwania konta
   - Inicjalizacja: `false`
   - Aktualizacja: `true` przed wywołaniem API, `false` po zakończeniu (sukces lub błąd)

### 6.3. Custom Hooks

**usePasswordStrength (opcjonalnie):**
- **Cel:** Obliczanie siły hasła na podstawie długości i złożoności
- **Parametry:** `password: string`
- **Zwraca:** `PasswordStrength | null`
- **Logika:**
  - `null` - jeśli hasło jest puste
  - `'weak'` - jeśli hasło ma mniej niż 8 znaków lub tylko litery/cyfry
  - `'medium'` - jeśli hasło ma 8+ znaków i zawiera litery + cyfry lub znaki specjalne
  - `'strong'` - jeśli hasło ma 8+ znaków i zawiera litery + cyfry + znaki specjalne

**Brak globalnego stanu:** Sesja użytkownika jest zarządzana przez Supabase SDK (localStorage/cookies).

**Optymalizacja:**
- `useCallback` dla funkcji `handleSubmit`, `handleChange`, `handleTogglePassword` (memoizacja)
- `useMemo` dla obliczania siły hasła (opcjonalnie)

## 7. Integracja API

**Brak bezpośredniej integracji z backend API** - widok używa **Supabase Auth SDK** po stronie klienta.

### 7.1. Change Password

**Supabase Auth Methods:**

**1. signInWithPassword (ponowne uwierzytelnienie)**
- **Metoda:** `supabase.auth.signInWithPassword({ email, password })`
- **Typ żądania:**
  ```typescript
  {
    email: string;
    password: string; // currentPassword
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
- **Użycie:** Weryfikacja obecnego hasła przed zmianą (security best practice)

**2. updateUser (zmiana hasła)**
- **Metoda:** `supabase.auth.updateUser({ password: newPassword })`
- **Typ żądania:**
  ```typescript
  {
    password: string; // newPassword
  }
  ```
- **Typ odpowiedzi:**
  ```typescript
  {
    data: {
      user: User | null;
    };
    error: AuthError | null;
  }
  ```
- **Użycie:** Zmiana hasła użytkownika (wymaga ponownego uwierzytelnienia)

**Przepływ:**
1. Użytkownik wypełnia formularz (currentPassword, newPassword, newPasswordConfirm)
2. Walidacja client-side (format, długość, zgodność)
3. Ponowne uwierzytelnienie: `signInWithPassword({ email: user.email, password: currentPassword })`
4. Jeśli sukces: `updateUser({ password: newPassword })`
5. Jeśli błąd: Wyświetlenie komunikatu błędu

### 7.2. Delete Account

**Opcja 1: Supabase Auth SDK (MVP)**
- **Metoda:** `supabase.auth.admin.deleteUser(userId)` - **UWAGA:** Wymaga service role key (nie dostępne po stronie klienta)
- **Alternatywa:** Użycie backend endpoint (zalecane dla bezpieczeństwa)

**Opcja 2: Backend Endpoint (zalecane)**
- **Endpoint:** `DELETE /api/v1/users/me`
- **Typ żądania:** Brak body (user_id z JWT token)
- **Typ odpowiedzi:** `204 No Content` (sukces) lub `ErrorResponse` (błąd)
- **Użycie:** Usunięcie konta użytkownika z weryfikacją ownership i kaskadowym usunięciem danych

**Przepływ:**
1. Użytkownik klika "Usuń konto"
2. Modal potwierdzenia z checkboxem "Rozumiem konsekwencje"
3. Użytkownik zaznacza checkbox i klika "Usuń konto"
4. Wywołanie `DELETE /api/v1/users/me` (lub Supabase Auth SDK)
5. Backend wykonuje:
   - Weryfikację ownership
   - Kaskadowe usunięcie danych (zapytania, oceny)
   - Usunięcie użytkownika z Supabase Auth
6. Jeśli sukces: Przekierowanie do `/login` z komunikatem
7. Jeśli błąd: Wyświetlenie komunikatu błędu

### 7.3. Mapowanie błędów Supabase na komunikaty użytkownika

**Supabase Auth Error Codes → Komunikaty:**

- `"Invalid login credentials"` → `"Nieprawidłowe obecne hasło"` (dla ponownego uwierzytelnienia)
- `"Password should be at least 8 characters"` → `"Hasło musi mieć minimum 8 znaków"`
- `"New password should be different from the old password"` → `"Nowe hasło musi różnić się od obecnego"`
- `"Too many requests"` → `"Zbyt wiele prób. Spróbuj ponownie za chwilę."`
- `"Network error"` → `"Błąd połączenia. Sprawdź połączenie internetowe."`
- `"User not found"` → `"Użytkownik nie został znaleziony. Zaloguj się ponownie."` (dla usunięcia konta)

## 8. Interakcje użytkownika

### 8.1. Zmiana hasła

**Akcja:** Użytkownik wypełnia formularz i klika "Zmień hasło"

**Oczekiwany wynik:**
1. Walidacja client-side (format, długość, zgodność)
2. Jeśli błędy: Wyświetlenie komunikatów błędów pod polami
3. Jeśli poprawne: Ponowne uwierzytelnienie (`signInWithPassword`)
4. Jeśli ponowne uwierzytelnienie sukces: Zmiana hasła (`updateUser`)
5. Jeśli sukces: Toast notification "Hasło zostało zmienione pomyślnie"
6. Jeśli błąd: Wyświetlenie komunikatu błędu (Alert lub toast)

**Obsługa:** `handleSubmit` w `ChangePasswordForm.tsx`

### 8.2. Toggle widoczności hasła

**Akcja:** Użytkownik klika ikonę oka obok pola hasła

**Oczekiwany wynik:**
- Zmiana `type` inputa z `password` na `text` (i odwrotnie)
- Zmiana ikony z `Eye` na `EyeOff` (i odwrotnie)

**Obsługa:** `handleTogglePassword` w `ChangePasswordForm.tsx` (dla każdego pola osobno)

### 8.3. Wskaźnik siły hasła (opcjonalnie)

**Akcja:** Użytkownik wpisuje nowe hasło

**Oczekiwany wynik:**
- Obliczanie siły hasła w czasie rzeczywistym (`usePasswordStrength`)
- Wyświetlanie wskaźnika (progress bar lub badge) z kolorami:
  - Czerwony: weak
  - Żółty: medium
  - Zielony: strong

**Obsługa:** `onChange` w polu `newPassword` + `usePasswordStrength` hook

### 8.4. Otwarcie modala usunięcia konta

**Akcja:** Użytkownik klika przycisk "Usuń konto"

**Oczekiwany wynik:**
- Otwarcie modala z ostrzeżeniem
- Focus trap: Focus pozostaje w modalu
- Checkbox "Rozumiem konsekwencje" jest niezaznaczony
- Przycisk "Usuń konto" jest disabled

**Obsługa:** `onClick` przycisku "Usuń konto" → `setIsModalOpen(true)`

### 8.5. Zaznaczenie checkboxa w modalu

**Akcja:** Użytkownik zaznacza checkbox "Rozumiem konsekwencje"

**Oczekiwany wynik:**
- Checkbox jest zaznaczony
- Przycisk "Usuń konto" jest enabled

**Obsługa:** `onChange` checkboxa → `setIsConfirmChecked(true)`

### 8.6. Potwierdzenie usunięcia konta

**Akcja:** Użytkownik zaznacza checkbox i klika "Usuń konto"

**Oczekiwany wynik:**
1. Wywołanie `DELETE /api/v1/users/me` (lub Supabase Auth SDK)
2. Loading state: Przycisk "Usuń konto" jest disabled, pokazuje spinner
3. Jeśli sukces: Przekierowanie do `/login` z komunikatem "Twoje konto zostało usunięte"
4. Jeśli błąd: Wyświetlenie komunikatu błędu (Alert w modalu lub toast)

**Obsługa:** `handleDeleteAccount` w `DeleteAccountButton.tsx`

### 8.7. Anulowanie usunięcia konta

**Akcja:** Użytkownik klika "Anuluj" lub zamyka modal (ESC, backdrop)

**Oczekiwany wynik:**
- Zamknięcie modala
- Reset stanu: `isConfirmChecked = false`
- Przywrócenie focus do przycisku "Usuń konto"

**Obsługa:** `onClick` przycisku "Anuluj" lub `onOpenChange(false)` w Dialog

### 8.8. Keyboard navigation

**Akcja:** Użytkownik używa klawiatury do nawigacji

**Oczekiwany wynik:**
- `Tab` - Przejście między polami (formularz) lub elementami (modal)
- `Enter` - Submit formularza (gdy focus na polu lub przycisku)
- `Escape` - Zamknięcie modala (gdy modal otwarty)
- Focus trap w modalu: Focus pozostaje w modalu, nie można wyjść poza modal

**Obsługa:** Standardowa obsługa HTML5 + Shadcn/ui Dialog (focus trap)

## 9. Warunki i walidacja

### 9.1. Warunki client-side (weryfikowane przed wysłaniem)

**1. Obecne hasło wymagane**
- **Warunek:** Pole `currentPassword` nie może być puste
- **Komponent:** `ChangePasswordForm.tsx` (pole currentPassword)
- **Walidacja:** `formData.currentPassword.trim().length > 0`
- **Komunikat:** `"Obecne hasło jest wymagane"`
- **Wpływ na stan:** `errors.currentPassword` jest ustawiane, pole ma czerwoną ramkę (`aria-invalid="true"`)

**2. Nowe hasło wymagane**
- **Warunek:** Pole `newPassword` nie może być puste
- **Komponent:** `ChangePasswordForm.tsx` (pole newPassword)
- **Walidacja:** `formData.newPassword.length > 0`
- **Komunikat:** `"Nowe hasło jest wymagane"`
- **Wpływ na stan:** `errors.newPassword` jest ustawiane, pole ma czerwoną ramkę

**3. Nowe hasło minimum 8 znaków**
- **Warunek:** Pole `newPassword` musi mieć minimum 8 znaków
- **Komponent:** `ChangePasswordForm.tsx` (pole newPassword)
- **Walidacja:** `formData.newPassword.length >= 8`
- **Komunikat:** `"Hasło musi mieć minimum 8 znaków"`
- **Wpływ na stan:** `errors.newPassword` jest ustawiane, pole ma czerwoną ramkę

**4. Potwierdzenie hasła wymagane**
- **Warunek:** Pole `newPasswordConfirm` nie może być puste
- **Komponent:** `ChangePasswordForm.tsx` (pole newPasswordConfirm)
- **Walidacja:** `formData.newPasswordConfirm.length > 0`
- **Komunikat:** `"Potwierdzenie hasła jest wymagane"`
- **Wpływ na stan:** `errors.newPasswordConfirm` jest ustawiane, pole ma czerwoną ramkę

**5. Zgodność haseł**
- **Warunek:** Pole `newPasswordConfirm` musi być zgodne z `newPassword`
- **Komponent:** `ChangePasswordForm.tsx` (pole newPasswordConfirm)
- **Walidacja:** `formData.newPassword === formData.newPasswordConfirm`
- **Komunikat:** `"Hasła muszą być identyczne"`
- **Wpływ na stan:** `errors.newPasswordConfirm` jest ustawiane, pole ma czerwoną ramkę

**6. Przycisk submit wyłączony podczas ładowania**
- **Warunek:** `isLoading === true`
- **Komponent:** `ChangePasswordForm.tsx` (przycisk submit)
- **Walidacja:** `disabled={isLoading}`
- **Wpływ na stan:** Przycisk jest nieaktywny, pola są wyłączone

**7. Checkbox "Rozumiem konsekwencje" wymagany**
- **Warunek:** Checkbox musi być zaznaczony przed włączeniem przycisku "Usuń konto"
- **Komponent:** `DeleteAccountButton.tsx` (przycisk "Usuń konto" w modalu)
- **Walidacja:** `disabled={!isConfirmChecked}`
- **Wpływ na stan:** Przycisk "Usuń konto" jest disabled, jeśli checkbox nie zaznaczony

### 9.2. Warunki server-side (weryfikowane przez Supabase Auth)

**1. Obecne hasło poprawne (ponowne uwierzytelnienie)**
- **Warunek:** `currentPassword` musi być poprawne dla użytkownika
- **Weryfikacja:** Supabase Auth sprawdza, czy hasło jest poprawne (`signInWithPassword`)
- **Błąd:** `"Invalid login credentials"`
- **Komunikat użytkownika:** `"Nieprawidłowe obecne hasło"`

**2. Nowe hasło różni się od obecnego**
- **Warunek:** `newPassword` musi różnić się od `currentPassword`
- **Weryfikacja:** Supabase Auth sprawdza, czy nowe hasło różni się od obecnego
- **Błąd:** `"New password should be different from the old password"`
- **Komunikat użytkownika:** `"Nowe hasło musi różnić się od obecnego"`

**3. Siła hasła (Supabase)**
- **Warunek:** Hasło musi spełniać wymagania Supabase (minimum 8 znaków)
- **Weryfikacja:** Supabase Auth sprawdza siłę hasła
- **Błąd:** `"Password should be at least 8 characters"`
- **Komunikat użytkownika:** `"Hasło musi mieć minimum 8 znaków"`

**4. Ownership konta (dla usunięcia)**
- **Warunek:** Tylko właściciel konta może je usunąć
- **Weryfikacja:** Backend sprawdza, czy `user_id` z JWT token odpowiada kontu do usunięcia
- **Błąd:** `401 Unauthorized` lub `403 Forbidden`
- **Komunikat użytkownika:** `"Nie masz uprawnień do usunięcia tego konta"`

## 10. Obsługa błędów

### 10.1. Błędy walidacji client-side

**Format wyświetlania:**
- Komunikaty błędów pod polami (`<span>` z klasą `text-red-600`)
- Czerwona ramka wokół pól z błędami (`border-red-500`)
- `aria-invalid="true"` dla pól z błędami
- `aria-describedby` wskazujący na komunikat błędu

**Czyszczenie błędów:**
- Błędy są czyszczone w `onChange` dla danego pola
- Błędy są czyszczone po pomyślnym submit

### 10.2. Błędy Supabase Auth (zmiana hasła)

**Mapowanie błędów:**
- `"Invalid login credentials"` → `"Nieprawidłowe obecne hasło"` (Alert lub toast)
- `"Password should be at least 8 characters"` → `"Hasło musi mieć minimum 8 znaków"` (pod polem)
- `"New password should be different from the old password"` → `"Nowe hasło musi różnić się od obecnego"` (Alert lub toast)
- `"Too many requests"` → `"Zbyt wiele prób. Spróbuj ponownie za chwilę."` (Alert lub toast)
- `"Network error"` → `"Błąd połączenia. Sprawdź połączenie internetowe."` (Alert lub toast)

**Format wyświetlania:**
- Ogólne błędy: `<Alert variant="destructive">` na górze formularza
- Błędy specyficzne dla pól: Komunikaty pod polami

### 10.3. Błędy usunięcia konta

**Mapowanie błędów:**
- `401 Unauthorized` → `"Nie masz uprawnień do usunięcia tego konta. Zaloguj się ponownie."`
- `403 Forbidden` → `"Nie masz uprawnień do usunięcia tego konta."`
- `404 Not Found` → `"Konto nie zostało znalezione."`
- `500 Internal Server Error` → `"Wystąpił błąd serwera. Spróbuj ponownie później."`
- `"Network error"` → `"Błąd połączenia. Sprawdź połączenie internetowe."`

**Format wyświetlania:**
- Błędy w modalu: `<Alert variant="destructive">` w `DialogContent`
- Błędy poza modalem: Toast notification (jeśli modal zamknięty)

### 10.4. Loading states

**Zmiana hasła:**
- Przycisk "Zmień hasło" pokazuje spinner i jest disabled
- Wszystkie pola są disabled
- Komunikaty błędów są ukryte (opcjonalnie)

**Usunięcie konta:**
- Przycisk "Usuń konto" pokazuje spinner i jest disabled
- Przycisk "Anuluj" jest disabled (opcjonalnie)
- Modal nie może być zamknięty podczas loading (opcjonalnie)

### 10.5. Komunikaty sukcesu

**Zmiana hasła:**
- Toast notification: "Hasło zostało zmienione pomyślnie"
- Formularz jest resetowany (pola są czyszczone)
- Komunikaty błędów są czyszczone

**Usunięcie konta:**
- Przekierowanie do `/login` z komunikatem: "Twoje konto zostało usunięte" (query parameter lub toast po przekierowaniu)

## 11. Kroki implementacji

### 11.1. Przygotowanie środowiska

1. **Sprawdzenie zależności:**
   - Upewnij się, że wszystkie zależności są zainstalowane (`npm install`)
   - Sprawdź czy `src/lib/supabase.ts` zawiera konfigurację Supabase client
   - Sprawdź czy `src/lib/types.ts` zawiera wszystkie wymagane typy (lub utwórz nowe)

2. **Sprawdzenie backendu (opcjonalnie):**
   - Jeśli używasz backend endpoint dla usunięcia konta, upewnij się, że endpoint `DELETE /api/v1/users/me` jest zaimplementowany
   - Sprawdź czy backend wykonuje kaskadowe usunięcie danych (zapytania, oceny)

### 11.2. Utworzenie typów

3. **Utworzenie `src/lib/types/settings.ts` (lub dodanie do `src/lib/types.ts`):**
   - `ChangePasswordFormData` interface
   - `ChangePasswordFormErrors` interface
   - `PasswordStrength` type
   - `SettingsLayoutProps` interface (opcjonalnie)

### 11.3. Utworzenie utility functions (opcjonalnie)

4. **Utworzenie `src/lib/utils/passwordStrength.ts`:**
   - Funkcja `calculatePasswordStrength(password: string): PasswordStrength | null`
   - Logika obliczania siły hasła (weak/medium/strong)
   - Testy jednostkowe dla różnych przypadków

### 11.4. Utworzenie komponentów React (islands)

5. **Utworzenie `src/components/settings/ChangePasswordForm.tsx`:**
   - Import zależności (React hooks, Supabase client, Shadcn/ui, typy)
   - Definicja komponentu z props (brak props)
   - Inicjalizacja stanu (formData, errors, isLoading, showPassword toggles, passwordStrength)
   - Renderowanie podstawowej struktury formularza (bez logiki)

6. **Implementacja walidacji client-side w `ChangePasswordForm.tsx`:**
   - Funkcja `validateForm(): ChangePasswordFormErrors`
   - Funkcja `isValidEmail(email: string): boolean` (niepotrzebna, ale dla spójności)
   - Handler `handleChange` dla pól input:
     - Aktualizacja `formData`
     - Czyszczenie błędów dla danego pola
     - Obliczanie siły hasła (dla `newPassword`, opcjonalnie)
   - Handler `handleSubmit` z `preventDefault()`:
     - Walidacja przed submit
     - Zatrzymanie, jeśli błędy

7. **Implementacja integracji z Supabase Auth w `ChangePasswordForm.tsx`:**
   - Funkcja `mapSupabaseError(error: AuthError | null): string` mapująca błędy
   - W `handleSubmit`:
     - Ustawienie `isLoading = true`
     - Pobranie email użytkownika z sesji (`supabase.auth.getUser()`)
     - Ponowne uwierzytelnienie: `supabase.auth.signInWithPassword({ email, password: currentPassword })`
     - Jeśli sukces: `supabase.auth.updateUser({ password: newPassword })`
     - Obsługa odpowiedzi:
       - Sukces → Toast notification, reset formularza
       - Błąd → Mapowanie i wyświetlenie komunikatu
     - Ustawienie `isLoading = false`

8. **Implementacja toggle hasła w `ChangePasswordForm.tsx`:**
   - Handler `handleToggleCurrentPassword` przełączający `showCurrentPassword`
   - Handler `handleToggleNewPassword` przełączający `showNewPassword`
   - Handler `handleToggleNewPasswordConfirm` przełączający `showNewPasswordConfirm`
   - Renderowanie przycisków z ikoną `Eye`/`EyeOff` obok pól hasła
   - Zmiana `type` inputa z `password` na `text` (i odwrotnie)

9. **Implementacja wskaźnika siły hasła w `ChangePasswordForm.tsx` (opcjonalnie):**
   - Custom hook `usePasswordStrength(password: string)` lub funkcja `calculatePasswordStrength`
   - Renderowanie wskaźnika (progress bar lub badge) z kolorami
   - Aktualizacja w `onChange` dla pola `newPassword`

10. **Implementacja komunikatów błędów w `ChangePasswordForm.tsx`:**
    - Renderowanie `<Alert variant="destructive">` dla `errors.general` (jeśli istnieje)
    - Renderowanie `<span>` z komunikatami błędów pod polami (`errors.currentPassword`, `errors.newPassword`, `errors.newPasswordConfirm`)
    - Dodanie `aria-invalid="true"` do pól z błędami
    - Dodanie `aria-describedby` wskazującego na komunikaty błędów

11. **Utworzenie `src/components/settings/DeleteAccountButton.tsx`:**
    - Import zależności (React hooks, Supabase client lub API client, Shadcn/ui Dialog, typy)
    - Definicja komponentu z props (brak props)
    - Inicjalizacja stanu (isModalOpen, isConfirmChecked, isLoading)
    - Renderowanie przycisku "Usuń konto" (variant="destructive")

12. **Implementacja modala potwierdzenia w `DeleteAccountButton.tsx`:**
    - Renderowanie `<Dialog>` z `open={isModalOpen}` i `onOpenChange={setIsModalOpen}`
    - Renderowanie `<DialogContent>` z focus trap
    - Renderowanie `<DialogHeader>` z tytułem i opisem ostrzeżenia
    - Renderowanie `<Checkbox>` z `checked={isConfirmChecked}` i `onCheckedChange={setIsConfirmChecked}`
    - Renderowanie `<DialogFooter>` z przyciskami "Anuluj" i "Usuń konto"
    - Przycisk "Usuń konto" z `disabled={!isConfirmChecked || isLoading}`

13. **Implementacja usunięcia konta w `DeleteAccountButton.tsx`:**
    - Handler `handleDeleteAccount`:
      - Ustawienie `isLoading = true`
      - Wywołanie `DELETE /api/v1/users/me` (lub Supabase Auth SDK)
      - Obsługa odpowiedzi:
        - Sukces → Przekierowanie do `/login` z komunikatem
        - Błąd → Wyświetlenie komunikatu błędu (Alert w modalu)
      - Ustawienie `isLoading = false`
    - Handler `handleCancel`:
      - Zamknięcie modala (`setIsModalOpen(false)`)
      - Reset checkboxa (`setIsConfirmChecked(false)`)

### 11.5. Utworzenie komponentów Astro

14. **Utworzenie `src/components/settings/SettingsLayout.astro`:**
    - Import Shadcn/ui Card components
    - Definicja props (`userEmail: string`)
    - Renderowanie sekcji "Profil" z emailem (read-only) i `<ChangePasswordForm client:load />`
    - Renderowanie sekcji "Konto" z `<DeleteAccountButton client:load />`
    - Card-based layout z odstępami

15. **Utworzenie `src/pages/app/settings.astro`:**
    - Import `AppLayout` i `SettingsLayout`
    - Import React islands (`ChangePasswordForm`, `DeleteAccountButton`)
    - Pobranie użytkownika z Supabase (`Astro.locals.supabase.auth.getUser()`)
    - Sprawdzenie autentykacji (redirect do `/login` jeśli nie zalogowany)
    - Renderowanie `<AppLayout>` z `<SettingsLayout userEmail={user.email} />`

### 11.6. Integracja z toast notifications

16. **Konfiguracja sonner (jeśli nie jest jeszcze skonfigurowane):**
    - Sprawdź czy `sonner` jest zainstalowane (`package.json`)
    - Sprawdź czy `<Toaster />` jest renderowany w `AppLayout.astro` lub `BaseLayout.astro`
    - Import `toast` z `sonner` w komponentach React

17. **Dodanie toast notifications:**
    - W `ChangePasswordForm.tsx`: `toast.success("Hasło zostało zmienione pomyślnie")` po sukcesie
    - W `DeleteAccountButton.tsx`: Toast error (jeśli błąd, opcjonalnie)

### 11.7. Testowanie i accessibility

18. **Testowanie funkcjonalności:**
    - Test zmiany hasła z prawidłowymi danymi
    - Test błędnych danych (nieprawidłowe obecne hasło)
    - Test walidacji hasła (min 8 znaków)
    - Test zgodności haseł
    - Test usunięcia konta (z confirmation modal)
    - Test keyboard navigation (Tab, Enter, Escape)
    - Test focus trap w modalu
    - Test screen reader (ARIA labels)

19. **Sprawdzenie accessibility:**
    - ARIA labels dla wszystkich przycisków i pól
    - `aria-invalid` dla pól z błędami
    - `aria-describedby` dla komunikatów pomocy
    - Focus trap w modalu
    - Keyboard navigation dla wszystkich formularzy
    - Kontrast kolorów (4.5:1 dla tekstu)

### 11.8. Finalizacja

20. **Sprawdzenie zgodności z PRD:**
    - Wymagania z PRD (3.1 Uwierzytelnianie, 9. Wymagania prawne i bezpieczeństwo)
    - User Stories (brak bezpośrednich, ale powiązane z zarządzaniem kontem)
    - Security best practices (ponowne uwierzytelnienie, ogólne komunikaty błędów)

21. **Dokumentacja:**
    - Sprawdź czy wszystkie komponenty mają JSDoc comments
    - Sprawdź czy typy są udokumentowane
    - Zaktualizuj `.ai/view-implementation-index.md` (jeśli istnieje)

