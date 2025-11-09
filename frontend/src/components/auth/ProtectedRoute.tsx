import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';

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
      
      // FIRST: Check localStorage BEFORE any network call (critical for mobile)
      // On mobile devices (especially iOS), cookies DON'T work for cross-origin requests
      // So we MUST use localStorage + JWT token as PRIMARY authentication method
      const loginTimestamp = localStorage.getItem('loginTimestamp');
      const isMobile = /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent);
      const recentLoginWindow = isMobile ? 30000 : 20000; // Increased to 20 seconds for desktop (was 10)
      const isRecentLogin = loginTimestamp && (Date.now() - parseInt(loginTimestamp)) < recentLoginWindow;
      
      // ⭐ CRITICAL: If login is VERY recent (< 2 seconds), ALWAYS skip check-session
      const isVeryRecentLogin = loginTimestamp && (Date.now() - parseInt(loginTimestamp)) < 2000;
      
      // ⭐ CRITICAL: If loginTimestamp is VERY recent (less than 3 seconds), wait longer for localStorage to sync
      if (loginTimestamp) {
        const timeSinceLogin = Date.now() - parseInt(loginTimestamp);
        if (timeSinceLogin < 3000) {
          const waitTime = timeSinceLogin < 1000 ? 1000 : 500; // Wait 1 second if < 1 second old, else 500ms
          console.log(`⏳ ProtectedRoute: Very recent loginTimestamp (${timeSinceLogin}ms) - waiting ${waitTime}ms for localStorage sync...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
          // After waiting, check again - if still very recent, skip check-session entirely
          const timeAfterWait = Date.now() - parseInt(loginTimestamp);
          if (timeAfterWait < 2000) {
            console.log(`⏳ ProtectedRoute: Still very recent (${timeAfterWait}ms) - will use localStorage only, skip check-session`);
          }
        }
      }
      
      // ⭐ CRITICAL: For very recent logins (< 2 seconds), ALWAYS use localStorage and skip check-session
      // This prevents 401 errors when token is still being saved
      if (isVeryRecentLogin) {
        let storedUser = null;
        let storedToken = null;
        
        if (requiredRole === 'customer') {
          storedUser = localStorage.getItem('customerUser');
          storedToken = localStorage.getItem('authToken');
        } else if (requiredRole === 'admin') {
          storedUser = localStorage.getItem('adminUser');
          storedToken = localStorage.getItem('authToken');
        } else if (requiredRole === 'staff') {
          storedUser = localStorage.getItem('staffUser');
          storedToken = localStorage.getItem('authToken');
        }
        
        if (storedUser && storedToken) {
          try {
            const user = JSON.parse(storedUser);
            if (user.role === requiredRole || (requiredRole === 'staff' && (user.role === 'staff' || user.role === 'admin'))) {
              setIsAuthenticated(true);
              setUserRole(user.role || requiredRole);
              setIsLoading(false);
              console.log(`✅ ProtectedRoute: VERY RECENT LOGIN (< 2s) - Using localStorage ONLY, SKIPPING check-session for ${requiredRole}`);
              return; // EXIT IMMEDIATELY - don't call check-session at all
            }
          } catch (e) {
            console.error('Failed to parse stored user:', e);
          }
        }
      }
      
      // For mobile devices, ALWAYS check localStorage first (cookies don't work)
      // For desktop, check localStorage if it's a recent login
      if (isMobile || isRecentLogin) {
        let storedUser = null;
        let storedToken = null;
        let sessionEndpoint = '';
        
        if (requiredRole === 'customer') {
          storedUser = localStorage.getItem('customerUser');
          storedToken = localStorage.getItem('authToken');
          sessionEndpoint = '/api/customer/check-session';
        } else if (requiredRole === 'admin') {
          storedUser = localStorage.getItem('adminUser');
          storedToken = localStorage.getItem('authToken');
          sessionEndpoint = '/api/admin/check-session';
        } else if (requiredRole === 'staff') {
          storedUser = localStorage.getItem('staffUser');
          storedToken = localStorage.getItem('authToken');
          sessionEndpoint = '/api/staff/check-session';
        }
        
        // ⭐ CRITICAL: If we have both user and token, use localStorage and SKIP check-session
        if (storedUser && storedToken) {
          try {
            const user = JSON.parse(storedUser);
            // Verify the role matches
            if (user.role === requiredRole || (requiredRole === 'staff' && (user.role === 'staff' || user.role === 'admin'))) {
              setIsAuthenticated(true);
              setUserRole(user.role || requiredRole);
              setIsLoading(false);
              console.log(`✅ ProtectedRoute: Using localStorage ONLY for ${requiredRole} (${isMobile ? 'mobile device - cookies blocked' : 'recent login'}) - SKIPPING check-session`);
              
              // Do session check in background ONLY after a delay (don't block navigation)
              if (sessionEndpoint) {
                setTimeout(async () => {
                  try {
                    const token = localStorage.getItem('authToken');
                    if (!token) {
                      console.log(`ProtectedRoute: No token for background check, skipping`);
                      return;
                    }
                    // Use axiosInstance which automatically adds Authorization header
                    const res = await axiosInstance.get(sessionEndpoint);
                    if (res.data && res.data.authenticated && res.data.user) {
                      console.log(`✅ ProtectedRoute: Background session verified for ${requiredRole}`);
                      if (loginTimestamp && Date.now() - parseInt(loginTimestamp) > 10000) {
                        localStorage.removeItem('loginTimestamp');
                      }
                    }
                  } catch (err) {
                    console.log(`ProtectedRoute: Background session check failed for ${requiredRole}, continuing with localStorage`);
                  }
                }, 5000); // Wait 5 seconds before background check
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
      let sessionEndpoint = '/api/admin/check-session';
      if (requiredRole === 'staff') {
        sessionEndpoint = '/api/staff/check-session';
      } else if (requiredRole === 'customer') {
        sessionEndpoint = '/api/customer/check-session';
      }

      // ⭐ CRITICAL: For recent logins, if we have localStorage data, DON'T call check-session
      // Only call check-session if localStorage doesn't have the user data
      if (isRecentLogin) {
        const timeSinceLogin = Date.now() - parseInt(loginTimestamp || '0');
        let hasLocalStorageData = false;
        
        if (requiredRole === 'customer') {
          hasLocalStorageData = !!(localStorage.getItem('customerUser') && localStorage.getItem('authToken'));
        } else if (requiredRole === 'admin') {
          hasLocalStorageData = !!(localStorage.getItem('adminUser') && localStorage.getItem('authToken'));
        } else if (requiredRole === 'staff') {
          hasLocalStorageData = !!(localStorage.getItem('staffUser') && localStorage.getItem('authToken'));
        }
        
        // If we have localStorage data for recent login, use it and skip check-session
        if (hasLocalStorageData) {
          console.log(`✅ ProtectedRoute: Recent login with localStorage data - using it, skipping check-session`);
          let storedUser = null;
          if (requiredRole === 'customer') {
            storedUser = localStorage.getItem('customerUser');
          } else if (requiredRole === 'admin') {
            storedUser = localStorage.getItem('adminUser');
          } else if (requiredRole === 'staff') {
            storedUser = localStorage.getItem('staffUser');
          }
          
          if (storedUser) {
            try {
              const user = JSON.parse(storedUser);
              if (user.role === requiredRole || (requiredRole === 'staff' && (user.role === 'staff' || user.role === 'admin'))) {
                setIsAuthenticated(true);
                setUserRole(user.role || requiredRole);
                setIsLoading(false);
                return; // EXIT - don't call check-session
              }
            } catch (e) {
              console.error('Failed to parse stored user:', e);
            }
          }
        }
        
        // If no localStorage data, wait for token to be saved
        console.log('⏳ ProtectedRoute: Recent login detected - waiting for token to be saved...');
        if (timeSinceLogin < 1000) {
          const waitTime = isMobile ? 800 : 600; // Longer wait for very recent logins
          console.log(`⏳ ProtectedRoute: Very recent login (${timeSinceLogin}ms ago) - waiting ${waitTime}ms`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          const waitTime = isMobile ? 500 : 300;
          console.log(`⏳ ProtectedRoute: Recent login (${timeSinceLogin}ms ago) - waiting ${waitTime}ms`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        // After waiting, verify token exists before proceeding
        const tokenAfterWait = localStorage.getItem('authToken');
        if (!tokenAfterWait) {
          console.warn('⚠️ ProtectedRoute: Token still not found after wait');
          // One more quick check
          await new Promise(resolve => setTimeout(resolve, 200));
        }
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
      
      // Use axiosInstance which automatically adds Authorization header
      console.log(`🔑 ProtectedRoute (${requiredRole}): Checking session with axiosInstance`);
      if (token) {
        console.log(`🔑 ProtectedRoute (${requiredRole}): Token exists, length:`, token.length);
      } else {
        console.warn(`⚠️ ProtectedRoute (${requiredRole}): No token in localStorage`);
      }
      
      const response = await axiosInstance.get(sessionEndpoint);
      
      console.log(`🔑 ProtectedRoute (${requiredRole}) - Response status:`, response.status);

      if (response.status === 200) {
        const data = response.data;
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
        // On 401/403, ALWAYS try localStorage fallback if token and user exist
        // This is critical for recent logins where check-session might fail
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
        
        // ⭐ CRITICAL: If we have token and user, use localStorage (especially for recent logins)
        if (storedUser && storedToken) {
          try {
            const user = JSON.parse(storedUser);
            // Verify the role matches
            if (user.role === requiredRole || (requiredRole === 'staff' && (user.role === 'staff' || user.role === 'admin'))) {
              const loginTimestampCheck = localStorage.getItem('loginTimestamp');
              const isRecentLoginCheck = loginTimestampCheck && (Date.now() - parseInt(loginTimestampCheck)) < 15000;
              
              // ⭐ ALWAYS use localStorage for recent logins or mobile devices
              if (isMobile || isRecentLoginCheck) {
                setIsAuthenticated(true);
                setUserRole(user.role || expectedRole);
                console.log(`✅ ProtectedRoute: Using localStorage fallback after 401/403 for ${requiredRole} (${isMobile ? 'mobile device' : 'recent login'})`);
                console.log(`⚠️ Note: check-session returned 401/403, but token exists - using localStorage`);
              } else {
                // For non-recent logins, fail authentication
                setIsAuthenticated(false);
              }
            } else {
              setIsAuthenticated(false);
            }
          } catch (e) {
            console.error('Failed to parse stored user:', e);
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
      }
    } catch (error: any) {
      console.error('Authentication check failed:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      // ⭐ CRITICAL: On ANY error (including 401), use localStorage if we have token and user
      // This is especially important for recent logins where check-session might fail
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
      
      // ⭐ CRITICAL: If we have both token and user, ALWAYS use localStorage for recent logins
      // This prevents redirect loops when check-session fails due to missing Authorization header
      if (storedUser && storedToken) {
        try {
          const user = JSON.parse(storedUser);
          // Verify the role matches
          if (user.role === requiredRole || (requiredRole === 'staff' && (user.role === 'staff' || user.role === 'admin'))) {
            const loginTimestamp = localStorage.getItem('loginTimestamp');
            const isMobileCheck = /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent);
            const isRecentLoginCheck = loginTimestamp && (Date.now() - parseInt(loginTimestamp)) < 15000; // 15 seconds
            
            // ⭐ ALWAYS use localStorage if it's a recent login OR mobile device
            if (isMobileCheck || isRecentLoginCheck) {
              setIsAuthenticated(true);
              setUserRole(user.role || expectedRole);
              console.log(`✅ ProtectedRoute: Using localStorage fallback after error for ${requiredRole} (${isMobileCheck ? 'mobile device' : 'recent login'})`);
              console.log(`⚠️ Note: check-session failed (${error.response?.status || 'network error'}), but token exists - using localStorage`);
            } else {
              // For non-recent logins, only fail if it's a 401/403 (not network error)
              if (error.response?.status === 401 || error.response?.status === 403) {
                setIsAuthenticated(false);
              } else {
                // Network error - use localStorage as fallback
                setIsAuthenticated(true);
                setUserRole(user.role || expectedRole);
                console.log(`✅ ProtectedRoute: Network error, using localStorage fallback for ${requiredRole}`);
              }
            }
          } else {
            setIsAuthenticated(false);
          }
        } catch (e) {
          console.error('Failed to parse stored user:', e);
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


