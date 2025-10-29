/**
 * Centralized API configuration utility
 * Automatically detects environment and sets appropriate API URL
 */

export const getApiUrl = (): string => {
  // Detect localhost development
  const isLocalhost = window.location.hostname === 'localhost' ||
                      window.location.hostname === '127.0.0.1';

  if (isLocalhost) {
    // In development, allow explicit override or fall back to local backend
    const envApiUrl = import.meta.env.VITE_API_URL;
    if (envApiUrl && envApiUrl.trim() !== '') return envApiUrl;
    return 'http://localhost:5001';
  }

  // In production (any non-localhost), ALWAYS use same-origin and rely on Vercel rewrites
  // This avoids third-party cookie blocking on mobile browsers
  return '';
};

// Export for use in components
export const API_URL = getApiUrl();
