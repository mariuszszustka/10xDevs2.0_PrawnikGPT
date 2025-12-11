/**
 * POST /api/auth/register
 * 
 * Registration endpoint for new user sign-up
 * 
 * Handles:
 * - Email/password registration via Supabase Auth
 * - Automatic login after registration (MVP - no email verification)
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
 *   "error": "Nie można utworzyć konta"
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
    errorMessage.includes('user already registered') ||
    errorMessage.includes('email already registered') ||
    errorMessage.includes('already exists')
  ) {
    return 'Nie można utworzyć konta';
  }

  if (errorMessage.includes('password should be at least')) {
    return 'Hasło jest zbyt słabe. Minimum 12 znaków, w tym małe i duże litery, cyfry oraz znaki specjalne.';
  }

  if (errorMessage.includes('invalid email')) {
    return 'Podaj prawidłowy adres email';
  }

  if (errorMessage.includes('too many requests')) {
    return 'Zbyt wiele prób. Spróbuj ponownie za chwilę.';
  }

  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return 'Wystąpił problem z połączeniem. Spróbuj ponownie.';
  }

  // Generic fallback
  return 'Nie można utworzyć konta. Spróbuj ponownie.';
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

    // Sign up new user (no email verification in MVP)
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: undefined, // No email verification in MVP
      },
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
    // If session exists, user is automatically logged in (MVP - no email verification)
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
    console.error('Register API error:', error);
    return new Response(
      JSON.stringify({
        error: 'Nie można utworzyć konta. Spróbuj ponownie.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
