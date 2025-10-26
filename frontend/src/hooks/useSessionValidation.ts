import { useState, useEffect, useCallback } from 'react';

type Role = 'admin' | 'staff' | 'customer';

interface SessionValidationResult {
  user: any | null;
  isValid: boolean;
  isLoading: boolean;
  error: string | null;
  checkSession: () => Promise<void>;
}

export const useSessionValidation = (role: Role = 'admin'): SessionValidationResult => {
  const [user, setUser] = useState<any | null>(null);
  const [isValid, setIsValid] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const endpointMap: Record<Role, string> = {
        admin: '/api/admin/check-session',
        staff: '/api/staff/check-session',
        customer: '/api/customer/check-session',
      };

      const loginRouteMap: Record<Role, string> = {
        admin: '/admin/login',
        staff: '/staff/login',
        customer: '/login',
      };

      const response = await fetch(endpointMap[role], {
        credentials: 'include',
      });

      if (response.status === 401) {
        setIsValid(false);
        setUser(null);
        setError('Session expired. Please log in again.');
        return;
      }

      if (!response.ok) {
        throw new Error('Session check failed');
      }

      const data = await response.json();

      if (data && (data.authenticated || data.success)) {
        setIsValid(true);
        setUser(data.user || data.data || null);
        setError(null);
      } else {
        setIsValid(false);
        setUser(null);
        setError('Session expired. Please log in again.');
        // Optional redirect after delay
        setTimeout(() => {
          window.location.href = loginRouteMap[role];
        }, 1500);
      }
    } catch (err) {
      setIsValid(false);
      setUser(null);
      setError('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  }, [role]);

  // Check session every 5 minutes and on focus
  useEffect(() => {
    const interval = setInterval(checkSession, 5 * 60 * 1000);
    const handleFocus = () => { checkSession(); };
    window.addEventListener('focus', handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkSession]);

  // Initial check
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return {
    user,
    isValid,
    isLoading,
    error,
    checkSession,
  };
};
