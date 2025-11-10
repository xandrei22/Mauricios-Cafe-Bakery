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
  console.log('🔍 adminLogin called - making request to /api/admin/login');
  
  try {
    const response = await axiosInstance.post('/api/admin/login', {
      username: usernameOrEmail,
      password,
    });

    console.log('🔍 Admin login response received:', {
      status: response.status,
      hasData: !!response.data,
      dataKeys: response.data ? Object.keys(response.data) : [],
      success: response.data?.success,
      hasToken: !!response.data?.token,
      hasUser: !!response.data?.user,
      tokenType: typeof response.data?.token,
      tokenValue: response.data?.token ? `${response.data.token.substring(0, 30)}...` : 'NULL',
      fullResponse: response.data
    });

    const data = response.data;

    // ⭐ CRITICAL: Check if response has required fields
    if (!data) {
      console.error('❌ CRITICAL: No response data!');
      throw new Error('No response data from server');
    }

    if (!data.success) {
      console.error('❌ Login failed - success is false:', data.message || 'Unknown error');
      throw new Error(data.message || 'Login failed');
    }

    if (!data.token) {
      console.error('❌ CRITICAL: No token in response!', {
        responseKeys: Object.keys(data),
        fullResponse: data
      });
      throw new Error('No authentication token received from server');
    }

    if (!data.user) {
      console.error('❌ CRITICAL: No user data in response!');
      throw new Error('No user data received from server');
    }

    // ⭐ CRITICAL: Verify token is a string
    if (typeof data.token !== 'string' || data.token.trim().length === 0) {
      console.error('❌ CRITICAL: Token is not a valid string!', {
        tokenType: typeof data.token,
        tokenLength: data.token?.length || 0
      });
      throw new Error('Invalid token format received from server');
    }

    // ⭐ CRITICAL: Clear old data FIRST
    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('adminUser');
      localStorage.removeItem('staffUser');
      localStorage.removeItem('customerUser');
      localStorage.removeItem('loginTimestamp');
    } catch (e) {
      console.warn('Could not clear old data:', e);
    }

    // ⭐ CRITICAL: SAVE TOKEN IMMEDIATELY - BEFORE ANY OTHER OPERATIONS
    console.log('💾 IMMEDIATELY SAVING ADMIN TOKEN TO LOCALSTORAGE');
    console.log('Token received:', data.token.substring(0, 50) + '...');
    console.log('Token length:', data.token.length);
    
    try {
      // IMMEDIATE SAVE - no waiting, no retries, just save it NOW
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('adminUser', JSON.stringify(data.user));
      localStorage.setItem('loginTimestamp', Date.now().toString());
      
      // IMMEDIATE VERIFICATION
      const immediateCheck = localStorage.getItem('authToken');
      console.log('✅ IMMEDIATE SAVE CHECK:', {
        saved: !!immediateCheck,
        matches: immediateCheck === data.token,
        length: immediateCheck?.length || 0
      });
      
      if (!immediateCheck || immediateCheck !== data.token) {
        console.error('❌ IMMEDIATE SAVE FAILED - trying again...');
        // Try one more time
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('adminUser', JSON.stringify(data.user));
        localStorage.setItem('loginTimestamp', Date.now().toString());
      }
    } catch (saveError: any) {
      console.error('❌ CRITICAL: Immediate save failed:', saveError);
      throw new Error(`Failed to save token: ${saveError.message}`);
    }

    if (data.success && data.token && data.user) {
    // ⭐ CRITICAL: Store token and user info - GUARANTEED SAVE (same as customerLogin)
    console.log('💾 SAVING ADMIN TOKEN TO LOCALSTORAGE - CRITICAL STEP (retry logic)');
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
    } else {
      console.error('❌ CRITICAL: Response validation failed!', {
        success: data.success,
        hasToken: !!data.token,
        hasUser: !!data.user
      });
      throw new Error('Invalid response format from server');
    }
  } catch (error: any) {
    console.error('❌ Admin login error:', error);
    if (error.response) {
      console.error('Response error:', {
        status: error.response.status,
        data: error.response.data
      });
      throw new Error(error.response.data?.message || error.message || 'Login failed');
    }
    throw error;
  }
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
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    console.warn('⚠️ checkAdminSession: No token found in localStorage');
    return { success: false, authenticated: false };
  }
  
  try {
    // ⭐ CRITICAL: Explicitly send Authorization header (even though interceptor should handle it)
    const bearerToken = `Bearer ${token.trim()}`;
    const response = await axiosInstance.get('/api/admin/check-session', {
      headers: {
        'Authorization': bearerToken,
        'authorization': bearerToken // lowercase fallback
      }
    });
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
  console.log('🔍 staffLogin called - making request to /api/staff/login');
  
  try {
    const response = await axiosInstance.post('/api/staff/login', {
      username: usernameOrEmail,
      password,
    });

    console.log('🔍 Staff login response received:', {
      status: response.status,
      hasData: !!response.data,
      dataKeys: response.data ? Object.keys(response.data) : [],
      success: response.data?.success,
      hasToken: !!response.data?.token,
      hasUser: !!response.data?.user,
      tokenType: typeof response.data?.token,
      tokenValue: response.data?.token ? `${response.data.token.substring(0, 30)}...` : 'NULL',
      fullResponse: response.data
    });

    const data = response.data;

    // ⭐ CRITICAL: Check if response has required fields
    if (!data) {
      console.error('❌ CRITICAL: No response data!');
      throw new Error('No response data from server');
    }

    if (!data.success) {
      console.error('❌ Login failed - success is false:', data.message || 'Unknown error');
      throw new Error(data.message || 'Login failed');
    }

    if (!data.token) {
      console.error('❌ CRITICAL: No token in response!', {
        responseKeys: Object.keys(data),
        fullResponse: data
      });
      throw new Error('No authentication token received from server');
    }

    if (!data.user) {
      console.error('❌ CRITICAL: No user data in response!');
      throw new Error('No user data received from server');
    }

    // ⭐ CRITICAL: Verify token is a string
    if (typeof data.token !== 'string' || data.token.trim().length === 0) {
      console.error('❌ CRITICAL: Token is not a valid string!', {
        tokenType: typeof data.token,
        tokenLength: data.token?.length || 0
      });
      throw new Error('Invalid token format received from server');
    }

    // ⭐ CRITICAL: Clear old data FIRST
    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('adminUser');
      localStorage.removeItem('staffUser');
      localStorage.removeItem('customerUser');
      localStorage.removeItem('loginTimestamp');
    } catch (e) {
      console.warn('Could not clear old data:', e);
    }

    // ⭐ CRITICAL: SAVE TOKEN IMMEDIATELY - BEFORE ANY OTHER OPERATIONS
    console.log('💾 IMMEDIATELY SAVING STAFF TOKEN TO LOCALSTORAGE');
    console.log('Token received:', data.token.substring(0, 50) + '...');
    console.log('Token length:', data.token.length);
    
    try {
      // IMMEDIATE SAVE - no waiting, no retries, just save it NOW
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('staffUser', JSON.stringify(data.user));
      localStorage.setItem('loginTimestamp', Date.now().toString());
      
      // IMMEDIATE VERIFICATION
      const immediateCheck = localStorage.getItem('authToken');
      console.log('✅ IMMEDIATE SAVE CHECK:', {
        saved: !!immediateCheck,
        matches: immediateCheck === data.token,
        length: immediateCheck?.length || 0
      });
      
      if (!immediateCheck || immediateCheck !== data.token) {
        console.error('❌ IMMEDIATE SAVE FAILED - trying again...');
        // Try one more time
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('staffUser', JSON.stringify(data.user));
        localStorage.setItem('loginTimestamp', Date.now().toString());
      }
    } catch (saveError: any) {
      console.error('❌ CRITICAL: Immediate save failed:', saveError);
      throw new Error(`Failed to save token: ${saveError.message}`);
    }

    if (data.success && data.token && data.user) {
    // ⭐ CRITICAL: Store token and user info - GUARANTEED SAVE (same as customerLogin)
    console.log('💾 SAVING STAFF TOKEN TO LOCALSTORAGE - CRITICAL STEP (retry logic)');
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
    } else {
      console.error('❌ CRITICAL: Response validation failed!', {
        success: data.success,
        hasToken: !!data.token,
        hasUser: !!data.user
      });
      throw new Error('Invalid response format from server');
    }
  } catch (error: any) {
    console.error('❌ Staff login error:', error);
    if (error.response) {
      console.error('Response error:', {
        status: error.response.status,
        data: error.response.data
      });
      throw new Error(error.response.data?.message || error.message || 'Login failed');
    }
    throw error;
  }
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
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    console.warn('⚠️ checkStaffSession: No token found in localStorage');
    return { success: false, authenticated: false };
  }
  
  try {
    // ⭐ CRITICAL: Explicitly send Authorization header (even though interceptor should handle it)
    const bearerToken = `Bearer ${token.trim()}`;
    const response = await axiosInstance.get('/api/staff/check-session', {
      headers: {
        'Authorization': bearerToken,
        'authorization': bearerToken // lowercase fallback
      }
    });
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
    dataKeys: data ? Object.keys(data) : [],
    success: data?.success,
    hasToken: !!data?.token,
    hasUser: !!data?.user,
    tokenLength: data?.token ? data.token.length : 0,
    tokenType: typeof data?.token,
    tokenValue: data?.token ? `${data.token.substring(0, 30)}...` : 'NULL',
    fullResponse: data
  });
  
  // ⭐ CRITICAL: Check localStorage availability BEFORE trying to save
  if (typeof localStorage === 'undefined') {
    console.error('❌ CRITICAL: localStorage is not available!');
    throw new Error('localStorage is not available. Please check browser settings or try a different browser.');
  }
  
  // Test localStorage write capability
  try {
    const testKey = '__localStorage_test__';
    localStorage.setItem(testKey, 'test');
    const testValue = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    if (testValue !== 'test') {
      console.error('❌ CRITICAL: localStorage write test failed!');
      throw new Error('localStorage is not writable. Please check browser settings.');
    }
    console.log('✅ localStorage is available and writable');
  } catch (testError: any) {
    console.error('❌ CRITICAL: localStorage test failed:', testError);
    throw new Error(`localStorage is not accessible: ${testError.message}`);
  }

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

  // ⭐ CRITICAL: Verify token is a string
  if (typeof data.token !== 'string' || data.token.trim().length === 0) {
    console.error('❌ CRITICAL: Token is not a valid string!', {
      tokenType: typeof data.token,
      tokenLength: data.token?.length || 0,
      tokenValue: data.token
    });
    throw new Error('Invalid token format received from server');
  }

  if (!data.user) {
    console.error('❌ CRITICAL: No user data in response!', {
      success: data.success,
      hasToken: !!data.token,
      responseKeys: Object.keys(data)
    });
    throw new Error('No user data received from server');
  }

  // ⭐ CRITICAL: Clear old data FIRST
  try {
    localStorage.removeItem('authToken');
    localStorage.removeItem('customerUser');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('staffUser');
    localStorage.removeItem('loginTimestamp');
    console.log('✅ Old data cleared from localStorage');
  } catch (e) {
    console.error('❌ Could not clear old data:', e);
  }

  // ⭐ CRITICAL: SAVE TOKEN IMMEDIATELY - BEFORE ANY OTHER OPERATIONS
  console.log('💾 IMMEDIATELY SAVING CUSTOMER TOKEN TO LOCALSTORAGE');
  console.log('Token received:', data.token.substring(0, 50) + '...');
  console.log('Token length:', data.token.length);
  console.log('User data:', data.user);
  
  // ⭐ CRITICAL: Save with retry logic - GUARANTEED SAVE
  let savedToken: string | null = null;
  let savedUser: string | null = null;
  
  for (let attempt = 1; attempt <= 20; attempt++) {
    try {
      // Save
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('customerUser', JSON.stringify(data.user));
      localStorage.setItem('loginTimestamp', Date.now().toString());
      
      // Immediate verification
      savedToken = localStorage.getItem('authToken');
      savedUser = localStorage.getItem('customerUser');
      
      if (savedToken === data.token && savedUser) {
        console.log(`✅ CUSTOMER TOKEN SAVED SUCCESSFULLY on attempt ${attempt}`);
        console.log('✅ Token in localStorage:', !!savedToken);
        console.log('✅ User in localStorage:', !!savedUser);
        break;
      } else {
        console.warn(`⚠️ Customer save attempt ${attempt} - Token mismatch. Retrying...`);
        if (attempt < 20) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    } catch (error: any) {
      console.error(`❌ Customer save attempt ${attempt} failed:`, error);
      if (attempt < 20) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
  }
  
  // Final verification
  if (!savedToken || savedToken !== data.token) {
    // Last resort - try one more time with delay
    await new Promise(resolve => setTimeout(resolve, 200));
    savedToken = localStorage.getItem('authToken');
    savedUser = localStorage.getItem('customerUser');
  }
  
  // CRITICAL: If still not saved, throw error
  if (!savedToken || savedToken !== data.token) {
    console.error('❌ CRITICAL: Customer token could not be saved after all attempts!');
    console.error('localStorage state:', {
      available: typeof localStorage !== 'undefined',
      keys: Object.keys(localStorage),
      tokenExists: !!localStorage.getItem('authToken'),
      userExists: !!localStorage.getItem('customerUser')
    });
    throw new Error('CRITICAL: Failed to save authentication token. Please check browser settings or try a different browser.');
  }
  
  console.log('✅✅✅ CUSTOMER LOGIN SUCCESSFUL - Token is in localStorage ✅✅✅');
  console.log('Final verification:', {
    tokenSaved: !!savedToken,
    tokenMatches: savedToken === data.token,
    userSaved: !!savedUser,
    tokenLength: savedToken?.length || 0
  });
  
  // ⭐ FINAL VERIFICATION: Double-check token is actually in localStorage
  const finalCheck = localStorage.getItem('authToken');
  const finalUserCheck = localStorage.getItem('customerUser');
  if (!finalCheck || finalCheck !== data.token || !finalUserCheck) {
    console.error('❌ CRITICAL: Token verification failed after save!');
    console.error('Expected token length:', data.token.length);
    console.error('Actual token in localStorage:', finalCheck ? finalCheck.length : 'NULL');
    console.error('Actual user in localStorage:', finalUserCheck ? 'EXISTS' : 'NULL');
    throw new Error('Token was not saved correctly to localStorage');
  }
  
  console.log('✅✅✅ FINAL VERIFICATION PASSED - Customer token and user are in localStorage ✅✅✅');
  return data;
  } catch (error: any) {
    console.error('❌ Customer login error:', error);
    if (error.response) {
      console.error('Response error:', {
        status: error.response.status,
        data: error.response.data
      });
      throw new Error(error.response.data?.message || error.message || 'Login failed');
    }
    throw error;
  }
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
    // ⭐ CRITICAL: Verify token exists and axiosInstance is configured
    const tokenCheck = localStorage.getItem('authToken');
    const axiosBaseURL = (axiosInstance.defaults.baseURL || axiosInstance.defaults.baseURL) || 'NOT SET';
    
    console.log('📡 checkCustomerSession: Making request with axiosInstance to /api/customer/check-session', {
      tokenExists: !!tokenCheck,
      tokenLength: tokenCheck?.length || 0,
      axiosBaseURL: axiosBaseURL,
      fullURL: `${axiosBaseURL}/api/customer/check-session`,
      axiosInstanceType: typeof axiosInstance,
      hasGetMethod: typeof axiosInstance.get === 'function'
    });
    
    if (!tokenCheck) {
      console.error('❌ CRITICAL: No token in localStorage when calling check-session!');
      return { success: false, authenticated: false };
    }
    
    // ⭐ CRITICAL: Explicitly send Authorization header (even though interceptor should handle it)
    // This ensures the header is sent even if interceptor fails (old build issue)
    const bearerToken = `Bearer ${tokenCheck.trim()}`;
    console.log('📡 checkCustomerSession: Explicitly adding Authorization header', {
      headerValue: bearerToken.substring(0, 30) + '...',
      tokenLength: tokenCheck.length
    });
    
    // ⭐ CRITICAL: Use axios request config with headers - this will be merged with interceptor
    // But we also set it explicitly to ensure it's there
    const response = await axiosInstance.get('/api/customer/check-session', {
      headers: {
        'Authorization': bearerToken,
        'authorization': bearerToken, // lowercase fallback
        'AUTHORIZATION': bearerToken  // uppercase fallback
      },
      transformRequest: [(data, headers) => {
        // ⭐ CRITICAL: Force set header in transformRequest as last resort
        if (headers) {
          headers['Authorization'] = bearerToken;
          headers['authorization'] = bearerToken;
        }
        return data;
      }]
    });
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



