/**
 * useQueryList - Hook for fetching query list from API
 * 
 * Provides data fetching, loading state, error handling, and refetch
 * functionality for query list endpoint.
 * 
 * @see history-view-implementation-plan.md section 4.1
 */

import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '../apiClient';
import { ApiError } from '../types';
import type { QueryListResponse, QueryListParams } from '../types';

/**
 * Hook return type
 */
export interface UseQueryListReturn {
  data: QueryListResponse | null;
  isLoading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching query list from API
 * 
 * @param params - Query parameters (page, per_page, order)
 * @returns Object with data, isLoading, error, refetch
 */
export function useQueryList(
  params: QueryListParams = {}
): UseQueryListReturn {
  const [data, setData] = useState<QueryListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchQueries = useCallback(async () => {
    // Validation: ensure valid params
    const page = Math.max(1, params.page || 1);
    const perPage = Math.max(1, Math.min(100, params.per_page || 20));
    const order = params.order === 'asc' ? 'asc' : 'desc';

    setIsLoading(true);
    setError(null);

    try {
      const queryString = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
        order,
      }).toString();

      const response = await apiGet<QueryListResponse>(
        `/api/v1/queries?${queryString}`
      );

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
            { message: 'Failed to fetch queries' },
            undefined
          )
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [params.page, params.per_page, params.order]);

  useEffect(() => {
    fetchQueries();
  }, [fetchQueries]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchQueries,
  };
}

