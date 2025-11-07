/**
 * Axios instance with automatic JWT token injection
 * Handles token refresh, expiration, and automatic logout
 */

import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import { getApiUrl } from './apiConfig';

// ✅ Create axios instance
// Use JWT Authorization headers (not cookies)
const axiosInstance: AxiosInstance = axios.create({
  baseURL: getApiUrl() || 'https://mauricios-cafe-bakery.onrender.com',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
  withCredentials: true, // ✅ Allow credentials if backend uses cookies for certain routes
});

// ====================== REQUEST INTERCEPTOR ======================
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // ⭐ CRITICAL: Get token from localStorage
    const token = localStorage.getItem('authToken');
    
    // ⭐ CRITICAL: Always add Authorization header if token exists
    if (token) {
      // Ensure headers object exists
      if (!config.headers) {
        config.headers = {} as any;
      }
      
      // Set Authorization header - CRITICAL for authentication
      const authHeader = `Bearer ${token}`;
      config.headers['Authorization'] = authHeader;
      config.headers = config.headers; // Ensure headers are properly set
      
      // Log for debugging (only for check-session to reduce noise)
      if (config.url?.includes('check-session')) {
        console.log('🔑 Axios: Adding Authorization header to check-session', {
          hasToken: !!token,
          tokenLength: token.length,
          url: config.url
        });
      }
    } else {
      // Only warn for protected routes
      if (config.url?.includes('check-session') || config.url?.includes('/customer/')) {
        console.warn('⚠️ Axios: No token found for protected route', {
          url: config.url,
          localStorageKeys: Object.keys(localStorage)
        });
      }
    }

    // Allow sending credentials
    config.withCredentials = true;

    return config;
  },
  (error: AxiosError) => {
    console.error('❌ Axios request interceptor error:', error);
    return Promise.reject(error);
  }
);

// ====================== RESPONSE INTERCEPTOR ======================
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    // ✅ Return successful response
    return response;
  },
  (error: AxiosError) => {
    // Handle 401 Unauthorized (token expired or invalid)
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || 'unknown';
      const requestMethod = error.config?.method?.toUpperCase() || 'unknown';
      const hasAuthHeader = !!error.config?.headers?.Authorization;

      console.warn('⚠️ Axios: 401 Unauthorized', {
        url: requestUrl,
        method: requestMethod,
        hasAuthHeader,
        responseData: error.response?.data,
        tokenExists: !!localStorage.getItem('authToken'),
      });

      // Only clear auth data and redirect if this is NOT a check-session endpoint
      const isSessionCheck = requestUrl.includes('/check-session');

      if (!isSessionCheck) {
        // Clear auth data
        localStorage.removeItem('authToken');
        localStorage.removeItem('adminUser');
        localStorage.removeItem('staffUser');
        localStorage.removeItem('customerUser');
        localStorage.removeItem('loginTimestamp');

        // Redirect based on current route
        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/admin')) {
          window.location.href = '/admin/login';
        } else if (currentPath.startsWith('/staff')) {
          window.location.href = '/staff/login';
        } else if (currentPath.startsWith('/customer')) {
          window.location.href = '/customer-login';
        } else {
          window.location.href = '/login';
        }
      }
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.warn('⚠️ Axios: 403 Forbidden - Access denied', {
        url: error.config?.url,
        method: error.config?.method,
        responseData: error.response?.data,
      });
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
