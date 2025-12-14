# Weryfikacja: Layout z UserMenu - Instrukcja testowania

**Data:** 2025-01-11  
**Status:** ✅ Gotowe do testowania

---

## 🚀 Uruchomienie aplikacji

Aplikacja jest uruchomiona i dostępna pod adresem:
- **Local:** http://localhost:4321/
- **Network:** http://192.168.0.11:4321/

---

## ✅ Co zweryfikować

### 1. Strony publiczne (bez logowania)

#### `/login`
- [ ] Strona logowania wyświetla się poprawnie
- [ ] **Brak headeru** z UserMenu (użytkownik nie jest zalogowany)
- [ ] Formularz logowania działa
- [ ] Link do rejestracji działa

#### `/register`
- [ ] Strona rejestracji wyświetla się poprawnie
- [ ] **Brak headeru** z UserMenu
- [ ] Formularz rejestracji działa

### 2. Po zalogowaniu

#### Weryfikacja headeru
- [ ] **Header jest widoczny** na górze strony (fixed position)
- [ ] Logo "PrawnikGPT" jest widoczne i klikalne (link do `/app`)
- [ ] Linki nawigacyjne są widoczne:
  - [ ] "Chat" → `/app`
  - [ ] "Historia" → `/app/history`
- [ ] **UserMenu** (avatar z inicjałami) jest widoczny w prawym górnym rogu

#### Weryfikacja UserMenu dropdown
- [ ] Kliknięcie avatara otwiera dropdown menu
- [ ] Dropdown zawiera:
  - [ ] Email użytkownika (read-only, szary tekst)
  - [ ] Separator
  - [ ] Link "Ustawienia" z ikoną
  - [ ] Separator
  - [ ] Przycisk "Wyloguj się" z ikoną (czerwony kolor)
- [ ] Keyboard navigation działa (Tab, Enter, Escape)

#### Weryfikacja funkcjonalności

**Link "Ustawienia":**
- [ ] Kliknięcie przekierowuje do `/app/settings`
- [ ] Dropdown zamyka się po kliknięciu

**Przycisk "Wyloguj się":**
- [ ] Kliknięcie rozpoczyna proces wylogowania
- [ ] Przycisk pokazuje "Wylogowywanie..." z animacją spinnera
- [ ] Po sukcesie: toast "Wylogowano pomyślnie"
- [ ] Przekierowanie do `/login`
- [ ] Header znika po wylogowaniu

### 3. Responsywność

- [ ] Header działa poprawnie na desktop (≥1024px)
- [ ] Header działa poprawnie na tablet (768px - 1023px)
- [ ] Header działa poprawnie na mobile (<768px)
- [ ] UserMenu dropdown otwiera się w odpowiednim miejscu (align="end")

### 4. Accessibility (WCAG AA)

- [ ] Keyboard navigation działa (Tab przez wszystkie elementy)
- [ ] ARIA labels są poprawne:
  - [ ] Avatar ma `aria-label` z emailem użytkownika
  - [ ] Dropdown ma `aria-haspopup="menu"`
  - [ ] Przycisk wylogowania ma `aria-label`
- [ ] Focus indicators są widoczne
- [ ] Screen reader może odczytać wszystkie elementy

### 5. Stylowanie

- [ ] Header ma odpowiedni z-index (z-50) - jest nad innymi elementami
- [ ] Header ma backdrop-blur effect
- [ ] Avatar wyświetla inicjały użytkownika (np. "JD" dla "jan.doe@example.com")
- [ ] Hover states działają poprawnie
- [ ] Active states działają poprawnie

---

## 🐛 Potencjalne problemy do sprawdzenia

### Problem 1: Header nie jest widoczny
**Sprawdź:**
- Czy użytkownik jest zalogowany? (sprawdź `Astro.locals.user`)
- Czy middleware ustawia `context.locals.user`?
- Sprawdź w DevTools → Network → czy request do `/app` zwraca 200?

### Problem 2: UserMenu nie działa
**Sprawdź:**
- Czy komponent `UserMenu` jest zaimportowany?
- Czy `client:load` jest ustawione?
- Sprawdź w DevTools → Console → czy są błędy JavaScript?
- Sprawdź czy `@radix-ui/react-avatar` jest zainstalowany

### Problem 3: Dropdown nie otwiera się
**Sprawdź:**
- Czy `@radix-ui/react-dropdown-menu` jest zainstalowany?
- Sprawdź w DevTools → Console → czy są błędy?
- Sprawdź czy komponent `DropdownMenu` jest poprawnie zaimportowany

### Problem 4: Wylogowanie nie działa
**Sprawdź:**
- Czy Supabase client jest poprawnie skonfigurowany?
- Sprawdź w DevTools → Network → czy request do `/api/auth/logout` jest wysyłany?
- Sprawdź w DevTools → Console → czy są błędy?

---

## 📝 Checklist szybkiej weryfikacji

### Minimum do sprawdzenia:
1. ✅ Aplikacja uruchamia się (`npm run dev`)
2. ✅ Strona `/login` działa (bez headeru)
3. ✅ Po zalogowaniu header jest widoczny
4. ✅ UserMenu dropdown otwiera się
5. ✅ Wylogowanie działa

### Pełna weryfikacja:
- Wszystkie punkty z sekcji "Co zweryfikować"
- Testy responsywności
- Testy accessibility
- Testy edge cases

---

## 🔧 Komendy do testowania

```bash
# Uruchom aplikację
npm run dev

# W innym terminalu - sprawdź czy działa
curl http://localhost:4321/

# Sprawdź logi
# (w terminalu gdzie działa npm run dev)
```

---

## 📊 Oczekiwane rezultaty

### Przed logowaniem:
- ❌ Brak headeru
- ✅ Strony publiczne działają

### Po logowaniu:
- ✅ Header widoczny na górze
- ✅ Logo + Nawigacja + UserMenu
- ✅ UserMenu dropdown działa
- ✅ Wylogowanie działa

---

**Status:** ✅ Gotowe do testowania  
**Następne kroki:** Przetestuj aplikację zgodnie z checklistą powyżej
