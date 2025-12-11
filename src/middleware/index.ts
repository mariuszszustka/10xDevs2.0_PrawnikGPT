/**
 * Astro middleware for PrawnikGPT
 * 
 * This middleware adds the Supabase client to Astro context locals,
 * making it available throughout the application (pages, layouts, components).
 * Also handles authentication redirects:
 * - Redirects logged-in users from /login to /app
 * - Redirects unauthenticated users from /app/* to /login
 */

import { defineMiddleware } from 'astro:middleware';
import { supabaseClient } from '../lib/supabase';

export const onRequest = defineMiddleware(async (context, next) => {
  // Add Supabase client to context locals
  context.locals.supabase = supabaseClient;
  
  // Get current session
  const { data: { session } } = await supabaseClient.auth.getSession();
  context.locals.session = session;
  
  // Redirect logged-in users away from login/register/forgot-password pages
  if (session && ['/login', '/register', '/forgot-password'].includes(context.url.pathname)) {
    return context.redirect('/app', 302);
  }
  
  // Redirect unauthenticated users from protected routes to login
  if (!session && context.url.pathname.startsWith('/app')) {
    return context.redirect('/login', 302);
  }
  
  // /reset-password is allowed for all users (with token) - no redirects needed
  
  return next();
});

