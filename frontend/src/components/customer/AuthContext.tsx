import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getApiUrl } from '../../utils/apiConfig';

interface User {
  name: string;
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
  const API_URL = getApiUrl();

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
                
              const headers = new Headers();
              headers.set('Content-Type', 'application/json');
              headers.set('Authorization', `Bearer ${token}`);
              console.log('🔑 AuthContext: Background session check - Sending Authorization header with token');
                
                const res = await fetch(`${API_URL}/api/customer/check-session`, {
                  credentials: 'include',
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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    setLoading(true);
    try {
      // Check token multiple ways to ensure we get it
      let token = localStorage.getItem('authToken');
      
      // If no token, wait a bit and try again (for timing issues after login)
      if (!token && isRecentLogin) {
        console.log('⏳ No token found, waiting 100ms for localStorage sync...');
        await new Promise(resolve => setTimeout(resolve, 100));
        token = localStorage.getItem('authToken');
      }
      
      console.log('🔑 AuthContext checkSession - Token from localStorage:', token ? 'PRESENT' : 'MISSING');
      if (token) {
        console.log('🔑 AuthContext checkSession - Token length:', token.length);
        console.log('🔑 AuthContext checkSession - Token preview:', token.substring(0, 20) + '...');
      }
      
      // CRITICAL: On mobile, token is REQUIRED (cookies don't work)
      if (isMobile && !token) {
        console.error('❌ CRITICAL: Mobile device but NO TOKEN in localStorage! Authentication will fail!');
        console.error('❌ localStorage contents:', {
          keys: Object.keys(localStorage),
          hasCustomerUser: !!localStorage.getItem('customerUser'),
          hasAuthToken: !!localStorage.getItem('authToken'),
          hasLoginTimestamp: !!localStorage.getItem('loginTimestamp')
        });
        setLoading(false);
        setAuthenticated(false);
        setUser(null);
        return;
      }
      
      // CRITICAL: Use plain object for headers (Headers object may not serialize correctly in mobile Safari)
      // Mobile Safari has issues with Headers object, so we use a plain object instead
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // ALWAYS send token if available (primary auth method for mobile)
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('🔑 AuthContext checkSession - Sending Authorization header with token');
        console.log('🔑 AuthContext checkSession - Token length:', token.length);
        console.log('🔑 AuthContext checkSession - Authorization header value:', `Bearer ${token.substring(0, 20)}...`);
      } else {
        console.warn('⚠️ AuthContext checkSession - No token in localStorage (desktop may use cookies)');
      }
      
      // Create fetch request with proper headers
      const fetchOptions: RequestInit = {
        method: 'GET',
        credentials: 'include', // Keep for desktop browsers that support cookies
        headers: headers,
        signal: controller.signal as any
      };
      
      // Log what we're about to send
      console.log('🔑 AuthContext checkSession - Fetch options:', {
        method: fetchOptions.method,
        hasHeaders: !!fetchOptions.headers,
        hasAuthorization: !!headers['Authorization'],
        authorizationValue: headers['Authorization']?.substring(0, 30) + '...',
        allHeaders: Object.keys(headers)
      });
      
      const res = await fetch(`${API_URL}/api/customer/check-session`, fetchOptions);
      
      console.log('🔑 AuthContext checkSession - Response status:', res.status);
      if (!res.ok) throw new Error('Session check failed');
      const data = await res.json();
      if (data && data.authenticated && data.user) {
        setAuthenticated(true);
        setUser(data.user);
        // Clear login timestamp on successful auth check
        if (isRecentLogin) {
          localStorage.removeItem('loginTimestamp');
        }
      } else {
        // If session check fails, fall back to localStorage (especially important for iOS Safari)
        // On iOS, cookies may never work, so we should always check localStorage if we have a token
        const storedUser = localStorage.getItem('customerUser');
        const storedToken = localStorage.getItem('authToken');
        if (storedUser && storedToken) {
          try {
            const user = JSON.parse(storedUser);
            // For iOS, always use localStorage fallback if cookies don't work
            // For other devices, only use it if it's a recent login
            if (isIOS || isRecentLogin) {
              setAuthenticated(true);
              setUser(user);
              console.log('✅ AuthContext: Session failed, using localStorage fallback (iOS cookie workaround)');
              return; // Don't clear - let it persist
            }
          } catch (e) {
            console.error('Failed to parse stored user:', e);
          }
        }
        // Only set authenticated to false if we don't have a valid localStorage fallback
        setAuthenticated(false);
        setUser(null);
      }
    } catch (e) {
      console.error('Session check error:', e);
      // On error, always try localStorage fallback if we have token and user (especially for iOS)
      const storedUser = localStorage.getItem('customerUser');
      const storedToken = localStorage.getItem('authToken');
      if (storedUser && storedToken) {
        try {
          const user = JSON.parse(storedUser);
          // For iOS, always use localStorage fallback if cookies don't work
          // For other devices, only use it if it's a recent login
          if (isIOS || isRecentLogin) {
            setAuthenticated(true);
            setUser(user);
            console.log('✅ AuthContext: Session check error, using localStorage fallback (iOS cookie workaround)');
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
      clearTimeout(timeout);
      setLoading(false);
    }
  }, [API_URL, lastSessionCheck]);

  const logout = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      await fetch(`${API_URL}/api/customer/logout`, {
        method: 'POST',
        credentials: 'include',
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
            // Still do session check in background to see if cookies eventually work
            // But don't let it override our localStorage fallback
            setTimeout(async () => {
              try {
                const token = localStorage.getItem('authToken');
                const headers: HeadersInit = { 'Content-Type': 'application/json' };
                if (token) {
                  headers['Authorization'] = `Bearer ${token}`;
                }
                const res = await fetch(`${API_URL}/api/customer/check-session`, {
                  credentials: 'include',
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