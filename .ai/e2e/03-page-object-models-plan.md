# E2E Testing - Zadanie 3: Page Object Models (POM)
**Data:** 2025-01-11
**Status:** 🚧 W trakcie
**Poprzednie:** Zadanie 2 (data-testid selektory) ✅ UKOŃCZONE

---

## 📋 Cel Zadania 3

Zbudowanie **Page Object Models** (POM) dla testów E2E w Playwright, wykorzystując selektory `data-testid` dodane w Zadaniu 2.

**Page Object Model** to wzorzec projektowy, który:
- Enkapsuluje interakcje z elementami strony
- Zwiększa czytelność i utrzymywalność testów
- Redukuje duplikację kodu
- Ułatwia aktualizację testów przy zmianach UI

---

## 🎯 Zakres Page Object Models

### **Priority 1: KRYTYCZNE** (Podstawowe flow)

#### 1. **LoginPage** 🔒
**Plik:** `tests/pom/LoginPage.ts`
**Strona:** `/login`
**Odpowiada za:** Logowanie użytkownika

**Selektory z LoginForm.tsx:**
- `login-form` - główny formularz
- `email-input` - pole email
- `password-input` - pole hasła
- `password-toggle-button` - toggle widoczności hasła
- `submit-button` - przycisk zaloguj
- `error-message` - komunikat błędu
- `session-expired-alert` - alert wygasłej sesji

**Metody:**
```typescript
class LoginPage {
  async goto(): Promise<void>
  async fillEmail(email: string): Promise<void>
  async fillPassword(password: string): Promise<void>
  async togglePasswordVisibility(): Promise<void>
  async clickSubmit(): Promise<void>
  async login(email: string, password: string): Promise<void>
  async getErrorMessage(): Promise<string | null>
  async hasSessionExpiredAlert(): Promise<boolean>
  async isSubmitButtonDisabled(): Promise<boolean>
}
```

---

#### 2. **ChatPage** 💬
**Plik:** `tests/pom/ChatPage.ts`
**Strona:** `/app/chat`
**Odpowiada za:** Zadawanie pytań i interakcje z odpowiedziami

**Selektory z ChatInput.tsx:**
- `chat-input-form` - formularz czatu
- `chat-input` - pole tekstowe pytania
- `character-counter` - licznik znaków
- `rate-limit-info` - informacja o limicie
- `active-queries-info` - aktywne zapytania
- `send-button` - przycisk wyślij
- `error-message` - komunikat błędu

**Selektory z ResponseCard.tsx:**
- `response-card-fast` / `response-card-accurate` - karty odpowiedzi
- `response-type-badge` - badge typu odpowiedzi
- `model-name-badge` - badge modelu
- `generation-time-badge` - czas generowania
- `rag-cache-timer` - timer cache
- `cache-expired-badge` - wygasły cache
- `response-content` - treść odpowiedzi
- `sources-list` - lista źródeł
- `source-item-${index}` - pojedyncze źródło
- `source-link-${index}` - link źródła
- `rating-buttons-container` - przyciski oceny
- `detailed-answer-button` - przycisk dokładnej odpowiedzi

**Selektory z RatingButtons.tsx:**
- `rating-buttons-wrapper` - kontener przycisków
- `thumbs-up-button` - kciuk w górę
- `thumbs-down-button` - kciuk w dół
- `data-rating-value` - wartość oceny
- `data-is-submitting` - stan submisji

**Metody:**
```typescript
class ChatPage {
  // Navigation
  async goto(): Promise<void>

  // Input interactions
  async fillQuery(text: string): Promise<void>
  async clearQuery(): Promise<void>
  async clickSend(): Promise<void>
  async submitQuery(text: string): Promise<void>

  // Query validation
  async getCharacterCount(): Promise<string>
  async getRateLimitInfo(): Promise<string>
  async getActiveQueriesInfo(): Promise<string | null>
  async isSendButtonDisabled(): Promise<boolean>
  async getErrorMessage(): Promise<string | null>

  // Response interactions
  async waitForFastResponse(timeout?: number): Promise<void>
  async waitForAccurateResponse(timeout?: number): Promise<void>
  async getFastResponseContent(): Promise<string>
  async getAccurateResponseContent(): Promise<string>
  async getResponseModelName(type: 'fast' | 'accurate'): Promise<string>
  async getResponseGenerationTime(type: 'fast' | 'accurate'): Promise<string>
  async getCacheTimer(): Promise<string | null>
  async isCacheExpired(): Promise<boolean>

  // Sources
  async getSourcesCount(type: 'fast' | 'accurate'): Promise<number>
  async getSourceTitle(type: 'fast' | 'accurate', index: number): Promise<string>
  async getSourceLink(type: 'fast' | 'accurate', index: number): Promise<string>
  async clickSourceLink(type: 'fast' | 'accurate', index: number): Promise<void>

  // Rating interactions
  async clickThumbsUp(type: 'fast' | 'accurate'): Promise<void>
  async clickThumbsDown(type: 'fast' | 'accurate'): Promise<void>
  async getCurrentRating(type: 'fast' | 'accurate'): Promise<'up' | 'down' | 'none'>
  async isRatingSubmitting(type: 'fast' | 'accurate'): Promise<boolean>

  // Detailed answer
  async clickDetailedAnswerButton(): Promise<void>
  async hasDetailedAnswerButton(): Promise<boolean>
}
```

---

#### 3. **HeaderComponent** 🔝
**Plik:** `tests/pom/components/HeaderComponent.ts`
**Strona:** Wszystkie strony (component)
**Odpowiada za:** Nawigacja główna

**Selektory z Header.astro:**
- `main-header` - główny header
- `logo-link` - link do logo
- `desktop-nav` - nawigacja desktop
- `app-link` - link do aplikacji
- `pricing-link` - link do cennika
- `auth-buttons` - przyciski autoryzacji
- `login-link` - link logowania
- `register-link` - link rejestracji

**Selektory z UserMenu.tsx:**
- `user-menu-button` - przycisk menu użytkownika
- `logout-button` - przycisk wylogowania

**Metody:**
```typescript
class HeaderComponent {
  // Navigation
  async clickLogo(): Promise<void>
  async clickAppLink(): Promise<void>
  async clickPricingLink(): Promise<void>

  // Auth (unauthenticated)
  async clickLoginLink(): Promise<void>
  async clickRegisterLink(): Promise<void>
  async hasAuthButtons(): Promise<boolean>

  // User menu (authenticated)
  async clickUserMenu(): Promise<void>
  async clickLogout(): Promise<void>
  async hasUserMenu(): Promise<boolean>
  async getUserEmail(): Promise<string | null>

  // Visibility checks
  async isVisible(): Promise<boolean>
  async isAuthenticated(): Promise<boolean>
}
```

---

### **Priority 2: WYSOKIE** (Rozszerzone flow)

#### 4. **HistoryPage** 📜
**Plik:** `tests/pom/HistoryPage.ts`
**Strona:** `/app/history`
**Odpowiada za:** Przeglądanie historii zapytań

**Wymagane selektory:** (do dodania w przyszłości)
- `history-list` - lista historii
- `history-item-${index}` - pojedynczy wpis
- `history-query-text` - tekst zapytania
- `history-timestamp` - timestamp
- `history-delete-button` - przycisk usuń

**Metody:**
```typescript
class HistoryPage {
  async goto(): Promise<void>
  async getHistoryItemsCount(): Promise<number>
  async getQueryText(index: number): Promise<string>
  async getTimestamp(index: number): Promise<string>
  async clickHistoryItem(index: number): Promise<void>
  async deleteHistoryItem(index: number): Promise<void>
  async hasEmptyState(): Promise<boolean>
}
```

---

#### 5. **RegisterPage** 📝
**Plik:** `tests/pom/RegisterPage.ts`
**Strona:** `/register`
**Odpowiada za:** Rejestracja nowego użytkownika

**Wymagane selektory:** (do dodania w przyszłości)
- `register-form` - formularz rejestracji
- `email-input` - pole email
- `password-input` - pole hasła
- `confirm-password-input` - potwierdzenie hasła
- `submit-button` - przycisk zarejestruj
- `error-message` - komunikat błędu

**Metody:**
```typescript
class RegisterPage {
  async goto(): Promise<void>
  async fillEmail(email: string): Promise<void>
  async fillPassword(password: string): Promise<void>
  async fillConfirmPassword(password: string): Promise<void>
  async clickSubmit(): Promise<void>
  async register(email: string, password: string): Promise<void>
  async getErrorMessage(): Promise<string | null>
}
```

---

## 🏗️ Struktura katalogów

```
tests/
├── pom/
│   ├── pages/
│   │   ├── LoginPage.ts          # Priority 1
│   │   ├── ChatPage.ts           # Priority 1
│   │   ├── HistoryPage.ts        # Priority 2
│   │   ├── RegisterPage.ts       # Priority 2
│   │   └── BasePage.ts           # Klasa bazowa
│   ├── components/
│   │   ├── HeaderComponent.ts    # Priority 1
│   │   └── ResponseCard.ts       # Helper dla ChatPage
│   └── index.ts                   # Export wszystkich POM
├── specs/
│   ├── auth/
│   │   ├── login.spec.ts
│   │   └── logout.spec.ts
│   ├── chat/
│   │   ├── submit-query.spec.ts
│   │   ├── fast-response.spec.ts
│   │   ├── detailed-response.spec.ts
│   │   └── rating.spec.ts
│   └── history/
│       └── view-history.spec.ts
├── fixtures/
│   ├── test-users.json           # Dane testowe
│   └── example-queries.json      # Przykładowe pytania
└── playwright.config.ts          # Konfiguracja Playwright
```

---

## 🎨 Wzorzec implementacji

### BasePage (Klasa bazowa)

```typescript
// tests/pom/pages/BasePage.ts
import { Page } from '@playwright/test';

export abstract class BasePage {
  constructor(protected page: Page) {}

  async goto(path: string): Promise<void> {
    await this.page.goto(path);
  }

  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  async waitForNavigation(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  protected async waitForSelector(selector: string, options?: { timeout?: number }): Promise<void> {
    await this.page.waitForSelector(`[data-testid="${selector}"]`, options);
  }

  protected getByTestId(selector: string) {
    return this.page.getByTestId(selector);
  }
}
```

### Przykład: LoginPage

```typescript
// tests/pom/pages/LoginPage.ts
import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await super.goto('/login');
    await this.waitForSelector('login-form');
  }

  async fillEmail(email: string): Promise<void> {
    await this.getByTestId('email-input').fill(email);
  }

  async fillPassword(password: string): Promise<void> {
    await this.getByTestId('password-input').fill(password);
  }

  async togglePasswordVisibility(): Promise<void> {
    await this.getByTestId('password-toggle-button').click();
  }

  async clickSubmit(): Promise<void> {
    await this.getByTestId('submit-button').click();
  }

  async login(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickSubmit();
  }

  async getErrorMessage(): Promise<string | null> {
    const errorElement = this.getByTestId('error-message');
    const isVisible = await errorElement.isVisible().catch(() => false);
    return isVisible ? await errorElement.textContent() : null;
  }

  async hasSessionExpiredAlert(): Promise<boolean> {
    return await this.getByTestId('session-expired-alert').isVisible().catch(() => false);
  }

  async isSubmitButtonDisabled(): Promise<boolean> {
    return await this.getByTestId('submit-button').isDisabled();
  }
}
```

---

## ✅ Plan implementacji Task 3

### Faza 1: Priority 1 (KRYTYCZNE)
1. ✅ Przygotowanie struktury katalogów (`tests/pom/`)
2. ⏳ Implementacja BasePage
3. ⏳ Implementacja LoginPage
4. ⏳ Implementacja ChatPage
5. ⏳ Implementacja HeaderComponent
6. ⏳ Testy POMs (podstawowa weryfikacja)

### Faza 2: Priority 2 (Opcjonalne)
7. ⏳ Implementacja HistoryPage
8. ⏳ Implementacja RegisterPage
9. ⏳ Rozszerzenie testów

---

## 🎯 Następny krok

**Rozpocząć implementację Fazy 1:**
1. Stworzyć strukturę katalogów `tests/pom/`
2. Zaimplementować BasePage
3. Zaimplementować LoginPage jako pierwszy POM
4. Napisać prosty test weryfikujący LoginPage

**Gotowe do kontynuacji?** 🚀
