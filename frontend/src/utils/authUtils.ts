/**
 * Authentication utility functions for all user roles
 * Handles login, logout, and session checking with JWT tokens
 */

import axiosInstance from './axiosInstance';

// Types
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

// ==================== ADMIN AUTH ====================

/**
 * Admin login
 */
export async function adminLogin(
  usernameOrEmail: string,
  password: string
): Promise<LoginResponse> {
  const response = await axiosInstance.post('/api/admin/login', {
    username: usernameOrEmail,
    password,
  });

  const data = response.data;

  if (data.success && data.token && data.user) {
    // Store token and user info
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('adminUser', JSON.stringify(data.user));
    localStorage.setItem('loginTimestamp', Date.now().toString());
    
    console.log('✅ Admin login successful - Token saved');
    return data;
  }

  throw new Error(data.message || 'Login failed');
}

/**
 * Admin logout
 */
export async function adminLogout(): Promise<void> {
  try {
    await axiosInstance.post('/api/admin/logout');
  } catch (error) {
    console.warn('Logout API call failed:', error);
  } finally {
    // Always clear local storage
    localStorage.removeItem('authToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('loginTimestamp');
    console.log('✅ Admin logged out - localStorage cleared');
  }
}

/**
 * Check admin session
 */
export async function checkAdminSession(): Promise<SessionResponse> {
  try {
    const response = await axiosInstance.get('/api/admin/check-session');
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token expired or invalid
      localStorage.removeItem('authToken');
      localStorage.removeItem('adminUser');
      localStorage.removeItem('loginTimestamp');
      return { success: false, authenticated: false };
    }
    throw error;
  }
}

// ==================== STAFF AUTH ====================

/**
 * Staff login
 */
export async function staffLogin(
  usernameOrEmail: string,
  password: string
): Promise<LoginResponse> {
  const response = await axiosInstance.post('/api/staff/login', {
    username: usernameOrEmail,
    password,
  });

  const data = response.data;

  if (data.success && data.token && data.user) {
    // Store token and user info
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('staffUser', JSON.stringify(data.user));
    localStorage.setItem('loginTimestamp', Date.now().toString());
    
    console.log('✅ Staff login successful - Token saved');
    return data;
  }

  throw new Error(data.message || 'Login failed');
}

/**
 * Staff logout
 */
export async function staffLogout(): Promise<void> {
  try {
    await axiosInstance.post('/api/staff/logout');
  } catch (error) {
    console.warn('Logout API call failed:', error);
  } finally {
    // Always clear local storage
    localStorage.removeItem('authToken');
    localStorage.removeItem('staffUser');
    localStorage.removeItem('loginTimestamp');
    console.log('✅ Staff logged out - localStorage cleared');
  }
}

/**
 * Check staff session
 */
export async function checkStaffSession(): Promise<SessionResponse> {
  try {
    const response = await axiosInstance.get('/api/staff/check-session');
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token expired or invalid
      localStorage.removeItem('authToken');
      localStorage.removeItem('staffUser');
      localStorage.removeItem('loginTimestamp');
      return { success: false, authenticated: false };
    }
    throw error;
  }
}

// ==================== CUSTOMER AUTH ====================

/**
 * Customer login
 */
export async function customerLogin(
  email: string,
  password: string,
  hasTable?: boolean,
  hasRedirect?: boolean
): Promise<LoginResponse> {
  console.log('🔍 customerLogin called', { email, hasTable, hasRedirect });
  
  const response = await axiosInstance.post('/api/customer/login', {
    email,
    password,
    hasTable,
    hasRedirect,
  });

  const data = response.data;
  console.log('🔍 Login response received', {
    success: data.success,
    hasToken: !!data.token,
    hasUser: !!data.user,
    tokenLength: data.token ? data.token.length : 0
  });

  if (data.success && data.token && data.user) {
    // CRITICAL: Store token and user info IMMEDIATELY
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('customerUser', JSON.stringify(data.user));
    localStorage.setItem('loginTimestamp', Date.now().toString());
    
    // Verify storage immediately
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('customerUser');
    
    console.log('✅ Customer login - Token storage verification:', {
      tokenSaved: !!savedToken,
      tokenMatches: savedToken === data.token,
      userSaved: !!savedUser,
      tokenLength: savedToken ? savedToken.length : 0
    });
    
    if (!savedToken || savedToken !== data.token) {
      console.error('❌ CRITICAL: Token not saved correctly!', {
        expectedLength: data.token.length,
        actualLength: savedToken ? savedToken.length : 0
      });
      throw new Error('Failed to save authentication token');
    }
    
    console.log('✅ Customer login successful - Token saved and verified');
    return data;
  }

  console.error('❌ Login failed - invalid response:', {
    success: data.success,
    hasToken: !!data.token,
    hasUser: !!data.user,
    message: data.message
  });
  throw new Error(data.message || 'Login failed');
}

/**
 * Customer logout
 */
export async function customerLogout(): Promise<void> {
  try {
    await axiosInstance.post('/api/customer/logout');
  } catch (error) {
    console.warn('Logout API call failed:', error);
  } finally {
    // Always clear local storage
    localStorage.removeItem('authToken');
    localStorage.removeItem('customerUser');
    localStorage.removeItem('loginTimestamp');
    console.log('✅ Customer logged out - localStorage cleared');
  }
}

/**
 * Check customer session
 */
export async function checkCustomerSession(): Promise<SessionResponse> {
  // Verify token exists before making request
  const token = localStorage.getItem('authToken');
  console.log('🔍 checkCustomerSession called', {
    tokenExists: !!token,
    tokenLength: token ? token.length : 0,
    timestamp: new Date().toISOString()
  });
  
  if (!token) {
    console.warn('⚠️ checkCustomerSession: No token in localStorage, returning unauthenticated');
    return { success: false, authenticated: false };
  }
  
  try {
    console.log('🔍 Making check-session request with axiosInstance');
    const response = await axiosInstance.get('/api/customer/check-session');
    console.log('✅ check-session response received:', {
      authenticated: response.data?.authenticated,
      hasUser: !!response.data?.user
    });
    return response.data;
  } catch (error: any) {
    console.error('❌ checkCustomerSession error:', {
      status: error.response?.status,
      message: error.message,
      responseData: error.response?.data,
      config: error.config ? {
        url: error.config.url,
        method: error.config.method,
        headers: Object.keys(error.config.headers || {})
      } : null
    });
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token expired or invalid
      console.warn('⚠️ Token expired or invalid, clearing auth data');
      localStorage.removeItem('authToken');
      localStorage.removeItem('customerUser');
      localStorage.removeItem('loginTimestamp');
      return { success: false, authenticated: false };
    }
    throw error;
  }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get current user from localStorage
 */
export function getCurrentUser(): any {
  const adminUser = localStorage.getItem('adminUser');
  const staffUser = localStorage.getItem('staffUser');
  const customerUser = localStorage.getItem('customerUser');
  
  if (adminUser) return JSON.parse(adminUser);
  if (staffUser) return JSON.parse(staffUser);
  if (customerUser) return JSON.parse(customerUser);
  
  return null;
}

/**
 * Get current user role
 */
export function getCurrentUserRole(): 'admin' | 'staff' | 'customer' | null {
  const user = getCurrentUser();
  return user?.role || null;
}

/**
 * Check if user is authenticated (has token)
 */
export function isAuthenticated(): boolean {
  return !!localStorage.getItem('authToken');
}

/**
 * Clear all auth data
 */
export function clearAuthData(): void {
  localStorage.removeItem('authToken');
  localStorage.removeItem('adminUser');
  localStorage.removeItem('staffUser');
  localStorage.removeItem('customerUser');
  localStorage.removeItem('loginTimestamp');
}



