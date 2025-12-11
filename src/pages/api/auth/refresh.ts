/**
 * POST /api/auth/refresh
 * 
 * Session refresh endpoint
 * 
 * Handles:
 * - Manual session refresh using refresh token from HttpOnly cookie
 * - Automatic token rotation (if enabled in Supabase)
 * 
 * This endpoint is optional - Supabase SSR automatically refreshes sessions,
 * but can be useful for explicit refresh requests.
 * 
 * Response (200):
 * {
 *   "session": { access_token, refresh_token, ... }
 * }
 * 
 * Response (401):
 * {
 *   "error": "Sesja wygasła. Zaloguj się ponownie."
 * }
 */

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase/server';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Create Supabase server client
    const supabase = createSupabaseServerClient({
      cookies,
      headers: request.headers,
    });

    // Refresh session using refresh token from HttpOnly cookie
    const { data, error } = await supabase.auth.refreshSession();

    if (error || !data.session) {
      return new Response(
        JSON.stringify({ error: 'Sesja wygasła. Zaloguj się ponownie.' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Success: new session is automatically stored in HttpOnly cookies
    return new Response(
      JSON.stringify({
        session: data.session,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Refresh API error:', error);
    return new Response(
      JSON.stringify({
        error: 'Wystąpił błąd podczas odświeżania sesji.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
