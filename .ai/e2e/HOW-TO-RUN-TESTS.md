# Jak uruchomić testy E2E z Playwright

**Data:** 2025-01-11
**Status:** Instrukcje uruchomienia testów E2E

---

## 🚀 Szybki start

### 1. Upewnij się, że wszystkie serwisy są uruchomione

```bash
# Terminal 1: Supabase (jeśli używasz local)
supabase start

# Terminal 2: Backend FastAPI
cd backend
uvicorn main:app --reload

# Terminal 3: Frontend Astro (Playwright uruchomi automatycznie)
# npm run dev
```

### 2. Sprawdź zmienne środowiskowe

Upewnij się, że `.env` ma wszystkie wymagane zmienne:
```env
SUPABASE_URL=http://localhost:8444
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
PUBLIC_API_BASE_URL=http://localhost:8000
OLLAMA_HOST=http://localhost:11434
```

### 3. Utwórz test użytkownika w Supabase

Testy wymagają użytkownika testowego:
- **Email:** `test@example.com`
- **Password:** `password123`

Możesz utworzyć go przez:
- Supabase Studio (http://localhost:54323)
- Lub endpoint `/api/auth/register` w aplikacji

### 4. Uruchom testy

```bash
# Wszystkie testy
npx playwright test

# Tylko testy auth
npx playwright test tests/specs/auth

# Tylko testy chat
npx playwright test tests/specs/chat

# Jeden konkretny plik
npx playwright test tests/specs/auth/login.spec.ts

# W trybie headed (pokazuje przeglądarkę)
npx playwright test --headed

# W trybie debug
npx playwright test --debug

# Tylko failed testy
npx playwright test --last-failed
```

---

## 📊 Dostępne testy (19 testów)

### Auth Tests (10 testów)
**Pliki:**
- `tests/specs/auth/login.spec.ts` (7 testów)
- `tests/specs/auth/logout.spec.ts` (3 testy)

**Scenariusze:**
- ✅ Successful login
- ✅ Invalid credentials
- ✅ Empty fields validation
- ✅ Password visibility toggle
- ✅ Session expired alert
- ✅ Logout flow
- ✅ User menu interactions

### Chat Tests (9 testów)
**Pliki:**
- `tests/specs/chat/submit-query.spec.ts` (9 testów)

**Scenariusze:**
- ✅ Submit valid query + fast response
- ✅ Query too short/long validation
- ✅ Character counter updates
- ✅ Edge cases (min/max lengths)
- ✅ Rate limit info display

---

## 🛠️ Konfiguracja Playwright

**Plik:** `playwright.config.ts`

### Kluczowe ustawienia:
```typescript
{
  testDir: './tests/specs',
  baseURL: 'http://localhost:4321',
  timeout: 5 * 60 * 1000, // 5 minut
  expect: { timeout: 10 * 1000 }, // 10s
  projects: [{ name: 'chromium' }], // Tylko Chromium
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    timeout: 120 * 1000,
  },
}
```

---

## 🐛 Debugowanie

### 1. Tryb headed
```bash
npx playwright test --headed
```
Pokazuje przeglądarkę podczas testów.

### 2. Tryb debug
```bash
npx playwright test --debug
```
Otwiera Playwright Inspector do step-by-step debugowania.

### 3. Tryb UI
```bash
npx playwright test --ui
```
Otwiera UI mode z podglądem na żywo.

### 4. Trace viewer
```bash
# Uruchom test z trace
npx playwright test --trace on

# Zobacz trace
npx playwright show-trace trace.zip
```

### 5. Screenshots i videos
Automatycznie zapisywane w `test-results/` po failed testach.

---

## ❌ Rozwiązywanie problemów

### Problem 1: "Server not running"
**Przyczyna:** Dev server nie jest uruchomiony.
**Rozwiązanie:**
```bash
# Uruchom ręcznie
npm run dev

# Lub zmień w playwright.config.ts
webServer: { reuseExistingServer: true }
```

### Problem 2: "Login failed"
**Przyczyna:** Brak test użytkownika w Supabase.
**Rozwiązanie:**
```bash
# Utwórz użytkownika przez Supabase Studio
# lub zarejestruj przez aplikację
```

### Problem 3: "Backend API error"
**Przyczyna:** Backend nie jest uruchomiony.
**Rozwiązanie:**
```bash
cd backend
uvicorn main:app --reload
```

### Problem 4: "Timeout waiting for fast response"
**Przyczyna:** OLLAMA nie jest uruchomiony lub modele nie są załadowane.
**Rozwiązanie:**
```bash
# Sprawdź OLLAMA
ollama list

# Uruchom modele
ollama pull mistral:7b
ollama pull gpt-oss:120b
ollama pull nomic-embed-text
```

### Problem 5: "Supabase connection error"
**Przyczyna:** Supabase nie jest uruchomiony lub źle skonfigurowany.
**Rozwiązanie:**
```bash
# Sprawdź status
supabase status

# Uruchom jeśli nie działa
supabase start

# Sprawdź .env
echo $SUPABASE_URL
```

---

## 📈 Raporty

### HTML Report
Po uruchomieniu testów:
```bash
npx playwright show-report
```
Otwiera interaktywny raport HTML w przeglądarce.

### JSON Report
Dodaj do `playwright.config.ts`:
```typescript
reporter: [
  ['html'],
  ['json', { outputFile: 'test-results.json' }]
]
```

---

## 🧪 Fixtures i dane testowe

### Test Users
**Plik:** `tests/fixtures/test-users.json`
```json
{
  "validUser": {
    "email": "test@example.com",
    "password": "password123"
  }
}
```

### Example Queries
**Plik:** `tests/fixtures/example-queries.json`
```json
{
  "validQueries": [
    {
      "query": "Jakie są obowiązki pracodawcy wobec pracownika?",
      "category": "Prawo pracy"
    }
  ]
}
```

**Użycie w testach:**
```typescript
import testUsers from '../fixtures/test-users.json';
import queries from '../fixtures/example-queries.json';

test('login with valid user', async ({ page }) => {
  const { email, password } = testUsers.validUser;
  await loginPage.login(email, password);
});
```

---

## 🎯 Best Practices

### 1. Uruchamiaj testy lokalnie przed commit
```bash
npx playwright test
```

### 2. Używaj POMs zamiast bezpośrednich selektorów
```typescript
// ✅ Good
await loginPage.login(email, password);

// ❌ Bad
await page.fill('[data-testid="email"]', email);
```

### 3. Używaj fixtures dla danych testowych
```typescript
// ✅ Good
const user = testUsers.validUser;

// ❌ Bad
const email = 'test@example.com'; // hardcoded
```

### 4. Dodawaj opisy do testów
```typescript
test('User can login successfully with valid credentials', async () => {
  // Clear description of what test does
});
```

### 5. Nie zapomnij o cleanup
```typescript
test.afterEach(async ({ page }) => {
  // Logout, clear cookies, etc.
});
```

---

## 📝 Dodawanie nowych testów

### 1. Utwórz nowy plik spec
```bash
touch tests/specs/new-feature/new-test.spec.ts
```

### 2. Użyj szablonu
```typescript
import { test, expect } from '@playwright/test';
import { LoginPage, ChatPage } from '../../pom';

test.describe('New Feature', () => {
  test('should do something', async ({ page }) => {
    // Arrange
    const loginPage = new LoginPage(page);

    // Act
    await loginPage.goto();

    // Assert
    expect(await loginPage.isFormVisible()).toBe(true);
  });
});
```

### 3. Uruchom nowy test
```bash
npx playwright test tests/specs/new-feature/new-test.spec.ts
```

---

## 🚀 CI/CD

### GitHub Actions przykład
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## ✅ Checklist przed uruchomieniem

- [ ] Supabase uruchomiony (`supabase start`)
- [ ] Backend FastAPI uruchomiony (`uvicorn main:app`)
- [ ] OLLAMA uruchomiony z modelami
- [ ] Test użytkownik istnieje w Supabase
- [ ] Zmienne środowiskowe ustawione w `.env`
- [ ] Playwright zainstalowany (`npm install`)
- [ ] Przeglądarki zainstalowane (`npx playwright install chromium`)

---

## 📚 Dokumentacja

- [Playwright Docs](https://playwright.dev/docs/intro)
- [Page Object Model Best Practices](https://playwright.dev/docs/pom)
- [Test Fixtures](https://playwright.dev/docs/test-fixtures)
- [Debugging Tests](https://playwright.dev/docs/debug)

---

**Powodzenia z testami E2E!** 🚀
