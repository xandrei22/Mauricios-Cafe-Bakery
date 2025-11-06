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
      
      // If we have localStorage and it's a recent login, use it IMMEDIATELY (for all roles)
      if (isRecentLogin) {
        let storedUser = null;
        let sessionEndpoint = '';
        
        if (requiredRole === 'customer') {
          storedUser = localStorage.getItem('customerUser');
          sessionEndpoint = `${API_URL}/api/customer/check-session`;
        } else if (requiredRole === 'admin') {
          storedUser = localStorage.getItem('adminUser');
          sessionEndpoint = `${API_URL}/api/admin/check-session`;
        } else if (requiredRole === 'staff') {
          storedUser = localStorage.getItem('staffUser');
          sessionEndpoint = `${API_URL}/api/staff/check-session`;
        }
        
        if (storedUser) {
          try {
            const user = JSON.parse(storedUser);
            // Verify the role matches
            if (user.role === requiredRole || (requiredRole === 'staff' && (user.role === 'staff' || user.role === 'admin'))) {
              setIsAuthenticated(true);
              setUserRole(user.role || requiredRole);
              setIsLoading(false);
              console.log(`✅ ProtectedRoute: Using localStorage FIRST for ${requiredRole} (iOS cookie workaround - before session check)`);
              
              // Do session check in background
              if (sessionEndpoint) {
                setTimeout(async () => {
                  try {
                    const token = localStorage.getItem('authToken');
                    const headers: HeadersInit = { 'Content-Type': 'application/json' };
                    if (token) {
                      headers['Authorization'] = `Bearer ${token}`;
                    }
                    const res = await fetch(sessionEndpoint, {
                      credentials: 'include',
                      headers
                    });
                    if (res.ok) {
                      const data = await res.json();
                      if (data && data.authenticated && data.user) {
                        console.log(`✅ ProtectedRoute: Cookies eventually worked for ${requiredRole}`);
                        if (Date.now() - parseInt(loginTimestamp) > 10000) {
                          localStorage.removeItem('loginTimestamp');
                        }
                      }
                    }
                  } catch (err) {
                    console.log(`ProtectedRoute: Background session check failed for ${requiredRole}, continuing with localStorage`);
                  }
                }, 3000);
              }
              
              return; // EXIT EARLY - don't do session check at all
            }
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
      // ALWAYS include token if available (critical for iOS Safari cookie blocking)
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('🔑 ProtectedRoute: Sending Authorization header with token');
      } else {
        console.log('⚠️ ProtectedRoute: No token in localStorage');
      }
      const response = await fetch(sessionEndpoint, {
        credentials: 'include',
        headers
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
          // If session check fails, fall back to localStorage (especially important for iOS Safari)
          // On iOS, cookies may never work, so we should always check localStorage if we have a token
          const storedToken = localStorage.getItem('authToken');
          let storedUser = null;
          let userRoleFromStorage = null;
          
          if (requiredRole === 'customer') {
            storedUser = localStorage.getItem('customerUser');
            userRoleFromStorage = 'customer';
          } else if (requiredRole === 'admin') {
            storedUser = localStorage.getItem('adminUser');
            userRoleFromStorage = 'admin';
          } else if (requiredRole === 'staff') {
            storedUser = localStorage.getItem('staffUser');
            userRoleFromStorage = 'staff';
          }
          
          if (storedUser && storedToken) {
            try {
              const user = JSON.parse(storedUser);
              // Verify the role matches
              if (user.role === requiredRole || (requiredRole === 'staff' && (user.role === 'staff' || user.role === 'admin'))) {
                // For iOS, always use localStorage fallback if cookies don't work
                // For other devices, only use it if it's a recent login
                if (isIOS || isRecentLogin) {
                  setIsAuthenticated(true);
                  setUserRole(user.role || userRoleFromStorage);
                  console.log(`✅ ProtectedRoute: Using localStorage fallback for ${requiredRole} (iOS cookie workaround)`);
                } else {
                  setIsAuthenticated(false);
                }
              } else {
                setIsAuthenticated(false);
              }
            } catch (e) {
              setIsAuthenticated(false);
            }
          } else {
            setIsAuthenticated(false);
          }
        }
      } else {
        // On 401/403, try localStorage fallback for all roles (especially for iOS)
        if (isIOS || isRecentLogin) {
          const storedToken = localStorage.getItem('authToken');
          let storedUser = null;
          let expectedRole = requiredRole;
          
          if (requiredRole === 'customer') {
            storedUser = localStorage.getItem('customerUser');
          } else if (requiredRole === 'admin') {
            storedUser = localStorage.getItem('adminUser');
          } else if (requiredRole === 'staff') {
            storedUser = localStorage.getItem('staffUser');
          }
          
          if (storedUser && storedToken) {
            try {
              const user = JSON.parse(storedUser);
              // Verify the role matches
              if (user.role === requiredRole || (requiredRole === 'staff' && (user.role === 'staff' || user.role === 'admin'))) {
                setIsAuthenticated(true);
                setUserRole(user.role || expectedRole);
                console.log(`✅ ProtectedRoute: Using localStorage fallback after 401/403 for ${requiredRole} (iOS cookie workaround)`);
              } else {
                setIsAuthenticated(false);
              }
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
      // On error, always try localStorage fallback if we have token and user (especially for iOS)
      const storedToken = localStorage.getItem('authToken');
      let storedUser = null;
      let expectedRole = requiredRole;
      
      if (requiredRole === 'customer') {
        storedUser = localStorage.getItem('customerUser');
      } else if (requiredRole === 'admin') {
        storedUser = localStorage.getItem('adminUser');
      } else if (requiredRole === 'staff') {
        storedUser = localStorage.getItem('staffUser');
      }
      
      if (storedUser && storedToken) {
        try {
          const user = JSON.parse(storedUser);
          // Verify the role matches
          if (user.role === requiredRole || (requiredRole === 'staff' && (user.role === 'staff' || user.role === 'admin'))) {
            // For iOS, always use localStorage fallback if cookies don't work
            // For other devices, only use it if it's a recent login
            const loginTimestamp = localStorage.getItem('loginTimestamp');
            const isRecentLogin = loginTimestamp && (Date.now() - parseInt(loginTimestamp)) < 5000;
            if (isIOS || isRecentLogin) {
              setIsAuthenticated(true);
              setUserRole(user.role || expectedRole);
              console.log(`✅ ProtectedRoute: Using localStorage fallback after error for ${requiredRole} (iOS cookie workaround)`);
            } else {
              setIsAuthenticated(false);
            }
          } else {
            setIsAuthenticated(false);
          }
        } catch (e) {
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


