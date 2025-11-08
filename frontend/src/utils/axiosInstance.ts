/**
 * ✅ Secure Axios instance for JWT-only authentication
 * - Automatically injects JWT from localStorage
 * - Prevents CORS issues by disabling cookies
 * - Handles 401/403 and redirects per user role
 */

import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  type AxiosError,
  type AxiosResponse
} from 'axios';
import { getApiUrl } from './apiConfig';

// ==========================================
// ✅ Create axios instance (NO CREDENTIALS)
// ==========================================
const apiUrl = getApiUrl() || 'https://mauricios-cafe-bakery.onrender.com';
console.log('🌐 Axios instance configured with API URL:', apiUrl);
console.log('🌐 VITE_API_URL from env:', import.meta.env.VITE_API_URL || 'NOT SET');
console.log('🌐 Current hostname:', window.location.hostname);

const axiosInstance: AxiosInstance = axios.create({
  baseURL: apiUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
  withCredentials: false, // ❌ No cookies — critical for JWT
});

// ==========================================
// ✅ Request Interceptor - Automatically adds Authorization header
// ==========================================
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 🔍 DIAGNOSTIC: Log the full URL being requested
    const fullUrl = `${config.baseURL}${config.url}`;
    console.log('🌐 AXIOS REQUEST URL:', fullUrl);
    console.log('🌐 Base URL:', config.baseURL);
    console.log('🌐 Request URL:', config.url);
    
    // 🔑 Get token from localStorage (same key used by all user types)
    const token = localStorage.getItem('authToken');

    // 🚫 Ensure no cookies or credentials are ever sent
    config.withCredentials = false;
    delete (config as any).credentials;

    // 🔑 Add Authorization header if token exists
    if (token && token.trim()) {
      // Ensure headers object exists
      if (!config.headers) {
        config.headers = {} as any;
      }
      
      // Set Authorization header (works with both AxiosHeaders and plain objects)
      const bearerToken = `Bearer ${token.trim()}`;
      config.headers['Authorization'] = bearerToken;
      config.headers['authorization'] = bearerToken; // lowercase fallback for compatibility
      
      // Debug log for protected endpoints
      if (config.url && (
        config.url.includes('/check-session') || 
        config.url.includes('/admin/') || 
        config.url.includes('/staff/') || 
        config.url.includes('/customer/') ||
        config.url.includes('/api/orders') ||
        config.url.includes('/api/menu') ||
        config.url.includes('/api/loyalty')
      )) {
        console.log('✅ AXIOS REQUEST - Authorization header attached', {
          url: config.url,
          method: config.method,
          hasToken: true,
          tokenLength: token.length,
          tokenPreview: token.substring(0, 20) + '...',
          headerSet: !!config.headers['Authorization']
        });
      }
    } else {
      // Warn if protected endpoint is called without token
      if (config.url && (
        config.url.includes('/check-session') || 
        config.url.includes('/admin/') || 
        config.url.includes('/staff/') ||
        (config.url.includes('/customer/') && !config.url.includes('/customer/signup'))
      )) {
        console.warn('⚠️ AXIOS REQUEST - No token found for protected endpoint', {
          url: config.url,
          method: config.method,
          localStorageKeys: Object.keys(localStorage).filter(k => k.includes('auth') || k.includes('User'))
        });
      }
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// ==========================================
// ✅ Response Interceptor
// ==========================================
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';
    const baseURL = error.config?.baseURL || '';

    // Handle network errors (CORS, connection refused, etc.)
    if (!error.response) {
      const isNetworkError = error.code === 'ERR_NETWORK' || 
                             error.message?.includes('Network Error') ||
                             error.message?.includes('CORS') ||
                             error.message?.includes('Failed to fetch');
      
      if (isNetworkError) {
        console.error('🚨 Network/CORS Error:', {
          message: error.message,
          code: error.code,
          url: requestUrl,
          baseURL: baseURL,
          fullUrl: baseURL + requestUrl,
          apiUrl: getApiUrl()
        });
        
        // Create a more descriptive error for network issues
        const networkError = new Error('Cannot connect to server. Please check your connection and try again.');
        (networkError as any).isNetworkError = true;
        (networkError as any).originalError = error;
        return Promise.reject(networkError);
      }
    }

    if (status === 401) {
      console.warn('⚠️ 401 Unauthorized', requestUrl);

      // Do not auto-logout on session check
      const isSessionCheck = requestUrl.includes('/check-session');
      if (!isSessionCheck) {
        // Clear local storage
        ['authToken', 'adminUser', 'staffUser', 'customerUser', 'loginTimestamp']
          .forEach(key => localStorage.removeItem(key));

        // Redirect user to appropriate login
        const path = window.location.pathname;
        if (path.startsWith('/admin')) {
          window.location.href = '/admin/login';
        } else if (path.startsWith('/staff')) {
          window.location.href = '/staff/login';
        } else if (path.startsWith('/customer')) {
          window.location.href = '/customer-login';
        } else {
          window.location.href = '/login';
        }
      }
    }

    if (status === 403) {
      console.warn('🚫 403 Forbidden', {
        url: error.config?.url,
        method: error.config?.method,
      });
    }

    return Promise.reject(error);
  }
);

// ==========================================
// ✅ Debug confirmation
// ==========================================
console.log('✅ Secure Axios instance initialized (JWT-only, no credentials)');

export default axiosInstance;
