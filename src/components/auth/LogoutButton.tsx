/**
 * LogoutButton - React island for user logout functionality
 * 
 * Interactive logout button with loading states, error handling,
 * and Supabase Auth integration. Uses Shadcn/ui components for UI.
 * 
 * Features:
 * - Loading states during logout
 * - Error handling with toast notifications
 * - Automatic redirect to login page after successful logout
 * - Full keyboard navigation support
 * - Accessibility (ARIA labels)
 */

import { useState, useCallback } from 'react';
import { LogOut, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

interface LogoutButtonProps {
  /**
   * Variant of the button (default: "outline")
   */
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  /**
   * Size of the button (default: "default")
   */
  size?: 'sm' | 'default' | 'lg' | 'icon';
  /**
   * Custom className for additional styling
   */
  className?: string;
}

/**
 * Map Supabase Auth errors to user-friendly messages
 */
function mapSupabaseError(error: { message: string } | null): string {
  if (!error) return '';
  
  switch (error.message) {
    case 'Invalid session':
      return 'Sesja wygasła. Zostaniesz przekierowany do strony logowania.';
    case 'Too many requests':
      return 'Zbyt wiele prób. Spróbuj ponownie za chwilę.';
    default:
      if (error.message.includes('network') || error.message.includes('fetch')) {
        return 'Błąd połączenia. Sprawdź połączenie internetowe.';
      }
      return 'Wystąpił błąd podczas wylogowania. Spróbuj ponownie.';
  }
}

/**
 * LogoutButton component
 * 
 * Handles user logout with proper error handling and redirects to login page.
 */
export function LogoutButton({
  variant = 'outline',
  size = 'default',
  className,
}: LogoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = useCallback(async () => {
    // Guard clause: prevent multiple clicks
    if (isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      // Sign out from Supabase (invalidates refresh token and clears cookies)
      const { error } = await supabaseClient.auth.signOut();

      if (error) {
        const errorMessage = mapSupabaseError(error);
        toast.error(errorMessage);
        console.error('Logout error:', error);
        setIsLoading(false);
        return;
      }

      // Success: show toast and redirect to login
      toast.success('Wylogowano pomyślnie');
      
      // Small delay to show toast before redirect
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }, 500);
    } catch (error) {
      // Handle unexpected errors
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Wystąpił nieoczekiwany błąd podczas wylogowania.';
      toast.error(errorMessage);
      console.error('Unexpected logout error:', error);
      setIsLoading(false);
    }
  }, [isLoading]);

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleLogout}
      disabled={isLoading}
      className={className}
      aria-label={isLoading ? 'Wylogowywanie...' : 'Wyloguj się'}
      aria-busy={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="animate-spin" aria-hidden="true" />
          <span className="sr-only">Wylogowywanie...</span>
          <span aria-hidden="true">Wylogowywanie...</span>
        </>
      ) : (
        <>
          <LogOut aria-hidden="true" />
          <span>Wyloguj się</span>
        </>
      )}
    </Button>
  );
}
