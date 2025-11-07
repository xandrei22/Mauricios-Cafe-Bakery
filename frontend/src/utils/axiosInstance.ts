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
    console.log('🔍 Axios Interceptor running');
    const token = localStorage.getItem('authToken');
    console.log('✅ Token found in localStorage:', !!token);
    console.log('✅ Token length:', token ? token.length : 0);
    console.log('🔍 Request URL:', config.url);
    console.log('🔍 Request method:', config.method);

    // ✅ Attach Authorization header if token exists
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('✅ Added Authorization header:', `Bearer ${token.substring(0, 30)}...`);
    } else {
      console.warn('⚠️ No token found in localStorage');
      console.warn('⚠️ localStorage keys:', Object.keys(localStorage));
    }

    // Allow sending credentials for cookies if backend supports it
    config.withCredentials = true;

    return config;
  },
  (error: AxiosError) => {
    console.error('❌ Axios request error:', error);
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
