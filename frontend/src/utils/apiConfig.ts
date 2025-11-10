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

  // In production, first respect explicit override if provided
  const envApiUrl = import.meta.env.VITE_API_URL;
  if (envApiUrl && envApiUrl.trim() !== '') {
    return envApiUrl.trim().replace(/\/+$/, '');
  }

  // If running on Vercel, use same-origin (empty base) to leverage rewrites
  const hostname = window.location.hostname || '';
  if (hostname.endsWith('.vercel.app')) {
    // All frontend calls should use relative paths like `/api/...`
    return '';
  }

  // Default: use direct Render backend URL
  return 'https://mauricios-cafe-bakery.onrender.com';
};

// Export for use in components
export const API_URL = getApiUrl();
