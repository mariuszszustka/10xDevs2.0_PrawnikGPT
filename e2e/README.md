# E2E Testing with Playwright

This directory contains end-to-end tests for the PrawnikGPT application using Playwright.

## Directory Structure

```
e2e/
├── README.md                    # This file
├── page-objects/                # Page Object Model implementations
│   ├── BasePage.ts             # Base class with common functionality
│   ├── LoginPage.ts            # Login page object
│   ├── ChatPage.ts             # Main chat interface
│   └── README.md               # Page Objects documentation
├── auth.spec.ts                 # Authentication tests
├── chat.spec.ts                 # Chat interface tests (to be implemented)
└── history.spec.ts              # Query history tests (to be implemented)
```

## Running Tests

### Prerequisites

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install Playwright browsers (first time only):
   ```bash
   npx playwright install chromium
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

### Run E2E Tests

```bash
# Run all tests (headless mode)
npm run test:e2e

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Run tests in debug mode
npm run test:e2e:debug

# Generate tests with codegen
npm run test:e2e:codegen
```

### Additional Playwright Commands

```bash
# Run specific test file
npx playwright test e2e/auth.spec.ts

# Run tests in headed mode (show browser)
npx playwright test --headed

# Run tests in specific browser
npx playwright test --project=chromium

# Show test report
npx playwright show-report

# Update screenshots (visual regression)
npx playwright test --update-snapshots
```

## Writing Tests

### 1. Follow the Page Object Model

Create Page Objects in `page-objects/` directory:

```typescript
import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class MyPage extends BasePage {
  constructor(page: Page) {
    super(page);
    // Initialize locators using data-testid
    this.submitButton = this.getByTestId('my-submit-button');
  }

  async performAction() {
    // Implement page interactions
  }
}
```

### 2. Use Arrange-Act-Assert Pattern

```typescript
test('should perform action', async ({ page }) => {
  // Arrange
  const myPage = new MyPage(page);
  await myPage.goto();

  // Act
  await myPage.performAction();

  // Assert
  await expect(page).toHaveURL(/expected-url/);
});
```

### 3. Use data-testid Selectors

In components:
```tsx
<button data-testid="login-button">Login</button>
```

In tests:
```typescript
this.loginButton = this.getByTestId('login-button');
```

### 4. Group Related Tests

```typescript
test.describe('Feature Name', () => {
  test.describe('Sub-feature', () => {
    test('should do something', async ({ page }) => {
      // Test implementation
    });
  });
});
```

## Configuration

See `playwright.config.ts` for configuration options:
- Base URL: `http://localhost:4321`
- Browser: Chromium only (per guidelines)
- Timeout: 5 minutes per test
- Retries: 2 on CI, 0 locally
- Reporters: HTML + List

## Best Practices

1. **Use Page Objects** - Encapsulate page interactions in Page Objects
2. **Use data-testid** - Use `data-testid` attributes for resilient selectors
3. **Isolate Tests** - Each test should be independent
4. **Use Fixtures** - Set up test data using Playwright fixtures
5. **Visual Regression** - Use `toHaveScreenshot()` for critical pages
6. **Parallel Execution** - Tests run in parallel by default
7. **Debug with Trace Viewer** - Use `--trace on` for debugging

## CI/CD Integration

Tests automatically run in GitHub Actions on:
- Pull requests to main branch
- Pushes to main branch

See `.github/workflows/` for CI configuration.

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Page Object Model](https://playwright.dev/docs/pom)
- [Test Fixtures](https://playwright.dev/docs/test-fixtures)
- [Visual Comparisons](https://playwright.dev/docs/test-snapshots)
