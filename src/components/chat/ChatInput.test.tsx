/**
 * ChatInput.test.tsx
 *
 * COMPREHENSIVE UNIT TESTS - PRIORYTET KRYTYCZNY (44/50)
 *
 * Test Coverage:
 * ═══════════════════════════════════════════════════════════════════════════
 * ✅ Walidacja długości (MIN_LENGTH=10, MAX_LENGTH=1000)
 * ✅ Keyboard shortcuts (Enter, Shift+Enter)
 * ✅ State management (clear input, error handling)
 * ✅ Rate limiting integration
 * ✅ Active queries limit
 * ✅ Character counter display
 * ✅ Error messages
 * ✅ Accessibility (ARIA labels, keyboard navigation)
 * ✅ Edge cases (boundary values, empty input, whitespace)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInput } from './ChatInput';
import { useRateLimit } from '@/lib/hooks/useRateLimit';
import { useActiveQueries } from '@/lib/hooks/useActiveQueries';
import { apiPost } from '@/lib/apiClient';
import { ApiError } from '@/lib/types';

// Mock modules
vi.mock('@/lib/hooks/useRateLimit');
vi.mock('@/lib/hooks/useActiveQueries');
vi.mock('@/lib/apiClient');

const mockUseRateLimit = vi.mocked(useRateLimit);
const mockUseActiveQueries = vi.mocked(useActiveQueries);
const mockApiPost = vi.mocked(apiPost);

describe('ChatInput Component', () => {
  // Default mocks
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Default hook values
    mockUseRateLimit.mockReturnValue({
      used: 0,
      limit: 10,
      canSubmit: true,
      resetAt: new Date(Date.now() + 60000),
    });

    mockUseActiveQueries.mockReturnValue({
      activeCount: 0,
      canAddQuery: true,
    });

    // Default API success
    mockApiPost.mockResolvedValue({
      data: { query_id: 'test-query-123' },
      rateLimit: { used: 1, limit: 10, resetAt: new Date(Date.now() + 60000) },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * WALIDACJA DŁUGOŚCI (BUSINESS RULES)
   * ═══════════════════════════════════════════════════════════════════════
   */
  describe('Length Validation (10-1000 chars)', () => {
    it('should disable submit button for empty input', () => {
      // Arrange
      const mockOnSubmit = vi.fn();
      render(<ChatInput onSubmit={mockOnSubmit} />);

      // Act
      const submitButton = screen.getByRole('button', { name: /wyślij/i });

      // Assert
      expect(submitButton).toBeDisabled();
    });

    it('should disable submit button for input < 10 chars', async () => {
      // Arrange
      const mockOnSubmit = vi.fn();
      const user = userEvent.setup();
      render(<ChatInput onSubmit={mockOnSubmit} />);

      // Act
      await user.type(screen.getByRole('textbox'), 'krótkie'); // 7 chars

      // Assert
      expect(screen.getByRole('button', { name: /wyślij/i })).toBeDisabled();
    });

    it('should enable submit button for exactly 10 chars (boundary)', async () => {
      // Arrange
      const mockOnSubmit = vi.fn();
      const user = userEvent.setup();
      render(<ChatInput onSubmit={mockOnSubmit} />);

      // Act
      await user.type(screen.getByRole('textbox'), '1234567890'); // exactly 10

      // Assert
      expect(screen.getByRole('button', { name: /wyślij/i })).toBeEnabled();
    });

    it('should enable submit button for valid input (10-1000 chars)', async () => {
      // Arrange
      const mockOnSubmit = vi.fn();
      const user = userEvent.setup();
      render(<ChatInput onSubmit={mockOnSubmit} />);

      // Act
      await user.type(screen.getByRole('textbox'), 'Jakie są podstawowe prawa konsumenta?'); // 40 chars

      // Assert
      expect(screen.getByRole('button', { name: /wyślij/i })).toBeEnabled();
    });

    it('should enable submit button for exactly 1000 chars (boundary)', async () => {
      // Arrange
      const mockOnSubmit = vi.fn();
      const user = userEvent.setup();
      render(<ChatInput onSubmit={mockOnSubmit} />);

      const exactly1000Chars = 'a'.repeat(1000);

      // Act
      await user.type(screen.getByRole('textbox'), exactly1000Chars);

      // Assert
      expect(screen.getByRole('button', { name: /wyślij/i })).toBeEnabled();
    });

    it('should disable submit button for input > 1000 chars', async () => {
      // Arrange
      const mockOnSubmit = vi.fn();
      const user = userEvent.setup();
      render(<ChatInput onSubmit={mockOnSubmit} />);

      const over1000Chars = 'a'.repeat(1001);

      // Act
      await user.type(screen.getByRole('textbox'), over1000Chars);

      // Assert
      expect(screen.getByRole('button', { name: /wyślij/i })).toBeDisabled();
    });

    it('should show validation hint for input < 10 chars', async () => {
      // Arrange
      const mockOnSubmit = vi.fn();
      const user = userEvent.setup();
      render(<ChatInput onSubmit={mockOnSubmit} />);

      // Act
      await user.type(screen.getByRole('textbox'), 'abc'); // 3 chars

      // Assert
      expect(screen.getByText(/wprowadź jeszcze 7 znaków/i)).toBeInTheDocument();
    });

    it('should show validation hint for input > 1000 chars', async () => {
      // Arrange
      const mockOnSubmit = vi.fn();
      const user = userEvent.setup();
      render(<ChatInput onSubmit={mockOnSubmit} />);

      const over1000Chars = 'a'.repeat(1010);

      // Act
      await user.type(screen.getByRole('textbox'), over1000Chars);

      // Assert
      expect(screen.getByText(/przekroczono limit o 10 znaków/i)).toBeInTheDocument();
    });
  });

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * CHARACTER COUNTER
   * ═══════════════════════════════════════════════════════════════════════
   */
  describe('Character Counter', () => {
    it('should display 0/1000 initially', () => {
      // Arrange & Act
      render(<ChatInput onSubmit={vi.fn()} />);

      // Assert
      expect(screen.getByText('0/1000')).toBeInTheDocument();
    });

    it('should update character counter as user types', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<ChatInput onSubmit={vi.fn()} />);

      // Act
      await user.type(screen.getByRole('textbox'), 'Test pytanie prawne');

      // Assert
      expect(screen.getByText('20/1000')).toBeInTheDocument();
    });

    it('should show destructive badge when over limit', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<ChatInput onSubmit={vi.fn()} />);

      const over1000 = 'a'.repeat(1001);

      // Act
      await user.type(screen.getByRole('textbox'), over1000);

      // Assert
      const badge = screen.getByText('1001/1000');
      expect(badge).toHaveClass(/destructive/);
    });

    it('should show secondary badge when valid', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<ChatInput onSubmit={vi.fn()} />);

      // Act
      await user.type(screen.getByRole('textbox'), 'Pytanie testowe'); // 15 chars

      // Assert
      const badge = screen.getByText('15/1000');
      expect(badge).toHaveClass(/secondary/);
    });
  });

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * KEYBOARD SHORTCUTS
   * ═══════════════════════════════════════════════════════════════════════
   */
  describe('Keyboard Shortcuts', () => {
    it('should submit on Enter key when input is valid', async () => {
      // Arrange
      const mockOnSubmit = vi.fn().mockResolvedValue('query-123');
      const user = userEvent.setup();
      render(<ChatInput onSubmit={mockOnSubmit} />);

      const validQuery = 'Jakie są prawa konsumenta?';

      // Act
      await user.type(screen.getByRole('textbox'), validQuery);
      await user.keyboard('{Enter}');

      // Assert
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(validQuery);
      });
    });

    it('should NOT submit on Enter when input is invalid', async () => {
      // Arrange
      const mockOnSubmit = vi.fn();
      const user = userEvent.setup();
      render(<ChatInput onSubmit={mockOnSubmit} />);

      // Act - Type short query
      await user.type(screen.getByRole('textbox'), 'krótkie'); // 7 chars
      await user.keyboard('{Enter}');

      // Assert
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should insert newline on Shift+Enter', async () => {
      // Arrange
      const mockOnSubmit = vi.fn();
      const user = userEvent.setup();
      render(<ChatInput onSubmit={mockOnSubmit} />);

      // Act
      await user.type(screen.getByRole('textbox'), 'First line');
      await user.keyboard('{Shift>}{Enter}{/Shift}');
      await user.type(screen.getByRole('textbox'), 'Second line');

      // Assert
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(textarea.value).toContain('\n');
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * SUBMIT BEHAVIOR
   * ═══════════════════════════════════════════════════════════════════════
   */
  describe('Submit Behavior', () => {
    it('should call onSubmit with trimmed query text', async () => {
      // Arrange
      const mockOnSubmit = vi.fn().mockResolvedValue('query-123');
      const user = userEvent.setup();
      render(<ChatInput onSubmit={mockOnSubmit} />);

      const queryWithSpaces = '  Jakie są prawa konsumenta?  ';

      // Act
      await user.type(screen.getByRole('textbox'), queryWithSpaces);
      await user.click(screen.getByRole('button', { name: /wyślij/i }));

      // Assert
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(queryWithSpaces.trim());
      });
    });

    it('should clear input after successful submit', async () => {
      // Arrange
      const mockOnSubmit = vi.fn().mockResolvedValue('query-123');
      const user = userEvent.setup();
      render(<ChatInput onSubmit={mockOnSubmit} />);

      // Act
      await user.type(screen.getByRole('textbox'), 'Test pytanie prawne');
      await user.click(screen.getByRole('button', { name: /wyślij/i }));

      // Assert
      await waitFor(() => {
        const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
        expect(textarea.value).toBe('');
      });
    });

    it('should show "Wysyłanie..." while submitting', async () => {
      // Arrange
      const mockOnSubmit = vi.fn<[string], Promise<string>>(() =>
        new Promise((resolve) => setTimeout(() => resolve('test-query-id'), 100))
      );
      const user = userEvent.setup();
      render(<ChatInput onSubmit={mockOnSubmit} />);

      // Act
      await user.type(screen.getByRole('textbox'), 'Test pytanie prawne');
      await user.click(screen.getByRole('button', { name: /wyślij/i }));

      // Assert
      expect(screen.getByText('Wysyłanie...')).toBeInTheDocument();
    });

    it('should disable submit button while submitting', async () => {
      // Arrange
      const mockOnSubmit = vi.fn<[string], Promise<string>>(() =>
        new Promise((resolve) => setTimeout(() => resolve('test-query-id'), 100))
      );
      const user = userEvent.setup();
      render(<ChatInput onSubmit={mockOnSubmit} />);

      // Act
      await user.type(screen.getByRole('textbox'), 'Test pytanie prawne');
      const submitButton = screen.getByRole('button', { name: /wyślij/i });
      await user.click(submitButton);

      // Assert
      expect(submitButton).toBeDisabled();
    });

    it('should call apiPost with correct payload', async () => {
      // Arrange
      const mockOnSubmit = vi.fn().mockResolvedValue('query-123');
      const user = userEvent.setup();
      render(<ChatInput onSubmit={mockOnSubmit} />);

      const queryText = 'Jakie są prawa konsumenta?';

      // Act
      await user.type(screen.getByRole('textbox'), queryText);
      await user.click(screen.getByRole('button', { name: /wyślij/i }));

      // Assert
      await waitFor(() => {
        expect(mockApiPost).toHaveBeenCalledWith(
          '/api/v1/queries',
          { query_text: queryText },
          true // includeRateLimit
        );
      });
    });

    it('should dispatch "query-submit" event with query_id', async () => {
      // Arrange
      const mockOnSubmit = vi.fn().mockResolvedValue('query-123');
      const user = userEvent.setup();
      const eventSpy = vi.fn();
      window.addEventListener('query-submit', eventSpy);

      render(<ChatInput onSubmit={mockOnSubmit} />);

      // Act
      await user.type(screen.getByRole('textbox'), 'Test pytanie prawne');
      await user.click(screen.getByRole('button', { name: /wyślij/i }));

      // Assert
      await waitFor(() => {
        expect(eventSpy).toHaveBeenCalled();
        expect((eventSpy.mock.calls[0][0] as CustomEvent).detail).toBe('test-query-123');
      });

      // Cleanup
      window.removeEventListener('query-submit', eventSpy);
    });
  });

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * ERROR HANDLING
   * ═══════════════════════════════════════════════════════════════════════
   */
  describe('Error Handling', () => {
    it('should display validation error from API', async () => {
      // Arrange
      mockApiPost.mockRejectedValue(
        new ApiError('Pytanie musi zawierać od 10 do 1000 znaków.', 'VALIDATION_ERROR')
      );
      const user = userEvent.setup();
      render(<ChatInput onSubmit={vi.fn()} />);

      // Act
      await user.type(screen.getByRole('textbox'), 'Valid query text here');
      await user.click(screen.getByRole('button', { name: /wyślij/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/musi zawierać od 10 do 1000 znaków/i);
      });
    });

    it('should display rate limit error', async () => {
      // Arrange
      mockApiPost.mockRejectedValue(
        new ApiError('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED')
      );
      const user = userEvent.setup();
      render(<ChatInput onSubmit={vi.fn()} />);

      // Act
      await user.type(screen.getByRole('textbox'), 'Valid query text here');
      await user.click(screen.getByRole('button', { name: /wyślij/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/przekroczono limit zapytań/i);
      });
    });

    it('should display generic error for unknown errors', async () => {
      // Arrange
      mockApiPost.mockRejectedValue(new Error('Network error'));
      const user = userEvent.setup();
      render(<ChatInput onSubmit={vi.fn()} />);

      // Act
      await user.type(screen.getByRole('textbox'), 'Valid query text here');
      await user.click(screen.getByRole('button', { name: /wyślij/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/wystąpił błąd/i);
      });
    });

    it('should clear error message when user types', async () => {
      // Arrange
      mockApiPost.mockRejectedValue(new ApiError('Error', 'VALIDATION_ERROR'));
      const user = userEvent.setup();
      render(<ChatInput onSubmit={vi.fn()} />);

      // Act - Trigger error
      await user.type(screen.getByRole('textbox'), 'Valid query text here');
      await user.click(screen.getByRole('button', { name: /wyślij/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Act - Type to clear error
      await user.type(screen.getByRole('textbox'), ' more text');

      // Assert
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * RATE LIMITING INTEGRATION
   * ═══════════════════════════════════════════════════════════════════════
   */
  describe('Rate Limiting Integration', () => {
    it('should display rate limit info', () => {
      // Arrange
      mockUseRateLimit.mockReturnValue({
        used: 5,
        limit: 10,
        canSubmit: true,
        resetAt: Date.now() + 60000,
      });

      // Act
      render(<ChatInput onSubmit={vi.fn()} />);

      // Assert
      expect(screen.getByText('5/10')).toBeInTheDocument();
      expect(screen.getByText(/limit zapytań/i)).toBeInTheDocument();
    });

    it('should disable submit when rate limit exceeded', async () => {
      // Arrange
      mockUseRateLimit.mockReturnValue({
        used: 10,
        limit: 10,
        canSubmit: false, // Rate limit exceeded
        resetAt: Date.now() + 60000,
      });
      const user = userEvent.setup();
      render(<ChatInput onSubmit={vi.fn()} />);

      // Act
      await user.type(screen.getByRole('textbox'), 'Valid query text here');

      // Assert
      expect(screen.getByRole('button', { name: /wyślij/i })).toBeDisabled();
    });

    it('should show destructive badge when rate limit exceeded', () => {
      // Arrange
      mockUseRateLimit.mockReturnValue({
        used: 10,
        limit: 10,
        canSubmit: false,
        resetAt: Date.now() + 60000,
      });

      // Act
      render(<ChatInput onSubmit={vi.fn()} />);

      // Assert
      const badge = screen.getByText('10/10');
      expect(badge).toHaveClass(/destructive/);
    });
  });

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * ACTIVE QUERIES LIMIT
   * ═══════════════════════════════════════════════════════════════════════
   */
  describe('Active Queries Limit', () => {
    it('should display active queries count', () => {
      // Arrange
      mockUseActiveQueries.mockReturnValue({
        activeCount: 2,
        canAddQuery: true,
        maxQueries: 3,
      });

      // Act
      render(<ChatInput onSubmit={vi.fn()} />);

      // Assert
      expect(screen.getByText('2/3')).toBeInTheDocument();
      expect(screen.getByText(/aktywne zapytania/i)).toBeInTheDocument();
    });

    it('should disable submit when max active queries reached', async () => {
      // Arrange
      mockUseActiveQueries.mockReturnValue({
        activeCount: 3,
        canAddQuery: false, // Max reached
        maxQueries: 3,
      });
      const user = userEvent.setup();
      render(<ChatInput onSubmit={vi.fn()} />);

      // Act
      await user.type(screen.getByRole('textbox'), 'Valid query text here');

      // Assert
      expect(screen.getByRole('button', { name: /wyślij/i })).toBeDisabled();
    });

    it('should show warning when max active queries reached', async () => {
      // Arrange
      const user = userEvent.setup();
      mockUseActiveQueries.mockReturnValue({
        activeCount: 3,
        canAddQuery: false,
        maxQueries: 3,
      });

      // Act
      render(<ChatInput onSubmit={vi.fn()} />);

      // Type some text to trigger hints (hints only show when characterCount > 0)
      const textarea = screen.getByPlaceholderText(/zadaj pytanie/i);
      await user.type(textarea, 'Test query');

      // Assert
      expect(screen.getByText(/osiągnięto limit 3 równoczesnych zapytań/i)).toBeInTheDocument();
    });
  });

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * ACCESSIBILITY
   * ═══════════════════════════════════════════════════════════════════════
   */
  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      // Arrange & Act
      render(<ChatInput onSubmit={vi.fn()} />);

      // Assert
      expect(screen.getByLabelText(/pole wprowadzania pytania/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/wyślij pytanie/i)).toBeInTheDocument();
    });

    it('should have aria-describedby for character count', () => {
      // Arrange & Act
      render(<ChatInput onSubmit={vi.fn()} />);

      // Assert
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-describedby', expect.stringContaining('character-count'));
    });

    it('should have role="alert" for error messages', async () => {
      // Arrange
      mockApiPost.mockRejectedValue(new ApiError('Error', 'VALIDATION_ERROR'));
      const user = userEvent.setup();
      render(<ChatInput onSubmit={vi.fn()} />);

      // Act
      await user.type(screen.getByRole('textbox'), 'Valid query text here');
      await user.click(screen.getByRole('button', { name: /wyślij/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('should auto-focus textarea on mount', () => {
      // Arrange & Act
      render(<ChatInput onSubmit={vi.fn()} />);

      // Assert
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveFocus();
    });
  });

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * EDGE CASES
   * ═══════════════════════════════════════════════════════════════════════
   */
  describe('Edge Cases', () => {
    it('should handle query with only whitespace', async () => {
      // Arrange
      const mockOnSubmit = vi.fn();
      const user = userEvent.setup();

      // Mock API to reject empty query (after trimming)
      mockApiPost.mockRejectedValue(
        new ApiError('VALIDATION_ERROR', 'Query text must be between 10 and 1000 characters')
      );

      render(<ChatInput onSubmit={mockOnSubmit} />);

      // Act
      await user.type(screen.getByRole('textbox'), '               '); // 15 spaces

      // Button is enabled (validation happens on API side)
      const button = screen.getByRole('button', { name: /wyślij/i });
      expect(button).not.toBeDisabled();

      // Submit the form
      await user.click(button);

      // Assert - Should show validation error, onSubmit NOT called
      await waitFor(() => {
        expect(screen.getByText(/pytanie musi zawierać od 10 do 1000 znaków/i)).toBeInTheDocument();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should handle external disabled prop', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<ChatInput onSubmit={vi.fn()} disabled={true} />);

      // Act
      await user.type(screen.getByRole('textbox'), 'Valid query text here');

      // Assert
      expect(screen.getByRole('textbox')).toBeDisabled();
      expect(screen.getByRole('button', { name: /wyślij/i })).toBeDisabled();
    });

    it('should not submit on Enter when externally disabled', async () => {
      // Arrange
      const mockOnSubmit = vi.fn();
      const user = userEvent.setup();
      render(<ChatInput onSubmit={mockOnSubmit} disabled={true} />);

      // Act
      // Cannot type when disabled, so we skip typing
      await user.keyboard('{Enter}');

      // Assert
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });
});
