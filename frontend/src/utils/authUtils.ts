/**
 * Authentication utility functions for all user roles
 * Handles login, logout, and session checking with JWT tokens
 */

import axiosInstance from './axiosInstance';

// ==================== AXIOS INSTANCE ====================
// The axios instance is imported from './axiosInstance'.
// The interceptor is already configured in axiosInstance.ts - no need to duplicate it here.
// This prevents conflicts and ensures the comprehensive interceptor is used.

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

// ==================== SPECIFIC LOGIN FUNCTIONS ====================
// These are used by the login forms for better type safety and convenience

/**
 * Customer login with retry logic for token saving
 */
export async function customerLogin(
  email: string,
  password: string,
  hasTable?: boolean,
  hasRedirect?: boolean
): Promise<LoginResponse> {
  console.log('🔍 customerLogin called', { email, hasTable, hasRedirect });
  
  try {
    const response = await axiosInstance.post('/api/customer/login', {
      email,
      password,
      hasTable,
      hasRedirect,
    });

    const data = response.data;
    console.log('🔍 Customer login response received:', {
      status: response.status,
      hasData: !!data,
      success: data?.success,
      hasToken: !!data?.token,
      hasUser: !!data?.user,
      tokenLength: data?.token ? data.token.length : 0,
    });
  
    // ⭐ CRITICAL: Check localStorage availability
    if (typeof localStorage === 'undefined') {
      console.error('❌ CRITICAL: localStorage is not available!');
      throw new Error('localStorage is not available. Please check browser settings.');
    }
  
    // Check if response is valid
    if (!data || !data.success || !data.token || !data.user) {
      console.error('❌ CRITICAL: Invalid response from server!', data);
      throw new Error(data?.message || 'Invalid response from server');
    }

    // ⭐ CRITICAL: Clear old data FIRST
    clearAuthData();

    // ⭐ CRITICAL: Save token with retry logic
    await saveAuthData(data.token, 'customerUser', data.user);

    console.log('✅ Customer login successful - Token saved and verified');
    return data;
  } catch (error: any) {
    console.error('❌ Customer login error:', error);
    if (error.response) {
      throw new Error(error.response.data?.message || error.message || 'Login failed');
    }
    throw error;
  }
}

/**
 * Admin login with retry logic for token saving
 */
export async function adminLogin(
  usernameOrEmail: string,
  password: string
): Promise<LoginResponse> {
  console.log('🔍 adminLogin called', { usernameOrEmail });
  
  try {
    const response = await axiosInstance.post('/api/admin/login', {
      usernameOrEmail,
      password,
    });

    const data = response.data;
    console.log('🔍 Admin login response received:', {
      status: response.status,
      hasData: !!data,
      success: data?.success,
      hasToken: !!data?.token,
      hasUser: !!data?.user,
    });
  
    if (!data || !data.success || !data.token || !data.user) {
      console.error('❌ CRITICAL: Invalid response from server!', data);
      throw new Error(data?.message || 'Invalid response from server');
    }

    // ⭐ CRITICAL: Clear old data FIRST
    clearAuthData();

    // ⭐ CRITICAL: Save token with retry logic
    await saveAuthData(data.token, 'adminUser', data.user);

    console.log('✅ Admin login successful - Token saved and verified');
    return data;
  } catch (error: any) {
    console.error('❌ Admin login error:', error);
    if (error.response) {
      throw new Error(error.response.data?.message || error.message || 'Login failed');
    }
    throw error;
  }
}

/**
 * Staff login with retry logic for token saving
 */
export async function staffLogin(
  usernameOrEmail: string,
  password: string
): Promise<LoginResponse> {
  console.log('🔍 staffLogin called', { usernameOrEmail });
  
  try {
    const response = await axiosInstance.post('/api/staff/login', {
      usernameOrEmail,
      password,
    });

    const data = response.data;
    console.log('🔍 Staff login response received:', {
      status: response.status,
      hasData: !!data,
      success: data?.success,
      hasToken: !!data?.token,
      hasUser: !!data?.user,
    });
  
    if (!data || !data.success || !data.token || !data.user) {
      console.error('❌ CRITICAL: Invalid response from server!', data);
      throw new Error(data?.message || 'Invalid response from server');
    }

    // ⭐ CRITICAL: Clear old data FIRST
    clearAuthData();

    // ⭐ CRITICAL: Save token with retry logic
    await saveAuthData(data.token, 'staffUser', data.user);

    console.log('✅ Staff login successful - Token saved and verified');
    return data;
  } catch (error: any) {
    console.error('❌ Staff login error:', error);
    if (error.response) {
      throw new Error(error.response.data?.message || error.message || 'Login failed');
    }
    throw error;
  }
}

/**
 * Check customer session
 */
export async function checkCustomerSession(): Promise<SessionResponse> {
  const token = localStorage.getItem('authToken');
  if (!token) {
    console.warn('⚠️ checkCustomerSession: No token found in localStorage');
    return { success: false, authenticated: false };
  }
  
  try {
    const response = await axiosInstance.get('/api/customer/check-session', {
      headers: {
        'Authorization': `Bearer ${token.trim()}`,
        'authorization': `Bearer ${token.trim()}`,
        'AUTHORIZATION': `Bearer ${token.trim()}`
      },
      transformRequest: [(data, headers) => {
        if (headers) {
          headers['Authorization'] = `Bearer ${token.trim()}`;
          headers['authorization'] = `Bearer ${token.trim()}`;
        }
        return data;
      }]
    });
    return response.data;
  } catch (error: any) {
    console.error('❌ checkCustomerSession: Error', error);
    if (error.response?.status === 401 || error.response?.status === 403) {
      return { success: false, authenticated: false };
    }
    throw error;
  }
}

/**
 * Check admin session
 */
export async function checkAdminSession(): Promise<SessionResponse> {
  const token = localStorage.getItem('authToken');
  if (!token) {
    console.warn('⚠️ checkAdminSession: No token found in localStorage');
    return { success: false, authenticated: false };
  }
  
  try {
    const response = await axiosInstance.get('/api/admin/check-session', {
      headers: {
        'Authorization': `Bearer ${token.trim()}`,
        'authorization': `Bearer ${token.trim()}`
      }
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      return { success: false, authenticated: false };
    }
    throw error;
  }
}

/**
 * Check staff session
 */
export async function checkStaffSession(): Promise<SessionResponse> {
  const token = localStorage.getItem('authToken');
  if (!token) {
    console.warn('⚠️ checkStaffSession: No token found in localStorage');
    return { success: false, authenticated: false };
  }
  
  try {
    const response = await axiosInstance.get('/api/staff/check-session', {
      headers: {
        'Authorization': `Bearer ${token.trim()}`,
        'authorization': `Bearer ${token.trim()}`
      }
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      return { success: false, authenticated: false };
    }
    throw error;
  }
}

/**
 * Customer logout
 */
export async function customerLogout(): Promise<void> {
  await logout('customer');
}

/**
 * Admin logout
 */
export async function adminLogout(): Promise<void> {
  await logout('admin');
}

/**
 * Staff logout
 */
export async function staffLogout(): Promise<void> {
  await logout('staff');
}
