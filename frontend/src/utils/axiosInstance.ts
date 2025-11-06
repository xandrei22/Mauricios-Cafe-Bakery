/**
 * Axios instance with automatic JWT token injection
 * Handles token refresh, expiration, and automatic logout
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import { getApiUrl } from './apiConfig';

// Create axios instance
// IMPORTANT: withCredentials: false prevents cookies from being sent
// We use JWT tokens in Authorization header instead
const axiosInstance: AxiosInstance = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
  withCredentials: false, // CRITICAL: Don't send cookies - we use JWT tokens instead
});

// Request interceptor: Automatically add Authorization header
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('authToken');
    
    // Log all localStorage keys for debugging
    const allKeys = Object.keys(localStorage);
    console.log('🔍 Axios Interceptor - localStorage keys:', allKeys);
    console.log('🔍 Axios Interceptor - authToken exists:', !!token);
    console.log('🔍 Axios Interceptor - Request URL:', config.url);
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('✅ Axios: Added Authorization header to request:', config.url);
      console.log('✅ Axios: Token length:', token.length);
      console.log('✅ Axios: Token preview:', token.substring(0, 20) + '...');
      console.log('✅ Axios: Full Authorization header:', `Bearer ${token.substring(0, 30)}...`);
    } else {
      console.warn('⚠️ Axios: No token found in localStorage for request:', config.url);
      console.warn('⚠️ Axios: localStorage contents:', {
        hasAuthToken: !!localStorage.getItem('authToken'),
        hasAdminUser: !!localStorage.getItem('adminUser'),
        hasStaffUser: !!localStorage.getItem('staffUser'),
        hasCustomerUser: !!localStorage.getItem('customerUser'),
        allKeys: allKeys
      });
    }
    
    // Ensure withCredentials is false
    config.withCredentials = false;
    
    return config;
  },
  (error: AxiosError) => {
    console.error('❌ Axios request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor: Handle token expiration and errors
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    // Success response - just return it
    return response;
  },
  (error: AxiosError) => {
    // Handle 401 Unauthorized (token expired or invalid)
    if (error.response?.status === 401) {
      console.warn('⚠️ Axios: 401 Unauthorized - Token expired or invalid');
      
      // Clear auth data
      localStorage.removeItem('authToken');
      localStorage.removeItem('adminUser');
      localStorage.removeItem('staffUser');
      localStorage.removeItem('customerUser');
      localStorage.removeItem('loginTimestamp');
      
      // Redirect to appropriate login page based on current route
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/admin')) {
        window.location.href = '/admin/login';
      } else if (currentPath.startsWith('/staff')) {
        window.location.href = '/staff/login';
      } else {
        window.location.href = '/login';
      }
    }
    
    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.warn('⚠️ Axios: 403 Forbidden - Access denied');
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;

