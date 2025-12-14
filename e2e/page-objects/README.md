# Page Objects - Playwright E2E Testing

This directory contains Page Object Model (POM) implementations for E2E tests.

## Structure

- `BasePage.ts` - Abstract base class with common functionality
- `LoginPage.ts` - Page Object for /login page
- `ChatPage.ts` - Page Object for /app (main chat interface)
- `RegisterPage.ts` - Page Object for /register page (to be implemented)
- `HistoryPage.ts` - Page Object for /app/history page (to be implemented)

## Guidelines

### 1. Use data-testid attributes
All interactive elements should have `data-testid` attributes for resilient selectors:

```tsx
<button data-testid="login-submit-button">Login</button>
```

Locate elements in Page Objects:
```typescript
this.submitButton = this.getByTestId('login-submit-button');
```

### 2. Follow Arrange-Act-Assert pattern
Structure all tests with clear separation:

```typescript
test('should login successfully', async ({ page }) => {
  // Arrange
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  // Act
  await loginPage.login('test@example.com', 'password123');

  // Assert
  await expect(page).toHaveURL(/.*app/);
});
```

### 3. Encapsulate page interactions
Create methods for common actions:

```typescript
async login(email: string, password: string) {
  await this.fillEmail(email);
  await this.fillPassword(password);
  await this.clickSubmit();
}
```

### 4. Use visual regression testing
Implement screenshot comparisons for critical pages:

```typescript
await expect(page).toHaveScreenshot('login-page.png');
```

### 5. Leverage browser contexts
Isolate tests with separate browser contexts for authentication states.

## Example Usage

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from './page-objects/LoginPage';
import { ChatPage } from './page-objects/ChatPage';

test('user can login and send query', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const chatPage = new ChatPage(page);

  await loginPage.goto();
  await loginPage.login('test@example.com', 'Test123!@#');

  await chatPage.goto();
  await chatPage.sendQuery('Jakie są prawa konsumenta?');
  await chatPage.waitForFastResponse();

  expect(await chatPage.getFastResponseContent()).toBeTruthy();
});
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)
- [Best Practices](https://playwright.dev/docs/best-practices)
