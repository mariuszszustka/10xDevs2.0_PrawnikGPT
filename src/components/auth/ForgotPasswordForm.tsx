/**
 * ForgotPasswordForm - React island for password reset request form
 * 
 * Interactive form component for requesting password reset via email.
 * Uses Shadcn/ui components for UI and Supabase Auth for password reset.
 * 
 * Features:
 * - Client-side validation (email format)
 * - Loading states
 * - Error handling with user-friendly messages
 * - Success message (always shown, even if email doesn't exist - prevents enumeration)
 * - Link back to login page
 * - Auto-focus on email field
 * - Full keyboard navigation support
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { supabaseClient } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Validate email format using regex pattern
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Map Supabase Auth errors to user-friendly Polish messages
 */
function mapSupabaseError(error: { message: string } | null): string {
  if (!error) return '';
  
  const errorMessage = error.message.toLowerCase();
  
  if (errorMessage.includes('invalid email')) {
    return 'Podaj prawidłowy adres email';
  }
  
  if (errorMessage.includes('too many requests') || errorMessage.includes('rate limit')) {
    return 'Zbyt wiele prób. Spróbuj ponownie za chwilę.';
  }
  
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return 'Błąd połączenia. Sprawdź połączenie internetowe.';
  }
  
  return 'Wystąpił błąd. Spróbuj ponownie później.';
}

/**
 * ForgotPasswordForm component
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on email field when component mounts
  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  /**
   * Validate email field
   */
  const validateEmail = useCallback((email: string): string | null => {
    if (!email.trim()) {
      return 'Email jest wymagany';
    }
    if (!isValidEmail(email)) {
      return 'Podaj prawidłowy adres email';
    }
    return null;
  }, []);

  /**
   * Handle input field changes
   */
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
    
    // Clear success message when user starts typing
    if (isSuccess) {
      setIsSuccess(false);
    }
  }, [error, isSuccess]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Client-side validation
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    // Clear previous errors
    setError(null);
    setIsLoading(true);

    try {
      // Request password reset via Supabase Auth
      const { error: resetError } = await supabaseClient.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (resetError) {
        // Map Supabase error to user-friendly message
        const errorMessage = mapSupabaseError(resetError);
        setError(errorMessage);
        setIsLoading(false);
        return;
      }

      // Success - always show success message (even if email doesn't exist - prevents enumeration)
      setIsSuccess(true);
      setIsLoading(false);
    } catch (err) {
      // Handle network errors or unexpected errors
      console.error('Password reset request error:', err);
      setError('Wystąpił błąd podczas wysyłania żądania. Spróbuj ponownie.');
      setIsLoading(false);
    }
  }, [email, validateEmail]);

  // If success, show success message
  if (isSuccess) {
    return (
      <div className="space-y-4">
        <Alert variant="success" role="alert">
          <AlertDescription>
            Jeśli podany adres email istnieje w systemie, otrzymasz wiadomość z linkiem do resetu hasła.
          </AlertDescription>
        </Alert>
        
        <div className="text-center space-y-4">
          <p className="text-sm text-gray-600">
            Sprawdź swoją skrzynkę pocztową i kliknij link w wiadomości, aby zresetować hasło.
          </p>
          
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              window.location.href = '/login';
            }}
          >
            Powrót do logowania
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Error message */}
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Email field */}
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <Input
          id="email"
          ref={emailInputRef}
          type="email"
          name="email"
          value={email}
          onChange={handleChange}
          disabled={isLoading}
          required
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? 'email-error' : undefined}
          className={error ? 'border-red-500' : ''}
          placeholder="twoj@email.pl"
          autoComplete="email"
        />
        {error && (
          <span
            id="email-error"
            className="text-sm text-red-600"
            role="alert"
            aria-live="polite"
          >
            {error}
          </span>
        )}
      </div>

      {/* Submit button */}
      <Button
        type="submit"
        disabled={isLoading}
        className="w-full"
        aria-label={isLoading ? 'Wysyłanie żądania...' : 'Wyślij link resetujący'}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Wysyłanie...
          </>
        ) : (
          'Wyślij link resetujący'
        )}
      </Button>
    </form>
  );
}
