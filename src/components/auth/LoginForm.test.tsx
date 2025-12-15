/**
 * Unit Tests for LoginForm Component
 *
 * Test Priority: ŚREDNI (28/50)
 *
 * Key Business Rules:
 * - Email validation: required, valid format
 * - Password validation: required
 * - Client-side validation before API call
 * - Timeout: 20 seconds for login request
 * - Auto-redirect on success (302)
 * - User-friendly error messages
 * - Auto-focus on email field
 * - Password visibility toggle
 *
 * @see .ai/unit-testing-priorities.md (Priority #7)
 * @see .ai/vitest-unit-testing.mdc (Testing guidelines)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

// Mock window.location
const mockLocationHref = vi.fn();
Object.defineProperty(window, 'location', {
  value: { href: '' },
  writable: true,
});

// ═════════════════════════════════════════════════════════════════════════════
// TESTS
// ═════════════════════════════════════════════════════════════════════════════

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    // Reset location.href
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // RENDERING
  // ───────────────────────────────────────────────────────────────────────────
  describe('Rendering', () => {
    it('should render email input with label', () => {
      // Arrange & Act
      render(<LoginForm />);

      // Assert
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('twoj@email.pl')).toBeInTheDocument();
    });

    it('should render password input with label', () => {
      // Arrange & Act
      render(<LoginForm />);

      // Assert
      expect(screen.getByLabelText('Hasło')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    });

    it('should render submit button', () => {
      // Arrange & Act
      render(<LoginForm />);

      // Assert
      expect(screen.getByRole('button', { name: 'Zaloguj się' })).toBeInTheDocument();
    });

    it('should render password visibility toggle button', () => {
      // Arrange & Act
      render(<LoginForm />);

      // Assert
      expect(screen.getByLabelText('Pokaż hasło')).toBeInTheDocument();
    });

    it('should auto-focus on email input when mounted', () => {
      // Arrange & Act
      render(<LoginForm />);

      // Assert
      const emailInput = screen.getByLabelText('Email');
      expect(emailInput).toHaveFocus();
    });

    it('should render email input with autocomplete="email"', () => {
      // Arrange & Act
      render(<LoginForm />);

      // Assert
      const emailInput = screen.getByLabelText('Email');
      expect(emailInput).toHaveAttribute('autocomplete', 'email');
    });

    it('should render password input with autocomplete="current-password"', () => {
      // Arrange & Act
      render(<LoginForm />);

      // Assert
      const passwordInput = screen.getByLabelText('Hasło');
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    });

    it('should render form with noValidate attribute', () => {
      // Arrange & Act
      const { container } = render(<LoginForm />);

      // Assert
      const form = container.querySelector('form');
      expect(form).toHaveAttribute('noValidate');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // PASSWORD VISIBILITY TOGGLE
  // ───────────────────────────────────────────────────────────────────────────
  describe('Password Visibility Toggle', () => {
    it('should initially hide password (type="password")', () => {
      // Arrange & Act
      render(<LoginForm />);

      // Assert
      const passwordInput = screen.getByLabelText('Hasło');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should show password when toggle button clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<LoginForm />);

      // Act
      const toggleButton = screen.getByLabelText('Pokaż hasło');
      await user.click(toggleButton);

      // Assert
      const passwordInput = screen.getByLabelText('Hasło');
      expect(passwordInput).toHaveAttribute('type', 'text');
    });

    it('should hide password when toggle button clicked again', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<LoginForm />);

      // Act - Show password
      const toggleButton = screen.getByLabelText('Pokaż hasło');
      await user.click(toggleButton);

      // Act - Hide password
      const hideButton = screen.getByLabelText('Ukryj hasło');
      await user.click(hideButton);

      // Assert
      const passwordInput = screen.getByLabelText('Hasło');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should change toggle button aria-label when password visible', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<LoginForm />);

      // Act
      const toggleButton = screen.getByLabelText('Pokaż hasło');
      await user.click(toggleButton);

      // Assert
      expect(screen.getByLabelText('Ukryj hasło')).toBeInTheDocument();
      expect(screen.queryByLabelText('Pokaż hasło')).not.toBeInTheDocument();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // CLIENT-SIDE VALIDATION
  // ───────────────────────────────────────────────────────────────────────────
  describe('Client-side Validation', () => {
    it('should show error when email is empty', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<LoginForm />);

      // Act
      const submitButton = screen.getByRole('button', { name: 'Zaloguj się' });
      await user.click(submitButton);

      // Assert
      expect(await screen.findByText('Email jest wymagany')).toBeInTheDocument();
    });

    it('should show error when email format is invalid', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<LoginForm />);

      // Act
      const emailInput = screen.getByLabelText('Email');
      await user.type(emailInput, 'invalid-email');

      const submitButton = screen.getByRole('button', { name: 'Zaloguj się' });
      await user.click(submitButton);

      // Assert
      expect(await screen.findByText('Podaj prawidłowy adres email')).toBeInTheDocument();
    });

    it('should accept valid email formats', async () => {
      // Arrange
      const user = userEvent.setup();
      vi.mocked(global.fetch).mockResolvedValue({
        status: 302,
        headers: new Headers({ Location: '/app' }),
      } as Response);

      render(<LoginForm />);

      // Act
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Hasło');

      await user.type(emailInput, 'valid.email@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: 'Zaloguj się' });
      await user.click(submitButton);

      // Assert - No validation error
      expect(screen.queryByText('Podaj prawidłowy adres email')).not.toBeInTheDocument();
    });

    it('should show error when password is empty', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<LoginForm />);

      // Act
      const submitButton = screen.getByRole('button', { name: 'Zaloguj się' });
      await user.click(submitButton);

      // Assert
      expect(await screen.findByText('Hasło jest wymagane')).toBeInTheDocument();
    });

    it('should show both email and password errors', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<LoginForm />);

      // Act
      const submitButton = screen.getByRole('button', { name: 'Zaloguj się' });
      await user.click(submitButton);

      // Assert
      expect(await screen.findByText('Email jest wymagany')).toBeInTheDocument();
      expect(await screen.findByText('Hasło jest wymagane')).toBeInTheDocument();
    });

    it('should clear email error when user starts typing', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<LoginForm />);

      // Trigger validation error
      const submitButton = screen.getByRole('button', { name: 'Zaloguj się' });
      await user.click(submitButton);

      // Assert error exists
      expect(await screen.findByText('Email jest wymagany')).toBeInTheDocument();

      // Act - Start typing
      const emailInput = screen.getByLabelText('Email');
      await user.type(emailInput, 't');

      // Assert - Error cleared
      await waitFor(() => {
        expect(screen.queryByText('Email jest wymagany')).not.toBeInTheDocument();
      });
    });

    it('should clear password error when user starts typing', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<LoginForm />);

      // Trigger validation error
      const submitButton = screen.getByRole('button', { name: 'Zaloguj się' });
      await user.click(submitButton);

      // Assert error exists
      expect(await screen.findByText('Hasło jest wymagane')).toBeInTheDocument();

      // Act - Start typing
      const passwordInput = screen.getByLabelText('Hasło');
      await user.type(passwordInput, 'p');

      // Assert - Error cleared
      await waitFor(() => {
        expect(screen.queryByText('Hasło jest wymagane')).not.toBeInTheDocument();
      });
    });

    it('should trim email before validation', async () => {
      // Arrange
      const user = userEvent.setup();
      vi.mocked(global.fetch).mockResolvedValue({
        status: 302,
        headers: new Headers({ Location: '/app' }),
      } as Response);

      render(<LoginForm />);

      // Act
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Hasło');

      await user.type(emailInput, '   test@example.com   ');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: 'Zaloguj się' });
      await user.click(submitButton);

      // Assert - Should send trimmed email
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/auth/login',
          expect.objectContaining({
            body: JSON.stringify({
              email: 'test@example.com',
              password: 'password123',
            }),
          })
        );
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // FORM SUBMISSION
  // ───────────────────────────────────────────────────────────────────────────
  describe('Form Submission', () => {
    it('should call /api/auth/login with correct credentials', async () => {
      // Arrange
      const user = userEvent.setup();
      vi.mocked(global.fetch).mockResolvedValue({
        status: 302,
        headers: new Headers({ Location: '/app' }),
      } as Response);

      render(<LoginForm />);

      // Act
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Hasło');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: 'Zaloguj się' });
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/auth/login',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            redirect: 'manual',
            body: JSON.stringify({
              email: 'test@example.com',
              password: 'password123',
            }),
          })
        );
      });
    });

    it('should redirect to /app on successful login (302)', async () => {
      // Arrange
      const user = userEvent.setup();
      vi.mocked(global.fetch).mockResolvedValue({
        status: 302,
        headers: new Headers({ Location: '/app' }),
      } as Response);

      render(<LoginForm />);

      // Act
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Hasło');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: 'Zaloguj się' });
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(window.location.href).toBe('/app');
      });
    });

    it('should redirect to custom redirectTo path', async () => {
      // Arrange
      const user = userEvent.setup();
      vi.mocked(global.fetch).mockResolvedValue({
        status: 302,
        headers: new Headers({ Location: '/custom-path' }),
      } as Response);

      render(<LoginForm redirectTo="/custom-path" />);

      // Act
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Hasło');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: 'Zaloguj się' });
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(window.location.href).toBe('/custom-path');
      });
    });

    it('should show loading state during submission', async () => {
      // Arrange
      const user = userEvent.setup();
      vi.mocked(global.fetch).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          status: 302,
          headers: new Headers({ Location: '/app' }),
        } as Response), 100))
      );

      render(<LoginForm />);

      // Act
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Hasło');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: 'Zaloguj się' });
      await user.click(submitButton);

      // Assert - Loading state
      expect(await screen.findByText('Logowanie...')).toBeInTheDocument();
      expect(screen.getByLabelText('Logowanie w toku...')).toBeDisabled();
    });

    it('should disable inputs during submission', async () => {
      // Arrange
      const user = userEvent.setup();
      vi.mocked(global.fetch).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          status: 302,
          headers: new Headers({ Location: '/app' }),
        } as Response), 100))
      );

      render(<LoginForm />);

      // Act
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Hasło');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: 'Zaloguj się' });
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(emailInput).toBeDisabled();
        expect(passwordInput).toBeDisabled();
        expect(screen.getByLabelText('Ukryj hasło')).toBeDisabled(); // Toggle button also disabled
      });
    });

    it('should NOT call API if validation fails', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<LoginForm />);

      // Act - Submit without filling form
      const submitButton = screen.getByRole('button', { name: 'Zaloguj się' });
      await user.click(submitButton);

      // Assert
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // ERROR HANDLING
  // ───────────────────────────────────────────────────────────────────────────
  describe('Error Handling', () => {
    it('should show error message for 400 Bad Request', async () => {
      // Arrange
      const user = userEvent.setup();
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Nieprawidłowy email lub hasło' }),
      } as Response);

      render(<LoginForm />);

      // Act
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Hasło');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');

      const submitButton = screen.getByRole('button', { name: 'Zaloguj się' });
      await user.click(submitButton);

      // Assert
      expect(await screen.findByText('Nieprawidłowy email lub hasło')).toBeInTheDocument();
    });

    it('should show error message for 503 Service Unavailable', async () => {
      // Arrange
      const user = userEvent.setup();
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => { throw new Error('JSON parsing failed'); },
      } as unknown as Response);

      render(<LoginForm />);

      // Act
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Hasło');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: 'Zaloguj się' });
      await user.click(submitButton);

      // Assert
      expect(
        await screen.findByText('Wystąpił błąd komunikacji z serwerem. Spróbuj ponownie za chwilę.')
      ).toBeInTheDocument();
    });

    it('should show error message for network error', async () => {
      // Arrange
      const user = userEvent.setup();
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      render(<LoginForm />);

      // Act
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Hasło');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: 'Zaloguj się' });
      await user.click(submitButton);

      // Assert
      expect(
        await screen.findByText('Wystąpił błąd podczas logowania. Sprawdź połączenie internetowe.')
      ).toBeInTheDocument();
    });

    it('should show error message for timeout (AbortError)', async () => {
      // Arrange
      const user = userEvent.setup();
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      vi.mocked(global.fetch).mockRejectedValue(abortError);

      render(<LoginForm />);

      // Act
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Hasło');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: 'Zaloguj się' });
      await user.click(submitButton);

      // Assert
      expect(
        await screen.findByText('Wystąpił błąd komunikacji z serwerem. Spróbuj ponownie za chwilę.')
      ).toBeInTheDocument();
    });

    it('should clear general error when user starts typing', async () => {
      // Arrange
      const user = userEvent.setup();
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Nieprawidłowy email lub hasło' }),
      } as Response);

      render(<LoginForm />);

      // Trigger error
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Hasło');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');

      const submitButton = screen.getByRole('button', { name: 'Zaloguj się' });
      await user.click(submitButton);

      // Assert error exists
      expect(await screen.findByText('Nieprawidłowy email lub hasło')).toBeInTheDocument();

      // Act - Start typing in email
      await user.type(emailInput, 'x');

      // Assert - Error cleared
      await waitFor(() => {
        expect(screen.queryByText('Nieprawidłowy email lub hasło')).not.toBeInTheDocument();
      });
    });

    it('should re-enable inputs after error', async () => {
      // Arrange
      const user = userEvent.setup();
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Nieprawidłowy email lub hasło' }),
      } as Response);

      render(<LoginForm />);

      // Act
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Hasło');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');

      const submitButton = screen.getByRole('button', { name: 'Zaloguj się' });
      await user.click(submitButton);

      // Assert - Error shown, inputs re-enabled
      await screen.findByText('Nieprawidłowy email lub hasło');

      await waitFor(() => {
        expect(emailInput).not.toBeDisabled();
        expect(passwordInput).not.toBeDisabled();
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SESSION EXPIRED MESSAGE
  // ───────────────────────────────────────────────────────────────────────────
  describe('Session Expired Message', () => {
    it('should show session expired message when prop is true', () => {
      // Arrange & Act
      render(<LoginForm showExpiredMessage={true} />);

      // Assert
      expect(screen.getByText('Twoja sesja wygasła. Zaloguj się ponownie.')).toBeInTheDocument();
    });

    it('should NOT show session expired message by default', () => {
      // Arrange & Act
      render(<LoginForm />);

      // Assert
      expect(screen.queryByText('Twoja sesja wygasła. Zaloguj się ponownie.')).not.toBeInTheDocument();
    });

    it('should prioritize general error over session expired message', async () => {
      // Arrange
      const user = userEvent.setup();
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Nieprawidłowy email lub hasło' }),
      } as Response);

      render(<LoginForm showExpiredMessage={true} />);

      // Act
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Hasło');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');

      const submitButton = screen.getByRole('button', { name: 'Zaloguj się' });
      await user.click(submitButton);

      // Assert - General error shown, not session expired
      expect(await screen.findByText('Nieprawidłowy email lub hasło')).toBeInTheDocument();
      expect(screen.queryByText('Twoja sesja wygasła. Zaloguj się ponownie.')).not.toBeInTheDocument();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // ACCESSIBILITY
  // ───────────────────────────────────────────────────────────────────────────
  describe('Accessibility', () => {
    it('should have proper ARIA labels for inputs', () => {
      // Arrange & Act
      render(<LoginForm />);

      // Assert
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Hasło');

      expect(emailInput).toHaveAttribute('aria-invalid', 'false');
      expect(passwordInput).toHaveAttribute('aria-invalid', 'false');
    });

    it('should set aria-invalid="true" when field has error', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<LoginForm />);

      // Act
      const submitButton = screen.getByRole('button', { name: 'Zaloguj się' });
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        const emailInput = screen.getByLabelText('Email');
        const passwordInput = screen.getByLabelText('Hasło');

        expect(emailInput).toHaveAttribute('aria-invalid', 'true');
        expect(passwordInput).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('should link error message with aria-describedby', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<LoginForm />);

      // Act
      const submitButton = screen.getByRole('button', { name: 'Zaloguj się' });
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        const emailInput = screen.getByLabelText('Email');
        expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');

        const emailError = document.getElementById('email-error');
        expect(emailError).toHaveTextContent('Email jest wymagany');
      });
    });

    it('should have role="alert" for error messages', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<LoginForm />);

      // Act
      const submitButton = screen.getByRole('button', { name: 'Zaloguj się' });
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        expect(alerts.length).toBeGreaterThan(0);
      });
    });

    it('should have aria-live="polite" for dynamic error messages', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<LoginForm />);

      // Act
      const submitButton = screen.getByRole('button', { name: 'Zaloguj się' });
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        const emailError = document.getElementById('email-error');
        expect(emailError).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('should be keyboard navigable', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<LoginForm />);

      // Act - Tab navigation
      await user.tab(); // Should focus email (auto-focused)
      expect(screen.getByLabelText('Email')).toHaveFocus();

      await user.tab(); // Should focus password
      expect(screen.getByLabelText('Hasło')).toHaveFocus();

      await user.tab(); // Should focus toggle button
      expect(screen.getByLabelText('Pokaż hasło')).toHaveFocus();

      await user.tab(); // Should focus submit button
      expect(screen.getByRole('button', { name: 'Zaloguj się' })).toHaveFocus();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // EDGE CASES
  // ───────────────────────────────────────────────────────────────────────────
  describe('Edge Cases', () => {
    it('should handle empty string email (trimmed)', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<LoginForm />);

      // Act
      const emailInput = screen.getByLabelText('Email');
      await user.type(emailInput, '   ');

      const submitButton = screen.getByRole('button', { name: 'Zaloguj się' });
      await user.click(submitButton);

      // Assert
      expect(await screen.findByText('Email jest wymagany')).toBeInTheDocument();
    });

    it('should handle JSON parsing error gracefully', async () => {
      // Arrange
      const user = userEvent.setup();
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => { throw new Error('Invalid JSON'); },
      } as unknown as Response);

      render(<LoginForm />);

      // Act
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Hasło');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: 'Zaloguj się' });
      await user.click(submitButton);

      // Assert
      expect(
        await screen.findByText('Wystąpił błąd podczas logowania. Spróbuj ponownie.')
      ).toBeInTheDocument();
    });

    it('should handle response status 0 as success (opaque redirect)', async () => {
      // Arrange
      const user = userEvent.setup();
      vi.mocked(global.fetch).mockResolvedValue({
        status: 0,
        headers: new Headers(),
      } as Response);

      render(<LoginForm />);

      // Act
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Hasło');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: 'Zaloguj się' });
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(window.location.href).toBe('/app');
      });
    });

    it('should use Location header for redirect if available', async () => {
      // Arrange
      const user = userEvent.setup();
      vi.mocked(global.fetch).mockResolvedValue({
        status: 302,
        headers: new Headers({ Location: '/custom-redirect' }),
      } as Response);

      render(<LoginForm redirectTo="/default" />);

      // Act
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Hasło');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: 'Zaloguj się' });
      await user.click(submitButton);

      // Assert - Should use Location header, not redirectTo prop
      await waitFor(() => {
        expect(window.location.href).toBe('/custom-redirect');
      });
    });

    it('should prevent multiple rapid submissions', async () => {
      // Arrange
      const user = userEvent.setup();
      vi.mocked(global.fetch).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          status: 302,
          headers: new Headers({ Location: '/app' }),
        } as Response), 200))
      );

      render(<LoginForm />);

      // Act
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Hasło');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: 'Zaloguj się' });

      // Rapid clicks
      await user.click(submitButton);
      await user.click(submitButton);
      await user.click(submitButton);

      // Assert - Only one API call should be made
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });
    });
  });
});
