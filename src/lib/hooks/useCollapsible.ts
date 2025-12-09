/**
 * useCollapsible - Hook for managing expand/collapse state
 * 
 * Provides state management for collapsible UI elements
 * (e.g., expandable response sections in QueryCard).
 * 
 * @see history-view-implementation-plan.md section 4.2
 */

import { useState, useCallback } from 'react';

/**
 * Hook return type
 */
export interface UseCollapsibleReturn {
  isExpanded: boolean;
  toggle: () => void;
  expand: () => void;
  collapse: () => void;
}

/**
 * Hook for managing expand/collapse state
 * 
 * @param initialExpanded - Initial expanded state (default: false)
 * @returns Object with isExpanded, toggle, expand, collapse
 */
export function useCollapsible(
  initialExpanded: boolean = false
): UseCollapsibleReturn {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  const toggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const expand = useCallback(() => {
    setIsExpanded(true);
  }, []);

  const collapse = useCallback(() => {
    setIsExpanded(false);
  }, []);

  return {
    isExpanded,
    toggle,
    expand,
    collapse,
  };
}

