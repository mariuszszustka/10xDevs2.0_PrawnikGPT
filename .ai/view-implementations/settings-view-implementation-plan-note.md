# Settings View - Implementation Plan

**Widok:** Settings View (Widok ustawień)  
**Ścieżka:** `/app/settings`  
**Typ:** Astro SSR + React islands (formularze)  
**Autentykacja:** Wymagana

---

## 1. Product Requirements Document (PRD)

@.ai/prd.md

---

## 2. Opis widoku

### 2.7. Settings View (Widok ustawień)

**Ścieżka:** `/app/settings`  
**Typ:** Astro SSR + React islands (formularze)  
**Autentykacja:** Wymagana

**Główny cel:**
Zarządzanie kontem użytkownika i preferencjami aplikacji.

**Kluczowe informacje do wyświetlenia:**
- **Sekcja "Profil":**
  - Email (read-only, z Supabase Auth)
  - Formularz zmiany hasła:
    - Obecne hasło
    - Nowe hasło (z wskaźnikiem siły)
    - Potwierdzenie nowego hasła
    - Przycisk "Zmień hasło"
- **Sekcja "Preferencje" (opcjonalnie w MVP):**
  - Dark mode toggle (localStorage, post-MVP)
- **Sekcja "Konto":**
  - Przycisk "Usuń konto" (destructive, czerwony)
  - Confirmation modal z ostrzeżeniem:
    - "Czy na pewno chcesz usunąć konto? Ta operacja jest nieodwracalna."
    - "Wszystkie twoje zapytania i oceny zostaną trwale usunięte."
    - Przyciski: "Anuluj" | "Usuń konto" (destructive)

**Kluczowe komponenty widoku:**
- `ChangePasswordForm.tsx` (React island) - Formularz zmiany hasła
- `DeleteAccountButton.tsx` (React island) - Przycisk usuwania konta z modal
- `SettingsLayout.astro` - Layout z sekcjami

**UX, dostępność i względy bezpieczeństwa:**
- **UX:**
  - Jasna struktura sekcji (card-based layout)
  - Walidacja formularza w czasie rzeczywistym
  - Success toast po zmianie hasła
  - Destructive actions wyraźnie oznaczone (czerwony kolor)
  - Confirmation modal dla usunięcia konta (podwójne potwierdzenie)
- **Dostępność:**
  - `aria-describedby` dla komunikatów pomocy
  - `aria-invalid` dla błędów walidacji
  - Focus trap w modalach
  - Keyboard navigation dla wszystkich formularzy
- **Bezpieczeństwo:**
  - Wymagane obecne hasło do zmiany hasła
  - Walidacja siły hasła (min 8 znaków)
  - Ogólne komunikaty błędów
  - Weryfikacja ownership przed usunięciem konta (backend)
  - Kaskadowe usuwanie wszystkich danych użytkownika (zapytania, oceny)

---

## 3. User Stories

**Ten widok nie adresuje bezpośrednio żadnych user stories z PRD**, ale jest częścią zarządzania kontem użytkownika.

**Powiązane wymagania z PRD:**
- **3.1. Uwierzytelnianie użytkowników:** Zarządzanie hasłem i kontem
- **9. Wymagania prawne i bezpieczeństwo:** Prawo do usunięcia danych (RODO)

---

## 4. Endpoint Description

**Ten widok nie korzysta z backend API** - używa bezpośrednio **Supabase Auth SDK** po stronie klienta.

### 4.1. Change Password
**Supabase Auth Method:**
- `supabase.auth.updateUser({ password: newPassword })` - Zmiana hasła użytkownika
- Wymaga ponownego uwierzytelnienia przed zmianą hasła (security best practice)

**Przykład użycia:**
```typescript
// Wymaga ponownego uwierzytelnienia
const { data: reauthData } = await supabase.auth.signInWithPassword({
  email: user.email,
  password: currentPassword
});

if (reauthData.user) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });
}
```

### 4.2. Delete Account
**Supabase Auth Method:**
- `supabase.auth.admin.deleteUser(userId)` - Usunięcie użytkownika (wymaga service role key)
- **UWAGA:** W MVP może wymagać backend endpoint dla bezpieczeństwa

**Alternatywnie (przez backend):**
- `DELETE /api/v1/users/me` - Usunięcie konta użytkownika (backend endpoint)
- Backend wykonuje:
  1. Weryfikację ownership
  2. Kaskadowe usunięcie danych (zapytania, oceny)
  3. Usunięcie użytkownika z Supabase Auth

---

## 5. Endpoint Implementation

### 5.1. Change Password
**Brak bezpośredniego endpointu API** - używa Supabase Auth SDK.

**Supabase Client Setup:**
- **Frontend:** `src/lib/supabase.ts` - Konfiguracja Supabase client
- **Auth methods:** Używane bezpośrednio w `ChangePasswordForm.tsx`

### 5.2. Delete Account
**Opcjonalnie - Backend Endpoint:**
- **Backend router:** `backend/routers/users.py` (do utworzenia)
- **Service:** `backend/services/user_service.py` (do utworzenia)
- **Repository:** `backend/db/users.py` (do utworzenia)

**Implementacja (jeśli przez backend):**
```python
@router.delete("/me", status_code=204)
async def delete_account(
    user_id: str = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service)
):
    # 1. Kaskadowe usunięcie danych (zapytania, oceny)
    await user_service.delete_user_data(user_id)
    
    # 2. Usunięcie użytkownika z Supabase Auth
    await supabase.auth.admin.delete_user(user_id)
    
    return Response(status_code=204)
```

**UWAGA:** W MVP można użyć bezpośrednio Supabase Auth SDK, ale backend endpoint jest bardziej bezpieczny.

---

## 6. Type Definitions

**Brak typów API** - widok używa Supabase Auth types.

**Supabase Types:**
- `User` - Typ użytkownika z Supabase
- `AuthError` - Typ błędu autentykacji

**Frontend Types (opcjonalnie):**
- Własne typy dla formularzy można zdefiniować w `src/lib/types.ts`:
```typescript
export interface ChangePasswordFormData {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
}

export interface ChangePasswordFormErrors {
  currentPassword?: string;
  newPassword?: string;
  newPasswordConfirm?: string;
  general?: string;
}

export type PasswordStrength = 'weak' | 'medium' | 'strong';
```

---

## 7. Tech Stack

**Frontend:**
- **Framework:** Astro 5 (SSR dla chronionych widoków)
- **React Islands:** React 19 dla interaktywnych formularzy (`client:load`)
- **Auth:** Supabase Auth SDK (client-side)
- **Styling:** Tailwind CSS + Shadcn/ui (formularze, modale)
- **Validation:** React Hook Form + Zod (walidacja hasła, zgodność haseł)

**Backend (opcjonalnie):**
- **Framework:** FastAPI (Python 3.11+)
- **Auth:** Supabase Auth (admin methods dla usunięcia konta)
- **Database:** Supabase (PostgreSQL) - kaskadowe usuwanie danych

**Zobacz:** @.ai/tech-stack.md dla szczegółów infrastruktury

---

## 8. Checklist Implementacji

### Frontend (Astro + React)
- [ ] Utworzenie `src/pages/app/settings.astro`
- [ ] Komponent `SettingsLayout.astro` (layout z sekcjami)
- [ ] Komponent `ChangePasswordForm.tsx` (React island)
  - [ ] Pola: currentPassword, newPassword, newPasswordConfirm
  - [ ] Walidacja hasła (min 8 znaków, w czasie rzeczywistym)
  - [ ] Wskaźnik siły hasła (opcjonalnie)
  - [ ] Sprawdzanie zgodności haseł
  - [ ] Ponowne uwierzytelnienie przed zmianą hasła
  - [ ] Loading state podczas zmiany hasła
  - [ ] Success toast po zmianie hasła
  - [ ] Obsługa błędów (Supabase Auth errors)
- [ ] Komponent `DeleteAccountButton.tsx` (React island)
  - [ ] Przycisk "Usuń konto" (destructive, czerwony)
  - [ ] Confirmation modal z ostrzeżeniem
  - [ ] Podwójne potwierdzenie (checkbox "Rozumiem konsekwencje")
  - [ ] DELETE request (Supabase Auth lub backend endpoint)
  - [ ] Redirect do `/login` po usunięciu konta
- [ ] Sekcja "Profil" (email read-only)
- [ ] Sekcja "Preferencje" (opcjonalnie, post-MVP)
- [ ] Accessibility (ARIA labels, keyboard navigation, focus trap)

### Supabase Setup
- [ ] Konfiguracja `src/lib/supabase.ts`
- [ ] Environment variables (`.env`):
  - `PUBLIC_SUPABASE_URL`
  - `PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_KEY` (jeśli backend endpoint dla usunięcia konta)

### Backend (opcjonalnie)
- [ ] Endpoint `DELETE /api/v1/users/me` (jeśli przez backend)
- [ ] Service `UserService.delete_user_data()` (kaskadowe usunięcie)
- [ ] Weryfikacja ownership
- [ ] Testy endpointu

### Security
- [ ] Wymagane obecne hasło do zmiany hasła (ponowne uwierzytelnienie)
- [ ] Walidacja siły hasła (min 8 znaków)
- [ ] Ogólne komunikaty błędów
- [ ] Confirmation modal dla usunięcia konta (podwójne potwierdzenie)
- [ ] Kaskadowe usuwanie danych (zapytania, oceny)

### Testing
- [ ] Test zmiany hasła z prawidłowymi danymi
- [ ] Test błędnych danych (nieprawidłowe obecne hasło)
- [ ] Test walidacji hasła (min 8 znaków)
- [ ] Test zgodności haseł
- [ ] Test usunięcia konta (z confirmation modal)
- [ ] Test kaskadowego usuwania danych
- [ ] Test accessibility (keyboard navigation, screen reader)

---

## 9. Uwagi Implementacyjne

1. **Change Password:** Wymaga ponownego uwierzytelnienia przed zmianą hasła (security best practice)
2. **Password Validation:** Minimum 8 znaków, walidacja po stronie klienta
3. **Password Strength:** Opcjonalny wskaźnik siły hasła (weak/medium/strong)
4. **Delete Account:** W MVP można użyć Supabase Auth SDK, ale backend endpoint jest bardziej bezpieczny
5. **Cascade Delete:** Usunięcie konta automatycznie usuwa wszystkie dane użytkownika (zapytania, oceny)
6. **Confirmation Modal:** Podwójne potwierdzenie dla usunięcia konta (checkbox + przycisk)
7. **Error Handling:** Supabase zwraca szczegółowe błędy - mapuj je na przyjazne komunikaty
8. **Redirect Logic:** Po usunięciu konta przekieruj do `/login` z komunikatem
9. **Loading States:** Wyłącz inputy i pokaż spinner podczas operacji
10. **Accessibility:** Pełna zgodność z WCAG AA (ARIA labels, keyboard navigation, focus trap)

---

**Powrót do:** [View Implementation Index](../view-implementation-index.md) | [UI Plan](../ui-plan.md) | [PRD](../prd.md)

