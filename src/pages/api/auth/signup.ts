/**
 * POST /api/auth/signup
 * 
 * Signup endpoint for new user registration with email verification
 * 
 * Handles:
 * - Email/password registration via Supabase Auth
 * - Email verification link sent to user (Supabase default behavior)
 * - Session management with HttpOnly cookies (PRD 9.2.2)
 * - Rate limiting (handled by Supabase Auth)
 * - Error handling with generic messages (no user enumeration)
 * 
 * IMPORTANT: After registration, user receives an email verification link.
 * User must click the link to activate their account before logging in.
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
 *   "message": "Link do potwierdzenia konta został wysłany na Twój adres email"
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

export const POST: APIRoute = async ({ request, cookies, url }) => {
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

    // Get the origin URL for email redirect (confirmation link)
    // Use request origin or construct from URL
    const origin = request.headers.get('origin') || `${url.protocol}//${url.host}`;
    const emailRedirectTo = `${origin}/login?emailConfirmed=true`;

    // Sign up new user with email verification enabled
    // Supabase will automatically send a confirmation email
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo, // URL to redirect after email confirmation
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

    // Success: email verification link has been sent
    // Note: In Supabase, when email verification is enabled, session is null until user confirms email
    // User will receive an email with confirmation link
    return new Response(
      JSON.stringify({
        user: data.user,
        message: 'Link do potwierdzenia konta został wysłany na Twój adres email. Sprawdź skrzynkę pocztową i kliknij link, aby aktywować konto.',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    // Handle JSON parsing errors or other unexpected errors
    console.error('Signup API error:', error);
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
