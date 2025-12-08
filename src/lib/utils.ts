import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get API base URL from environment variables
 * 
 * Returns the base URL for the FastAPI backend, with fallback to localhost:8000
 * This function ensures type safety and provides a default value.
 * 
 * @returns API base URL string
 */
export function getApiBaseUrl(): string {
  const apiUrl = import.meta.env.PUBLIC_API_BASE_URL;
  
  if (!apiUrl) {
    // Fallback to default for development
    console.warn(
      'PUBLIC_API_BASE_URL is not set in environment variables. ' +
      'Using default: http://localhost:8000'
    );
    return 'http://localhost:8000';
  }
  
  return apiUrl;
}