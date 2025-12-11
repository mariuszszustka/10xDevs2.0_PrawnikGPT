/**
 * Astro middleware for PrawnikGPT
 * 
 * This middleware:
 * - Creates Supabase server client with cookie-based session management
 * - Adds Supabase client to Astro context locals
 * - Handles authentication redirects:
 *   - Redirects logged-in users from /login, /register, /forgot-password to /app
 *   - Redirects unauthenticated users from /app/* to /login
 * - Automatically refreshes sessions using HttpOnly cookies (PRD 9.2.2)
 */

import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServerClient } from '../lib/supabase/server';

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
];

// Auth API endpoints (public, but handled separately)
const AUTH_API_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/auth/refresh',
];

export const onRequest = defineMiddleware(async (context, next) => {
  // Create Supabase server client with cookie-based session management
  const supabase = createSupabaseServerClient({
    cookies: context.cookies,
    headers: context.request.headers,
  });

  // Add Supabase client to context locals for use in pages
  context.locals.supabase = supabase;

  // Get current user session (automatically refreshes if needed using HttpOnly cookies)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // Store session in context locals
  if (user) {
    const { data: { session } } = await supabase.auth.getSession();
    context.locals.session = session;
    context.locals.user = {
      id: user.id,
      email: user.email || undefined,
    };
  } else {
    context.locals.session = null;
    context.locals.user = null;
  }

  const pathname = context.url.pathname;
  const isPublicPath = PUBLIC_PATHS.includes(pathname);
  const isAuthApiPath = AUTH_API_PATHS.some((path) => pathname.startsWith(path));

  // Skip auth checks for public paths and auth API endpoints
  if (isPublicPath || isAuthApiPath) {
    // Redirect logged-in users away from login/register/forgot-password pages
    if (user && ['/login', '/register', '/forgot-password'].includes(pathname)) {
      return context.redirect('/app', 302);
    }
    return next();
  }

  // Protected routes: redirect unauthenticated users to login
  if (!user && pathname.startsWith('/app')) {
    const redirectTo = encodeURIComponent(pathname + context.url.search);
    return context.redirect(`/login?redirect_to=${redirectTo}`, 302);
  }

  // /reset-password is allowed for all users (with token) - no redirects needed
  // (handled by isPublicPath check above)

  return next();
});

