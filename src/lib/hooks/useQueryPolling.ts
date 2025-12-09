/**
 * useQueryPolling - Hook for polling query status with exponential backoff
 * 
 * Polls query status with exponential backoff: 1s → 1.5s → 2s (max)
 * Timeout: 15s for fast responses
 * 
 * @see chat-view-implementation-plan.md section 6.3
 */

import { useState, useEffect, useRef } from 'react';
import { apiGet } from '../apiClient';
import type { QueryDetailResponse, QueryProcessingStatus } from '../types';
import { ApiError } from '../types';

const INITIAL_POLL_INTERVAL = 1000; // 1 second
const MAX_POLL_INTERVAL = 2000; // 2 seconds max
const BACKOFF_MULTIPLIER = 1.5;
const TIMEOUT_MS = 15000; // 15 seconds timeout

/**
 * Hook return type
 */
export interface UseQueryPollingReturn {
  query: QueryDetailResponse | null;
  isPolling: boolean;
  error: ApiError | null;
}

/**
 * Hook for polling query status with exponential backoff
 * 
 * @param queryId - ID of the query to poll
 * @returns Object with query, isPolling, error
 */
export function useQueryPolling(queryId: string): UseQueryPollingReturn {
  const [query, setQuery] = useState<QueryDetailResponse | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  
  const pollIntervalRef = useRef<number>(INITIAL_POLL_INTERVAL);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!queryId) {
      return;
    }

    let isCancelled = false;
    setIsPolling(true);
    setError(null);
    pollIntervalRef.current = INITIAL_POLL_INTERVAL;
    startTimeRef.current = Date.now();

    // Set timeout
    timeoutRef.current = setTimeout(() => {
      if (!isCancelled) {
        setIsPolling(false);
        setError(
          new ApiError(
            504,
            'GENERATION_TIMEOUT',
            { message: 'Fast response generation timeout (15s)' },
            undefined
          )
        );
      }
    }, TIMEOUT_MS);

    const poll = async () => {
      if (isCancelled) {
        return;
      }

      // Check timeout
      if (Date.now() - startTimeRef.current >= TIMEOUT_MS) {
        setIsPolling(false);
        setError(
          new ApiError(
            504,
            'GENERATION_TIMEOUT',
            { message: 'Fast response generation timeout (15s)' },
            undefined
          )
        );
        return;
      }

      try {
        const response = await apiGet<QueryDetailResponse>(`/api/v1/queries/${queryId}`);
        
        if (isCancelled) {
          return;
        }

        setQuery(response);

        // Check if completed or failed
        const isCompleted = 
          response.fast_response.status === 'completed' ||
          response.fast_response.status === 'failed' ||
          response.status === 'completed' ||
          response.status === 'failed';

        if (isCompleted) {
          setIsPolling(false);
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          return;
        }

        // Continue polling with exponential backoff
        const currentInterval = pollIntervalRef.current;
        pollIntervalRef.current = Math.min(
          currentInterval * BACKOFF_MULTIPLIER,
          MAX_POLL_INTERVAL
        );

        setTimeout(poll, pollIntervalRef.current);
      } catch (err) {
        if (isCancelled) {
          return;
        }

        setIsPolling(false);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        if (err instanceof ApiError) {
          setError(err);
        } else {
          setError(
            new ApiError(
              500,
              'INTERNAL_SERVER_ERROR',
              { message: 'Failed to poll query status' },
              undefined
            )
          );
        }
      }
    };

    // Start polling
    poll();

    return () => {
      isCancelled = true;
      setIsPolling(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [queryId]);

  return { query, isPolling, error };
}

