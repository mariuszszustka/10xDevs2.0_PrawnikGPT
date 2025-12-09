/**
 * DeleteQueryButton.tsx
 * 
 * Przycisk usuwania zapytania z confirmation modal.
 * Zapewnia bezpieczne usuwanie z potwierdzeniem użytkownika,
 * optimistic update w liście oraz obsługę błędów z rollback.
 * 
 * @see history-view-implementation-plan.md section 4.3
 */

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { deleteQuery } from '@/lib/apiClient';
import { ApiError } from '@/lib/types';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import { truncateText } from '@/lib/utils/truncateText';
import { Trash2, Loader2 } from 'lucide-react';

interface DeleteQueryButtonProps {
  queryId: string;
  queryText: string;
  onDelete: (queryId: string) => Promise<void>;
}

export function DeleteQueryButton({
  queryId,
  queryText,
  onDelete,
}: DeleteQueryButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trap for modal
  useFocusTrap(isModalOpen, modalRef);

  const truncatedText = truncateText(queryText, 50);

  const handleOpen = () => {
    setIsModalOpen(true);
    setError(null);
  };

  const handleClose = () => {
    if (isDeleting) {
      return; // Prevent closing while deleting
    }
    setIsModalOpen(false);
    setError(null);
  };

  const handleConfirm = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      // Call API to delete query
      await deleteQuery(queryId);

      // Call parent callback for optimistic update
      await onDelete(queryId);

      // Close modal on success
      setIsModalOpen(false);
    } catch (err) {
      // Handle error
      if (err instanceof ApiError) {
        setError(err);
      } else {
        setError(
          new ApiError(
            500,
            'INTERNAL_SERVER_ERROR',
            { message: 'Nie udało się usunąć zapytania' },
            undefined
          )
        );
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isDeleting) {
      handleClose();
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpen}
        aria-label="Usuń zapytanie"
        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <Dialog open={isModalOpen} onOpenChange={handleClose}>
        <DialogContent
          ref={modalRef}
          onKeyDown={handleKeyDown}
          aria-modal="true"
          role="dialog"
        >
          <DialogHeader>
            <DialogTitle>Usunąć zapytanie?</DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz usunąć to zapytanie? Ta operacja jest
              nieodwracalna.
            </DialogDescription>
          </DialogHeader>

          {truncatedText && (
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Zapytanie:</span> {truncatedText}
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-destructive/10 p-3">
              <p className="text-sm text-destructive">
                {error.errorCode === 'FORBIDDEN'
                  ? 'Nie masz uprawnień do wykonania tej operacji.'
                  : error.errorCode === 'NOT_FOUND'
                  ? 'Zapytanie nie istnieje.'
                  : 'Nie udało się usunąć zapytania. Spróbuj ponownie.'}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isDeleting}
            >
              Anuluj
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Usuwanie...
                </>
              ) : (
                'Usuń'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

