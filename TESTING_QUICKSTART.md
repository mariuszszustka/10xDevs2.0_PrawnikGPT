# Testing Quick Start Guide

## 🚀 Quick Start (5 minutes)

### 1. Install Dependencies (Already Done ✅)

```bash
npm install
```

### 2. Run Your First Unit Test

```bash
# Run example test
npm run test

# You should see:
# ✓ src/__tests__/example.test.tsx (3 tests)
#   ✓ Button Component
#     ✓ should render with correct text
#     ✓ should call onClick handler when clicked
#     ✓ should match inline snapshot
```

### 3. Install Playwright Browsers

```bash
# Install Chromium browser (first time only, ~100MB)
npx playwright install chromium
```

### 4. Run Your First E2E Test

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Run E2E tests
npm run test:e2e
```

## 📊 View Test Results

### Unit Test Coverage

```bash
npm run test:coverage

# Open coverage report in browser
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
start coverage/index.html  # Windows
```

### E2E Test Report

```bash
# After running E2E tests
npx playwright show-report
```

## 🎯 Next Steps

### Write Your First Unit Test

Create `src/components/auth/LoginForm.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('should submit form with email and password', async () => {
    // Arrange
    const mockOnSubmit = vi.fn();
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockOnSubmit} />);

    // Act
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    // Assert
    expect(mockOnSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });
});
```

### Add data-testid to Components

Update `src/components/auth/LoginForm.tsx`:

```tsx
export function LoginForm() {
  return (
    <form>
      <input
        type="email"
        data-testid="login-email-input"  // ← Add this
      />
      <input
        type="password"
        data-testid="login-password-input"  // ← Add this
      />
      <button
        type="submit"
        data-testid="login-submit-button"  // ← Add this
      >
        Submit
      </button>
    </form>
  );
}
```

### Write Your First E2E Test

Create `e2e/chat.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from './page-objects/LoginPage';
import { ChatPage } from './page-objects/ChatPage';

test('user can send query and receive response', async ({ page }) => {
  // Arrange
  const loginPage = new LoginPage(page);
  const chatPage = new ChatPage(page);

  // Act
  await loginPage.goto();
  await loginPage.login('test@example.com', 'Test123!@#');

  await chatPage.goto();
  await chatPage.sendQuery('Jakie są prawa konsumenta?');
  await chatPage.waitForFastResponse();

  // Assert
  const response = await chatPage.getFastResponseContent();
  expect(response).toBeTruthy();
});
```

## 🛠️ Development Workflow

### Watch Mode (Recommended)

```bash
# Terminal 1: Dev server
npm run dev

# Terminal 2: Tests in watch mode
npm run test:watch

# Now edit files - tests re-run automatically! 🔄
```

### Interactive Testing

```bash
# Vitest UI (interactive browser interface)
npm run test:ui

# Playwright UI (step through E2E tests)
npm run test:e2e:ui
```

## 📚 Learn More

- **Detailed Guide**: See [TESTING_SETUP.md](./TESTING_SETUP.md)
- **Unit Tests**: See [src/__tests__/README.md](./src/__tests__/README.md)
- **E2E Tests**: See [e2e/README.md](./e2e/README.md)
- **Page Objects**: See [e2e/page-objects/README.md](./e2e/page-objects/README.md)

## 🐛 Common Issues

### "Cannot find module '@/...'"
**Fix**: Path aliases are configured in `vitest.config.ts`

### "Browser not found" (Playwright)
**Fix**: Run `npx playwright install chromium`

### "Port 4321 already in use"
**Fix**: Stop other dev servers or change port in `playwright.config.ts`

### Tests slow in WSL2
**Fix**: Run tests from Windows or increase WSL2 memory allocation

## ✅ Coverage Targets

- **MVP Frontend**: ≥50% coverage
- **MVP Backend**: ≥70% coverage

Check current coverage:
```bash
npm run test:coverage
```

---

**Happy Testing! 🧪**
