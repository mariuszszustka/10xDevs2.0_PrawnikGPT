/**
 * useLongPolling - Hook for long polling accurate response status
 * 
 * Polls accurate response status every 5 seconds with timeout of 240s
 * 
 * @see chat-view-implementation-plan.md section 6.3
 */

import { useState, useEffect, useRef } from 'react';
import { apiGet } from '../apiClient';
import type { QueryDetailResponse } from '../types';
import { ApiError } from '../types';

const POLL_INTERVAL = 5000; // 5 seconds
const DEFAULT_TIMEOUT_MS = 240000; // 240 seconds (4 minutes)

/**
 * Hook return type
 */
export interface UseLongPollingReturn {
  accurateResponse: QueryDetailResponse['accurate_response'] | null;
  isPolling: boolean;
  timeoutReached: boolean;
  error: ApiError | null;
}

/**
 * Hook for long polling accurate response status
 * 
 * @param queryId - ID of the query to poll
 * @param timeout - Timeout in milliseconds (default: 240000)
 * @returns Object with accurateResponse, isPolling, timeoutReached, error
 */
export function useLongPolling(
  queryId: string,
  timeout: number = DEFAULT_TIMEOUT_MS
): UseLongPollingReturn {
  const [accurateResponse, setAccurateResponse] = 
    useState<QueryDetailResponse['accurate_response'] | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [timeoutReached, setTimeoutReached] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!queryId) {
      return;
    }

    let isCancelled = false;
    setIsPolling(true);
    setTimeoutReached(false);
    setError(null);
    startTimeRef.current = Date.now();

    // Set timeout
    timeoutRef.current = setTimeout(() => {
      if (!isCancelled) {
        setIsPolling(false);
        setTimeoutReached(true);
        setError(
          new ApiError(
            504,
            'GENERATION_TIMEOUT',
            { message: 'Accurate response generation timeout (240s)' },
            undefined
          )
        );
      }
    }, timeout);

    const poll = async () => {
      if (isCancelled) {
        return;
      }

      // Check timeout
      if (Date.now() - startTimeRef.current >= timeout) {
        setIsPolling(false);
        setTimeoutReached(true);
        setError(
          new ApiError(
            504,
            'GENERATION_TIMEOUT',
            { message: 'Accurate response generation timeout (240s)' },
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

        if (response.accurate_response) {
          setAccurateResponse(response.accurate_response);

          // Check if completed or failed
          const isCompleted = 
            response.accurate_response.status === 'completed' ||
            response.accurate_response.status === 'failed';

          if (isCompleted) {
            setIsPolling(false);
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
            return;
          }
        }

        // Continue polling
        setTimeout(poll, POLL_INTERVAL);
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
              { message: 'Failed to poll accurate response status' },
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
  }, [queryId, timeout]);

  return { accurateResponse, isPolling, timeoutReached, error };
}

