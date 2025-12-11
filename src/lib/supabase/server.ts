/**
 * Supabase Server Client for Astro SSR
 * 
 * This file provides a server-side Supabase client using @supabase/ssr
 * for proper cookie-based session management in Astro middleware and pages.
 * 
 * Use this factory function in:
 * - Astro middleware (src/middleware/index.ts)
 * - Astro pages (server-side rendering)
 * - Astro API endpoints (src/pages/api/**)
 * 
 * IMPORTANT: This client uses HttpOnly cookies for refresh tokens (PRD 9.2.2),
 * which prevents XSS attacks on refresh tokens.
 */

import type { AstroCookies, AstroRequest } from 'astro';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
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
 * Cookie options for Supabase Auth (PRD 9.2.2)
 * 
 * - httpOnly: true - Prevents JavaScript access (XSS protection)
 * - secure: true - Only sent over HTTPS (production)
 * - sameSite: 'lax' - CSRF protection
 * - path: '/' - Available for all routes
 */
const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: import.meta.env.PROD, // true in production, false in development
  sameSite: 'lax',
  path: '/',
};

/**
 * Parse cookie header string into array of { name, value } objects
 * 
 * @param cookieHeader - Cookie header string from request
 * @returns Array of cookie objects
 */
function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  if (!cookieHeader) {
    return [];
  }

  return cookieHeader.split(';').map((cookie) => {
    const trimmed = cookie.trim();
    const [name, ...rest] = trimmed.split('=');
    return {
      name: name || '',
      value: rest.join('=') || '',
    };
  });
}

/**
 * Create Supabase server client instance for Astro SSR
 * 
 * This factory function creates a server-side Supabase client that:
 * - Reads cookies from request headers
 * - Writes cookies to AstroCookies
 * - Automatically refreshes sessions using HttpOnly cookies
 * 
 * @param context - Astro context with cookies and request headers
 * @returns Supabase client instance for server-side use
 * 
 * @example
 * ```typescript
 * // In Astro middleware
 * const supabase = createSupabaseServerClient({
 *   cookies: context.cookies,
 *   headers: context.request.headers,
 * });
 * 
 * // In Astro API endpoint
 * const supabase = createSupabaseServerClient({
 *   cookies: Astro.cookies,
 *   headers: Astro.request.headers,
 * });
 * ```
 */
export function createSupabaseServerClient(context: {
  cookies: AstroCookies;
  headers: Headers;
}) {
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        const cookieHeader = context.headers.get('Cookie') ?? '';
        return parseCookieHeader(cookieHeader);
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          context.cookies.set(name, value, {
            ...cookieOptions,
            ...options,
          });
        });
      },
    },
  });
}
