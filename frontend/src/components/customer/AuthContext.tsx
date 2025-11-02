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
    // Debounce: prevent rapid successive calls (minimum 2 seconds between checks)
    const now = Date.now();
    if (now - lastSessionCheck < 2000) {
      return;
    }
    setLastSessionCheck(now);

    // Check if we just logged in (within last 30 seconds for iOS Safari) - give mobile Safari time to process cookies
    const loginTimestamp = localStorage.getItem('loginTimestamp');
    const isIOSSafari = /iPhone.*Safari/i.test(navigator.userAgent) && !/CriOS|FxiOS/i.test(navigator.userAgent);
    const isOldIOS = /OS 1[0-5]_/.test(navigator.userAgent);
    const recentLoginWindow = (isIOSSafari && isOldIOS) ? 30000 : 10000; // 30 seconds for old iOS, 10 for others
    const isRecentLogin = loginTimestamp && (Date.now() - parseInt(loginTimestamp)) < recentLoginWindow;
    
    // If recent login, add a delay to let mobile Safari process cookies
    // iOS 15.8 needs longer delays due to aggressive cookie blocking
    if (isRecentLogin) {
      const delay = (isIOSSafari && isOldIOS) ? 1500 : 500;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/customer/check-session`, { credentials: 'include', signal: controller.signal as any });
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
        // If session check fails but we have localStorage backup and recent login, use it temporarily
        if (isRecentLogin) {
          const storedUser = localStorage.getItem('customerUser');
          if (storedUser) {
            try {
              const user = JSON.parse(storedUser);
              setAuthenticated(true);
              setUser(user);
              console.log('AuthContext: Using localStorage fallback (mobile Safari cookie delay)');
              
              // For iOS Safari, schedule a retry to check if cookies eventually work
              if (isIOSSafari && isOldIOS) {
                setTimeout(async () => {
                  try {
                    const retryRes = await fetch(`${API_URL}/api/customer/check-session`, { credentials: 'include' });
                    if (retryRes.ok) {
                      const retryData = await retryRes.json();
                      if (retryData && retryData.authenticated && retryData.user) {
                        console.log('AuthContext: Cookie eventually accepted by iOS Safari');
                        setUser(retryData.user);
                        localStorage.removeItem('loginTimestamp');
                      }
                    }
                  } catch (retryErr) {
                    console.log('AuthContext: Retry check failed, continuing with localStorage fallback');
                  }
                }, 5000); // Retry after 5 seconds
              }
              
              return; // Don't clear - let it persist
            } catch (e) {
              console.error('Failed to parse stored user:', e);
              setAuthenticated(false);
              setUser(null);
            }
          } else {
            setAuthenticated(false);
            setUser(null);
          }
        } else {
          setAuthenticated(false);
          setUser(null);
        }
      }
    } catch (e) {
      console.error('Session check error:', e);
      // On error during recent login, allow localStorage fallback
      if (isRecentLogin) {
        const storedUser = localStorage.getItem('customerUser');
        if (storedUser) {
          try {
            const user = JSON.parse(storedUser);
            setAuthenticated(true);
            setUser(user);
            console.log('AuthContext: Using localStorage fallback after error (mobile Safari cookie delay)');
          } catch (parseErr) {
            console.error('Failed to parse stored user:', parseErr);
            setAuthenticated(false);
            setUser(null);
          }
        } else {
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
      await fetch(`${API_URL}/api/customer/logout`, { method: 'POST', credentials: 'include' });
    } catch {}
    // Clear all local storage and session storage
    localStorage.removeItem('customerUser');
    localStorage.removeItem('loginTimestamp');
    localStorage.clear();
    sessionStorage.clear();
    setAuthenticated(false);
    setUser(null);
  };

  useEffect(() => {
    let isMounted = true;
    
    // IMMEDIATE localStorage check for iOS Safari users who just logged in
    // This must happen BEFORE session check to prevent redirect loops
    const loginTimestamp = localStorage.getItem('loginTimestamp');
    const isRecentLogin = loginTimestamp && (Date.now() - parseInt(loginTimestamp)) < 30000;
    let hasLocalStorageFallback = false;
    
    if (isRecentLogin) {
      const storedUser = localStorage.getItem('customerUser');
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          if (isMounted) {
            setAuthenticated(true);
            setUser(user);
            setLoading(false);
            hasLocalStorageFallback = true;
            console.log('AuthContext: Immediately using localStorage fallback (iOS Safari cookie workaround)');
            // Still do session check in background to see if cookies eventually work
            // But don't let it override our localStorage fallback
            setTimeout(() => {
              checkSession().then(() => {
                // If session check succeeds, we can clear the localStorage fallback
                const currentTimestamp = localStorage.getItem('loginTimestamp');
                if (currentTimestamp && (Date.now() - parseInt(currentTimestamp)) > 10000) {
                  // Cookie is working now, we can rely on it
                  localStorage.removeItem('loginTimestamp');
                }
              }).catch(() => {
                // Session check failed, but we already have localStorage fallback - that's fine
              });
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