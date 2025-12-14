# Testing Environment Setup - PrawnikGPT

This document provides a complete guide to the testing environment setup for the PrawnikGPT project.

## Overview

The project is configured with two testing frameworks:
- **Vitest** - Unit and integration testing for React components and utilities
- **Playwright** - End-to-end testing for user workflows

## What Was Configured

### 1. Dependencies Added

#### Vitest & Testing Library
- `vitest` (^2.1.8) - Modern testing framework
- `@vitest/coverage-v8` (^2.1.8) - Code coverage reporting
- `@testing-library/react` (^16.1.0) - React component testing utilities
- `@testing-library/user-event` (^14.5.2) - User interaction simulation
- `@testing-library/jest-dom` (^6.6.3) - Custom matchers for DOM assertions
- `jsdom` (^25.0.1) - DOM environment for tests
- `msw` (^2.7.0) - API mocking
- `@axe-core/react` (^4.10.2) - Accessibility testing
- `@vitejs/plugin-react` (^4.3.4) - React support for Vitest

#### Playwright
- `@playwright/test` (^1.49.1) - E2E testing framework

### 2. Configuration Files Created

#### vitest.config.ts
- jsdom environment for DOM testing
- Setup file: `src/test/setup.ts`
- Coverage thresholds: ≥50% for MVP
- Path aliases matching tsconfig.json
- Excludes: Shadcn/ui components, config files, dist

#### playwright.config.ts
- Chromium browser only (per guidelines)
- Base URL: http://localhost:4321
- Automatic dev server startup
- Trace on first retry
- Screenshot on failure
- HTML + List reporters

### 3. Directory Structure Created

```
prawnik_v01/
├── src/
│   ├── test/
│   │   └── setup.ts              # Vitest setup file
│   └── __tests__/
│       ├── README.md             # Unit testing guide
│       └── example.test.tsx      # Example unit test
├── e2e/
│   ├── README.md                 # E2E testing guide
│   ├── page-objects/
│   │   ├── README.md             # Page Objects documentation
│   │   ├── BasePage.ts           # Base Page Object class
│   │   ├── LoginPage.ts          # Login page object
│   │   └── ChatPage.ts           # Chat page object
│   └── auth.spec.ts              # Authentication E2E tests
├── vitest.config.ts              # Vitest configuration
├── playwright.config.ts          # Playwright configuration
└── TESTING_SETUP.md              # This file
```

### 4. NPM Scripts Added

```json
{
  "test": "vitest",                              // Run unit tests
  "test:ui": "vitest --ui",                      // Interactive test UI
  "test:watch": "vitest --watch",                // Watch mode
  "test:coverage": "vitest --coverage",          // With coverage report
  "test:e2e": "playwright test",                 // Run E2E tests
  "test:e2e:ui": "playwright test --ui",         // E2E interactive UI
  "test:e2e:debug": "playwright test --debug",   // E2E debug mode
  "test:e2e:codegen": "playwright codegen http://localhost:4321"  // Generate tests
}
```

### 5. Setup Files Created

#### src/test/setup.ts
- Imports @testing-library/jest-dom matchers
- Configures cleanup after each test
- Mocks window.matchMedia
- Mocks IntersectionObserver
- Mocks ResizeObserver

### 6. Example Tests Created

#### src/__tests__/example.test.tsx
- Demonstrates Arrange-Act-Assert pattern
- Shows mocking with vi.fn()
- Shows user interaction with @testing-library/user-event
- Shows inline snapshots
- Shows async testing

#### e2e/auth.spec.ts
- Login page visibility tests
- Invalid credentials error handling
- Successful login redirect
- Navigation to register/forgot password
- Visual regression testing

### 7. Page Objects Created

#### e2e/page-objects/BasePage.ts
- Abstract base class for Page Objects
- Common methods: goto, waitForPageLoad, getByTestId, screenshot

#### e2e/page-objects/LoginPage.ts
- Login page interactions
- Locators using data-testid convention
- Methods: fillEmail, fillPassword, clickSubmit, login

#### e2e/page-objects/ChatPage.ts
- Chat interface interactions
- Methods: sendQuery, waitForFastResponse, rateUp, rateDown, logout

## Getting Started

### Install Dependencies

```bash
npm install
```

### Install Playwright Browsers (First Time)

```bash
npx playwright install chromium
```

## Running Tests

### Unit Tests (Vitest)

```bash
# Run all unit tests
npm run test

# Watch mode (recommended for development)
npm run test:watch

# UI mode (interactive browser interface)
npm run test:ui

# Coverage report
npm run test:coverage
```

### E2E Tests (Playwright)

```bash
# Start dev server first (in separate terminal)
npm run dev

# Run all E2E tests
npm run test:e2e

# UI mode (interactive)
npm run test:e2e:ui

# Debug mode (step through tests)
npm run test:e2e:debug

# Generate tests with codegen
npm run test:e2e:codegen
```

## Next Steps

### 1. Add data-testid Attributes to Components

Update existing components to include `data-testid` attributes for E2E testing:

```tsx
// Before
<button onClick={handleClick}>Submit</button>

// After
<button onClick={handleClick} data-testid="submit-button">Submit</button>
```

**Priority components:**
- `src/components/auth/LoginForm.tsx`
- `src/components/auth/RegisterForm.tsx`
- `src/components/chat/ChatInput.tsx`
- `src/components/chat/ChatMessagesContainer.tsx`
- `src/components/layout/UserMenu.tsx`

### 2. Write Unit Tests

Start writing unit tests for React components:

```bash
# Test file location options:
# Option 1: Co-located with component
src/components/auth/LoginForm.test.tsx

# Option 2: In __tests__ directory
src/__tests__/components/auth/LoginForm.test.tsx
```

**Priority components to test:**
- Auth forms (LoginForm, RegisterForm, SignupForm)
- Chat components (ChatInput, ResponseCard, RatingButtons)
- Utility functions in `src/lib/`

### 3. Write E2E Tests

Expand E2E test coverage:

```bash
# Create test files:
e2e/auth.spec.ts          # ✅ Already created
e2e/chat.spec.ts          # TODO: Chat workflow tests
e2e/history.spec.ts       # TODO: Query history tests
e2e/onboarding.spec.ts    # TODO: Welcome message, example questions
```

### 4. Set Up CI/CD

Create GitHub Actions workflow for automated testing:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: npm run test:coverage
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
```

## Testing Guidelines

### Unit Tests (Vitest)

✅ **Do:**
- Follow Arrange-Act-Assert pattern
- Use semantic queries (getByRole, getByLabelText)
- Test user behavior, not implementation details
- Mock external dependencies (API calls)
- Use @testing-library/user-event for interactions
- Aim for ≥50% coverage (MVP target)

❌ **Don't:**
- Test internal state or props directly
- Use getByTestId unless necessary
- Test third-party libraries (Shadcn/ui)
- Write integration tests in unit test files

### E2E Tests (Playwright)

✅ **Do:**
- Use Page Object Model pattern
- Use data-testid attributes for selectors
- Follow Arrange-Act-Assert pattern
- Test complete user workflows
- Use visual regression for critical pages
- Isolate tests (each test independent)

❌ **Don't:**
- Use CSS selectors (fragile)
- Skip Page Objects (encapsulation)
- Share state between tests
- Test backend logic (use backend tests)

## Coverage Targets

### MVP Phase
- **Frontend**: ≥50% coverage
- **Backend**: ≥70% coverage

### Post-MVP
- **Frontend**: ≥70% coverage
- **Backend**: ≥80% coverage

## Resources

### Vitest
- [Vitest Documentation](https://vitest.dev)
- [Vitest Best Practices](https://vitest.dev/guide/best-practices)

### Testing Library
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro)
- [Common Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

### Playwright
- [Playwright Documentation](https://playwright.dev)
- [Page Object Model](https://playwright.dev/docs/pom)
- [Best Practices](https://playwright.dev/docs/best-practices)

## Troubleshooting

### Vitest Issues

**Issue**: Tests fail with "Cannot find module '@/...'"
**Solution**: Check path aliases in `vitest.config.ts` match `tsconfig.json`

**Issue**: "jsdom is not defined"
**Solution**: Ensure `environment: 'jsdom'` in `vitest.config.ts`

### Playwright Issues

**Issue**: "Target closed" error
**Solution**: Increase timeout in `playwright.config.ts` or use `page.waitForLoadState()`

**Issue**: "Browser not found"
**Solution**: Run `npx playwright install chromium`

**Issue**: Dev server not starting
**Solution**: Check `webServer` config in `playwright.config.ts`, ensure port 4321 is available

## Support

For questions or issues with the testing setup:
1. Check the README files in `src/__tests__/` and `e2e/`
2. Review example tests
3. Consult official documentation (links above)
4. Open an issue in the project repository

---

**Setup completed by:** Claude Code
**Date:** 2025-01-11
**Version:** 1.0.0
