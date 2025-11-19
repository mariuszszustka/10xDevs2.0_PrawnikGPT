/// <reference types="astro/client" />

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './lib/database.types';

/**
 * Augment Astro global namespace with Supabase client
 * 
 * This makes the Supabase client available via `Astro.locals.supabase`
 * in all Astro pages, layouts, and components.
 */
declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
    }
  }
}

/**
 * Environment variables type definitions for PrawnikGPT
 * 
 * These types ensure type safety when accessing environment variables
 * via import.meta.env in the codebase.
 */
interface ImportMetaEnv {
  // Public variables (available in browser)
  readonly PUBLIC_API_BASE_URL: string;
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;

  // Server-only variables (not exposed to browser)
  readonly SUPABASE_URL?: string;
  readonly SUPABASE_SERVICE_KEY?: string;
  readonly SUPABASE_JWT_SECRET?: string;
  readonly OLLAMA_HOST?: string;
  readonly REDIS_URL?: string;
  readonly LOG_LEVEL?: string;
  readonly DEBUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

