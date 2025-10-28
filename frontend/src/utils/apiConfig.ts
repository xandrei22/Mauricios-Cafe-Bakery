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
  
  // Check if we're accessing from mobile/LAN IP
  const isMobileAccess = window.location.hostname.startsWith('192.168.') ||
                        window.location.hostname.startsWith('10.') ||
                        window.location.hostname.startsWith('172.');
  
  if (isMobileAccess) {
    // For mobile access, use the same hostname but backend port
    return `http://${window.location.hostname}:5001`;
  }
  
  if (isLocalhost) {
    // In development, use localhost backend
    return 'http://localhost:5001';
  }
  
  // In production on Vercel, use the Render backend URL directly
  // This avoids proxy issues and ensures requests go directly to the backend
  return 'https://mauricios-cafe-bakery.onrender.com';
};

// Export for use in components
export const API_URL = getApiUrl();
