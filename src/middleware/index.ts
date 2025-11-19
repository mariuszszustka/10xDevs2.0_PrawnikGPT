/**
 * Astro middleware for PrawnikGPT
 * 
 * This middleware adds the Supabase client to Astro context locals,
 * making it available throughout the application (pages, layouts, components).
 */

import { defineMiddleware } from 'astro:middleware';
import { supabaseClient } from '../lib/supabase';

export const onRequest = defineMiddleware((context, next) => {
  // Add Supabase client to context locals
  context.locals.supabase = supabaseClient;
  
  return next();
});

