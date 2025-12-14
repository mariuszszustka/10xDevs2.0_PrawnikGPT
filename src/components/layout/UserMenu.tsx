/**
 * UserMenu - React island for user menu dropdown
 * 
 * Interactive user menu with dropdown containing:
 * - User email (read-only)
 * - Link to settings
 * - Logout button
 * 
 * Uses Shadcn/ui components for UI and follows React islands best practices.
 * 
 * Features:
 * - Dropdown menu with user information
 * - Navigation to settings
 * - Logout functionality
 * - Full keyboard navigation support
 * - Accessibility (ARIA labels)
 */

import { useState, useCallback } from 'react';
import { Settings, LogOut, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabaseClient } from '@/lib/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface UserMenuProps {
  /**
   * User email to display
   */
  userEmail: string;
  /**
   * User ID (optional, for avatar initials)
   */
  userId?: string;
}

/**
 * Get user initials from email
 */
function getInitials(email: string): string {
  const parts = email.split('@')[0].split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
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
 * UserMenu component
 * 
 * Displays user avatar with dropdown menu containing user info and actions.
 */
export function UserMenu({ userEmail, userId }: UserMenuProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = useCallback(async () => {
    // Guard clause: prevent multiple clicks
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      // Sign out from Supabase (invalidates refresh token and clears cookies)
      const { error } = await supabaseClient.auth.signOut();

      if (error) {
        const errorMessage = mapSupabaseError(error);
        toast.error(errorMessage);
        console.error('Logout error:', error);
        setIsLoggingOut(false);
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
      setIsLoggingOut(false);
    }
  }, [isLoggingOut]);

  const handleSettingsClick = useCallback(() => {
    setIsOpen(false);
    if (typeof window !== 'undefined') {
      window.location.href = '/app/settings';
    }
  }, []);

  const initials = getInitials(userEmail);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-full"
          aria-label={`Menu użytkownika: ${userEmail}`}
          aria-haspopup="menu"
          aria-expanded={isOpen}
        >
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="sr-only">Otwórz menu użytkownika</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Moje konto</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSettingsClick}
          className="cursor-pointer"
          aria-label="Przejdź do ustawień"
        >
          <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
          <span>Ustawienia</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="cursor-pointer text-destructive focus:text-destructive"
          aria-label={isLoggingOut ? 'Wylogowywanie...' : 'Wyloguj się'}
          aria-busy={isLoggingOut}
        >
          {isLoggingOut ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Wylogowywanie...</span>
            </>
          ) : (
            <>
              <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
              <span>Wyloguj się</span>
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
