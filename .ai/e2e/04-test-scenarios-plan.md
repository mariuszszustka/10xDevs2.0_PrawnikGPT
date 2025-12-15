# E2E Testing - Zadanie 4: Scenariusze testowe Playwright
**Data:** 2025-01-11
**Status:** 🚧 W trakcie
**Poprzednie:** Zadanie 3 (Page Object Models) ✅ UKOŃCZONE

---

## 📋 Cel Zadania 4

Napisanie testów E2E w Playwright wykorzystując POMs z Zadania 3, opartych na scenariuszach zidentyfikowanych w Zadaniu 1.

**Zasady:**
- Używamy tylko POMs (LoginPage, ChatPage, HeaderComponent)
- Nie duplikujemy logiki z POMs w testach
- Testy są czytelne i samo-dokumentujące
- Każdy test jest niezależny (można uruchomić osobno)
- Używamy fixtures dla danych testowych

---

## 🎯 Priority 1: KRYTYCZNE testy

### **Kategoria 1: Authentication** 🔒

#### Test 1.1: Successful Login
**Plik:** `tests/specs/auth/login.spec.ts`
**Scenariusz:**
```
GIVEN użytkownik jest na stronie logowania
WHEN wprowadza poprawny email i hasło
AND klika przycisk "Zaloguj się"
THEN zostaje przekierowany do /app/chat
AND widzi menu użytkownika w headerze
```

**Kroki:**
1. Navigate to /login
2. Fill email: `test@example.com`
3. Fill password: `password123`
4. Click submit
5. Assert: URL contains `/app`
6. Assert: User menu is visible in header

---

#### Test 1.2: Login with Invalid Credentials
**Plik:** `tests/specs/auth/login.spec.ts`
**Scenariusz:**
```
GIVEN użytkownik jest na stronie logowania
WHEN wprowadza niepoprawny email lub hasło
AND klika przycisk "Zaloguj się"
THEN widzi komunikat błędu
AND pozostaje na stronie logowania
```

**Kroki:**
1. Navigate to /login
2. Fill email: `wrong@example.com`
3. Fill password: `wrongpassword`
4. Click submit
5. Assert: Error message is visible
6. Assert: URL is still `/login`

---

#### Test 1.3: Login with Empty Fields
**Plik:** `tests/specs/auth/login.spec.ts`
**Scenariusz:**
```
GIVEN użytkownik jest na stronie logowania
WHEN pozostawia pola puste
THEN przycisk "Zaloguj się" jest wyłączony
OR widzi komunikaty walidacji
```

**Kroki:**
1. Navigate to /login
2. Leave fields empty
3. Assert: Submit button is disabled OR validation errors are shown

---

#### Test 1.4: Password Visibility Toggle
**Plik:** `tests/specs/auth/login.spec.ts`
**Scenariusz:**
```
GIVEN użytkownik wprowadził hasło
WHEN klika ikonę oka
THEN hasło staje się widoczne/ukryte
```

**Kroki:**
1. Navigate to /login
2. Fill password: `password123`
3. Assert: Password is masked (type="password")
4. Click password toggle button
5. Assert: Password is visible (type="text")
6. Click password toggle button again
7. Assert: Password is masked again

---

#### Test 1.5: Logout
**Plik:** `tests/specs/auth/logout.spec.ts`
**Scenariusz:**
```
GIVEN użytkownik jest zalogowany
WHEN klika menu użytkownika
AND wybiera "Wyloguj się"
THEN zostaje przekierowany do /login
AND widzi przyciski logowania w headerze
```

**Kroki:**
1. Login first (setup)
2. Navigate to /app/chat
3. Click user menu
4. Click logout
5. Assert: URL is `/login`
6. Assert: Auth buttons are visible in header

---

### **Kategoria 2: Chat Flow** 💬

#### Test 2.1: Submit Valid Query
**Plik:** `tests/specs/chat/submit-query.spec.ts`
**Scenariusz:**
```
GIVEN użytkownik jest zalogowany i na stronie czatu
WHEN wprowadza pytanie (min. 10 znaków)
AND klika "Wyślij"
THEN widzi szybką odpowiedź w ciągu 20s
```

**Kroki:**
1. Login (setup)
2. Navigate to /app/chat
3. Fill query: "Jakie są obowiązki pracodawcy wobec pracownika?"
4. Click send
5. Wait for fast response (max 20s)
6. Assert: Fast response card is visible
7. Assert: Response content is not empty

---

#### Test 2.2: Submit Query Too Short
**Plik:** `tests/specs/chat/submit-query.spec.ts`
**Scenariusz:**
```
GIVEN użytkownik wprowadził <10 znaków
THEN przycisk "Wyślij" jest wyłączony
AND widzi komunikat walidacji
```

**Kroki:**
1. Login (setup)
2. Navigate to /app/chat
3. Fill query: "Test" (4 znaki)
4. Assert: Send button is disabled
5. Assert: Character counter shows warning (e.g., red badge)

---

#### Test 2.3: Submit Query Too Long
**Plik:** `tests/specs/chat/submit-query.spec.ts`
**Scenariusz:**
```
GIVEN użytkownik wprowadził >1000 znaków
THEN przycisk "Wyślij" jest wyłączony
AND widzi komunikat o przekroczeniu limitu
```

**Kroki:**
1. Login (setup)
2. Navigate to /app/chat
3. Fill query: "A".repeat(1001)
4. Assert: Send button is disabled
5. Assert: Character counter shows error

---

#### Test 2.4: Character Counter Updates
**Plik:** `tests/specs/chat/submit-query.spec.ts`
**Scenariusz:**
```
GIVEN użytkownik pisze pytanie
THEN licznik znaków aktualizuje się na bieżąco
```

**Kroki:**
1. Login (setup)
2. Navigate to /app/chat
3. Fill query: "Test pytanie" (12 znaków)
4. Assert: Character counter shows "12/1000"

---

### **Kategoria 3: Response Handling** 📄

#### Test 3.1: Fast Response Display
**Plik:** `tests/specs/chat/fast-response.spec.ts`
**Scenariusz:**
```
GIVEN użytkownik wysłał pytanie
WHEN otrzyma szybką odpowiedź
THEN widzi:
  - Treść odpowiedzi
  - Badge "Szybka odpowiedź"
  - Nazwę modelu
  - Czas generowania
  - Listę źródeł (jeśli są)
```

**Kroki:**
1. Login (setup)
2. Navigate to /app/chat
3. Submit query
4. Wait for fast response
5. Assert: Response type badge shows "Szybka odpowiedź"
6. Assert: Model name badge is visible
7. Assert: Generation time badge is visible
8. Assert: Response content is visible
9. Assert: Sources list has >0 sources (if applicable)

---

#### Test 3.2: Detailed Answer Request
**Plik:** `tests/specs/chat/detailed-response.spec.ts`
**Scenariusz:**
```
GIVEN użytkownik otrzymał szybką odpowiedź
WHEN klika "Uzyskaj dokładniejszą odpowiedź"
THEN widzi dokładną odpowiedź w ciągu 240s
AND przycisk znika po wygenerowaniu
```

**Kroki:**
1. Login (setup)
2. Submit query
3. Wait for fast response
4. Assert: Detailed answer button is visible
5. Click detailed answer button
6. Wait for accurate response (max 240s)
7. Assert: Accurate response card is visible
8. Assert: Response type badge shows "Dokładna odpowiedź"

---

#### Test 3.3: Source Links Navigation
**Plik:** `tests/specs/chat/sources.spec.ts`
**Scenariusz:**
```
GIVEN odpowiedź zawiera źródła
WHEN użytkownik klika link źródła
THEN otwiera się nowa karta z aktem prawnym
```

**Kroki:**
1. Login (setup)
2. Submit query
3. Wait for fast response
4. Assert: Sources count > 0
5. Get first source link URL
6. Assert: URL is valid (contains act title/link)
7. (Optional) Click source link and verify new tab opens

---

### **Kategoria 4: Rating System** ⭐

#### Test 4.1: Thumbs Up Rating
**Plik:** `tests/specs/chat/rating.spec.ts`
**Scenariusz:**
```
GIVEN użytkownik otrzymał odpowiedź
WHEN klika kciuk w górę
THEN przycisk staje się aktywny (podświetlony)
AND kciuk w dół staje się nieaktywny
```

**Kroki:**
1. Login (setup)
2. Submit query
3. Wait for fast response
4. Click thumbs up button
5. Assert: Current rating is "up"
6. Assert: Thumbs up button is active/highlighted
7. Assert: Thumbs down button is inactive

---

#### Test 4.2: Thumbs Down Rating
**Plik:** `tests/specs/chat/rating.spec.ts`
**Scenariusz:**
```
GIVEN użytkownik otrzymał odpowiedź
WHEN klika kciuk w dół
THEN przycisk staje się aktywny (podświetlony)
AND kciuk w górę staje się nieaktywny
```

**Kroki:**
1. Login (setup)
2. Submit query
3. Wait for fast response
4. Click thumbs down button
5. Assert: Current rating is "down"
6. Assert: Thumbs down button is active/highlighted
7. Assert: Thumbs up button is inactive

---

#### Test 4.3: Change Rating
**Plik:** `tests/specs/chat/rating.spec.ts`
**Scenariusz:**
```
GIVEN użytkownik ocenił odpowiedź kciukiem w górę
WHEN klika kciuk w dół
THEN ocena zmienia się na negatywną
```

**Kroki:**
1. Login (setup)
2. Submit query
3. Wait for fast response
4. Click thumbs up
5. Assert: Current rating is "up"
6. Click thumbs down
7. Assert: Current rating is "down"

---

### **Kategoria 5: Navigation** 🧭

#### Test 5.1: Header Navigation - Logo
**Plik:** `tests/specs/navigation/header.spec.ts`
**Scenariusz:**
```
GIVEN użytkownik jest na dowolnej stronie
WHEN klika logo w headerze
THEN zostaje przekierowany do strony głównej
```

**Kroki:**
1. Navigate to /app/chat
2. Click logo
3. Assert: URL is `/`

---

#### Test 5.2: Header Navigation - App Link
**Plik:** `tests/specs/navigation/header.spec.ts`
**Scenariusz:**
```
GIVEN użytkownik jest zalogowany
WHEN klika "Aplikacja" w headerze
THEN zostaje przekierowany do /app/chat
```

**Kroki:**
1. Login (setup)
2. Navigate to `/` or `/pricing`
3. Click App link
4. Assert: URL is `/app` or `/app/chat`

---

## 📊 Podsumowanie testów Priority 1

| Kategoria | Liczba testów | Pliki |
|-----------|---------------|-------|
| Authentication | 5 | login.spec.ts, logout.spec.ts |
| Chat Flow | 4 | submit-query.spec.ts |
| Response Handling | 3 | fast-response.spec.ts, detailed-response.spec.ts, sources.spec.ts |
| Rating System | 3 | rating.spec.ts |
| Navigation | 2 | header.spec.ts |
| **RAZEM** | **17** | **8 plików** |

---

## 🏗️ Struktura plików testowych

```
tests/specs/
├── auth/
│   ├── login.spec.ts          # Tests 1.1-1.4
│   └── logout.spec.ts         # Test 1.5
├── chat/
│   ├── submit-query.spec.ts   # Tests 2.1-2.4
│   ├── fast-response.spec.ts  # Test 3.1
│   ├── detailed-response.spec.ts # Test 3.2
│   ├── sources.spec.ts        # Test 3.3
│   └── rating.spec.ts         # Tests 4.1-4.3
└── navigation/
    └── header.spec.ts         # Tests 5.1-5.2
```

---

## 🔧 Fixtures i helpery

### Test Data Fixtures
**Plik:** `tests/fixtures/test-users.json`
```json
{
  "validUser": {
    "email": "test@example.com",
    "password": "password123"
  },
  "invalidUser": {
    "email": "wrong@example.com",
    "password": "wrongpassword"
  }
}
```

### Example Queries
**Plik:** `tests/fixtures/example-queries.json`
```json
{
  "validQueries": [
    "Jakie są obowiązki pracodawcy wobec pracownika?",
    "Czy można rozwiązać umowę o pracę bez wypowiedzenia?",
    "Jakie są zasady dziedziczenia ustawowego?"
  ],
  "shortQuery": "Test",
  "longQuery": "A".repeat(1001)
}
```

---

## ✅ Plan implementacji

### Faza 1: Podstawowe testy (2-3 godziny)
1. ⏳ Auth tests (login.spec.ts, logout.spec.ts)
2. ⏳ Submit query tests (submit-query.spec.ts)
3. ⏳ Fast response test (fast-response.spec.ts)

### Faza 2: Zaawansowane testy (2-3 godziny)
4. ⏳ Rating tests (rating.spec.ts)
5. ⏳ Detailed response test (detailed-response.spec.ts)
6. ⏳ Sources test (sources.spec.ts)
7. ⏳ Navigation tests (header.spec.ts)

### Faza 3: Fixtures i optymalizacje (1 godzina)
8. ⏳ Utworzenie fixtures (test-users.json, example-queries.json)
9. ⏳ Setup/teardown helpers
10. ⏳ Uruchomienie wszystkich testów i weryfikacja

---

## 🎯 Następny krok

**Rozpocząć implementację Fazy 1:**
1. Utworzyć `tests/specs/auth/login.spec.ts` z testami 1.1-1.4
2. Utworzyć `tests/specs/auth/logout.spec.ts` z testem 1.5
3. Uruchomić testy i zweryfikować działanie

**Gotowe do kontynuacji?** 🚀
