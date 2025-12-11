/**
 * POST /api/auth/logout
 * 
 * Logout endpoint for user sign-out
 * 
 * Handles:
 * - Sign out from Supabase Auth
 * - Invalidation of refresh token (PRD 9.2.2)
 * - Clearing of HttpOnly cookies
 * 
 * Response (200):
 * {
 *   "message": "Wylogowano pomyślnie"
 * }
 * 
 * Response (400):
 * {
 *   "error": "Wystąpił błąd podczas wylogowania"
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

    // Sign out (invalidates refresh token and clears cookies)
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout error:', error);
      return new Response(
        JSON.stringify({ error: 'Wystąpił błąd podczas wylogowania' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Success: cookies are automatically cleared by Supabase SSR
    return new Response(
      JSON.stringify({ message: 'Wylogowano pomyślnie' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Logout API error:', error);
    return new Response(
      JSON.stringify({
        error: 'Wystąpił błąd podczas wylogowania. Spróbuj ponownie.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
