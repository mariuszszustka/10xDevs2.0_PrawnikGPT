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
 * - Timeout handling (15 seconds for Supabase requests)
 * 
 * Request Body:
 * {
 *   "email": string,
 *   "password": string
 * }
 * 
 * Response (302 Redirect):
 * - Success: Redirects to /app (or redirect_to from query params)
 * - HttpOnly cookies are automatically set by Supabase SSR
 * 
 * Response (400 JSON):
 * {
 *   "error": "Nieprawidłowy email lub hasło"
 * }
 * 
 * Response (503 JSON):
 * {
 *   "error": "Wystąpił błąd komunikacji z serwerem. Spróbuj ponownie za chwilę."
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

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  // Timeout configuration (15 seconds for Supabase requests)
  const TIMEOUT_MS = 15000;

  try {
    // Parse request body with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let body;
    try {
      body = await request.json();
      clearTimeout(timeoutId);
    } catch (parseError) {
      clearTimeout(timeoutId);
      return new Response(
        JSON.stringify({ error: 'Nieprawidłowy format żądania' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

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

    // Sign in with password (with timeout)
    const signInController = new AbortController();
    const signInTimeoutId = setTimeout(() => signInController.abort(), TIMEOUT_MS);

    let data, error;
    try {
      const result = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      clearTimeout(signInTimeoutId);
      data = result.data;
      error = result.error;
    } catch (signInError: any) {
      clearTimeout(signInTimeoutId);
      // Handle timeout or network errors
      if (signInError.name === 'AbortError' || signInError.message?.includes('timeout')) {
        return new Response(
          JSON.stringify({
            error: 'Wystąpił błąd komunikacji z serwerem. Spróbuj ponownie za chwilę.',
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      throw signInError;
    }

    if (error) {
      // Map error to user-friendly message (no enumeration)
      const errorMessage = mapSupabaseError(error);
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Success: session is automatically stored in HttpOnly cookies by Supabase SSR
    // Redirect to app (or redirect_to from query params)
    const url = new URL(request.url);
    const redirectTo = url.searchParams.get('redirect_to') || '/app';
    
    return redirect(redirectTo, 302);
  } catch (error: any) {
    // Handle unexpected errors
    console.error('Login API error:', error);
    
    // Check if it's a timeout error
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      return new Response(
        JSON.stringify({
          error: 'Wystąpił błąd komunikacji z serwerem. Spróbuj ponownie za chwilę.',
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

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
