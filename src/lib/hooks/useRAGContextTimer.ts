/**
 * useRAGContextTimer - Hook for tracking RAG context cache TTL (5 minutes)
 * 
 * Calculates remaining time until RAG context cache expires.
 * Cache expires 5 minutes after query creation.
 * 
 * @see chat-view-implementation-plan.md section 6.3
 */

import { useState, useEffect } from 'react';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes in milliseconds
const EXPIRING_THRESHOLD_MS = 60 * 1000; // 1 minute - show warning when < 1 min left

/**
 * Hook return type
 */
export interface UseRAGContextTimerReturn {
  secondsRemaining: number; // Seconds until cache expires
  isExpiring: boolean; // true if < 1 minute remaining
  isExpired: boolean; // true if cache has expired
}

/**
 * Hook for tracking RAG context cache expiration
 * 
 * @param createdAt - ISO 8601 timestamp of query creation
 * @returns Object with secondsRemaining, isExpiring, isExpired
 */
export function useRAGContextTimer(createdAt: string): UseRAGContextTimerReturn {
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const createdDate = new Date(createdAt);
    const expiresAt = new Date(createdDate.getTime() + CACHE_TTL_MS);
    
    const updateTimer = () => {
      const now = new Date();
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
      
      setSecondsRemaining(remaining);
      setIsExpired(remaining === 0);
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [createdAt]);

  const isExpiring = secondsRemaining > 0 && secondsRemaining < EXPIRING_THRESHOLD_MS / 1000;

  return {
    secondsRemaining,
    isExpiring,
    isExpired,
  };
}

