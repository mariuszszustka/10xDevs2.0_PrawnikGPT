/**
 * ResetPasswordForm - React island for password reset form
 * 
 * Interactive form component for resetting password using token from email.
 * Uses Shadcn/ui components for UI and Supabase Auth for password reset.
 * 
 * Features:
 * - Client-side validation (password strength, password match)
 * - Password visibility toggle for both password fields
 * - Password strength indicator
 * - Loading states
 * - Error handling with user-friendly messages
 * - Token validation
 * - Auto-focus on password field
 * - Full keyboard navigation support
 * - Redirect to login after success
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabaseClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import type { PasswordStrength } from '@/lib/types';

/**
 * Validate password according to PRD requirements:
 * - Minimum 12 characters
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one digit
 * - At least one special character
 */
function validatePasswordStrength(password: string): { isValid: boolean; error?: string } {
  if (password.length < 12) {
    return { isValid: false, error: 'Hasło musi mieć minimum 12 znaków' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Hasło musi zawierać co najmniej jedną małą literę' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Hasło musi zawierać co najmniej jedną dużą literę' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Hasło musi zawierać co najmniej jedną cyfrę' };
  }
  
  if (!/[^a-zA-Z0-9]/.test(password)) {
    return { isValid: false, error: 'Hasło musi zawierać co najmniej jeden znak specjalny' };
  }
  
  return { isValid: true };
}

/**
 * Calculate password strength based on PRD requirements
 */
function calculatePasswordStrength(password: string): PasswordStrength {
  const validation = validatePasswordStrength(password);
  
  if (!validation.isValid) {
    return 'weak';
  }
  
  // Strong: meets all requirements
  return 'strong';
}

/**
 * Map Supabase Auth errors to user-friendly Polish messages
 */
function mapSupabaseError(error: { message: string } | null): string {
  if (!error) return '';
  
  const errorMessage = error.message.toLowerCase();
  
  if (errorMessage.includes('invalid token') || errorMessage.includes('token expired') || errorMessage.includes('expired')) {
    return 'Link resetujący hasło jest nieprawidłowy lub wygasł. Poproś o nowy link.';
  }
  
  if (errorMessage.includes('password should be at least') || errorMessage.includes('password is too weak')) {
    return 'Hasło jest zbyt słabe';
  }
  
  if (errorMessage.includes('too many requests') || errorMessage.includes('rate limit')) {
    return 'Zbyt wiele prób. Spróbuj ponownie za chwilę.';
  }
  
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return 'Błąd połączenia. Sprawdź połączenie internetowe.';
  }
  
  return 'Wystąpił błąd podczas resetowania hasła. Spróbuj ponownie.';
}

interface ResetPasswordFormProps {
  token?: string; // Optional - can be read from URL if not provided
}

interface ResetPasswordFormData {
  password: string;
  passwordConfirm: string;
}

interface ResetPasswordFormErrors {
  password?: string;
  passwordConfirm?: string;
  token?: string;
  general?: string;
}

/**
 * ResetPasswordForm component
 * 
 * Note: Supabase automatically handles password reset tokens from URL hash.
 * The token prop is optional and mainly for display/validation purposes.
 * Supabase SDK will automatically extract the token from the URL when updateUser is called.
 */
export function ResetPasswordForm({ token: tokenProp }: ResetPasswordFormProps) {
  const [formData, setFormData] = useState<ResetPasswordFormData>({
    password: '',
    passwordConfirm: '',
  });
  const [errors, setErrors] = useState<ResetPasswordFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>('weak');
  
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on password field when component mounts
  useEffect(() => {
    passwordInputRef.current?.focus();
  }, []);

  // Check if token exists (from prop or URL)
  useEffect(() => {
    // Supabase automatically handles tokens from URL hash, but we can validate
    // if a token was provided via query parameter
    if (!tokenProp) {
      // Try to read from URL query parameter (if not in hash)
      const urlParams = new URLSearchParams(window.location.search);
      const tokenFromUrl = urlParams.get('token');
      
      // If no token in prop or URL, show error
      if (!tokenFromUrl && !window.location.hash.includes('access_token')) {
        setErrors({
          token: 'Brak tokenu resetującego hasło. Poproś o nowy link.',
        });
      }
    }
  }, [tokenProp]);

  /**
   * Validate password field
   */
  const validatePassword = useCallback((password: string): string | undefined => {
    const validation = validatePasswordStrength(password);
    if (!validation.isValid) {
      return validation.error;
    }
    return undefined;
  }, []);

  /**
   * Validate password confirmation field
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
   * Validate entire form
   */
  const validateForm = useCallback((): ResetPasswordFormErrors => {
    const validationErrors: ResetPasswordFormErrors = {};

    validationErrors.password = validatePassword(formData.password);
    validationErrors.passwordConfirm = validatePasswordConfirm(formData.password, formData.passwordConfirm);

    // Remove undefined values
    Object.keys(validationErrors).forEach(key => {
      if (validationErrors[key as keyof ResetPasswordFormErrors] === undefined) {
        delete validationErrors[key as keyof ResetPasswordFormErrors];
      }
    });

    return validationErrors;
  }, [formData, validatePassword, validatePasswordConfirm]);

  /**
   * Handle input field changes
   */
  const handleChange = useCallback((field: keyof ResetPasswordFormData) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
      
      // Update password strength when password changes
      if (field === 'password') {
        setPasswordStrength(calculatePasswordStrength(value));
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
      // Update password via Supabase Auth
      // Note: Supabase automatically validates the token from the URL
      const { error: updateError } = await supabaseClient.auth.updateUser({
        password: formData.password,
      });

      if (updateError) {
        // Map Supabase error to user-friendly message
        const errorMessage = mapSupabaseError(updateError);
        
        // Check if it's a token error
        if (updateError.message.toLowerCase().includes('token') || updateError.message.toLowerCase().includes('expired')) {
          setErrors({
            token: errorMessage,
          });
        } else {
          setErrors({
            general: errorMessage,
          });
        }
        
        setIsLoading(false);
        return;
      }

      // Success - redirect to login with success message
      window.location.href = '/login?passwordReset=true';
    } catch (error) {
      // Handle network errors or unexpected errors
      console.error('Password reset error:', error);
      setErrors({
        general: 'Wystąpił błąd podczas resetowania hasła. Spróbuj ponownie.',
      });
      setIsLoading(false);
    }
  }, [formData, validateForm]);

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
      {/* Token error message */}
      {errors.token && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>
            {errors.token}
          </AlertDescription>
        </Alert>
      )}

      {/* General error message */}
      {errors.general && !errors.token && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>
            {errors.general}
          </AlertDescription>
        </Alert>
      )}

      {/* Password field */}
      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Nowe hasło
        </label>
        <div className="relative">
          <Input
            id="password"
            ref={passwordInputRef}
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={formData.password}
            onChange={handleChange('password')}
            disabled={isLoading}
            required
            minLength={12}
            aria-invalid={errors.password ? 'true' : 'false'}
            aria-describedby={errors.password ? 'password-error' : 'password-help'}
            className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
            placeholder="••••••••••••"
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
          Minimum 12 znaków, małe i duże litery, cyfry, znaki specjalne
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
          Potwierdź nowe hasło
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
            placeholder="••••••••••••"
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

      {/* Submit button */}
      <Button
        type="submit"
        disabled={isLoading}
        className="w-full"
        aria-label={isLoading ? 'Resetowanie hasła...' : 'Zresetuj hasło'}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Resetowanie...
          </>
        ) : (
          'Zresetuj hasło'
        )}
      </Button>
    </form>
  );
}
