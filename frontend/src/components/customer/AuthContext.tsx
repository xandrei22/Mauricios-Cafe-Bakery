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
      } else {
        setAuthenticated(false);
        setUser(null);
      }
    } catch (e) {
      setAuthenticated(false);
      setUser(null);
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
    localStorage.clear();
    sessionStorage.clear();
    setAuthenticated(false);
    setUser(null);
  };

  useEffect(() => {
    let isMounted = true;
    
    // Only check customer session on routes that need it
    const checkSessionIfNeeded = async () => {
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
    
    checkSessionIfNeeded();
    
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