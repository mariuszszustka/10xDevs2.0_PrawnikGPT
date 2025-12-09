/**
 * useActiveQueries - Hook for managing active queries limit (3 concurrent)
 * 
 * Provides utilities to add/remove queries and check if new queries can be added.
 * 
 * @see chat-view-implementation-plan.md section 6.3
 */

import { useCallback } from 'react';
import { useAppContext } from '../AppContext';

const MAX_CONCURRENT_QUERIES = 3;

/**
 * Hook return type
 */
export interface UseActiveQueriesReturn {
  activeQueries: Set<string>;
  addQuery: (queryId: string) => boolean; // Returns true if added, false if limit reached
  removeQuery: (queryId: string) => void;
  canAddQuery: boolean;
  activeCount: number;
}

/**
 * Hook for managing active queries with limit of 3 concurrent
 * 
 * @returns Object with activeQueries, addQuery, removeQuery, canAddQuery, activeCount
 */
export function useActiveQueries(): UseActiveQueriesReturn {
  const { activeQueries, setActiveQueries } = useAppContext();

  const addQuery = useCallback(
    (queryId: string): boolean => {
      if (activeQueries.size >= MAX_CONCURRENT_QUERIES) {
        return false; // Limit reached
      }

      setActiveQueries(new Set([...activeQueries, queryId]));
      return true;
    },
    [activeQueries, setActiveQueries]
  );

  const removeQuery = useCallback(
    (queryId: string) => {
      const newSet = new Set(activeQueries);
      newSet.delete(queryId);
      setActiveQueries(newSet);
    },
    [activeQueries, setActiveQueries]
  );

  const canAddQuery = activeQueries.size < MAX_CONCURRENT_QUERIES;
  const activeCount = activeQueries.size;

  return {
    activeQueries,
    addQuery,
    removeQuery,
    canAddQuery,
    activeCount,
  };
}

