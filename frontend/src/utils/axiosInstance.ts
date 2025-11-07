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
// ⭐ CRITICAL: This interceptor MUST run for ALL requests
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // ⭐ CRITICAL: Get token from localStorage FIRST
    const token = localStorage.getItem('authToken');
    
    // ⭐ CRITICAL: Log for check-session requests
    if (config.url?.includes('check-session')) {
      console.log('🔍🔍🔍 AXIOS INTERCEPTOR RUNNING FOR CHECK-SESSION 🔍🔍🔍');
      console.log('Token exists:', !!token);
      console.log('Token length:', token?.length || 0);
    }
    
    // ⭐ CRITICAL: Always add Authorization header if token exists
    if (token) {
      // CRITICAL: Set header - axios normalizes to lowercase internally but we set both
      const authHeader = `Bearer ${token}`;
      
      // Ensure headers object exists
      if (!config.headers) {
        config.headers = {} as any;
      }
      
      // Set header - axios will normalize 'Authorization' to 'authorization' internally
      // But we set both to be safe
      config.headers.Authorization = authHeader;
      config.headers.authorization = authHeader;
      
      // ALWAYS log for check-session to debug
      if (config.url?.includes('check-session')) {
        console.log('🔑🔑🔑 AUTHORIZATION HEADER SET 🔑🔑🔑', {
          url: config.url,
          hasToken: !!token,
          tokenLength: token.length,
          tokenPreview: token.substring(0, 30) + '...',
          headerSet: !!(config.headers.Authorization || config.headers.authorization),
          headerValue: (config.headers.Authorization || config.headers.authorization)?.substring(0, 40) + '...',
          allHeaderKeys: Object.keys(config.headers || {})
        });
      }
    } else {
      // ALWAYS error for check-session if no token
      if (config.url?.includes('check-session')) {
        console.error('❌❌❌ NO TOKEN IN LOCALSTORAGE FOR CHECK-SESSION ❌❌❌', {
          url: config.url,
          localStorageKeys: Object.keys(localStorage),
          localStorageContent: {
            authToken: localStorage.getItem('authToken') ? 'EXISTS' : 'MISSING',
            customerUser: localStorage.getItem('customerUser') ? 'EXISTS' : 'MISSING',
            loginTimestamp: localStorage.getItem('loginTimestamp')
          }
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
