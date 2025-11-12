/**
 * Utility functions for PrawnikGPT
 */

/**
 * Get API base URL from environment variables
 * Falls back to localhost:8000 if not set
 */
export function getApiBaseUrl(): string {
  return import.meta.env.PUBLIC_API_BASE_URL || 'http://localhost:8000';
}

/**
 * Get Supabase URL from environment variables
 * Falls back to localhost:8444 if not set
 */
export function getSupabaseUrl(): string {
  return import.meta.env.PUBLIC_SUPABASE_URL || 'http://localhost:8444';
}

/**
 * Get Supabase anon key from environment variables
 */
export function getSupabaseAnonKey(): string {
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error('PUBLIC_SUPABASE_ANON_KEY is not set in environment variables');
  }
  return key;
}

/**
 * Format date to Polish locale
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pl-PL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * Validate query text length (10-1000 characters)
 */
export function validateQueryText(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.length >= 10 && trimmed.length <= 1000;
}

