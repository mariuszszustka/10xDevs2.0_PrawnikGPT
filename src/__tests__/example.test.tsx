import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Example Unit Test with Vitest and React Testing Library
 * This demonstrates the Arrange-Act-Assert pattern and best practices
 */

// Example component to test (you'll replace this with actual components)
function Button({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} data-testid="example-button">
      {children}
    </button>
  );
}

describe('Button Component', () => {
  it('should render with correct text', () => {
    // Arrange
    const mockOnClick = vi.fn();

    // Act
    render(<Button onClick={mockOnClick}>Click me</Button>);

    // Assert
    expect(screen.getByTestId('example-button')).toBeInTheDocument();
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should call onClick handler when clicked', async () => {
    // Arrange
    const mockOnClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={mockOnClick}>Click me</Button>);

    // Act
    await user.click(screen.getByTestId('example-button'));

    // Assert
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('should match inline snapshot', () => {
    // Arrange
    const mockOnClick = vi.fn();

    // Act
    const { container } = render(<Button onClick={mockOnClick}>Click me</Button>);

    // Assert
    expect(container.firstChild).toMatchInlineSnapshot(`
      <button
        data-testid="example-button"
      >
        Click me
      </button>
    `);
  });
});

// Example: Testing with mocked API calls
describe('API Integration', () => {
  it('should handle async operations', async () => {
    // Arrange
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Success' }),
    });
    global.fetch = mockFetch;

    // Act
    const response = await fetch('/api/test');
    const data = await response.json();

    // Assert
    expect(mockFetch).toHaveBeenCalledWith('/api/test');
    expect(data.message).toBe('Success');
  });
});

// Example: Testing hooks
describe('Custom Hooks', () => {
  it('should demonstrate hook testing pattern', () => {
    // Arrange
    // (Setup hook test with renderHook from @testing-library/react)

    // Act
    // (Call hook actions)

    // Assert
    // (Verify hook state)
  });
});
