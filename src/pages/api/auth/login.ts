/**
 * POST /api/auth/login
 * 
 * Login endpoint for user authentication
 * 
 * Handles:
 * - Email/password authentication via Supabase Auth
 * - Session management with HttpOnly cookies (PRD 9.2.2)
 * - Rate limiting (handled by Supabase Auth)
 * - Error handling with generic messages (no user enumeration)
 * 
 * Request Body:
 * {
 *   "email": string,
 *   "password": string
 * }
 * 
 * Response (200):
 * {
 *   "user": { id, email, ... },
 *   "session": { access_token, refresh_token, ... }
 * }
 * 
 * Response (400):
 * {
 *   "error": "Nieprawidłowy email lub hasło"
 * }
 */

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase/server';

/**
 * Map Supabase Auth errors to user-friendly Polish messages
 * Prevents user enumeration (PRD 9.2.4)
 */
function mapSupabaseError(error: { message: string } | null): string {
  if (!error) return '';

  const errorMessage = error.message.toLowerCase();

  // Generic error messages to prevent user enumeration
  if (
    errorMessage.includes('invalid login credentials') ||
    errorMessage.includes('email not confirmed') ||
    errorMessage.includes('user not found')
  ) {
    return 'Nieprawidłowy email lub hasło';
  }

  if (errorMessage.includes('too many requests')) {
    return 'Zbyt wiele prób logowania. Spróbuj ponownie za chwilę.';
  }

  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return 'Błąd połączenia. Sprawdź połączenie internetowe.';
  }

  // Generic fallback
  return 'Wystąpił błąd podczas logowania. Spróbuj ponownie.';
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Parse request body
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email i hasło są wymagane' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Supabase server client
    const supabase = createSupabaseServerClient({
      cookies,
      headers: request.headers,
    });

    // Sign in with password
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      // Map error to user-friendly message (no enumeration)
      const errorMessage = mapSupabaseError(error);
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Success: session is automatically stored in HttpOnly cookies by Supabase SSR
    return new Response(
      JSON.stringify({
        user: data.user,
        session: data.session,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    // Handle JSON parsing errors or other unexpected errors
    console.error('Login API error:', error);
    return new Response(
      JSON.stringify({
        error: 'Wystąpił błąd podczas logowania. Spróbuj ponownie.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
