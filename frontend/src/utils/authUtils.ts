/**
 * Authentication utility functions for all user roles
 * Handles login, logout, and session checking with JWT tokens
 */

import axiosInstance from './axiosInstance'

// ==================== AXIOS INSTANCE ====================
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://mauricios-cafe-bakery.onrender.com',
  headers: { 'Content-Type': 'application/json' },
});

// Automatically attach JWT token to all requests
axiosInstance.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token && config.headers) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  response => response,
  error => {
    console.error('Axios response error:', error);
    return Promise.reject(error);
  }
);

export default axiosInstance;

// ==================== TYPES ====================
export interface LoginResponse {
  success: boolean;
  token: string;
  user: {
    id: number;
    username?: string;
    email: string;
    name?: string;
    fullName?: string;
    role: 'admin' | 'staff' | 'customer';
  };
  message?: string;
}

export interface SessionResponse {
  success: boolean;
  authenticated: boolean;
  user?: {
    id: number;
    username?: string;
    email: string;
    name?: string;
    fullName?: string;
    role: 'admin' | 'staff' | 'customer';
  };
}

// ==================== LOCALSTORAGE UTILS ====================
export function getCurrentUser(): any {
  const adminUser = localStorage.getItem('adminUser');
  const staffUser = localStorage.getItem('staffUser');
  const customerUser = localStorage.getItem('customerUser');
  if (adminUser) return JSON.parse(adminUser);
  if (staffUser) return JSON.parse(staffUser);
  if (customerUser) return JSON.parse(customerUser);
  return null;
}

export function getCurrentUserRole(): 'admin' | 'staff' | 'customer' | null {
  const user = getCurrentUser();
  return user?.role || null;
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('authToken');
}

export function clearAuthData(): void {
  localStorage.removeItem('authToken');
  localStorage.removeItem('adminUser');
  localStorage.removeItem('staffUser');
  localStorage.removeItem('customerUser');
  localStorage.removeItem('loginTimestamp');
}

// Save token & user info with retry logic
async function saveAuthData(token: string, userKey: string, user: any) {
  let savedToken: string | null = null;
  let savedUser: string | null = null;
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      localStorage.setItem('authToken', token);
      localStorage.setItem(userKey, JSON.stringify(user));
      localStorage.setItem('loginTimestamp', Date.now().toString());
      savedToken = localStorage.getItem('authToken');
      savedUser = localStorage.getItem(userKey);
      if (savedToken === token && savedUser) break;
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch {}
  }
  if (!savedToken || savedToken !== token) throw new Error('Failed to save auth token');
}

// ==================== LOGIN / LOGOUT / SESSION ====================
export async function login(role: 'admin' | 'staff' | 'customer', credentials: any): Promise<LoginResponse> {
  let endpoint = '';
  let userKey = '';
  switch (role) {
    case 'admin':
      endpoint = '/api/admin/login';
      userKey = 'adminUser';
      break;
    case 'staff':
      endpoint = '/api/staff/login';
      userKey = 'staffUser';
      break;
    case 'customer':
      endpoint = '/api/customer/login';
      userKey = 'customerUser';
      break;
  }

  try {
    const response = await axiosInstance.post(endpoint, credentials);
    const data = response.data as LoginResponse;

    if (!data.success || !data.token || !data.user) {
      throw new Error(data.message || 'Login failed');
    }

    clearAuthData();
    await saveAuthData(data.token, userKey, data.user);

    return data;
  } catch (error: any) {
    console.error(`${role} login error:`, error);
    if (error.response?.data?.message) throw new Error(error.response.data.message);
    throw error;
  }
}

export async function logout(role: 'admin' | 'staff' | 'customer') {
  let endpoint = '';
  switch (role) {
    case 'admin': endpoint = '/api/admin/logout'; break;
    case 'staff': endpoint = '/api/staff/logout'; break;
    case 'customer': endpoint = '/api/customer/logout'; break;
  }
  try {
    await axiosInstance.post(endpoint);
  } catch (error) {
    console.warn(`${role} logout API call failed:`, error);
  } finally {
    clearAuthData();
    console.log(`${role} logged out`);
  }
}

export async function checkSession(role: 'admin' | 'staff' | 'customer'): Promise<SessionResponse> {
  let endpoint = '';
  switch (role) {
    case 'admin': endpoint = '/api/admin/check-session'; break;
    case 'staff': endpoint = '/api/staff/check-session'; break;
    case 'customer': endpoint = '/api/customer/check-session'; break;
  }

  const token = localStorage.getItem('authToken');
  if (!token) return { success: false, authenticated: false };

  try {
    const response = await axiosInstance.get(endpoint);
    return response.data as SessionResponse;
  } catch (error: any) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      clearAuthData();
      return { success: false, authenticated: false };
    }
    throw error;
  }
}
