/**
 * ChangePasswordForm - React island for password change form
 * 
 * Interactive password change form with validation, error handling,
 * and Supabase Auth integration. Uses Shadcn/ui components for UI.
 * 
 * Features:
 * - Client-side validation (required fields, min length, password match)
 * - Password visibility toggles for all fields
 * - Loading states
 * - Error handling with user-friendly messages
 * - Full keyboard navigation support
 * - Password strength indicator (optional)
 */

import { useState, useCallback } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabaseClient } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ChangePasswordFormData, ChangePasswordFormErrors, PasswordStrength } from '@/lib/types';

/**
 * Map Supabase Auth errors to user-friendly messages
 */
function mapSupabaseError(error: { message: string } | null): string {
  if (!error) return '';
  
  switch (error.message) {
    case 'Invalid login credentials':
      return 'Nieprawidłowe obecne hasło';
    case 'Password should be at least 8 characters':
      return 'Hasło musi mieć minimum 8 znaków';
    case 'New password should be different from the old password':
      return 'Nowe hasło musi różnić się od obecnego';
    case 'Too many requests':
      return 'Zbyt wiele prób. Spróbuj ponownie za chwilę.';
    default:
      if (error.message.includes('network') || error.message.includes('fetch')) {
        return 'Błąd połączenia. Sprawdź połączenie internetowe.';
      }
      return 'Wystąpił błąd podczas zmiany hasła. Spróbuj ponownie.';
  }
}

/**
 * Calculate password strength (optional)
 */
function calculatePasswordStrength(password: string): PasswordStrength | null {
  if (!password || password.length === 0) {
    return null;
  }
  
  if (password.length < 8) {
    return 'weak';
  }
  
  const hasLetters = /[a-zA-Z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  
  if (hasLetters && hasNumbers && hasSpecial) {
    return 'strong';
  }
  
  if ((hasLetters && hasNumbers) || (hasLetters && hasSpecial) || (hasNumbers && hasSpecial)) {
    return 'medium';
  }
  
  return 'weak';
}

/**
 * ChangePasswordForm component
 */
export default function ChangePasswordForm() {
  const [formData, setFormData] = useState<ChangePasswordFormData>({
    currentPassword: '',
    newPassword: '',
    newPasswordConfirm: '',
  });
  const [errors, setErrors] = useState<ChangePasswordFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showNewPasswordConfirm, setShowNewPasswordConfirm] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null);

  /**
   * Validate form data
   */
  const validateForm = useCallback((): ChangePasswordFormErrors => {
    const validationErrors: ChangePasswordFormErrors = {};

    // Current password validation
    if (!formData.currentPassword.trim()) {
      validationErrors.currentPassword = 'Obecne hasło jest wymagane';
    }

    // New password validation
    if (!formData.newPassword) {
      validationErrors.newPassword = 'Nowe hasło jest wymagane';
    } else if (formData.newPassword.length < 8) {
      validationErrors.newPassword = 'Hasło musi mieć minimum 8 znaków';
    }

    // Password confirmation validation
    if (!formData.newPasswordConfirm) {
      validationErrors.newPasswordConfirm = 'Potwierdzenie hasła jest wymagane';
    } else if (formData.newPassword !== formData.newPasswordConfirm) {
      validationErrors.newPasswordConfirm = 'Hasła muszą być identyczne';
    }

    return validationErrors;
  }, [formData]);

  /**
   * Handle input field changes
   */
  const handleChange = useCallback((field: keyof ChangePasswordFormData) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));

      // Clear error for this field
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });

      // Calculate password strength for newPassword field
      if (field === 'newPassword') {
        setPasswordStrength(calculatePasswordStrength(value));
      }
    };
  }, []);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate form
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Get user email from session
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user || !user.email) {
        setErrors({ general: 'Nie znaleziono użytkownika. Zaloguj się ponownie.' });
        setIsLoading(false);
        return;
      }

      // Re-authenticate with current password
      const { error: reAuthError } = await supabaseClient.auth.signInWithPassword({
        email: user.email,
        password: formData.currentPassword,
      });

      if (reAuthError) {
        setErrors({ general: mapSupabaseError(reAuthError) });
        setIsLoading(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabaseClient.auth.updateUser({
        password: formData.newPassword,
      });

      if (updateError) {
        const errorMessage = mapSupabaseError(updateError);
        // Check if error is specific to newPassword field
        if (errorMessage.includes('8 znaków')) {
          setErrors({ newPassword: errorMessage });
        } else if (errorMessage.includes('różnić się')) {
          setErrors({ newPassword: errorMessage });
        } else {
          setErrors({ general: errorMessage });
        }
        setIsLoading(false);
        return;
      }

      // Success - reset form
      setFormData({
        currentPassword: '',
        newPassword: '',
        newPasswordConfirm: '',
      });
      setPasswordStrength(null);
      setErrors({});
      
      // Show success toast notification
      toast.success('Hasło zostało zmienione pomyślnie');
      
    } catch (error) {
      setErrors({ general: 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.' });
    } finally {
      setIsLoading(false);
    }
  }, [formData, validateForm]);

  /**
   * Toggle password visibility
   */
  const handleToggleCurrentPassword = useCallback(() => {
    setShowCurrentPassword(prev => !prev);
  }, []);

  const handleToggleNewPassword = useCallback(() => {
    setShowNewPassword(prev => !prev);
  }, []);

  const handleToggleNewPasswordConfirm = useCallback(() => {
    setShowNewPasswordConfirm(prev => !prev);
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* General error alert */}
      {errors.general && (
        <Alert variant="destructive">
          <AlertDescription>{errors.general}</AlertDescription>
        </Alert>
      )}

      {/* Current Password Field */}
      <div>
        <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
          Obecne hasło
        </label>
        <div className="relative">
          <Input
            id="currentPassword"
            type={showCurrentPassword ? 'text' : 'password'}
            value={formData.currentPassword}
            onChange={handleChange('currentPassword')}
            disabled={isLoading}
            aria-invalid={errors.currentPassword ? 'true' : 'false'}
            aria-describedby={errors.currentPassword ? 'currentPassword-error' : undefined}
            className={errors.currentPassword ? 'border-red-500' : ''}
          />
          <button
            type="button"
            onClick={handleToggleCurrentPassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            aria-label={showCurrentPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
          >
            {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.currentPassword && (
          <span id="currentPassword-error" className="text-sm text-red-600 mt-1 block">
            {errors.currentPassword}
          </span>
        )}
      </div>

      {/* New Password Field */}
      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
          Nowe hasło
        </label>
        <div className="relative">
          <Input
            id="newPassword"
            type={showNewPassword ? 'text' : 'password'}
            value={formData.newPassword}
            onChange={handleChange('newPassword')}
            disabled={isLoading}
            aria-invalid={errors.newPassword ? 'true' : 'false'}
            aria-describedby={errors.newPassword ? 'newPassword-error' : undefined}
            className={errors.newPassword ? 'border-red-500' : ''}
          />
          <button
            type="button"
            onClick={handleToggleNewPassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            aria-label={showNewPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
          >
            {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.newPassword && (
          <span id="newPassword-error" className="text-sm text-red-600 mt-1 block">
            {errors.newPassword}
          </span>
        )}
        {/* Password strength indicator (optional) */}
        {passwordStrength && formData.newPassword.length > 0 && (
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <div className={`h-2 flex-1 rounded ${
                passwordStrength === 'weak' ? 'bg-red-500' :
                passwordStrength === 'medium' ? 'bg-yellow-500' :
                'bg-green-500'
              }`} />
              <span className={`text-xs ${
                passwordStrength === 'weak' ? 'text-red-600' :
                passwordStrength === 'medium' ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {passwordStrength === 'weak' ? 'Słabe' :
                 passwordStrength === 'medium' ? 'Średnie' :
                 'Silne'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* New Password Confirm Field */}
      <div>
        <label htmlFor="newPasswordConfirm" className="block text-sm font-medium text-gray-700 mb-2">
          Potwierdź nowe hasło
        </label>
        <div className="relative">
          <Input
            id="newPasswordConfirm"
            type={showNewPasswordConfirm ? 'text' : 'password'}
            value={formData.newPasswordConfirm}
            onChange={handleChange('newPasswordConfirm')}
            disabled={isLoading}
            aria-invalid={errors.newPasswordConfirm ? 'true' : 'false'}
            aria-describedby={errors.newPasswordConfirm ? 'newPasswordConfirm-error' : undefined}
            className={errors.newPasswordConfirm ? 'border-red-500' : ''}
          />
          <button
            type="button"
            onClick={handleToggleNewPasswordConfirm}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            aria-label={showNewPasswordConfirm ? 'Ukryj hasło' : 'Pokaż hasło'}
          >
            {showNewPasswordConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.newPasswordConfirm && (
          <span id="newPasswordConfirm-error" className="text-sm text-red-600 mt-1 block">
            {errors.newPasswordConfirm}
          </span>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isLoading}
        className="w-full"
        aria-label={isLoading ? 'Zmienianie hasła...' : 'Zmień hasło'}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Zmienianie...
          </>
        ) : (
          'Zmień hasło'
        )}
      </Button>
    </form>
  );
}
