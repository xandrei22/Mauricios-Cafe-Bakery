import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
  name: string;
  email: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authenticated: boolean;
  refreshSession: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const API_URL = (import.meta as any)?.env?.VITE_API_URL || 'http://localhost:5001';

  const checkSession = async () => {
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
  };

  const logout = async () => {
    try {
      await fetch(`${API_URL}/api/customer/logout`, { method: 'POST', credentials: 'include' });
    } catch {}
    setAuthenticated(false);
    setUser(null);
  };

  useEffect(() => {
    let isMounted = true;
    const initial = async () => { if (isMounted) await checkSession(); };
    initial();
    const onVisibility = () => { if (document.visibilityState === 'visible') checkSession(); };
    document.addEventListener('visibilitychange', onVisibility);
    const interval = setInterval(() => checkSession(), 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

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