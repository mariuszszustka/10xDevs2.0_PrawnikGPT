/**
 * useScrollPosition - Hook for preserving scroll position
 * 
 * Provides utilities to save and restore scroll position,
 * useful for "Load More" pagination to maintain user's scroll position.
 * 
 * @see history-view-implementation-plan.md section 4.1
 */

import { useRef, useCallback } from 'react';

/**
 * Hook return type
 */
export interface UseScrollPositionReturn {
  save: () => void;
  restore: () => void;
  scrollToElement: (element: HTMLElement | null) => void;
}

/**
 * Hook for preserving scroll position
 * 
 * @returns Object with save, restore, scrollToElement functions
 */
export function useScrollPosition(): UseScrollPositionReturn {
  const scrollPositionRef = useRef<number>(0);
  const scrollElementRef = useRef<HTMLElement | null>(null);

  const save = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Save current scroll position
    scrollPositionRef.current = window.scrollY || window.pageYOffset;

    // Save reference to scrollable container (if any)
    // For now, we use window scroll
    scrollElementRef.current = document.documentElement;
  }, []);

  const restore = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Restore scroll position
    window.scrollTo({
      top: scrollPositionRef.current,
      behavior: 'auto', // Instant scroll, not smooth
    });
  }, []);

  const scrollToElement = useCallback((element: HTMLElement | null) => {
    if (!element) {
      return;
    }

    // Scroll element into view
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, []);

  return {
    save,
    restore,
    scrollToElement,
  };
}

