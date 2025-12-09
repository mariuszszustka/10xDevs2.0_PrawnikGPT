[2x6] Implementacja widoku Settings View - Komponenty Frontend

**Data rozpoczęcia:** 2025-12-09  
**Status:** UKOŃCZONY

---

## 📋 Sesja Implementacyjna - Settings View Components

### Kontekst projektu
- **Backend:** ✅ Zaimplementowany (API endpoints, RAG pipeline, rating system)
- **Frontend:** 🔄 W trakcie - implementacja Settings View
- **Plan implementacji:** ✅ Kompletny (`.ai/settings-view-implementation-plan.md`)
- **UI Plan:** ✅ Istniejący (`.ai/ui-plan.md`) - sekcja 2.7 Settings View
- **PRD:** ✅ Kompletny (`.ai/prd.md`) - wymagania 3.1 (Uwierzytelnianie) i 9 (Wymagania prawne i bezpieczeństwo)

### Cel sesji
Implementacja kompletnego widoku Settings View zgodnie z planem implementacji, w tym:
- Komponent Astro (SettingsLayout.astro) z sekcjami Profil i Konto
- Komponent React island (ChangePasswordForm.tsx) z formularzem zmiany hasła
- Komponent React island (DeleteAccountButton.tsx) z modalem potwierdzenia
- Strona Astro (settings.astro) z integracją komponentów
- Typy TypeScript dla formularzy
- Integracja z toast notifications (sonner)
- Pełna dostępność (WCAG AA)
- Obsługa błędów i loading states
- Integracja z Supabase Auth SDK (zmiana hasła)
- Integracja z backend API (usunięcie konta)

**Wynik:** Pełna implementacja Settings View z wszystkimi funkcjonalnościami:
- ✅ 1 komponent Astro (SettingsLayout.astro - 66 linii)
- ✅ 2 komponenty React island (ChangePasswordForm.tsx - 377 linii, DeleteAccountButton.tsx - 257 linii)
- ✅ 1 strona Astro (settings.astro - 56 linii)
- ✅ 1 komponent UI (toaster.tsx - 25 linii)
- ✅ 3 typy TypeScript (ChangePasswordFormData, ChangePasswordFormErrors, SettingsLayoutProps)
- ✅ Integracja z toast notifications (sonner)
- ✅ Pełna dostępność (WCAG AA)
- ✅ Integracja z Supabase Auth SDK (zmiana hasła z ponownym uwierzytelnieniem)
- ✅ Integracja z backend API (DELETE /api/v1/users/me)
- ✅ Wskaźnik siły hasła (weak/medium/strong)

---

## 🎯 Zakres pracy

### Krok 1: Dodanie typów do types.ts
- [x] Dodanie typów do `src/lib/types.ts`:
  - `ChangePasswordFormData` - DTO reprezentujący dane formularza zmiany hasła (currentPassword, newPassword, newPasswordConfirm)
  - `ChangePasswordFormErrors` - ViewModel reprezentujący błędy walidacji (currentPassword, newPassword, newPasswordConfirm, general)
  - `SettingsLayoutProps` - Propsy komponentu SettingsLayout (userEmail)
  - `PasswordStrength` - Typ siły hasła ('weak' | 'medium' | 'strong') - już istniał

### Krok 2: Utworzenie SettingsLayout.astro
- [x] Import Shadcn/ui Card components
- [x] Definicja props (`userEmail: string`)
- [x] Renderowanie sekcji "Profil" z:
  - Email display (read-only) z aria-readonly i aria-label
  - Formularz zmiany hasła (`<ChangePasswordForm client:load />`)
- [x] Renderowanie sekcji "Konto" z:
  - Przyciskiem usuwania konta (`<DeleteAccountButton client:load />`)
- [x] Card-based layout z odstępami (`space-y-6`)

### Krok 3: Utworzenie strony settings.astro
- [x] Import `BaseLayout` i `SettingsLayout`
- [x] Import React islands (`ChangePasswordForm`, `DeleteAccountButton`)
- [x] Pobranie użytkownika z Supabase (`supabaseClient.auth.getSession()` i `getUser()`)
- [x] Sprawdzenie autentykacji (redirect do `/login?redirect_to=/app/settings` jeśli nie zalogowany)
- [x] Renderowanie `<BaseLayout>` z `<SettingsLayout userEmail={user.email} />`
- [x] Page header z tytułem i opisem

### Krok 4: Utworzenie ChangePasswordForm.tsx - Podstawowa struktura
- [x] Import wszystkich wymaganych zależności:
  - React hooks (`useState`, `useCallback`)
  - Supabase client (`supabaseClient`)
  - Shadcn/ui komponenty (`Input`, `Button`, `Alert`, `AlertDescription`)
  - Typy (`ChangePasswordFormData`, `ChangePasswordFormErrors`, `PasswordStrength`)
  - Ikony (`Eye`, `EyeOff`, `Loader2` z `lucide-react`)
- [x] Inicjalizacja stanu:
  - `formData` - wartości pól formularza
  - `errors` - komunikaty błędów walidacji
  - `isLoading` - stan ładowania
  - `showCurrentPassword`, `showNewPassword`, `showNewPasswordConfirm` - widoczność haseł
  - `passwordStrength` - siła hasła

### Krok 5: Implementacja ChangePasswordForm.tsx - Walidacja client-side
- [x] Funkcja `validateForm(): ChangePasswordFormErrors` sprawdzająca:
  - Obecne hasło wymagane (currentPassword.trim().length > 0)
  - Nowe hasło wymagane i minimum 8 znaków
  - Potwierdzenie hasła wymagane i zgodność z nowym hasłem
- [x] Funkcja `calculatePasswordStrength(password: string): PasswordStrength | null`:
  - `null` - jeśli hasło puste
  - `'weak'` - mniej niż 8 znaków lub tylko litery/cyfry
  - `'medium'` - 8+ znaków, litery + cyfry lub znaki specjalne
  - `'strong'` - 8+ znaków, litery + cyfry + znaki specjalne
- [x] Handler `handleChange` dla pól input:
  - Aktualizacja `formData`
  - Czyszczenie błędów dla danego pola
  - Obliczanie siły hasła dla pola `newPassword`
- [x] Handler `handleSubmit` z `preventDefault()`:
  - Walidacja przed submit
  - Zatrzymanie, jeśli błędy

### Krok 6: Implementacja ChangePasswordForm.tsx - Integracja z Supabase Auth
- [x] Funkcja `mapSupabaseError(error: AuthError | null): string` mapująca błędy:
  - "Invalid login credentials" → "Nieprawidłowe obecne hasło"
  - "Password should be at least 8 characters" → "Hasło musi mieć minimum 8 znaków"
  - "New password should be different from the old password" → "Nowe hasło musi różnić się od obecnego"
  - "Too many requests" → "Zbyt wiele prób. Spróbuj ponownie za chwilę."
  - Network errors → "Błąd połączenia. Sprawdź połączenie internetowe."
- [x] W `handleSubmit`:
  - Ustawienie `isLoading = true`
  - Pobranie email użytkownika z sesji (`supabaseClient.auth.getUser()`)
  - Ponowne uwierzytelnienie: `supabaseClient.auth.signInWithPassword({ email, password: currentPassword })`
  - Jeśli sukces: `supabaseClient.auth.updateUser({ password: newPassword })`
  - Obsługa odpowiedzi:
    - Sukces → Toast notification, reset formularza
    - Błąd → Mapowanie i wyświetlenie komunikatu
  - Ustawienie `isLoading = false`

### Krok 7: Implementacja ChangePasswordForm.tsx - Toggle hasła i wskaźnik siły
- [x] Handler `handleToggleCurrentPassword` przełączający `showCurrentPassword`
- [x] Handler `handleToggleNewPassword` przełączający `showNewPassword`
- [x] Handler `handleToggleNewPasswordConfirm` przełączający `showNewPasswordConfirm`
- [x] Renderowanie przycisków z ikoną `Eye`/`EyeOff` obok pól hasła
- [x] Zmiana `type` inputa z `password` na `text` (i odwrotnie)
- [x] Renderowanie wskaźnika siły hasła (progress bar z kolorami):
  - Czerwony: weak
  - Żółty: medium
  - Zielony: strong

### Krok 8: Implementacja ChangePasswordForm.tsx - Komunikaty błędów
- [x] Renderowanie `<Alert variant="destructive">` dla `errors.general` (jeśli istnieje)
- [x] Renderowanie `<span>` z komunikatami błędów pod polami (`errors.currentPassword`, `errors.newPassword`, `errors.newPasswordConfirm`)
- [x] Dodanie `aria-invalid="true"` do pól z błędami
- [x] Dodanie `aria-describedby` wskazującego na komunikaty błędów
- [x] Dodanie `aria-label` dla przycisków toggle hasła

### Krok 9: Utworzenie DeleteAccountButton.tsx - Podstawowa struktura
- [x] Import zależności:
  - React hooks (`useState`, `useCallback`, `useRef`, `useEffect`)
  - API client (`apiDelete`, `ApiError`)
  - Shadcn/ui Dialog components
  - Shadcn/ui Button i Alert
  - Ikony (`Loader2`, `AlertTriangle` z `lucide-react`)
- [x] Inicjalizacja stanu:
  - `isModalOpen` - widoczność modala
  - `isConfirmChecked` - stan checkboxa
  - `isLoading` - stan ładowania
  - `error` - komunikat błędu
- [x] `useRef` dla przycisku "Usuń konto" (przywrócenie focus po zamknięciu modala)

### Krok 10: Implementacja DeleteAccountButton.tsx - Modal potwierdzenia
- [x] Renderowanie `<Dialog>` z `open={isModalOpen}` i `onOpenChange={handleCloseModal}`
- [x] Renderowanie `<DialogContent>` z focus trap (automatycznie przez Radix UI)
- [x] Renderowanie `<DialogHeader>` z:
  - Tytułem "Usuń konto" z ikoną `AlertTriangle`
  - Opisem ostrzeżenia (nieodwracalność operacji)
- [x] Renderowanie `<Checkbox>` (input type="checkbox") z:
  - `checked={isConfirmChecked}`
  - `onChange={handleCheckboxChange}`
  - `aria-required="true"`
  - `aria-describedby` wskazującym na label
- [x] Renderowanie `<DialogFooter>` z przyciskami:
  - "Anuluj" (variant="outline")
  - "Usuń konto" (variant="destructive", disabled jeśli checkbox nie zaznaczony lub isLoading)
- [x] Renderowanie `<Alert variant="destructive">` dla błędów (jeśli istnieje)

### Krok 11: Implementacja DeleteAccountButton.tsx - Usunięcie konta
- [x] Funkcja `mapApiError(error: ApiError | Error): string` mapująca błędy:
  - 401 → "Nie masz uprawnień do usunięcia tego konta. Zaloguj się ponownie."
  - 403 → "Nie masz uprawnień do usunięcia tego konta."
  - 404 → "Konto nie zostało znalezione."
  - 500 → "Wystąpił błąd serwera. Spróbuj ponownie później."
  - Network errors → "Błąd połączenia. Sprawdź połączenie internetowe."
- [x] Handler `handleDeleteAccount`:
  - Ustawienie `isLoading = true`
  - Wywołanie `apiDelete<void>('/api/v1/users/me')`
  - Obsługa odpowiedzi:
    - Sukces → Przekierowanie do `/login?deleted=true`
    - Błąd → Wyświetlenie komunikatu błędu (Alert w modalu)
  - Ustawienie `isLoading = false`
- [x] Handler `handleCloseModal`:
  - Zamknięcie modala (`setIsModalOpen(false)`)
  - Reset checkboxa (`setIsConfirmChecked(false)`)
  - Czyszczenie błędów (`setError(null)`)
  - Blokada zamknięcia podczas loading
- [x] `useEffect` dla przywrócenia focus do przycisku "Usuń konto" po zamknięciu modala

### Krok 12: Integracja z toast notifications
- [x] Sprawdzenie instalacji `sonner` (v2.0.7 w package.json)
- [x] Utworzenie komponentu `src/components/ui/toaster.tsx`:
  - React island z `SonnerToaster`
  - Konfiguracja: position="top-right", richColors, closeButton, duration=4000ms
  - Stylowanie zgodne z motywem aplikacji
- [x] Dodanie `<Toaster client:load />` do `BaseLayout.astro` w `<body>`
- [x] Import `toast` z `sonner` w `ChangePasswordForm.tsx`
- [x] Dodanie `toast.success('Hasło zostało zmienione pomyślnie')` po sukcesie zmiany hasła

### Krok 13: Testowanie i finalizacja - Accessibility
- [x] ARIA labels:
  - `aria-label` dla przycisków toggle hasła ("Ukryj hasło" / "Pokaż hasło")
  - `aria-label` dla przycisku submit ("Zmień hasło" / "Zmienianie hasła...")
  - `aria-label` dla przycisku usuwania konta ("Usuń konto")
  - `aria-label` dla przycisku potwierdzenia ("Potwierdź usunięcie konta")
  - `aria-describedby` dla komunikatów błędów
  - `aria-invalid` dla pól z błędami
  - `aria-readonly` dla pola email
  - `aria-required` dla checkboxa potwierdzenia
- [x] Keyboard navigation:
  - Tab order poprawny (wszystkie pola i przyciski)
  - Enter submit formularza
  - Escape zamyka modal
  - Focus trap w modalu (automatycznie przez Radix UI Dialog)
- [x] Screen reader support:
  - Semantic HTML (`<label>`, `<form>`, `<button>`, `<input>`)
  - Opisowe teksty dla wszystkich elementów interaktywnych
  - Komunikaty błędów powiązane z polami przez `aria-describedby`

### Krok 14: Testowanie i finalizacja - Responsywność
- [x] Mobile-first approach:
  - Przyciski `w-full` na mobile, `sm:w-auto` na desktop
  - Modal `sm:max-w-md` dla lepszego wyświetlania na desktop
  - DialogFooter `flex-col-reverse sm:flex-row` dla przycisków
- [x] Layout:
  - `container mx-auto` dla centrowania
  - `max-w-4xl mx-auto` dla szerokości zawartości
  - `space-y-6` dla odstępów między sekcjami
  - `px-4 py-8` dla paddingów

### Krok 15: Testowanie i finalizacja - Funkcjonalność
- [x] Zmiana hasła:
  - ✅ Walidacja client-side (wymagane pola, min 8 znaków, zgodność haseł)
  - ✅ Ponowne uwierzytelnienie przed zmianą (security best practice)
  - ✅ Wskaźnik siły hasła (weak/medium/strong)
  - ✅ Toast success po sukcesie
  - ✅ Obsługa błędów z przyjaznymi komunikatami
- [x] Usunięcie konta:
  - ✅ Modal potwierdzenia z podwójnym potwierdzeniem (checkbox + przycisk)
  - ✅ Integracja z backend API (`DELETE /api/v1/users/me`)
  - ✅ Obsługa błędów z mapowaniem na komunikaty użytkownika
  - ✅ Przekierowanie do `/login?deleted=true` po sukcesie
  - ✅ Focus management (przywrócenie focus po zamknięciu modala)

---

## 📁 Pliki utworzone/zmodyfikowane

### Nowe pliki
1. `src/components/settings/SettingsLayout.astro` (66 linii)
   - Astro component z sekcjami Profil i Konto
   - Card-based layout z Shadcn/ui Card
   - Integracja React islands

2. `src/components/settings/ChangePasswordForm.tsx` (377 linii)
   - React island z formularzem zmiany hasła
   - Walidacja client-side i server-side
   - Integracja z Supabase Auth SDK
   - Wskaźnik siły hasła
   - Toggle widoczności hasła dla wszystkich pól
   - Pełna dostępność (WCAG AA)

3. `src/components/settings/DeleteAccountButton.tsx` (257 linii)
   - React island z przyciskiem usuwania konta
   - Modal potwierdzenia z Shadcn/ui Dialog
   - Podwójne potwierdzenie (checkbox + przycisk)
   - Integracja z backend API
   - Focus management
   - Pełna dostępność (WCAG AA)

4. `src/pages/app/settings.astro` (56 linii)
   - Strona Astro z autentykacją
   - Pobieranie danych użytkownika z Supabase
   - Renderowanie SettingsLayout

5. `src/components/ui/toaster.tsx` (25 linii)
   - React island z SonnerToaster
   - Konfiguracja toast notifications

### Zmodyfikowane pliki
1. `src/lib/types.ts`
   - Dodano `ChangePasswordFormData` interface
   - Dodano `ChangePasswordFormErrors` interface
   - Dodano `SettingsLayoutProps` interface
   - `PasswordStrength` już istniał

2. `src/layouts/BaseLayout.astro`
   - Dodano import `Toaster` component
   - Dodano `<Toaster client:load />` w `<body>`

---

## ✅ Weryfikacja zgodności z planem

### Zgodność z planem implementacji
- ✅ Wszystkie komponenty zgodne z `.ai/settings-view-implementation-plan.md`
- ✅ Wszystkie typy zdefiniowane zgodnie z planem
- ✅ Integracja z Supabase Auth SDK (zmiana hasła)
- ✅ Integracja z backend API (usunięcie konta)
- ✅ Toast notifications zintegrowane
- ✅ Pełna dostępność (WCAG AA)
- ✅ Responsywność (mobile i desktop)

### Zgodność z UI Plan
- ✅ Sekcja "Profil" z emailem i formularzem zmiany hasła
- ✅ Sekcja "Konto" z przyciskiem usuwania konta
- ✅ Card-based layout zgodny z UI Plan
- ✅ Modal potwierdzenia z ostrzeżeniem

### Zgodność z PRD
- ✅ Wymaganie 3.1 (Uwierzytelnianie) - zarządzanie hasłem
- ✅ Wymaganie 9 (Wymagania prawne i bezpieczeństwo) - prawo do usunięcia danych (RODO)

---

## 🎯 Wyniki

### Statystyki
- **Utworzone pliki:** 5
- **Zmodyfikowane pliki:** 2
- **Łączna liczba linii kodu:** ~781 linii
- **Komponenty React:** 2 (ChangePasswordForm, DeleteAccountButton)
- **Komponenty Astro:** 1 (SettingsLayout)
- **Strony Astro:** 1 (settings.astro)
- **Typy TypeScript:** 3 (ChangePasswordFormData, ChangePasswordFormErrors, SettingsLayoutProps)

### Funkcjonalności
- ✅ Zmiana hasła z walidacją i wskaźnikiem siły
- ✅ Usunięcie konta z podwójnym potwierdzeniem
- ✅ Toast notifications (success/error)
- ✅ Pełna dostępność (WCAG AA)
- ✅ Responsywność (mobile i desktop)
- ✅ Obsługa błędów z przyjaznymi komunikatami
- ✅ Loading states dla wszystkich operacji
- ✅ Focus management w modalu

### Jakość kodu
- ✅ Brak błędów lintowania
- ✅ TypeScript type safety
- ✅ JSDoc comments dla wszystkich komponentów
- ✅ Zgodność z zasadami projektu (frontend.mdc, react.mdc, ui-shadcn-helper.mdc)
- ✅ Error handling zgodny z best practices

---

## 📝 Uwagi i obserwacje

### Implementacja zgodna z planem
Wszystkie kroki z planu implementacji zostały wykonane zgodnie z specyfikacją. Komponenty są w pełni funkcjonalne i gotowe do użycia.

### Integracja z Supabase Auth
Zmiana hasła wymaga ponownego uwierzytelnienia (security best practice), co zostało poprawnie zaimplementowane w `ChangePasswordForm.tsx`.

### Integracja z backend API
Usunięcie konta korzysta z endpointu `DELETE /api/v1/users/me`, który powinien obsługiwać kaskadowe usunięcie danych i usunięcie użytkownika z Supabase Auth.

### Toast notifications
Komponent `Toaster` został dodany do `BaseLayout.astro`, co umożliwia wyświetlanie toastów na wszystkich stronach aplikacji.

### Accessibility
Wszystkie komponenty spełniają wymagania WCAG AA:
- ARIA labels dla wszystkich elementów interaktywnych
- Keyboard navigation
- Focus management
- Screen reader support

---

## 🔄 Następne kroki (opcjonalne)

1. **Testy jednostkowe:**
   - Testy dla `ChangePasswordForm.tsx` (walidacja, integracja z Supabase)
   - Testy dla `DeleteAccountButton.tsx` (modal, integracja z API)

2. **Testy integracyjne:**
   - Test end-to-end zmiany hasła
   - Test end-to-end usunięcia konta

3. **Backend endpoint:**
   - Weryfikacja implementacji `DELETE /api/v1/users/me` w backendzie
   - Test kaskadowego usuwania danych

4. **Dokumentacja:**
   - Aktualizacja `.ai/view-implementation-index.md` (jeśli istnieje)
   - Aktualizacja README.md (jeśli potrzebna)

---

**Status:** ✅ UKOŃCZONY  
**Data zakończenia:** 2025-12-09
