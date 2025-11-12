/**
 * Supabase client setup for PrawnikGPT
 * 
 * This file initializes the Supabase client for use in Astro pages and React components.
 * Uses environment variables for configuration (deployment-agnostic).
 */

import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseAnonKey } from './utils';

// Get configuration from environment variables
const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = getSupabaseAnonKey();

/**
 * Create Supabase client for browser usage (client-side)
 * Use this in React components and client-side code
 */
export function createBrowserClient() {
  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Create Supabase client for server usage (SSR)
 * Use this in Astro pages and server-side code
 */
export function createServerClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // Don't persist session in SSR
    },
  });
}

