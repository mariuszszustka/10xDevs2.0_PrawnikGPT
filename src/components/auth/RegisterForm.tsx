/**
 * RegisterForm - React island for registration form
 * 
 * Interactive registration form component with validation, error handling,
 * and Supabase Auth integration. Uses Shadcn/ui components for UI.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabaseClient } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import type { RegisterFormData, RegisterFormErrors, RegisterFormProps, PasswordStrength } from '@/lib/types';

/**
 * Validate email format using regex pattern
 * 
 * @param email - Email address to validate
 * @returns true if email format is valid, false otherwise
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Calculate password strength based on length and character variety
 * 
 * @param password - Password to evaluate
 * @returns Password strength level: 'weak', 'medium', or 'strong'
 * 
 * Rules:
 * - 'weak': Less than 8 characters or only letters/digits
 * - 'medium': 8+ characters with mix of letters and numbers
 * - 'strong': 8+ characters with mix of letters, numbers, and special characters
 */
function calculatePasswordStrength(password: string): PasswordStrength {
  if (password.length < 8) {
    return 'weak';
  }
  
  const hasLetters = /[a-zA-Z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecialChars = /[^a-zA-Z0-9]/.test(password);
  
  if (hasLetters && hasNumbers && hasSpecialChars) {
    return 'strong';
  }
  
  if (hasLetters && hasNumbers) {
    return 'medium';
  }
  
  return 'weak';
}

/**
 * Map Supabase Auth errors to user-friendly Polish messages
 * 
 * @param error - Supabase Auth error object or null
 * @returns User-friendly error message in Polish
 * 
 * Handles common error cases:
 * - User already registered
 * - Weak password
 * - Rate limiting
 * - Invalid email
 * - Network errors
 * - Generic errors
 */
function mapSupabaseError(error: { message: string } | null): string {
  if (!error) return '';
  
  const errorMessage = error.message.toLowerCase();
  
  if (errorMessage.includes('user already registered') || errorMessage.includes('email already registered')) {
    return 'Ten adres email jest już zarejestrowany';
  }
  
  if (errorMessage.includes('password should be at least') || errorMessage.includes('password is too weak')) {
    return 'Hasło jest zbyt słabe';
  }
  
  if (errorMessage.includes('too many requests') || errorMessage.includes('rate limit')) {
    return 'Zbyt wiele prób. Spróbuj ponownie za chwilę.';
  }
  
  if (errorMessage.includes('invalid email')) {
    return 'Podaj prawidłowy adres email';
  }
  
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return 'Wystąpił problem z połączeniem. Spróbuj ponownie.';
  }
  
  return 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie później.';
}

/**
 * RegisterForm component
 * 
 * Features:
 * - Client-side validation (email format, password length, password match, terms acceptance)
 * - Password visibility toggle for both password fields
 * - Password strength indicator (optional)
 * - Loading states
 * - Error handling with user-friendly messages
 * - Auto-focus on email field
 * - Full keyboard navigation support
 */
export function RegisterForm({ redirectTo = '/app?firstLogin=true' }: RegisterFormProps) {
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    passwordConfirm: '',
    acceptTerms: false,
  });
  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>('weak');
  
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on email field when component mounts
  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  /**
   * Validate email field
   * 
   * @param email - Email address to validate
   * @returns Error message if validation fails, undefined if valid
   */
  const validateEmail = useCallback((email: string): string | undefined => {
    if (!email.trim()) {
      return 'Email jest wymagany';
    }
    if (!isValidEmail(email)) {
      return 'Podaj prawidłowy adres email';
    }
    return undefined;
  }, []);

  /**
   * Validate password field (minimum 8 characters)
   * 
   * @param password - Password to validate
   * @returns Error message if validation fails, undefined if valid
   */
  const validatePassword = useCallback((password: string): string | undefined => {
    if (!password) {
      return 'Hasło jest wymagane';
    }
    if (password.length < 8) {
      return 'Hasło musi mieć minimum 8 znaków';
    }
    return undefined;
  }, []);

  /**
   * Validate password confirmation field (must match password)
   * 
   * @param password - Original password
   * @param passwordConfirm - Password confirmation to validate
   * @returns Error message if validation fails, undefined if valid
   */
  const validatePasswordConfirm = useCallback((password: string, passwordConfirm: string): string | undefined => {
    if (!passwordConfirm) {
      return 'Potwierdzenie hasła jest wymagane';
    }
    if (passwordConfirm !== password) {
      return 'Hasła nie są zgodne';
    }
    return undefined;
  }, []);

  /**
   * Validate entire form (all fields)
   * 
   * @returns Object with validation errors for each field (empty if valid)
   */
  const validateForm = useCallback((): RegisterFormErrors => {
    const validationErrors: RegisterFormErrors = {};

    validationErrors.email = validateEmail(formData.email);
    validationErrors.password = validatePassword(formData.password);
    validationErrors.passwordConfirm = validatePasswordConfirm(formData.password, formData.passwordConfirm);
    
    if (!formData.acceptTerms) {
      validationErrors.acceptTerms = 'Musisz zaakceptować regulamin';
    }

    // Remove undefined values
    Object.keys(validationErrors).forEach(key => {
      if (validationErrors[key as keyof RegisterFormErrors] === undefined) {
        delete validationErrors[key as keyof RegisterFormErrors];
      }
    });

    return validationErrors;
  }, [formData, validateEmail, validatePassword, validatePasswordConfirm]);

  /**
   * Handle input field changes
   */
  const handleChange = useCallback((field: keyof RegisterFormData) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = field === 'acceptTerms' ? e.target.checked : e.target.value;
      
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
      
      // Update password strength when password changes
      if (field === 'password') {
        setPasswordStrength(calculatePasswordStrength(value as string));
      }
      
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
      // Sign up with Supabase Auth
      const { data, error } = await supabaseClient.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          emailRedirectTo: undefined, // No email verification in MVP
        },
      });

      if (error) {
        // Map Supabase error to user-friendly message
        const errorMessage = mapSupabaseError(error);
        
        // Try to map to specific field if possible
        if (error.message.toLowerCase().includes('email')) {
          setErrors({
            email: errorMessage,
          });
        } else if (error.message.toLowerCase().includes('password')) {
          setErrors({
            password: errorMessage,
          });
        } else {
          setErrors({
            general: errorMessage,
          });
        }
        
        setIsLoading(false);
        return;
      }

      // Success - check if session was created
      if (data.session) {
        // Auto-login successful - redirect to app
        window.location.href = redirectTo;
      } else {
        // This shouldn't happen in MVP without email verification, but handle it anyway
        setErrors({
          general: 'Rejestracja zakończyła się sukcesem, ale nie udało się zalogować. Spróbuj zalogować się ręcznie.',
        });
        setIsLoading(false);
      }
    } catch (error) {
      // Handle network errors or unexpected errors
      console.error('Registration error:', error);
      setErrors({
        general: 'Wystąpił błąd podczas rejestracji. Spróbuj ponownie.',
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

  /**
   * Toggle password confirmation visibility
   */
  const handleTogglePasswordConfirm = useCallback(() => {
    setShowPasswordConfirm(prev => !prev);
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* General error message */}
      {errors.general && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>
            {errors.general}
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
            minLength={8}
            aria-invalid={errors.password ? 'true' : 'false'}
            aria-describedby={errors.password ? 'password-error' : 'password-help'}
            className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
            placeholder="••••••••"
            autoComplete="new-password"
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
        <p id="password-help" className="text-xs text-gray-500">
          Minimum 8 znaków
        </p>
        {formData.password && (
          <PasswordStrengthIndicator strength={passwordStrength} />
        )}
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

      {/* Password confirmation field */}
      <div className="space-y-2">
        <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700">
          Potwierdź hasło
        </label>
        <div className="relative">
          <Input
            id="passwordConfirm"
            type={showPasswordConfirm ? 'text' : 'password'}
            name="passwordConfirm"
            value={formData.passwordConfirm}
            onChange={handleChange('passwordConfirm')}
            disabled={isLoading}
            required
            aria-invalid={errors.passwordConfirm ? 'true' : 'false'}
            aria-describedby={errors.passwordConfirm ? 'passwordConfirm-error' : undefined}
            className={errors.passwordConfirm ? 'border-red-500 pr-10' : 'pr-10'}
            placeholder="••••••••"
            autoComplete="new-password"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleTogglePasswordConfirm}
            disabled={isLoading}
            className="absolute right-0 top-0 h-full px-3"
            aria-label={showPasswordConfirm ? 'Ukryj hasło' : 'Pokaż hasło'}
            tabIndex={0}
          >
            {showPasswordConfirm ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        </div>
        {errors.passwordConfirm && (
          <span
            id="passwordConfirm-error"
            className="text-sm text-red-600"
            role="alert"
            aria-live="polite"
          >
            {errors.passwordConfirm}
          </span>
        )}
      </div>

      {/* Terms acceptance checkbox */}
      <div className="space-y-2">
        <div className="flex items-start space-x-2">
          <input
            id="acceptTerms"
            type="checkbox"
            checked={formData.acceptTerms}
            onChange={handleChange('acceptTerms')}
            disabled={isLoading}
            required
            aria-invalid={errors.acceptTerms ? 'true' : 'false'}
            aria-describedby={errors.acceptTerms ? 'acceptTerms-error' : undefined}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
          />
          <label htmlFor="acceptTerms" className="text-sm text-gray-700">
            Akceptuję{' '}
            <a href="/regulamin" className="text-blue-600 hover:text-blue-700 underline" target="_blank" rel="noopener noreferrer">
              regulamin
            </a>
          </label>
        </div>
        {errors.acceptTerms && (
          <span
            id="acceptTerms-error"
            className="text-sm text-red-600"
            role="alert"
            aria-live="polite"
          >
            {errors.acceptTerms}
          </span>
        )}
      </div>

      {/* Submit button */}
      <Button
        type="submit"
        disabled={isLoading}
        className="w-full"
        aria-label={isLoading ? 'Rejestrowanie w toku...' : 'Zarejestruj się'}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Rejestrowanie...
          </>
        ) : (
          'Zarejestruj się'
        )}
      </Button>
    </form>
  );
}

