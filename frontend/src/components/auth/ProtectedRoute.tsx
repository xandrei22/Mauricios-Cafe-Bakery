import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getApiUrl } from '../../utils/apiConfig';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'staff' | 'customer';
  fallbackPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole, 
  fallbackPath 
}) => {
  // Set appropriate fallback path based on required role
  const getFallbackPath = () => {
    if (fallbackPath) return fallbackPath;
    if (requiredRole === 'admin') return '/admin/login';
    if (requiredRole === 'staff') return '/staff/login';
    return '/login';
  };
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const API_URL = getApiUrl();
      
      // FIRST: Check localStorage BEFORE any network call (critical for iOS)
      const loginTimestamp = localStorage.getItem('loginTimestamp');
      const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const recentLoginWindow = isIOS ? 30000 : 5000;
      const isRecentLogin = loginTimestamp && (Date.now() - parseInt(loginTimestamp)) < recentLoginWindow;
      
      // If we have localStorage for customer and it's a recent login, use it IMMEDIATELY
      if (requiredRole === 'customer' && isRecentLogin) {
        const storedUser = localStorage.getItem('customerUser');
        if (storedUser) {
          try {
            const user = JSON.parse(storedUser);
            setIsAuthenticated(true);
            setUserRole('customer');
            setIsLoading(false);
            console.log('✅ ProtectedRoute: Using localStorage FIRST (iOS cookie workaround - before session check)');
            
            // Do session check in background
            setTimeout(async () => {
              try {
                const res = await fetch(`${API_URL}/api/customer/check-session`, { credentials: 'include' });
                if (res.ok) {
                  const data = await res.json();
                  if (data && data.authenticated && data.user) {
                    console.log('✅ ProtectedRoute: Cookies eventually worked');
                    if (Date.now() - parseInt(loginTimestamp) > 10000) {
                      localStorage.removeItem('loginTimestamp');
                    }
                  }
                }
              } catch (err) {
                console.log('ProtectedRoute: Background session check failed, continuing with localStorage');
              }
            }, 3000);
            
            return; // EXIT EARLY - don't do session check at all
          } catch (e) {
            console.error('Failed to parse stored user:', e);
            // Continue to session check below
          }
        }
      }
      
      // Determine which session check endpoint to use based on required role
      let sessionEndpoint = `${API_URL}/api/admin/check-session`;
      if (requiredRole === 'staff') {
        sessionEndpoint = `${API_URL}/api/staff/check-session`;
      } else if (requiredRole === 'customer') {
        sessionEndpoint = `${API_URL}/api/customer/check-session`;
      }

      // If recent login, add a delay to let iOS process cookies
      if (isRecentLogin) {
        const delay = isIOS ? 1500 : 300;
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Check if user is logged in by calling the appropriate session check endpoint
      const response = await fetch(sessionEndpoint, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.authenticated && data.user) {
          setIsAuthenticated(true);
          setUserRole(data.user.role);
          // Clear login timestamp on successful auth check
          if (isRecentLogin) {
            localStorage.removeItem('loginTimestamp');
          }
        } else {
          // If session check fails but we have localStorage backup for customer, allow access temporarily
          if (requiredRole === 'customer' && isRecentLogin) {
            const storedUser = localStorage.getItem('customerUser');
            if (storedUser) {
              try {
                const user = JSON.parse(storedUser);
                setIsAuthenticated(true);
                setUserRole('customer');
                console.log('Using localStorage fallback for customer auth (mobile Safari cookie delay)');
              } catch (e) {
                setIsAuthenticated(false);
              }
            } else {
              setIsAuthenticated(false);
            }
          } else {
            setIsAuthenticated(false);
          }
        }
      } else {
        // On 401/403, if recent login, try localStorage fallback for customer
        if (requiredRole === 'customer' && isRecentLogin && response.status === 401) {
          const storedUser = localStorage.getItem('customerUser');
          if (storedUser) {
            try {
              const user = JSON.parse(storedUser);
              setIsAuthenticated(true);
              setUserRole('customer');
              console.log('Using localStorage fallback for customer auth (cookie not set yet)');
            } catch (e) {
              setIsAuthenticated(false);
            }
          } else {
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
      }
    } catch (error) {
      console.error('Authentication check failed:', error);
      // On error during recent login, allow localStorage fallback for customer
      if (requiredRole === 'customer') {
        const loginTimestamp = localStorage.getItem('loginTimestamp');
        const isRecentLogin = loginTimestamp && (Date.now() - parseInt(loginTimestamp)) < 5000;
        if (isRecentLogin) {
          const storedUser = localStorage.getItem('customerUser');
          if (storedUser) {
            try {
              const user = JSON.parse(storedUser);
              setIsAuthenticated(true);
              setUserRole('customer');
              console.log('Using localStorage fallback after auth check error (mobile Safari cookie delay)');
            } catch (e) {
              setIsAuthenticated(false);
            }
          } else {
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to={getFallbackPath()} state={{ from: location }} replace />;
  }

  // If role is required and user doesn't have it, redirect
  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  // User is authenticated and has required role (if any)
  return <>{children}</>;
};

export default ProtectedRoute;


