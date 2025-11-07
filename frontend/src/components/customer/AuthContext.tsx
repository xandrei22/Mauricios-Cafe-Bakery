/*import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { checkCustomerSession } from '../../utils/authUtils';

interface User {
  name?: string;
  email: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authenticated: boolean;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [lastSessionCheck, setLastSessionCheck] = useState<number>(0);
  const checkSession = useCallback(async () => {
    // Detect device type
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isMobile = /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent);
    
    // FIRST: Check localStorage BEFORE any network call (critical for mobile)
    // On mobile devices (especially iOS), cookies DON'T work for cross-origin requests
    // So we MUST use localStorage + JWT token as PRIMARY authentication method
    const loginTimestamp = localStorage.getItem('loginTimestamp');
    const recentLoginWindow = isMobile ? 30000 : 10000; // Longer window for mobile
    const isRecentLogin = loginTimestamp && (Date.now() - parseInt(loginTimestamp)) < recentLoginWindow;
    
    // For mobile devices, ALWAYS check localStorage first (cookies don't work)
    // For desktop, still check localStorage but cookies can be used as fallback
    if (isMobile || isRecentLogin) {
      const storedUser = localStorage.getItem('customerUser');
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          setAuthenticated(true);
          setUser(user);
          setLoading(false);
            console.log(`✅ AuthContext: Using localStorage FIRST (${isMobile ? 'mobile device - cookies blocked' : 'recent login'})`);
          
          // CRITICAL: On mobile, we MUST verify token with backend immediately
          // Don't exit early - we need to send the token to backend for verification
          // The backend needs to know about the session even if we use localStorage for UI
          if (isMobile) {
            console.log('📱 Mobile device detected - will verify token with backend immediately');
            // Don't return early - continue to token verification below
          } else {
            // For desktop, we can use localStorage immediately and verify in background
            setTimeout(async () => {
              try {
                const token = localStorage.getItem('authToken');
                if (!token) {
                  console.warn('⚠️ AuthContext: No token found in localStorage for background verification');
                  return;
                }
                
                // Use plain object for headers (Headers object may not serialize correctly)
                const headers: Record<string, string> = {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                };
                console.log('🔑 AuthContext: Background session check - Sending Authorization header with token');
                
                const res = await fetch(`${API_URL}/api/customer/check-session`, {
                  credentials: 'omit', // JWT-only: No cookies needed
                  headers
                });
                
                if (res.ok) {
                  const data = await res.json();
                  if (data && data.authenticated && data.user) {
                    console.log('✅ AuthContext: Token verified successfully, updating user from server');
                    setUser(data.user);
                    const currentTimestamp = localStorage.getItem('loginTimestamp');
                    if (currentTimestamp && (Date.now() - parseInt(currentTimestamp)) > 10000) {
                      localStorage.removeItem('loginTimestamp');
                    }
                  } else {
                    console.warn('⚠️ AuthContext: Token verification failed - user not authenticated');
                  }
                } else {
                  console.warn('⚠️ AuthContext: Token verification failed - HTTP error:', res.status);
                }
              } catch (retryErr) {
                console.error('AuthContext: Background session check error:', retryErr);
              }
            }, 500);
            
            return; // EXIT EARLY only for desktop
          }
        } catch (e) {
          console.error('Failed to parse stored user:', e);
          // Continue to session check below
        }
      }
    }
    
    // Debounce: prevent rapid successive calls (minimum 2 seconds between checks)
    const now = Date.now();
    if (now - lastSessionCheck < 2000) {
      return;
    }
    setLastSessionCheck(now);
    
    // If recent login, add a delay to let iOS process cookies
    if (isRecentLogin) {
      const delay = isIOS ? 1500 : 500;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    setLoading(true);
    try {
      // Check token exists before making request
      const token = localStorage.getItem('authToken');
      
      // If no token, wait a bit and try again (for timing issues after login)
      if (!token && isRecentLogin) {
        const waitTime = isMobile ? 500 : 100;
        console.log(`⏳ No token found, waiting ${waitTime}ms for localStorage sync...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      // CRITICAL: On mobile, token is REQUIRED (cookies don't work)
      if (isMobile && !localStorage.getItem('authToken')) {
        console.error('❌ CRITICAL: Mobile device but NO TOKEN in localStorage! Authentication will fail!');
        setLoading(false);
        setAuthenticated(false);
        setUser(null);
        return;
      }
      
      // Use JWT auth utility (uses axiosInstance which automatically adds Authorization header)
      console.log('🔑 AuthContext: Using checkCustomerSession (JWT)');
      const data = await checkCustomerSession();
      
      if (data && data.authenticated && data.user) {
        setAuthenticated(true);
        setUser(data.user);
        // Clear login timestamp on successful auth check
        if (isRecentLogin) {
          localStorage.removeItem('loginTimestamp');
        }
      } else {
        // If session check fails, fall back to localStorage (especially important for iOS Safari)
        const storedUser = localStorage.getItem('customerUser');
        const storedToken = localStorage.getItem('authToken');
        if (storedUser && storedToken) {
          try {
            const user = JSON.parse(storedUser);
            // For iOS, always use localStorage fallback if JWT check fails
            if (isIOS || isRecentLogin) {
              setAuthenticated(true);
              setUser(user);
              console.log('✅ AuthContext: JWT check failed, using localStorage fallback');
              return;
            }
          } catch (e) {
            console.error('Failed to parse stored user:', e);
          }
        }
        setAuthenticated(false);
        setUser(null);
      }
    } catch (e: any) {
      console.error('Session check error:', e);
      // On error, try localStorage fallback if we have token and user
      const storedUser = localStorage.getItem('customerUser');
      const storedToken = localStorage.getItem('authToken');
      if (storedUser && storedToken) {
        try {
          const user = JSON.parse(storedUser);
          // For iOS, always use localStorage fallback if JWT check fails
          if (isIOS || isRecentLogin) {
            setAuthenticated(true);
            setUser(user);
            console.log('✅ AuthContext: JWT check error, using localStorage fallback');
          } else {
            setAuthenticated(false);
            setUser(null);
          }
        } catch (parseErr) {
          console.error('Failed to parse stored user:', parseErr);
          setAuthenticated(false);
          setUser(null);
        }
      } else {
        setAuthenticated(false);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, [isIOS, isMobile, isRecentLogin, lastSessionCheck]);

  const logout = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      await fetch(`${API_URL}/api/customer/logout`, {
        method: 'POST',
        credentials: 'omit', // JWT-only: No cookies needed
        headers
      });
    } catch {}
    // Clear all local storage and session storage
    localStorage.removeItem('customerUser');
    localStorage.removeItem('loginTimestamp');
    localStorage.removeItem('authToken');
    localStorage.clear();
    sessionStorage.clear();
    setAuthenticated(false);
    setUser(null);
  };

  useEffect(() => {
    let isMounted = true;
    
    // IMMEDIATE localStorage check for ALL iOS users who just logged in (any version, any browser)
    // This must happen BEFORE session check to prevent redirect loops
    // Works for iOS 12, 13, 14, 15, 16, 17, 18+ and all browsers (Safari, Chrome, Firefox, etc.)
    const loginTimestamp = localStorage.getItem('loginTimestamp');
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const recentLoginWindow = isIOS ? 30000 : 10000; // 30 seconds for ALL iOS, 10 for others
    const isRecentLogin = loginTimestamp && (Date.now() - parseInt(loginTimestamp)) < recentLoginWindow;
    let hasLocalStorageFallback = false;
    
    console.log('AuthContext mount - loginTimestamp:', loginTimestamp, 'isRecentLogin:', isRecentLogin);
    
    if (isRecentLogin) {
      const storedUser = localStorage.getItem('customerUser');
      console.log('AuthContext - storedUser exists:', !!storedUser);
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          if (isMounted) {
            setAuthenticated(true);
            setUser(user);
            setLoading(false);
            hasLocalStorageFallback = true;
            console.log('✅ AuthContext: Immediately using localStorage fallback (iOS cookie workaround - works for ALL iOS versions)');
            console.log('✅ AuthContext: User from localStorage:', user.email);
            // Still do session check in background to see if cookies eventually work,
            // but do not override our local fallback if it fails or is null.
            setTimeout(async () => {
              try {
                const token = localStorage.getItem('authToken');
                const headers: HeadersInit = { 'Content-Type': 'application/json' };
                if (token) {
                  headers['Authorization'] = `Bearer ${token}`;
                }
                const res = await fetch(`${API_URL}/api/customer/check-session`, {
                  credentials: 'omit', // JWT-only: No cookies needed
                  headers
                });
                if (res.ok) {
                  const data = await res.json();
                  if (data && data.authenticated && data.user) {
                    console.log('✅ AuthContext: Cookies eventually worked, updating user from server');
                    setUser(data.user);
                    const currentTimestamp = localStorage.getItem('loginTimestamp');
                    if (currentTimestamp && (Date.now() - parseInt(currentTimestamp)) > 10000) {
                      localStorage.removeItem('loginTimestamp');
                    }
                  }
                }
              } catch (err) {
                console.log('AuthContext: Background session check failed, continuing with localStorage fallback');
              }
            }, 3000); // Wait 3 seconds before checking
          }
        } catch (e) {
          console.error('Failed to parse stored user:', e);
        }
      }
    }
    
    // Only check customer session on routes that need it (unless we already have localStorage fallback)
    const checkSessionIfNeeded = async () => {
      // If we already set authenticated via localStorage, skip immediate session check
      if (hasLocalStorageFallback) {
        return;
      }
      
      const currentPath = window.location.pathname;
      
      // Skip auth checking on staff/admin routes and public pages
      if (currentPath.startsWith('/staff') || 
          currentPath.startsWith('/admin') ||
          currentPath === '/' ||
          currentPath === '/login' ||
          currentPath === '/customer-signup' ||
          currentPath === '/customer-login' ||
          currentPath.startsWith('/guest') ||
          currentPath.startsWith('/qr-codes') ||
          currentPath.startsWith('/visit-mauricio') ||
          currentPath === '/privacy' ||
          currentPath === '/terms' ||
          currentPath === '/accessibility') {
        setLoading(false);
        return;
      }
      
      // Only check on customer routes or when explicitly needed
      if (currentPath.startsWith('/customer') && isMounted) {
        await checkSession();
      } else {
        setLoading(false);
      }
    };
    
    // Only run session check if we don't have localStorage fallback
    if (!hasLocalStorageFallback) {
      checkSessionIfNeeded();
    }
    
    const onVisibility = () => { 
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/customer') && 
          !currentPath.startsWith('/staff') && 
          !currentPath.startsWith('/admin') && 
          document.visibilityState === 'visible') {
        checkSession();
      }
    };
    
    document.addEventListener('visibilitychange', onVisibility);
    // Reduced frequency from 60 seconds to 5 minutes to prevent excessive API calls
    const interval = setInterval(() => {
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/customer') && 
          !currentPath.startsWith('/staff') && 
          !currentPath.startsWith('/admin')) {
        checkSession();
      }
    }, 300000); // 5 minutes instead of 1 minute
    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [checkSession]);

  return (
    <AuthContext.Provider value={{ user, loading, authenticated, refreshSession: checkSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 
  */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { checkCustomerSession, customerLogout } from '../../utils/authUtils';

interface User {
  name?: string;
  email: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authenticated: boolean;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [lastSessionCheck, setLastSessionCheck] = useState<number>(0);
  
  const checkSession = useCallback(async () => {
    // ⭐ CRITICAL FIX: Check if token exists BEFORE making any API calls
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      // No token = not logged in = no need to check session
      console.log('ℹ️ AuthContext: No token found, skipping session check');
      setLoading(false);
      setAuthenticated(false);
      setUser(null);
      return;
    }
    
    // Detect device type
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isMobile = /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent);
    
    // Check localStorage for recent login
    const loginTimestamp = localStorage.getItem('loginTimestamp');
    const recentLoginWindow = isMobile ? 30000 : 10000;
    const isRecentLogin = loginTimestamp && (Date.now() - parseInt(loginTimestamp)) < recentLoginWindow;
    
    // For mobile devices or recent logins, check localStorage first
    if (isMobile || isRecentLogin) {
      const storedUser = localStorage.getItem('customerUser');
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          setAuthenticated(true);
          setUser(user);
          setLoading(false);
          console.log(`✅ AuthContext: Using localStorage (${isMobile ? 'mobile device' : 'recent login'})`);
          
          // For mobile, verify token immediately
          if (isMobile) {
            console.log('📱 Mobile device - verifying token with backend');
            // Continue to token verification below
          } else {
            // For desktop, verify in background
            setTimeout(async () => {
              try {
                const data = await checkCustomerSession();
                if (data && data.authenticated && data.user) {
                  console.log('✅ Token verified, updating user');
                  setUser(data.user);
                  const currentTimestamp = localStorage.getItem('loginTimestamp');
                  if (currentTimestamp && (Date.now() - parseInt(currentTimestamp)) > 10000) {
                    localStorage.removeItem('loginTimestamp');
                  }
                }
              } catch (err) {
                console.error('Background token verification failed:', err);
              }
            }, 500);
            return; // Exit early for desktop
          }
        } catch (e) {
          console.error('Failed to parse stored user:', e);
        }
      }
    }
    
    // Debounce: prevent rapid successive calls
    const now = Date.now();
    if (now - lastSessionCheck < 2000) {
      return;
    }
    setLastSessionCheck(now);
    
    // Add delay for iOS to process cookies
    if (isRecentLogin && isIOS) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    setLoading(true);
    try {
      console.log('🔑 AuthContext: Checking session with JWT token');
      const data = await checkCustomerSession();
      
      if (data && data.authenticated && data.user) {
        setAuthenticated(true);
        setUser(data.user);
        if (isRecentLogin) {
          localStorage.removeItem('loginTimestamp');
        }
      } else {
        // Fallback to localStorage
        const storedUser = localStorage.getItem('customerUser');
        const storedToken = localStorage.getItem('authToken');
        if (storedUser && storedToken && (isIOS || isRecentLogin)) {
          try {
            const user = JSON.parse(storedUser);
            setAuthenticated(true);
            setUser(user);
            console.log('✅ Using localStorage fallback');
            return;
          } catch (e) {
            console.error('Failed to parse stored user:', e);
          }
        }
        setAuthenticated(false);
        setUser(null);
      }
    } catch (e: any) {
      console.error('Session check error:', e);
      
      // Fallback to localStorage on error
      const storedUser = localStorage.getItem('customerUser');
      const storedToken = localStorage.getItem('authToken');
      if (storedUser && storedToken && (isIOS || isRecentLogin)) {
        try {
          const user = JSON.parse(storedUser);
          setAuthenticated(true);
          setUser(user);
          console.log('✅ Error fallback to localStorage');
        } catch (parseErr) {
          setAuthenticated(false);
          setUser(null);
        }
      } else {
        setAuthenticated(false);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, [lastSessionCheck]);

  const logout = async () => {
    try {
      // Use customerLogout from authUtils which uses axiosInstance
      await customerLogout();
    } catch (err) {
      console.error('Logout error:', err);
    }
    
    // Clear storage (customerLogout already clears authToken, but we clear everything)
    localStorage.removeItem('customerUser');
    localStorage.removeItem('loginTimestamp');
    localStorage.removeItem('authToken');
    localStorage.clear();
    sessionStorage.clear();
    setAuthenticated(false);
    setUser(null);
  };

  useEffect(() => {
    let isMounted = true;
    
    // Check for recent login with localStorage
    const loginTimestamp = localStorage.getItem('loginTimestamp');
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const recentLoginWindow = isIOS ? 30000 : 10000;
    const isRecentLogin = loginTimestamp && (Date.now() - parseInt(loginTimestamp)) < recentLoginWindow;
    let hasLocalStorageFallback = false;
    
    console.log('AuthContext mount - recent login:', isRecentLogin);
    
    // Immediate localStorage check for recent logins
    if (isRecentLogin) {
      const storedUser = localStorage.getItem('customerUser');
      const storedToken = localStorage.getItem('authToken');
      
      if (storedUser && storedToken) {
        try {
          const user = JSON.parse(storedUser);
          if (isMounted) {
            setAuthenticated(true);
            setUser(user);
            setLoading(false);
            hasLocalStorageFallback = true;
            console.log('✅ Using localStorage immediately (recent login)');
            
            // Background verification
            setTimeout(async () => {
              try {
                const data = await checkCustomerSession();
                if (data && data.authenticated && data.user) {
                  console.log('✅ Session verified in background');
                  setUser(data.user);
                  const currentTimestamp = localStorage.getItem('loginTimestamp');
                  if (currentTimestamp && (Date.now() - parseInt(currentTimestamp)) > 10000) {
                    localStorage.removeItem('loginTimestamp');
                  }
                }
              } catch (err) {
                console.log('Background check failed, using localStorage');
              }
            }, 3000);
          }
        } catch (e) {
          console.error('Failed to parse stored user:', e);
        }
      }
    }
    
    // Check session only on customer routes
    const checkSessionIfNeeded = async () => {
      if (hasLocalStorageFallback) {
        return;
      }
      
      const currentPath = window.location.pathname;
      
      // ⭐ CRITICAL: Skip session check on public/non-customer pages
      if (currentPath.startsWith('/staff') || 
          currentPath.startsWith('/admin') ||
          currentPath === '/' ||
          currentPath === '/login' ||
          currentPath === '/customer-signup' ||
          currentPath === '/customer-login' ||
          currentPath.startsWith('/guest') ||
          currentPath.startsWith('/qr-codes') ||
          currentPath.startsWith('/visit-mauricio') ||
          currentPath === '/privacy' ||
          currentPath === '/terms' ||
          currentPath === '/accessibility' ||
          currentPath.startsWith('/customer/forgot-password') ||
          currentPath.startsWith('/customer/reset-password')) {
        console.log('ℹ️ Public page - skipping auth check');
        setLoading(false);
        return;
      }
      
      // Only check on customer routes
      if (currentPath.startsWith('/customer') && isMounted) {
        await checkSession();
      } else {
        setLoading(false);
      }
    };
    
    if (!hasLocalStorageFallback) {
      checkSessionIfNeeded();
    }
    
    // Event listeners for tab visibility and periodic checks
    const onVisibility = () => { 
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/customer') && 
          document.visibilityState === 'visible') {
        checkSession();
      }
    };
    
    document.addEventListener('visibilitychange', onVisibility);
    
    // Periodic check every 5 minutes (only on customer routes)
    const interval = setInterval(() => {
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/customer')) {
        checkSession();
      }
    }, 300000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [checkSession]);

  return (
    <AuthContext.Provider value={{ user, loading, authenticated, refreshSession: checkSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}