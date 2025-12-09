/**
 * useQueryDetails - Hook for fetching query details from API
 * 
 * Provides data fetching, loading state, and error handling
 * for query details endpoint.
 * 
 * @see history-view-implementation-plan.md section 4.2
 */

import { useState, useEffect, useCallback } from 'react';
import { getQueryDetails } from '../apiClient';
import { ApiError } from '../types';
import type { QueryDetailResponse } from '../types';

/**
 * Hook return type
 */
export interface UseQueryDetailsReturn {
  data: QueryDetailResponse | null;
  isLoading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching query details from API
 * 
 * @param queryId - Query ID (UUID)
 * @param enabled - Whether to fetch immediately (default: true)
 * @returns Object with data, isLoading, error, refetch
 */
export function useQueryDetails(
  queryId: string | null,
  enabled: boolean = true
): UseQueryDetailsReturn {
  const [data, setData] = useState<QueryDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!queryId || !enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await getQueryDetails(queryId);
      setData(response);
    } catch (err) {
      // Handle ApiError
      if (err instanceof ApiError) {
        setError(err);
      } else {
        // Unknown error
        setError(
          new ApiError(
            500,
            'INTERNAL_SERVER_ERROR',
            { message: 'Failed to fetch query details' },
            undefined
          )
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [queryId, enabled]);

  useEffect(() => {
    if (enabled && queryId) {
      fetchDetails();
    }
  }, [enabled, queryId, fetchDetails]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchDetails,
  };
}

