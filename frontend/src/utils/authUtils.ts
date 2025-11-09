/**
 * Authentication utility functions for all user roles
 * Handles login, logout, and session checking with JWT tokens
 */

import axiosInstance from './axiosInstance';

// Protect auth data from accidental localStorage.clear()
// Store a backup before any potential clear operations
if (typeof window !== 'undefined') {
  const originalClear = localStorage.clear;
  localStorage.clear = function() {
    console.warn('⚠️ localStorage.clear() called - protecting auth data');
    const authToken = localStorage.getItem('authToken');
    const customerUser = localStorage.getItem('customerUser');
    const adminUser = localStorage.getItem('adminUser');
    const staffUser = localStorage.getItem('staffUser');
    const loginTimestamp = localStorage.getItem('loginTimestamp');
    
    // Call original clear
    originalClear.call(localStorage);
    
    // Restore auth data if it existed
    if (authToken) {
      console.log('🛡️ Restoring auth data after localStorage.clear()');
      try {
        if (customerUser) localStorage.setItem('customerUser', customerUser);
        if (adminUser) localStorage.setItem('adminUser', adminUser);
        if (staffUser) localStorage.setItem('staffUser', staffUser);
        if (authToken) localStorage.setItem('authToken', authToken);
        if (loginTimestamp) localStorage.setItem('loginTimestamp', loginTimestamp);
      } catch (e) {
        console.error('Failed to restore auth data:', e);
      }
    }
  };
}

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
    // ⭐ CRITICAL: Store token and user info - GUARANTEED SAVE (same as customerLogin)
    console.log('💾 SAVING ADMIN TOKEN TO LOCALSTORAGE - CRITICAL STEP');
    console.log('Token length:', data.token.length);
    console.log('User data:', data.user);
    
    // Clear old data first
    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('adminUser');
      localStorage.removeItem('staffUser');
      localStorage.removeItem('customerUser');
      localStorage.removeItem('loginTimestamp');
    } catch (e) {
      console.warn('Could not clear old data:', e);
    }

    // Save with force - multiple synchronous attempts
    let savedToken: string | null = null;
    let savedUser: string | null = null;

    for (let attempt = 1; attempt <= 10; attempt++) {
      try {
        // Save
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('adminUser', JSON.stringify(data.user));
        localStorage.setItem('loginTimestamp', Date.now().toString());

        // Immediate verification
        savedToken = localStorage.getItem('authToken');
        savedUser = localStorage.getItem('adminUser');

        if (savedToken === data.token && savedUser) {
          console.log(`✅ ADMIN TOKEN SAVED SUCCESSFULLY on attempt ${attempt}`);
          break;
        } else {
          console.warn(`⚠️ Admin save attempt ${attempt} - Token mismatch. Retrying...`);
          if (attempt < 10) {
            await new Promise(resolve => setTimeout(resolve, 20));
          }
        }
      } catch (error: any) {
        console.error(`❌ Admin save attempt ${attempt} failed:`, error);
        if (attempt < 10) {
          await new Promise(resolve => setTimeout(resolve, 20));
        }
      }
    }

    // Final verification with multiple checks
    if (!savedToken || savedToken !== data.token) {
      // Last resort - try one more time with delay
      await new Promise(resolve => setTimeout(resolve, 100));
      savedToken = localStorage.getItem('authToken');
      savedUser = localStorage.getItem('adminUser');
    }

    // CRITICAL: If still not saved, throw error
    if (!savedToken || savedToken !== data.token) {
      console.error('❌ CRITICAL: Admin token could not be saved after all attempts!');
      throw new Error('CRITICAL: Failed to save authentication token. Please check browser settings or try a different browser.');
    }
    
    console.log('✅ Admin login successful - Token saved and verified');
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
    // ⭐ CRITICAL: Store token and user info - GUARANTEED SAVE (same as customerLogin)
    console.log('💾 SAVING STAFF TOKEN TO LOCALSTORAGE - CRITICAL STEP');
    console.log('Token length:', data.token.length);
    console.log('User data:', data.user);
    
    // Clear old data first
    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('adminUser');
      localStorage.removeItem('staffUser');
      localStorage.removeItem('customerUser');
      localStorage.removeItem('loginTimestamp');
    } catch (e) {
      console.warn('Could not clear old data:', e);
    }

    // Save with force - multiple synchronous attempts
    let savedToken: string | null = null;
    let savedUser: string | null = null;

    for (let attempt = 1; attempt <= 10; attempt++) {
      try {
        // Save
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('staffUser', JSON.stringify(data.user));
        localStorage.setItem('loginTimestamp', Date.now().toString());

        // Immediate verification
        savedToken = localStorage.getItem('authToken');
        savedUser = localStorage.getItem('staffUser');

        if (savedToken === data.token && savedUser) {
          console.log(`✅ STAFF TOKEN SAVED SUCCESSFULLY on attempt ${attempt}`);
          break;
        } else {
          console.warn(`⚠️ Staff save attempt ${attempt} - Token mismatch. Retrying...`);
          if (attempt < 10) {
            await new Promise(resolve => setTimeout(resolve, 20));
          }
        }
      } catch (error: any) {
        console.error(`❌ Staff save attempt ${attempt} failed:`, error);
        if (attempt < 10) {
          await new Promise(resolve => setTimeout(resolve, 20));
        }
      }
    }

    // Final verification with multiple checks
    if (!savedToken || savedToken !== data.token) {
      // Last resort - try one more time with delay
      await new Promise(resolve => setTimeout(resolve, 100));
      savedToken = localStorage.getItem('authToken');
      savedUser = localStorage.getItem('staffUser');
    }

    // CRITICAL: If still not saved, throw error
    if (!savedToken || savedToken !== data.token) {
      console.error('❌ CRITICAL: Staff token could not be saved after all attempts!');
      throw new Error('CRITICAL: Failed to save authentication token. Please check browser settings or try a different browser.');
    }
    
    console.log('✅ Staff login successful - Token saved and verified');
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
    tokenLength: data.token ? data.token.length : 0,
    tokenType: typeof data.token,
    tokenValue: data.token ? `${data.token.substring(0, 20)}...` : 'NULL',
    fullResponse: data
  });

  // Check if response is valid
  if (!data) {
    console.error('❌ CRITICAL: No response data received!');
    throw new Error('Invalid response from server');
  }

  if (!data.success) {
    console.error('❌ Login failed - success is false:', {
      message: data.message,
      data: data
    });
    throw new Error(data.message || 'Login failed');
  }

  if (!data.token) {
    console.error('❌ CRITICAL: No token in response!', {
      success: data.success,
      hasUser: !!data.user,
      responseKeys: Object.keys(data),
      fullResponse: data
    });
    throw new Error('No authentication token received from server');
  }

  if (!data.user) {
    console.error('❌ CRITICAL: No user data in response!', {
      success: data.success,
      hasToken: !!data.token,
      responseKeys: Object.keys(data)
    });
    throw new Error('No user data received from server');
  }

  // ⭐ CRITICAL: Store token and user info - GUARANTEED SAVE
  console.log('💾 SAVING TOKEN TO LOCALSTORAGE - CRITICAL STEP');
  console.log('Token length:', data.token.length);
  console.log('User data:', data.user);
  
  // Clear old data first
  try {
    localStorage.removeItem('authToken');
    localStorage.removeItem('customerUser');
    localStorage.removeItem('loginTimestamp');
  } catch (e) {
    console.warn('Could not clear old data:', e);
  }
  
  // Save with force - multiple synchronous attempts
  let savedToken: string | null = null;
  let savedUser: string | null = null;
  
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      // Save
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('customerUser', JSON.stringify(data.user));
      localStorage.setItem('loginTimestamp', Date.now().toString());
      
      // Immediate verification
      savedToken = localStorage.getItem('authToken');
      savedUser = localStorage.getItem('customerUser');
      
      if (savedToken === data.token && savedUser) {
        console.log(`✅ TOKEN SAVED SUCCESSFULLY on attempt ${attempt}`);
        break;
      } else {
        console.warn(`⚠️ Attempt ${attempt} - Token mismatch. Retrying...`);
        if (attempt < 10) {
          await new Promise(resolve => setTimeout(resolve, 20));
        }
      }
    } catch (error: any) {
      console.error(`❌ Save attempt ${attempt} failed:`, error);
      if (attempt < 10) {
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    }
  }
  
  // Final verification with multiple checks
  if (!savedToken || savedToken !== data.token) {
    // Last resort - try one more time with delay
    await new Promise(resolve => setTimeout(resolve, 100));
    savedToken = localStorage.getItem('authToken');
    savedUser = localStorage.getItem('customerUser');
  }
  
  // CRITICAL: If still not saved, throw error
  if (!savedToken || savedToken !== data.token) {
    console.error('❌ CRITICAL: Token could not be saved after all attempts!');
    console.error('localStorage state:', {
      available: typeof localStorage !== 'undefined',
      keys: Object.keys(localStorage),
      tokenExists: !!localStorage.getItem('authToken'),
      tokenValue: localStorage.getItem('authToken')?.substring(0, 20)
    });
    throw new Error('CRITICAL: Failed to save authentication token. Please check browser settings or try a different browser.');
  }
  
  // Final verification
  console.log('✅ TOKEN SAVE COMPLETE:', {
    tokenSaved: !!savedToken,
    tokenMatches: savedToken === data.token,
    userSaved: !!savedUser,
    tokenLength: savedToken?.length || 0
  });
  
  console.log('✅✅✅ LOGIN SUCCESSFUL - Token is in localStorage ✅✅✅');
  return data;
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
  // ⭐ CRITICAL: Verify token exists before making request
  const token = localStorage.getItem('authToken');
  
  console.log('🔍 checkCustomerSession called', {
    hasToken: !!token,
    tokenLength: token ? token.length : 0,
    tokenPreview: token ? token.substring(0, 30) + '...' : 'NO TOKEN',
    localStorageKeys: Object.keys(localStorage).filter(k => k.includes('auth') || k.includes('User') || k.includes('login'))
  });
  
  // If no token, return immediately without making request (silent - this is normal when not logged in)
  if (!token) {
    console.warn('⚠️ checkCustomerSession: No token found in localStorage');
    return { success: false, authenticated: false };
  }
  
  try {
    console.log('📡 checkCustomerSession: Making request with axiosInstance to /api/customer/check-session');
    console.log('📡 checkCustomerSession: Token will be added by axios interceptor');
    const response = await axiosInstance.get('/api/customer/check-session');
    console.log('✅ checkCustomerSession: Success', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ checkCustomerSession: Error', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    const errorStatus = error.response?.status;
    
    // 401/403 is expected when token is invalid/expired - handle silently
    if (errorStatus === 401 || errorStatus === 403) {
      // Clear auth data if we had a token (it's now invalid)
      if (token) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('customerUser');
        localStorage.removeItem('loginTimestamp');
      }
      return { success: false, authenticated: false };
    }
    
    // For other errors, log and return unauthenticated
    console.error('checkCustomerSession error:', error.message);
    return { success: false, authenticated: false };
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



