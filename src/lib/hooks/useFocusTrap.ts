/**
 * useFocusTrap - Hook for trapping focus within a modal
 * 
 * Traps keyboard focus within a modal dialog and restores focus
 * to the previously focused element when modal closes.
 * 
 * @see chat-view-implementation-plan.md section 6.3
 */

import { useEffect, useRef } from 'react';

/**
 * Hook for focus trap in modal dialogs
 * 
 * @param isOpen - Whether the modal is open
 * @param containerRef - Ref to the modal container element
 */
export function useFocusTrap(isOpen: boolean, containerRef: React.RefObject<HTMLElement>) {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen || !containerRef.current) {
      return;
    }

    // Save previous focus
    previousFocusRef.current = document.activeElement as HTMLElement;

    const container = containerRef.current;

    // Get all focusable elements within container
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const focusableElements = Array.from(
      container.querySelectorAll<HTMLElement>(focusableSelectors)
    );

    if (focusableElements.length === 0) {
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element
    firstElement.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') {
        return;
      }

      if (e.shiftKey) {
        // Shift + Tab: focus previous element
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: focus next element
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      
      // Restore previous focus
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, containerRef]);
}

