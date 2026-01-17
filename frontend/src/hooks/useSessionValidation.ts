import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { checkAdminSession, checkStaffSession, checkCustomerSession } from '../utils/authUtils';

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

      const loginRouteMap: Record<Role, string> = {
        admin: '/admin/login',
        staff: '/staff/login',
        customer: '/login',
      };

      let data;
      
      // Use appropriate session check function based on role
      if (role === 'admin') {
        data = await checkAdminSession();
      } else if (role === 'staff') {
        data = await checkStaffSession();
      } else {
        data = await checkCustomerSession();
      }

      if (data && (data.authenticated || data.success)) {
        setIsValid(true);
        setUser(data.user || null);
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
    } catch (err: any) {
      setIsValid(false);
      setUser(null);
      
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Session expired. Please log in again.');
      } else {
        setError('Network error. Please check your connection.');
      }
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
