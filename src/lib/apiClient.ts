/**
 * API client for FastAPI backend
 * 
 * This file provides utilities for making API calls to the FastAPI backend.
 * Uses environment variables for configuration (deployment-agnostic).
 */

import { getApiBaseUrl } from './utils';
import { supabaseClient } from './supabase';
import { ApiError, type ErrorResponse, type ApiErrorCode } from './types';

const API_BASE_URL = getApiBaseUrl();

/**
 * Get authorization headers for API requests
 * Extracts JWT token from Supabase session
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Get token from Supabase session
  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (error) {
      console.warn('Failed to get Supabase session:', error.message);
      return headers;
    }
    
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  } catch (error) {
    // Silently fail if session cannot be retrieved (e.g., user not logged in)
    // This allows public endpoints to work without authentication
    console.debug('Could not retrieve auth token:', error);
  }

  return headers;
}

/**
 * Parse error response from backend API
 * Backend returns structured ErrorResponse format
 */
async function parseErrorResponse(response: Response): Promise<ApiError> {
  try {
    const errorData: ErrorResponse = await response.json();
    
    // Check if response has the expected ErrorResponse structure
    if (errorData?.error) {
      const { code, message, details, request_id } = errorData.error;
      return new ApiError(
        response.status,
        code as ApiErrorCode,
        details,
        request_id
      );
    }
    
    // Fallback for non-standard error responses
    return new ApiError(
      response.status,
      'INTERNAL_SERVER_ERROR' as ApiErrorCode,
      { raw_message: errorData },
      undefined
    );
  } catch {
    // If JSON parsing fails, create error from status
    const errorCode = response.status === 401 
      ? 'UNAUTHORIZED' 
      : response.status === 403 
      ? 'FORBIDDEN'
      : response.status === 404
      ? 'NOT_FOUND'
      : response.status === 429
      ? 'RATE_LIMIT_EXCEEDED'
      : response.status >= 500
      ? 'INTERNAL_SERVER_ERROR'
      : 'VALIDATION_ERROR';
      
    return new ApiError(
      response.status,
      errorCode as ApiErrorCode,
      { message: response.statusText },
      response.headers.get('X-Request-ID') || undefined
    );
  }
}

/**
 * Fetch data from API with error handling
 * 
 * Throws ApiError for all error responses (4xx, 5xx)
 * Handles 401 Unauthorized by redirecting to login
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = await getAuthHeaders();

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const apiError = await parseErrorResponse(response);
      
      // Handle 401 Unauthorized - redirect to login
      if (response.status === 401) {
        // Try to refresh session first
        try {
          const { data: { session }, error } = await supabaseClient.auth.refreshSession();
          
          if (error || !session) {
            // Session expired or invalid - redirect to login
            if (typeof window !== 'undefined') {
              window.location.href = '/login?expired=true';
            }
          } else {
            // Session refreshed - retry request with new token
            return apiFetch<T>(endpoint, options);
          }
        } catch (refreshError) {
          // Refresh failed - redirect to login
          if (typeof window !== 'undefined') {
            window.location.href = '/login?expired=true';
          }
        }
      }
      
      throw apiError;
    }

    return response.json();
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Handle network errors and other exceptions
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError(
        0,
        'SERVICE_UNAVAILABLE' as ApiErrorCode,
        { message: 'Network error: Could not connect to API server' },
        undefined
      );
    }
    
    // Re-throw unknown errors
    throw error;
  }
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

