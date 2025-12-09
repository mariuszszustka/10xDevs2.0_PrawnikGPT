/**
 * RatingButtons.tsx
 * 
 * Przyciski oceny (kciuk w górę/dół) z optimistic updates, rollback przy błędzie
 * oraz wizualną zmianą stanu po oddaniu głosu.
 * 
 * @see chat-view-implementation-plan.md section 4.4
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOptimisticRating } from '@/lib/hooks/useOptimisticRating';
import type { ResponseType, RatingValue, RatingDetail } from '@/lib/types';

interface RatingButtonsProps {
  queryId: string;
  responseType: ResponseType;
  currentRating?: RatingDetail;
  onRatingChange?: (rating: RatingDetail) => void;
  disabled?: boolean;
}

export function RatingButtons({
  queryId,
  responseType,
  currentRating,
  onRatingChange,
  disabled = false,
}: RatingButtonsProps) {
  const { rating, isSubmitting, handleRating } = useOptimisticRating(
    queryId,
    responseType,
    currentRating?.value ?? null
  );

  const handleClick = useCallback(
    async (value: RatingValue) => {
      if (disabled || isSubmitting) {
        return;
      }

      try {
        await handleRating(value);
        // onRatingChange will be called by useOptimisticRating after success
        // For now, we just handle the optimistic update
      } catch (error) {
        // Error is already handled by useOptimisticRating (rollback)
        console.error('Failed to submit rating:', error);
      }
    },
    [handleRating, disabled, isSubmitting]
  );

  const isUpActive = rating === 'up';
  const isDownActive = rating === 'down';
  const isAnyActive = isUpActive || isDownActive;

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant={isUpActive ? 'default' : 'outline'}
        size="sm"
        onClick={() => handleClick('up')}
        disabled={disabled || isSubmitting || (isAnyActive && !isUpActive)}
        aria-label="Oceń pozytywnie"
        className={cn(
          'gap-2',
          isUpActive && 'bg-primary text-primary-foreground'
        )}
      >
        <ThumbsUp className={cn('h-4 w-4', isUpActive && 'fill-current')} />
        <span className="sr-only sm:not-sr-only">Pozytywna</span>
      </Button>

      <Button
        type="button"
        variant={isDownActive ? 'default' : 'outline'}
        size="sm"
        onClick={() => handleClick('down')}
        disabled={disabled || isSubmitting || (isAnyActive && !isDownActive)}
        aria-label="Oceń negatywnie"
        className={cn(
          'gap-2',
          isDownActive && 'bg-primary text-primary-foreground'
        )}
      >
        <ThumbsDown className={cn('h-4 w-4', isDownActive && 'fill-current')} />
        <span className="sr-only sm:not-sr-only">Negatywna</span>
      </Button>
    </div>
  );
}

