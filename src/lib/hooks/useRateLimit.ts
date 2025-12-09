/**
 * useRateLimit - Hook for accessing rate limit information
 * 
 * Provides rate limit info from AppContext and helper to check if submission is allowed.
 * 
 * @see chat-view-implementation-plan.md section 6.3
 */

import { useAppContext } from '../AppContext';

const RATE_LIMIT_MAX = 10; // 10 queries per minute

/**
 * Hook return type
 */
export interface UseRateLimitReturn {
  used: number;
  limit: number;
  resetAt: Date | null;
  canSubmit: boolean; // true if used < limit
}

/**
 * Hook for accessing rate limit information
 * 
 * @returns Object with used, limit, resetAt, canSubmit
 */
export function useRateLimit(): UseRateLimitReturn {
  const { rateLimitInfo } = useAppContext();

  const used = rateLimitInfo?.used ?? 0;
  const limit = rateLimitInfo?.limit ?? RATE_LIMIT_MAX;
  const resetAt = rateLimitInfo?.resetAt ?? null;
  const canSubmit = used < limit;

  return {
    used,
    limit,
    resetAt,
    canSubmit,
  };
}

