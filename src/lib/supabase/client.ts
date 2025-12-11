/**
 * Supabase Browser Client for React Islands
 * 
 * This file provides a browser-side Supabase client using @supabase/ssr
 * for proper cookie-based session management (HttpOnly cookies for refresh tokens).
 * 
 * Use this client in React components (React islands) that run in the browser.
 * 
 * IMPORTANT: This client uses HttpOnly cookies for refresh tokens (PRD 9.2.2),
 * which prevents XSS attacks on refresh tokens.
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '../database.types';

// Get configuration from environment variables
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('PUBLIC_SUPABASE_URL is not set in environment variables');
}

if (!supabaseAnonKey) {
  throw new Error('PUBLIC_SUPABASE_ANON_KEY is not set in environment variables');
}

/**
 * Create Supabase browser client with cookie-based session management
 * 
 * This client automatically handles:
 * - HttpOnly cookies for refresh tokens (secure, prevents XSS)
 * - Automatic token refresh
 * - Session persistence across page reloads
 * 
 * @returns Supabase client instance for browser use
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

/**
 * Singleton browser client instance
 * Use this in React components (React islands)
 */
export const supabaseClient = createSupabaseBrowserClient();
