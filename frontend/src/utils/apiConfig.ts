/**
 * Centralized API configuration utility
 * Automatically detects environment and sets appropriate API URL
 */

export const getApiUrl = (): string => {
  // First, try to use the explicit VITE_API_URL if provided
  const envApiUrl = import.meta.env.VITE_API_URL;
  
  if (envApiUrl && envApiUrl.trim() !== '') {
    return envApiUrl;
  }
  
  // Check if we're in development (localhost)
  const isLocalhost = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';
  
  if (isLocalhost) {
    // In development, use localhost backend
    return 'http://localhost:5001';
  }

  // In production, route through the same origin using Vercel rewrite to avoid 3rd-party cookie blocking
  // All frontend code will call relative paths like `/api/...`
  return '';
};

// Export for use in components
export const API_URL = getApiUrl();
