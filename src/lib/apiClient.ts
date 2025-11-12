/**
 * API client for FastAPI backend
 * 
 * This file provides utilities for making API calls to the FastAPI backend.
 * Uses environment variables for configuration (deployment-agnostic).
 */

import { getApiBaseUrl } from './utils';

const API_BASE_URL = getApiBaseUrl();

/**
 * Get authorization headers for API requests
 * Extracts JWT token from Supabase session
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // TODO: Get token from Supabase session
  // const { data: { session } } = await supabase.auth.getSession();
  // if (session?.access_token) {
  //   headers['Authorization'] = `Bearer ${session.access_token}`;
  // }

  return headers;
}

/**
 * Fetch data from API with error handling
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = await getAuthHeaders();

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: `HTTP ${response.status}: ${response.statusText}`,
    }));
    throw new Error(error.message || 'API request failed');
  }

  return response.json();
}

/**
 * POST request helper
 */
export async function apiPost<T>(
  endpoint: string,
  data: unknown
): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * GET request helper
 */
export async function apiGet<T>(endpoint: string): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: 'GET',
  });
}

/**
 * DELETE request helper
 */
export async function apiDelete<T>(endpoint: string): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: 'DELETE',
  });
}

