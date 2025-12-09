/**
 * AppContext - Global state management for PrawnikGPT
 * 
 * Provides shared state across React components:
 * - Active queries tracking (limit 3 concurrent)
 * - User session management
 * - Rate limit information
 * 
 * @see chat-view-implementation-plan.md section 6.1
 */

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';

/**
 * Rate limit information from API headers
 */
export interface RateLimitInfo {
  used: number;
  limit: number; // 10 queries per minute
  resetAt: Date | null; // When the rate limit resets
}

/**
 * App context type definition
 */
export interface AppContextType {
  // Active queries (limit 3 concurrent)
  activeQueries: Set<string>; // Set<query_id>
  setActiveQueries: (queries: Set<string>) => void;
  
  // User session
  userSession: Session | null;
  setUserSession: (session: Session | null) => void;
  
  // Rate limit info
  rateLimitInfo: RateLimitInfo | null;
  setRateLimitInfo: (info: RateLimitInfo | null) => void;
}

/**
 * App context instance
 */
const AppContext = createContext<AppContextType | undefined>(undefined);

/**
 * AppContext Provider component
 * 
 * Wraps the application and provides global state to all children
 */
export function AppContextProvider({ children }: { children: ReactNode }) {
  const [activeQueries, setActiveQueries] = useState<Set<string>>(new Set());
  const [userSession, setUserSession] = useState<Session | null>(null);
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);

  return (
    <AppContext.Provider
      value={{
        activeQueries,
        setActiveQueries,
        userSession,
        setUserSession,
        rateLimitInfo,
        setRateLimitInfo,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

/**
 * Hook to access AppContext
 * 
 * @throws Error if used outside AppContextProvider
 */
export function useAppContext(): AppContextType {
  const context = useContext(AppContext);
  
  if (context === undefined) {
    throw new Error('useAppContext must be used within AppContextProvider');
  }
  
  return context;
}

