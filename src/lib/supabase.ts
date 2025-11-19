/**
 * Supabase client setup for PrawnikGPT
 * 
 * This file initializes the Supabase client for use in Astro pages and React components.
 * Uses environment variables for configuration (deployment-agnostic).
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Get configuration from environment variables
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('PUBLIC_SUPABASE_URL is not set in environment variables');
}

if (!supabaseAnonKey) {
  throw new Error('PUBLIC_SUPABASE_ANON_KEY is not set in environment variables');
}

/**
 * Supabase client with type-safe database schema
 * Use this singleton instance throughout the application
 */
export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

