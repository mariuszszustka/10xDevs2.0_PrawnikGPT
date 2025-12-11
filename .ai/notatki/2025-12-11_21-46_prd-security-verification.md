# Sesja: Weryfikacja i uzupełnienie PRD - Wymagania Bezpieczeństwa

**Data:** 2025-12-11
**Czas:** 21:46
**Asystent:** Auto (Cursor AI)

---

## 📋 Cel sesji

Weryfikacja dokumentu PRD (`.ai/prd.md`) pod kątem bezpieczeństwa i uzupełnienie go o szczegółowe wymagania bezpieczeństwa zgodnie z najlepszymi praktykami. Dodanie wymagań dotyczących: hashowania haseł, obsługi sesji JWT, uwierzytelniania wieloetapowego (MFA), zabezpieczeń przed atakami oraz mechanizmów odzyskiwania dostępu.

---

## 🎯 Wykonane zadania

### 1. Rozszerzenie sekcji 9 "Wymagania prawne i bezpieczeństwo"

#### 9.2.1. Hashowanie i przechowywanie haseł
- ✅ Dodano wymaganie: hasła NIE MOGĄ być przechowywane w formie tekstu jawnego
- ✅ Wymagany silny algorytm haszujący (Argon2id lub Bcrypt) z unikalną solą (salt)
- ✅ Polityka złożoności hasła: minimum 12 znaków, małe/duże litery, cyfry, znaki specjalne
- ✅ Walidacja po stronie frontendu i backendu
- ✅ Implementacja przez Supabase Auth (domyślnie Bcrypt)

#### 9.2.2. Obsługa sesji i tokenów JWT
- ✅ Stateless JWT (JSON Web Token) dla uwierzytelniania
- ✅ Access Token z krótkim czasem życia (15 minut)
- ✅ Refresh Token przechowywany wyłącznie w ciasteczku HttpOnly, Secure, SameSite (nie w LocalStorage)
- ✅ Ochrona przed atakami XSS przez właściwe przechowywanie tokenów
- ✅ Unieważnianie tokenów przy wylogowaniu (czarna lista lub usunięcie z bazy sesji)
- ✅ Wymagana konfiguracja odpowiednich flag dla ciasteczek w Supabase Auth

#### 9.2.3. Uwierzytelnianie wieloetapowe (MFA/2FA)
- ✅ Wymagana możliwość włączenia uwierzytelniania dwuskładnikowego
- ✅ Obsługa TOTP (Time-based One-Time Password) - Google Authenticator / Authy
- ✅ Wymaganie 6-cyfrowego kodu przy logowaniu, jeśli MFA włączone
- ✅ Wymagane wygenerowanie kodów zapasowych (backup codes) przy aktywacji
- ✅ Kody zapasowe wyświetlane tylko raz i haszowane w bazie danych

#### 9.2.4. Zabezpieczenie przed popularnymi atakami
- ✅ **Rate Limiting:**
  - Endpointy logowania i rejestracji objęte mechanizmem Rate Limiting
  - 5 nieudanych prób logowania = blokada na 15 minut (ochrona przed Brute Force)
  - Maksymalnie 5 prób rejestracji na 15 minut z jednego adresu IP
- ✅ **CSRF Protection:**
  - Formularze z zabezpieczeniem przed atakami CSRF
  - Supabase Auth domyślnie obsługuje CSRF protection
- ✅ **Sanityzacja danych wejściowych:**
  - Wszystkie dane wejściowe sanityzowane (ochrona przed SQL Injection / XSS)
  - Backend używa parameterized queries (Supabase SDK)
  - Frontend używa React (domyślnie chroni przed XSS)
- ✅ **Enumeracja użytkowników:**
  - System nie ujawnia, czy email istnieje w bazie przy nieudanym logowaniu/rejestracji
  - Komunikaty ogólne: "Błędny login lub hasło" / "Nie można utworzyć konta"
  - Alternatywnie: system "udaje" wysłanie maila resetującego hasło

#### 9.2.5. Mechanizmy odzyskiwania dostępu
- ✅ Reset hasła przez unikalny, jednorazowy link z tokenem na email
- ✅ Ważność tokenu resetującego: maksymalnie 15-30 minut
- ✅ Automatyczne wylogowanie ze wszystkich aktywnych sesji po zmianie hasła
- ✅ Ochrona przed enumeracją: system "udaje" wysłanie maila, nawet jeśli konto nie istnieje

#### 9.2.6. Autoryzacja i kontrola dostępu
- ✅ Tylko zalogowany użytkownik może wyświetlać/edytować usuwać swoje zapytania
- ✅ Brak współdzielenia danych między użytkownikami
- ✅ Walidacja JWT tokenu przy każdym zapytaniu do API
- ✅ Weryfikacja dostępu użytkownika do zasobu przed wykonaniem operacji

### 2. Uzupełnienie kryteriów akceptacji w US-001 (Rejestracja)

- ✅ Polityka złożoności hasła (min. 12 znaków, różne typy znaków)
- ✅ Hashowanie haseł przez Supabase Auth (Argon2id/Bcrypt z solą)
- ✅ Rate Limiting: maksymalnie 5 prób rejestracji na 15 minut z jednego adresu IP
- ✅ Brak enumeracji użytkowników: komunikat ogólny "Nie można utworzyć konta"

### 3. Uzupełnienie kryteriów akceptacji w US-002 (Logowanie)

- ✅ Szczegóły JWT: Access Token (15 min), Refresh Token w HttpOnly cookies
- ✅ Rate Limiting z blokadą po 5 nieudanych próbach na 15 minut
- ✅ Obsługa MFA/2FA: wymaganie 6-cyfrowego kodu TOTP, jeśli włączone
- ✅ Unieważnianie tokenów przy wylogowaniu (czarna lista lub usunięcie z bazy)
- ✅ Brak enumeracji użytkowników: komunikat ogólny "Błędny login lub hasło"

### 4. Dodanie sekcji bezpieczeństwa w US-004

- ✅ Nowa podsekcja "Wymagania Niefunkcjonalne (Bezpieczeństwo)"
- ✅ Wymagania dotyczące endpointów API odpowiedzi:
  - Walidacja JWT tokenu (tylko zalogowani użytkownicy)
  - Sanityzacja zapytań użytkownika przed wysłaniem do LLM
  - Rate Limiting: 10 zapytań/min na użytkownika, 30 zapytań/min na IP
- ✅ Odniesienie do sekcji 9.2 "Wymagania bezpieczeństwa"

---

## 📊 Statystyki zmian

### Pliki zmodyfikowane
- ✅ `.ai/prd.md` - rozszerzona sekcja 9 o szczegółowe wymagania bezpieczeństwa
- ✅ `.ai/prd.md` - uzupełnione kryteria akceptacji w US-001 i US-002
- ✅ `.ai/prd.md` - dodana sekcja bezpieczeństwa w US-004

### Dodane wymagania bezpieczeństwa

1. ✅ Hashowanie haseł (Argon2id/Bcrypt, unikalna sól)
2. ✅ Polityka złożoności hasła (min. 12 znaków)
3. ✅ Obsługa JWT (Access Token 15 min, Refresh Token w HttpOnly cookies)
4. ✅ Uwierzytelnianie wieloetapowe (MFA/2FA z TOTP)
5. ✅ Kody zapasowe (backup codes) dla MFA
6. ✅ Rate Limiting (logowanie, rejestracja, API)
7. ✅ Ochrona przed CSRF
8. ✅ Sanityzacja danych wejściowych
9. ✅ Ochrona przed enumeracją użytkowników
10. ✅ Mechanizmy resetowania hasła
11. ✅ Automatyczne wylogowanie po zmianie hasła
12. ✅ Kontrola dostępu i autoryzacja

---

## 🔍 Kluczowe decyzje projektowe

### 1. Wykorzystanie Supabase Auth
- Supabase Auth domyślnie obsługuje większość wymagań bezpieczeństwa
- Bcrypt dla hashowania haseł (możliwość zmiany na Argon2id w przyszłości)
- Automatyczna obsługa JWT, CSRF protection, parameterized queries
- Wymagana konfiguracja flag ciasteczek (HttpOnly, Secure, SameSite)

### 2. Polityka złożoności hasła
- Minimum 12 znaków (zgodnie z najlepszymi praktykami)
- Wymagane różne typy znaków (małe/duże litery, cyfry, znaki specjalne)
- Walidacja po stronie frontendu (UX) i backendu (bezpieczeństwo)

### 3. Rate Limiting
- Różne limity dla różnych endpointów:
  - Logowanie/rejestracja: 5 prób / 15 min
  - API odpowiedzi: 10 zapytań/min na użytkownika, 30/min na IP
- Ochrona przed Brute Force i nadużyciami

### 4. Ochrona przed enumeracją
- System nie ujawnia, czy email istnieje w bazie
- Ogólne komunikaty błędów
- Alternatywnie: "udawanie" wysłania maila resetującego hasło

### 5. MFA/2FA jako opcjonalne
- System musi umożliwiać włączenie MFA, ale nie jest wymagane domyślnie
- TOTP jako standardowa metoda (Google Authenticator / Authy)
- Backup codes dla odzyskania dostępu

---

## 📝 Następne kroki implementacji

### Backend (FastAPI)
1. Konfiguracja Supabase Auth z właściwymi flagami ciasteczek
2. Implementacja Rate Limiting (np. slowapi lub własne rozwiązanie)
3. Walidacja polityki hasła w endpointach rejestracji
4. Implementacja mechanizmu resetowania hasła
5. Integracja z Supabase MFA (jeśli dostępne) lub własna implementacja TOTP
6. Sanityzacja zapytań użytkownika przed wysłaniem do LLM

### Frontend (Astro/React)
1. Walidacja polityki hasła w formularzu rejestracji
2. Obsługa HttpOnly cookies dla Refresh Token (Supabase SDK)
3. UI dla włączania/wyłączania MFA
4. UI dla wyświetlania backup codes (tylko raz)
5. Obsługa resetowania hasła (formularz + weryfikacja tokenu)

### Testy
1. Testy bezpieczeństwa: próby enumeracji użytkowników
2. Testy Rate Limiting (sprawdzenie blokad)
3. Testy walidacji hasła (frontend + backend)
4. Testy MFA (jeśli zaimplementowane)
5. Testy resetowania hasła

---

## ✅ Status: ZAKOŃCZONE

Dokument PRD został zweryfikowany i uzupełniony o szczegółowe wymagania bezpieczeństwa zgodnie z najlepszymi praktykami. Wszystkie wymagania są gotowe do implementacji przez zespół deweloperski.

---

## 📚 Powiązane dokumenty

- PRD: `.ai/prd.md`
- Wymagania bezpieczeństwa: Sekcja 9.2 w PRD
- Historyjki użytkowników: US-001, US-002, US-004 w PRD
