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
  withCredentials: false // ❌ No cookies — critical for JWT
});

// ==========================================
// ✅ Request Interceptor - Automatically adds Authorization header
// ==========================================
console.log('🔧 REGISTERING AXIOS REQUEST INTERCEPTOR...');
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 🔍 DIAGNOSTIC: Log the full URL being requested
    const fullUrl = `${config.baseURL}${config.url}`;
    console.log('🌐 AXIOS REQUEST INTERCEPTOR FIRED:', {
      fullUrl,
      baseURL: config.baseURL,
      url: config.url,
      method: config.method,
      timestamp: new Date().toISOString()
    });
    
    // 🔑 Get token from localStorage (same key used by all user types)
    const token = localStorage.getItem('authToken');
    
    // 🔍 CRITICAL DEBUG: Log token retrieval for check-session requests
    if (config.url && config.url.includes('/check-session')) {
      console.log('🔍 AXIOS INTERCEPTOR - check-session request:', {
        url: config.url,
        method: config.method,
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
        tokenPreview: token ? token.substring(0, 30) + '...' : 'NO TOKEN',
        localStorageKeys: Object.keys(localStorage).filter(k => k.includes('auth') || k.includes('User') || k.includes('login')),
        allLocalStorageKeys: Object.keys(localStorage)
      });
    }

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
      
      // ⭐ CRITICAL: Set header using multiple methods to ensure it's set
      // Method 1: Direct assignment (most reliable)
      if (!config.headers) {
        config.headers = {} as any;
      }
      
      // ⭐ CRITICAL: Convert headers to plain object if needed (AxiosHeaders can be problematic)
      // AxiosHeaders sometimes doesn't properly set headers, so we force convert to plain object
      if (config.headers && typeof (config.headers as any).toJSON === 'function') {
        // It's an AxiosHeaders object - convert to plain object
        const plainHeaders = (config.headers as any).toJSON();
        config.headers = plainHeaders as any;
      }
      
      // Ensure headers is a plain object
      if (!config.headers || typeof config.headers !== 'object' || Array.isArray(config.headers)) {
        config.headers = {} as any;
      }
      
      // Force set as plain object property (most compatible)
      (config.headers as any)['Authorization'] = bearerToken;
      (config.headers as any)['authorization'] = bearerToken;
      
      // Method 2: Use AxiosHeaders API if available (but only if it's still AxiosHeaders)
      if (config.headers && typeof (config.headers as any).set === 'function') {
        (config.headers as any).set('Authorization', bearerToken);
        (config.headers as any).set('authorization', bearerToken);
      }
      
      // Method 3: Use common property access
      if (config.headers && typeof config.headers === 'object') {
        (config.headers as Record<string, string>)['Authorization'] = bearerToken;
        (config.headers as Record<string, string>)['authorization'] = bearerToken;
      }
      
      // Method 4: Force set using Object.defineProperty as last resort
      try {
        Object.defineProperty(config.headers, 'Authorization', {
          value: bearerToken,
          writable: true,
          enumerable: true,
          configurable: true
        });
      } catch (e) {
        // Ignore if it fails
      }
      
      // ⭐ VERIFY header was set
      const headerValue = (config.headers as any)?.['Authorization'] || 
                          (config.headers as any)?.['authorization'] ||
                          (config.headers as any)?.get?.('Authorization');
      
      if (!headerValue || !headerValue.includes('Bearer')) {
        console.error('❌ CRITICAL: Authorization header NOT SET after all attempts!', {
          headersType: typeof config.headers,
          headersKeys: Object.keys(config.headers || {}),
          hasSetMethod: typeof (config.headers as any)?.set === 'function',
          hasGetMethod: typeof (config.headers as any)?.get === 'function'
        });
      }
      
      // Always log for check-session requests
      if (config.url && config.url.includes('/check-session')) {
        // Verify header was actually set
        const finalHeaderValue = (config.headers as any)?.['Authorization'] || 
                                (config.headers as any)?.['authorization'] ||
                                (config.headers as any)?.get?.('Authorization') ||
                                (config.headers as any)?.get?.('authorization');
        
        console.log('✅ AXIOS REQUEST - Authorization header attached for check-session', {
          url: config.url,
          method: config.method,
          fullUrl: fullUrl,
          hasToken: true,
          tokenLength: token.length,
          tokenPreview: token.substring(0, 20) + '...',
          headerSet: !!finalHeaderValue,
          headerValue: finalHeaderValue || 'NOT SET',
          headerValuePreview: finalHeaderValue ? finalHeaderValue.substring(0, 30) + '...' : 'NOT SET',
          allHeaders: Object.keys(config.headers || {}),
          headersType: typeof config.headers,
          headersObject: config.headers
        });
        
        // CRITICAL: If header is still not set, force it one more time
        if (!finalHeaderValue) {
          console.error('❌ CRITICAL: Authorization header NOT SET after all attempts - FORCING SET');
          const bearerToken = `Bearer ${token.trim()}`;
          // Force set as plain object
          if (!config.headers) {
            config.headers = {} as any;
          }
          (config.headers as any)['Authorization'] = bearerToken;
          (config.headers as any)['authorization'] = bearerToken;
          console.log('🔧 FORCED Authorization header:', (config.headers as any)['Authorization']);
        }
      } else if (config.url && (
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
          fullUrl: fullUrl,
          localStorageKeys: Object.keys(localStorage).filter(k => k.includes('auth') || k.includes('User')),
          localStorageAuthToken: localStorage.getItem('authToken') ? 'EXISTS' : 'NOT FOUND'
        });
      }
    }

    // ⭐ CRITICAL: Final verification - log what we're actually sending
    if (config.url && config.url.includes('/check-session')) {
      const finalCheck = (config.headers as any)?.['Authorization'] || 
                        (config.headers as any)?.['authorization'] ||
                        (config.headers as any)?.get?.('Authorization');
      
      console.log('🔍 FINAL CHECK - Config being returned:', {
        url: config.url,
        hasAuthorization: !!finalCheck,
        authorizationValue: finalCheck ? finalCheck.substring(0, 30) + '...' : 'NOT SET',
        headersType: typeof config.headers,
        headersKeys: Object.keys(config.headers || {}),
        fullHeaders: config.headers
      });
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
