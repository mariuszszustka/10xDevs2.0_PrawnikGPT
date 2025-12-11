/**
 * API client for FastAPI backend
 * 
 * This file provides utilities for making API calls to the FastAPI backend.
 * Uses environment variables for configuration (deployment-agnostic).
 */

import { getApiBaseUrl } from './utils';
import { supabaseClient } from './supabase/client';
import { ApiError, type ErrorResponse, type ApiErrorCode } from './types';
import type { RateLimitInfo } from './AppContext';

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
 * Parse rate limit headers from API response
 * 
 * Headers format:
 * - X-RateLimit-Limit: Maximum number of requests allowed
 * - X-RateLimit-Remaining: Number of requests remaining
 * - X-RateLimit-Reset: Unix timestamp when the rate limit resets
 * 
 * @param response - Fetch Response object
 * @returns RateLimitInfo or null if headers not present
 */
function parseRateLimitHeaders(response: Response): RateLimitInfo | null {
  const limitHeader = response.headers.get('X-RateLimit-Limit');
  const remainingHeader = response.headers.get('X-RateLimit-Remaining');
  const resetHeader = response.headers.get('X-RateLimit-Reset');

  if (!limitHeader || !remainingHeader) {
    return null;
  }

  const limit = parseInt(limitHeader, 10);
  const remaining = parseInt(remainingHeader, 10);
  const used = limit - remaining;

  let resetAt: Date | null = null;
  if (resetHeader) {
    const resetTimestamp = parseInt(resetHeader, 10);
    if (!isNaN(resetTimestamp)) {
      // Convert Unix timestamp to Date
      resetAt = new Date(resetTimestamp * 1000);
    }
  }

  return {
    used,
    limit,
    resetAt,
  };
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
 * Response wrapper with rate limit information
 */
export interface ApiResponseWithRateLimit<T> {
  data: T;
  rateLimit: RateLimitInfo | null;
}

/**
 * Fetch data from API with error handling
 * 
 * Throws ApiError for all error responses (4xx, 5xx)
 * Handles 401 Unauthorized by redirecting to login
 * Parses rate limit headers from response
 * 
 * @overload
 * @param endpoint - API endpoint path
 * @param options - Fetch options
 * @param includeRateLimit - false (default)
 * @returns Promise<T>
 * 
 * @overload
 * @param endpoint - API endpoint path
 * @param options - Fetch options
 * @param includeRateLimit - true
 * @returns Promise<ApiResponseWithRateLimit<T>>
 */
export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit,
  includeRateLimit?: false
): Promise<T>;
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit,
  includeRateLimit: true
): Promise<ApiResponseWithRateLimit<T>>;
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  includeRateLimit: boolean = false
): Promise<T | ApiResponseWithRateLimit<T>> {
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

    const data = await response.json();
    const rateLimit = parseRateLimitHeaders(response);

    if (includeRateLimit) {
      return { data, rateLimit } as ApiResponseWithRateLimit<T>;
    }

    return data;
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
 * 
 * @overload
 * @param endpoint - API endpoint path
 * @param data - Request body data
 * @param includeRateLimit - false (default)
 * @returns Promise<T>
 * 
 * @overload
 * @param endpoint - API endpoint path
 * @param data - Request body data
 * @param includeRateLimit - true
 * @returns Promise<ApiResponseWithRateLimit<T>>
 */
export async function apiPost<T>(
  endpoint: string,
  data: unknown,
  includeRateLimit?: false
): Promise<T>;
export async function apiPost<T>(
  endpoint: string,
  data: unknown,
  includeRateLimit: true
): Promise<ApiResponseWithRateLimit<T>>;
export async function apiPost<T>(
  endpoint: string,
  data: unknown,
  includeRateLimit: boolean = false
): Promise<T | ApiResponseWithRateLimit<T>> {
  if (includeRateLimit) {
    return apiFetch<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }, true);
  }
  return apiFetch<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  }, false);
}

/**
 * GET request helper
 * 
 * @overload
 * @param endpoint - API endpoint path
 * @param includeRateLimit - false (default)
 * @returns Promise<T>
 * 
 * @overload
 * @param endpoint - API endpoint path
 * @param includeRateLimit - true
 * @returns Promise<ApiResponseWithRateLimit<T>>
 */
export async function apiGet<T>(
  endpoint: string,
  includeRateLimit?: false
): Promise<T>;
export async function apiGet<T>(
  endpoint: string,
  includeRateLimit: true
): Promise<ApiResponseWithRateLimit<T>>;
export async function apiGet<T>(
  endpoint: string,
  includeRateLimit: boolean = false
): Promise<T | ApiResponseWithRateLimit<T>> {
  if (includeRateLimit) {
    return apiFetch<T>(endpoint, {
      method: 'GET',
    }, true);
  }
  return apiFetch<T>(endpoint, {
    method: 'GET',
  }, false);
}

/**
 * DELETE request helper
 */
export async function apiDelete<T>(endpoint: string): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: 'DELETE',
  });
}

// =============================================================================
// Query Management Functions (History View)
// =============================================================================

import type {
  QueryListResponse,
  QueryListParams,
  QueryDetailResponse,
} from './types';

/**
 * Get list of user queries with pagination
 * 
 * @param params - Query parameters (page, per_page, order)
 * @returns Query list response with pagination
 */
export async function getQueries(
  params: QueryListParams = {}
): Promise<QueryListResponse> {
  const queryString = new URLSearchParams({
    page: String(params.page || 1),
    per_page: String(params.per_page || 20),
    order: params.order || 'desc',
  }).toString();

  return apiGet<QueryListResponse>(`/api/v1/queries?${queryString}`);
}

/**
 * Get query details by ID
 * 
 * @param queryId - Query ID (UUID)
 * @returns Query detail response
 */
export async function getQueryDetails(
  queryId: string
): Promise<QueryDetailResponse> {
  return apiGet<QueryDetailResponse>(`/api/v1/queries/${queryId}`);
}

/**
 * Delete query by ID
 * 
 * @param queryId - Query ID (UUID)
 * @returns Promise that resolves when query is deleted
 */
export async function deleteQuery(queryId: string): Promise<void> {
  return apiDelete<void>(`/api/v1/queries/${queryId}`);
}


// Re-export ApiError for convenience
export { ApiError } from "./types";
