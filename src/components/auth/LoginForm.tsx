/**
 * LoginForm - React island for login form
 * 
 * Interactive login form component with validation, error handling,
 * and Supabase Auth integration. Uses Shadcn/ui components for UI.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabaseClient } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { LoginFormData, LoginFormErrors, LoginFormProps } from '@/lib/types';

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Map Supabase Auth errors to user-friendly messages
 */
function mapSupabaseError(error: { message: string } | null): string {
  if (!error) return '';
  
  switch (error.message) {
    case 'Invalid login credentials':
    case 'Email not confirmed':
      return 'Nieprawidłowy email lub hasło';
    case 'Too many requests':
      return 'Zbyt wiele prób logowania. Spróbuj ponownie za chwilę.';
    default:
      if (error.message.includes('network') || error.message.includes('fetch')) {
        return 'Błąd połączenia. Sprawdź połączenie internetowe.';
      }
      return 'Wystąpił błąd podczas logowania. Spróbuj ponownie.';
  }
}

/**
 * LoginForm component
 * 
 * Features:
 * - Client-side validation (email format, required fields)
 * - Password visibility toggle
 * - Loading states
 * - Error handling with user-friendly messages
 * - Auto-focus on email field
 * - Full keyboard navigation support
 */
export function LoginForm({ redirectTo = '/app', showExpiredMessage = false }: LoginFormProps) {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on email field when component mounts
  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  /**
   * Validate form data
   */
  const validateForm = useCallback((): LoginFormErrors => {
    const validationErrors: LoginFormErrors = {};

    // Email validation
    if (!formData.email.trim()) {
      validationErrors.email = 'Email jest wymagany';
    } else if (!isValidEmail(formData.email)) {
      validationErrors.email = 'Podaj prawidłowy adres email';
    }

    // Password validation
    if (!formData.password) {
      validationErrors.password = 'Hasło jest wymagane';
    }

    return validationErrors;
  }, [formData]);

  /**
   * Handle input field changes
   */
  const handleChange = useCallback((field: keyof LoginFormData) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData(prev => ({
        ...prev,
        [field]: e.target.value,
      }));
      
      // Clear error for this field when user starts typing
      if (errors[field]) {
        setErrors(prev => ({
          ...prev,
          [field]: undefined,
        }));
      }
      
      // Clear general error when user starts typing
      if (errors.general) {
        setErrors(prev => ({
          ...prev,
          general: undefined,
        }));
      }
    };
  }, [errors]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Client-side validation
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Clear previous errors
    setErrors({});
    setIsLoading(true);

    try {
      // Sign in with Supabase Auth
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: formData.email.trim(),
        password: formData.password,
      });

      if (error) {
        // Map Supabase error to user-friendly message
        const errorMessage = mapSupabaseError(error);
        setErrors({
          general: errorMessage,
        });
        setIsLoading(false);
        return;
      }

      // Success - redirect to app
      if (data.session) {
        window.location.href = redirectTo;
      }
    } catch (error) {
      // Handle network errors or unexpected errors
      console.error('Login error:', error);
      setErrors({
        general: 'Wystąpił błąd podczas logowania. Spróbuj ponownie.',
      });
      setIsLoading(false);
    }
  }, [formData, validateForm, redirectTo]);

  /**
   * Toggle password visibility
   */
  const handleTogglePassword = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* General error message */}
      {(errors.general || showExpiredMessage) && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>
            {showExpiredMessage && !errors.general
              ? 'Twoja sesja wygasła. Zaloguj się ponownie.'
              : errors.general}
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
          value={formData.email}
          onChange={handleChange('email')}
          disabled={isLoading}
          required
          aria-invalid={errors.email ? 'true' : 'false'}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className={errors.email ? 'border-red-500' : ''}
          placeholder="twoj@email.pl"
          autoComplete="email"
        />
        {errors.email && (
          <span
            id="email-error"
            className="text-sm text-red-600"
            role="alert"
            aria-live="polite"
          >
            {errors.email}
          </span>
        )}
      </div>

      {/* Password field */}
      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Hasło
        </label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={formData.password}
            onChange={handleChange('password')}
            disabled={isLoading}
            required
            aria-invalid={errors.password ? 'true' : 'false'}
            aria-describedby={errors.password ? 'password-error' : undefined}
            className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
            placeholder="••••••••"
            autoComplete="current-password"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleTogglePassword}
            disabled={isLoading}
            className="absolute right-0 top-0 h-full px-3"
            aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
            tabIndex={0}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        </div>
        {errors.password && (
          <span
            id="password-error"
            className="text-sm text-red-600"
            role="alert"
            aria-live="polite"
          >
            {errors.password}
          </span>
        )}
      </div>

      {/* Submit button */}
      <Button
        type="submit"
        disabled={isLoading}
        className="w-full"
        aria-label={isLoading ? 'Logowanie w toku...' : 'Zaloguj się'}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Logowanie...
          </>
        ) : (
          'Zaloguj się'
        )}
      </Button>
    </form>
  );
}

