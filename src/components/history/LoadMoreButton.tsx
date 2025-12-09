/**
 * LoadMoreButton.tsx
 * 
 * Przycisk "Załaduj więcej" z licznikiem pozostałych zapytań.
 * Wyświetla się na dole listy gdy są jeszcze zapytania do załadowania.
 * 
 * @see history-view-implementation-plan.md section 4.5
 */

import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface LoadMoreButtonProps {
  remaining: number;
  isLoading: boolean;
  onLoadMore: () => Promise<void>;
}

export function LoadMoreButton({
  remaining,
  isLoading,
  onLoadMore,
}: LoadMoreButtonProps) {
  const handleClick = async () => {
    if (isLoading || remaining <= 0) {
      return;
    }
    await onLoadMore();
  };

  return (
    <div className="flex justify-center pt-4">
      <Button
        variant="outline"
        onClick={handleClick}
        disabled={isLoading || remaining <= 0}
        aria-label="Załaduj więcej zapytań"
        className="min-w-[200px]"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Ładowanie...
          </>
        ) : (
          <>
            Załaduj więcej ({remaining}{' '}
            {remaining === 1 ? 'pozostałe' : 'pozostałych'})
          </>
        )}
      </Button>
    </div>
  );
}

