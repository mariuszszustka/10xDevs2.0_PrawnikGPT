/**
 * useOptimisticRating - Hook for optimistic rating updates
 * 
 * Provides optimistic UI updates for ratings with rollback on error.
 * 
 * @see chat-view-implementation-plan.md section 6.3
 */

import { useState, useCallback } from 'react';
import { apiPost } from '../apiClient';
import type { RatingValue, ResponseType, RatingResponse } from '../types';
import { ApiError } from '../types';

/**
 * Hook return type
 */
export interface UseOptimisticRatingReturn {
  rating: RatingValue | null; // Current optimistic rating
  isSubmitting: boolean;
  handleRating: (value: RatingValue) => Promise<void>;
}

/**
 * Hook for optimistic rating updates
 * 
 * @param queryId - ID of the query
 * @param responseType - Type of response ('fast' | 'accurate')
 * @param initialRating - Initial rating value (optional)
 * @returns Object with rating, isSubmitting, handleRating
 */
export function useOptimisticRating(
  queryId: string,
  responseType: ResponseType,
  initialRating?: RatingValue | null
): UseOptimisticRatingReturn {
  const [optimisticRating, setOptimisticRating] = useState<RatingValue | null>(
    initialRating ?? null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previousRating, setPreviousRating] = useState<RatingValue | null>(null);

  const handleRating = useCallback(
    async (value: RatingValue) => {
      // Guard: prevent double submission
      if (isSubmitting) {
        return;
      }

      // Save previous rating for rollback
      setPreviousRating(optimisticRating);
      
      // Optimistic update
      setOptimisticRating(value);
      setIsSubmitting(true);

      try {
        const response = await apiPost<RatingResponse>(
          `/api/v1/queries/${queryId}/ratings`,
          {
            response_type: responseType,
            rating_value: value,
          }
        );

        // Success - keep optimistic rating
        setOptimisticRating(response.rating_value);
      } catch (err) {
        // Rollback on error
        setOptimisticRating(previousRating);
        
        // Re-throw error for component to handle
        if (err instanceof ApiError) {
          throw err;
        }
        
        throw new ApiError(
          500,
          'INTERNAL_SERVER_ERROR',
          { message: 'Failed to submit rating' },
          undefined
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [queryId, responseType, optimisticRating, previousRating, isSubmitting]
  );

  return {
    rating: optimisticRating,
    isSubmitting,
    handleRating,
  };
}

