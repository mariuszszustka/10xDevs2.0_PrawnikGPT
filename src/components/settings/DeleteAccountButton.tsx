/**
 * DeleteAccountButton - React island for account deletion
 * 
 * Interactive button with confirmation modal for account deletion.
 * Uses Shadcn/ui Dialog for modal and API client for backend integration.
 * 
 * Features:
 * - Destructive button (red) to trigger deletion
 * - Confirmation modal with warning message
 * - Double confirmation (checkbox + button)
 * - Loading states
 * - Error handling with user-friendly messages
 * - Full keyboard navigation support
 * - Focus trap in modal (handled by Radix UI Dialog)
 * - Redirect to /login after successful deletion
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { apiDelete, ApiError } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Map API errors to user-friendly messages
 */
function mapApiError(error: ApiError | Error): string {
  if (error instanceof ApiError) {
    switch (error.statusCode) {
      case 401:
        return 'Nie masz uprawnień do usunięcia tego konta. Zaloguj się ponownie.';
      case 403:
        return 'Nie masz uprawnień do usunięcia tego konta.';
      case 404:
        return 'Konto nie zostało znalezione.';
      case 500:
        return 'Wystąpił błąd serwera. Spróbuj ponownie później.';
      default:
        if (error.errorCode === 'SERVICE_UNAVAILABLE') {
          return 'Błąd połączenia. Sprawdź połączenie internetowe.';
        }
        return error.message || 'Wystąpił błąd podczas usuwania konta. Spróbuj ponownie.';
    }
  }
  
  if (error.message.includes('network') || error.message.includes('fetch')) {
    return 'Błąd połączenia. Sprawdź połączenie internetowe.';
  }
  
  return 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.';
}

/**
 * DeleteAccountButton component
 */
export default function DeleteAccountButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmChecked, setIsConfirmChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  // Restore focus to delete button when modal closes
  useEffect(() => {
    if (!isModalOpen && deleteButtonRef.current) {
      // Small delay to ensure modal is fully closed
      setTimeout(() => {
        deleteButtonRef.current?.focus();
      }, 100);
    }
  }, [isModalOpen]);

  /**
   * Handle opening the confirmation modal
   */
  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
    setIsConfirmChecked(false);
    setError(null);
  }, []);

  /**
   * Handle closing the confirmation modal
   */
  const handleCloseModal = useCallback(() => {
    if (isLoading) {
      // Prevent closing during deletion
      return;
    }
    setIsModalOpen(false);
    setIsConfirmChecked(false);
    setError(null);
  }, [isLoading]);

  /**
   * Handle checkbox change
   */
  const handleCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setIsConfirmChecked(e.target.checked);
    setError(null);
  }, []);

  /**
   * Handle account deletion
   */
  const handleDeleteAccount = useCallback(async () => {
    if (!isConfirmChecked) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Call backend API to delete account
      // Endpoint: DELETE /api/v1/users/me
      // Returns: 204 No Content on success
      await apiDelete<void>('/api/v1/users/me');

      // Success - redirect to login with message
      // The backend will handle cascading deletion and Supabase Auth deletion
      if (typeof window !== 'undefined') {
        window.location.href = '/login?deleted=true';
      }
    } catch (err) {
      // Handle errors
      const errorMessage = err instanceof ApiError || err instanceof Error
        ? mapApiError(err)
        : 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.';
      
      setError(errorMessage);
      setIsLoading(false);
    }
  }, [isConfirmChecked]);

  return (
    <>
      {/* Delete Account Button */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Usuń konto
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Usunięcie konta jest nieodwracalne. Wszystkie twoje zapytania i oceny zostaną trwale usunięte.
          </p>
        </div>
        
        <Button
          ref={deleteButtonRef}
          type="button"
          variant="destructive"
          onClick={handleOpenModal}
          className="w-full sm:w-auto"
          aria-label="Usuń konto"
        >
          Usuń konto
        </Button>
      </div>

      {/* Confirmation Modal */}
      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent
          className="sm:max-w-md"
          aria-describedby="delete-account-description"
        >
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-600" aria-hidden="true" />
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Usuń konto
              </DialogTitle>
            </div>
            <DialogDescription id="delete-account-description" className="text-left">
              <p className="text-sm text-gray-700 mb-4">
                Czy na pewno chcesz usunąć swoje konto? Ta operacja jest <strong>nieodwracalna</strong>.
              </p>
              <p className="text-sm text-gray-600">
                Wszystkie twoje zapytania i oceny zostaną trwale usunięte. Nie będziesz mógł odzyskać dostępu do tego konta.
              </p>
            </DialogDescription>
          </DialogHeader>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Confirmation Checkbox */}
          <div className="py-4">
            <div className="flex items-start space-x-3">
              <input
                id="confirmDelete"
                type="checkbox"
                checked={isConfirmChecked}
                onChange={handleCheckboxChange}
                disabled={isLoading}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                aria-required="true"
                aria-describedby="confirmDelete-description"
              />
              <label
                htmlFor="confirmDelete"
                className="text-sm text-gray-700 cursor-pointer"
                id="confirmDelete-description"
              >
                Rozumiem konsekwencje i chcę trwale usunąć moje konto
              </label>
            </div>
          </div>

          {/* Dialog Footer */}
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              Anuluj
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={!isConfirmChecked || isLoading}
              className="w-full sm:w-auto"
              aria-label="Potwierdź usunięcie konta"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Usuwanie...
                </>
              ) : (
                'Usuń konto'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
