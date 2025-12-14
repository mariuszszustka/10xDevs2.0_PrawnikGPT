# Unit Testing with Vitest

This directory contains unit tests for React components and utilities using Vitest and React Testing Library.

## Directory Structure

```
src/__tests__/
├── README.md                    # This file
├── example.test.tsx             # Example test demonstrating best practices
└── (component tests to be implemented)
```

## Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode (recommended for development)
npm run test:watch

# Run tests with UI mode (interactive)
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Writing Tests

### 1. Follow Arrange-Act-Assert Pattern

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('MyComponent', () => {
  it('should do something', async () => {
    // Arrange
    const mockFn = vi.fn();
    const user = userEvent.setup();
    render(<MyComponent onClick={mockFn} />);

    // Act
    await user.click(screen.getByRole('button'));

    // Assert
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});
```

### 2. Use Testing Library Queries

Prefer these query methods (in order of priority):
1. `getByRole()` - Most accessible
2. `getByLabelText()` - For form fields
3. `getByPlaceholderText()` - For inputs
4. `getByText()` - For non-interactive elements
5. `getByTestId()` - Last resort

```typescript
// Good
screen.getByRole('button', { name: /submit/i });
screen.getByLabelText(/email/i);

// Avoid (unless necessary)
screen.getByTestId('submit-button');
```

### 3. Mock External Dependencies

```typescript
import { vi } from 'vitest';

// Mock module
vi.mock('@/lib/apiClient', () => ({
  fetchData: vi.fn().mockResolvedValue({ data: 'mocked' }),
}));

// Mock function
const mockFetch = vi.fn();
global.fetch = mockFetch;
```

### 4. Use User Event for Interactions

```typescript
import userEvent from '@testing-library/user-event';

it('should handle user interactions', async () => {
  const user = userEvent.setup();
  render(<MyForm />);

  await user.type(screen.getByLabelText(/email/i), 'test@example.com');
  await user.click(screen.getByRole('button', { name: /submit/i }));
});
```

### 5. Test Accessibility

```typescript
import { axe } from '@axe-core/react';

it('should have no accessibility violations', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## Test File Naming

- `*.test.tsx` - Component tests
- `*.test.ts` - Utility/function tests
- Place tests next to the component or in `__tests__/` directory

```
src/
├── components/
│   ├── Button.tsx
│   └── Button.test.tsx          # Co-located test
└── __tests__/
    └── Button.test.tsx           # Alternative location
```

## Common Patterns

### Testing Async Operations

```typescript
it('should handle async data fetching', async () => {
  render(<MyComponent />);

  // Wait for element to appear
  const element = await screen.findByText(/loaded data/i);
  expect(element).toBeInTheDocument();
});
```

### Testing Forms

```typescript
it('should validate form inputs', async () => {
  const user = userEvent.setup();
  render(<LoginForm />);

  const emailInput = screen.getByLabelText(/email/i);
  await user.type(emailInput, 'invalid-email');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
});
```

### Testing Custom Hooks

```typescript
import { renderHook } from '@testing-library/react';
import { useMyHook } from '@/hooks/useMyHook';

it('should update state', () => {
  const { result } = renderHook(() => useMyHook());

  act(() => {
    result.current.updateValue('new value');
  });

  expect(result.current.value).toBe('new value');
});
```

## Coverage Thresholds

The project requires ≥50% coverage for MVP (configured in `vitest.config.ts`):
- Lines: 50%
- Functions: 50%
- Branches: 50%
- Statements: 50%

View coverage report:
```bash
npm run test:coverage
# Open coverage/index.html in browser
```

## Debugging Tests

### VS Code Debugging

Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test"],
  "console": "integratedTerminal"
}
```

### Browser Debugging

```bash
npm run test:ui
# Opens browser with interactive test UI
```

## Best Practices

1. **Test User Behavior** - Test what users see and do, not implementation details
2. **Use Semantic Queries** - Prefer accessible queries (getByRole, getByLabelText)
3. **Avoid Testing Implementation** - Don't test internal state or props directly
4. **Mock External APIs** - Use MSW or vi.mock() for API calls
5. **Keep Tests Fast** - Avoid unnecessary waits and timeouts
6. **Write Descriptive Test Names** - Use "should..." format
7. **Group Related Tests** - Use describe blocks for organization

## Resources

- [Vitest Documentation](https://vitest.dev)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro)
- [Common Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Testing Best Practices](https://testingjavascript.com)
