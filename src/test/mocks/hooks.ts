/**
 * Mock Helpers for Custom Hooks
 *
 * Централизowane mocki dla custom hooks używanych w komponentach.
 * Pozwala na łatwe tworzenie różnych scenariuszy testowych.
 */

import { vi } from 'vitest';

/**
 * Mock dla useRateLimit hook
 */
export const createMockUseRateLimit = (overrides = {}) => ({
  used: 0,
  limit: 10,
  canSubmit: true,
  resetAt: Date.now() + 60000,
  ...overrides,
});

/**
 * Mock dla useActiveQueries hook
 */
export const createMockUseActiveQueries = (overrides = {}) => ({
  activeCount: 0,
  canAddQuery: true,
  maxQueries: 3,
  ...overrides,
});

/**
 * Mock dla useRAGContextTimer hook
 */
export const createMockUseRAGContextTimer = (overrides = {}) => ({
  secondsRemaining: 300,
  isExpiring: false,
  isExpired: false,
  ...overrides,
});

/**
 * Mock dla useOptimisticRating hook
 */
export const createMockUseOptimisticRating = (overrides = {}) => ({
  rating: null,
  isSubmitting: false,
  handleRating: vi.fn(),
  ...overrides,
});

/**
 * Setup default mocks for all custom hooks
 */
export const setupDefaultHookMocks = () => {
  vi.mock('@/lib/hooks/useRateLimit', () => ({
    useRateLimit: vi.fn(() => createMockUseRateLimit()),
  }));

  vi.mock('@/lib/hooks/useActiveQueries', () => ({
    useActiveQueries: vi.fn(() => createMockUseActiveQueries()),
  }));

  vi.mock('@/lib/hooks/useRAGContextTimer', () => ({
    useRAGContextTimer: vi.fn(() => createMockUseRAGContextTimer()),
  }));

  vi.mock('@/lib/hooks/useOptimisticRating', () => ({
    useOptimisticRating: vi.fn(() => createMockUseOptimisticRating()),
  }));
};
