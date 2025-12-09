/**
 * EmptyState.tsx
 * 
 * Stan pusty wyświetlany gdy użytkownik nie ma jeszcze żadnych zapytań.
 * Zawiera ikonę, nagłówek, opis oraz CTA button przekierowujący do czatu.
 * 
 * @see history-view-implementation-plan.md section 4.4
 */

import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';

interface EmptyStateProps {
  onNavigateToChat?: () => void;
}

export function EmptyState({ onNavigateToChat }: EmptyStateProps) {
  const handleNavigate = () => {
    if (onNavigateToChat) {
      onNavigateToChat();
    } else {
      // Default: navigate to /app
      if (typeof window !== 'undefined') {
        window.location.href = '/app';
      }
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <div className="mb-6 rounded-full bg-muted p-6">
        <MessageSquare className="h-12 w-12 text-muted-foreground" />
      </div>

      <h2 className="text-2xl font-bold text-foreground mb-2">
        Nie masz jeszcze żadnych zapytań
      </h2>

      <p className="text-muted-foreground mb-6 max-w-md">
        Wróć do czatu i zadaj pierwsze pytanie!
      </p>

      <Button onClick={handleNavigate} size="lg">
        Przejdź do czatu
      </Button>
    </div>
  );
}

