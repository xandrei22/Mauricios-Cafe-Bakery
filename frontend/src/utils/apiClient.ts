/**
 * API Client Utility
 * Automatically adds Authorization Bearer token to all API requests
 * This ensures iPhone and other mobile devices work without cookies
 */

export function getApiUrl(): string {
  return import.meta.env.VITE_API_URL || 'http://localhost:5001';
}

/**
 * Get authentication headers with Bearer token
 * Always includes token from localStorage if available
 */
export function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // ALWAYS include token if available (critical for mobile devices where cookies don't work)
  const token = localStorage.getItem('authToken');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Fetch wrapper that automatically adds auth headers
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const authHeaders = getAuthHeaders();
  
  // Merge with existing headers
  const headers = {
    ...authHeaders,
    ...(options.headers || {}),
  };

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Keep for desktop browsers
  });
}

/**
 * Make authenticated GET request
 */
export async function apiGet(endpoint: string): Promise<Response> {
  const API_URL = getApiUrl();
  return authenticatedFetch(`${API_URL}${endpoint}`, {
    method: 'GET',
  });
}

/**
 * Make authenticated POST request
 */
export async function apiPost(
  endpoint: string,
  body?: any
): Promise<Response> {
  const API_URL = getApiUrl();
  return authenticatedFetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Make authenticated PUT request
 */
export async function apiPut(
  endpoint: string,
  body?: any
): Promise<Response> {
  const API_URL = getApiUrl();
  return authenticatedFetch(`${API_URL}${endpoint}`, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Make authenticated DELETE request
 */
export async function apiDelete(endpoint: string): Promise<Response> {
  const API_URL = getApiUrl();
  return authenticatedFetch(`${API_URL}${endpoint}`, {
    method: 'DELETE',
  });
}




