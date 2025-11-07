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
      
      // FIRST: Check localStorage BEFORE any network call (critical for mobile)
      // On mobile devices (especially iOS), cookies DON'T work for cross-origin requests
      // So we MUST use localStorage + JWT token as PRIMARY authentication method
      const loginTimestamp = localStorage.getItem('loginTimestamp');
      const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const isMobile = /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent);
      const recentLoginWindow = isMobile ? 30000 : 5000; // Longer window for mobile
      const isRecentLogin = loginTimestamp && (Date.now() - parseInt(loginTimestamp)) < recentLoginWindow;
      
      // For mobile devices, ALWAYS check localStorage first (cookies don't work)
      // For desktop, check localStorage if it's a recent login
      if (isMobile || isRecentLogin) {
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
              console.log(`✅ ProtectedRoute: Using localStorage FIRST for ${requiredRole} (${isMobile ? 'mobile device - cookies blocked' : 'recent login'})`);
              
              // Do session check in background
              if (sessionEndpoint) {
                setTimeout(async () => {
                  try {
                    const token = localStorage.getItem('authToken');
                    const headers = new Headers();
                    headers.set('Content-Type', 'application/json');
                    if (token) {
                      headers.set('Authorization', `Bearer ${token}`);
                    }
                    const res = await fetch(sessionEndpoint, {
                      credentials: 'omit', // JWT-only: No cookies needed
                      headers: headers
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

      // CRITICAL: For mobile devices with recent login, wait a bit for token to be saved
      // This ensures localStorage has the token before we check session
      if (isMobile && isRecentLogin) {
        console.log('⏳ Waiting for token to be saved to localStorage...');
        await new Promise(resolve => setTimeout(resolve, 200)); // Wait 200ms for localStorage sync
      }
      
      // For desktop with recent login, add a small delay
      if (!isMobile && isRecentLogin) {
        const delay = 300;
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Check if user is logged in by calling the appropriate session check endpoint
      // ALWAYS include token if available (critical for iOS Safari cookie blocking)
      const token = localStorage.getItem('authToken');
      
      // CRITICAL: On mobile, token is REQUIRED (cookies don't work)
      // Note: isMobile is already declared above on line 41
      if (isMobile && !token) {
        console.error(`❌ CRITICAL: Mobile device but NO TOKEN in localStorage for ${requiredRole}! Authentication will fail!`);
        console.error('❌ localStorage contents:', {
          keys: Object.keys(localStorage),
          hasAdminUser: !!localStorage.getItem('adminUser'),
          hasStaffUser: !!localStorage.getItem('staffUser'),
          hasCustomerUser: !!localStorage.getItem('customerUser'),
          hasAuthToken: !!localStorage.getItem('authToken')
        });
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }
      
      // CRITICAL: Use plain object for headers (Headers object may not serialize correctly in mobile Safari)
      // Mobile Safari has issues with Headers object, so we use a plain object instead
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log(`🔑 ProtectedRoute (${requiredRole}): Sending Authorization header with token`);
        console.log(`🔑 ProtectedRoute (${requiredRole}): Token length:`, token.length);
        console.log(`🔑 ProtectedRoute (${requiredRole}): Authorization header value:`, `Bearer ${token.substring(0, 20)}...`);
      } else {
        console.warn(`⚠️ ProtectedRoute (${requiredRole}): No token in localStorage (desktop may use cookies)`);
      }
      
      // Log what we're about to send
      console.log(`🔑 ProtectedRoute (${requiredRole}) - Fetch options:`, {
        endpoint: sessionEndpoint,
        hasAuthorization: !!headers['Authorization'],
        authorizationValue: headers['Authorization']?.substring(0, 30) + '...',
        allHeaders: Object.keys(headers)
      });
      
      const response = await fetch(sessionEndpoint, {
        method: 'GET',
        credentials: 'omit', // JWT-only: No cookies needed
        headers: headers
      });
      
      console.log(`🔑 ProtectedRoute (${requiredRole}) - Response status:`, response.status);

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
          // If session check fails, fall back to localStorage (especially important for mobile)
          // On mobile devices (especially iOS), cookies may never work, so always check localStorage
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
                // For mobile devices, ALWAYS use localStorage fallback (cookies don't work)
                // For desktop, only use it if it's a recent login
                if (isMobile || isRecentLogin) {
                  setIsAuthenticated(true);
                  setUserRole(user.role || userRoleFromStorage);
                  console.log(`✅ ProtectedRoute: Using localStorage fallback for ${requiredRole} (${isMobile ? 'mobile device - cookies blocked' : 'recent login'})`);
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
        // On 401/403, try localStorage fallback for all roles (especially for mobile)
        // Mobile devices (especially iOS) can't use cookies, so always try localStorage
        if (isMobile || isRecentLogin) {
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
                console.log(`✅ ProtectedRoute: Using localStorage fallback after 401/403 for ${requiredRole} (${isMobile ? 'mobile device - cookies blocked' : 'recent login'})`);
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
            // For mobile devices, always use localStorage fallback (cookies don't work)
            // For desktop, only use it if it's a recent login
            const loginTimestamp = localStorage.getItem('loginTimestamp');
            const isMobile = /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent);
            const isRecentLogin = loginTimestamp && (Date.now() - parseInt(loginTimestamp)) < 5000;
            if (isMobile || isRecentLogin) {
              setIsAuthenticated(true);
              setUserRole(user.role || expectedRole);
              console.log(`✅ ProtectedRoute: Using localStorage fallback after error for ${requiredRole} (${isMobile ? 'mobile device - cookies blocked' : 'recent login'})`);
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


