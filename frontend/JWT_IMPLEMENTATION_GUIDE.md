# JWT Authentication Implementation Guide

This document provides a complete guide to the JWT-based authentication system implemented for admin, staff, and customer roles.

## Overview

The application now uses **JWT (JSON Web Tokens)** for authentication instead of session cookies. This ensures reliable authentication across all devices, including mobile (iPhone, iPad, Android) where cross-origin cookies are often blocked.

## Key Components

### 1. Axios Instance (`src/utils/axiosInstance.ts`)

The axios instance automatically:
- Adds `Authorization: Bearer <token>` header to all requests
- Handles token expiration (401/403 responses)
- Automatically redirects to login page when token is invalid

**Usage:**
```typescript
import axiosInstance from '../utils/axiosInstance';

// All requests automatically include Authorization header
const response = await axiosInstance.get('/api/customer/dashboard');
const response = await axiosInstance.post('/api/customer/orders', orderData);
```

### 2. Auth Utilities (`src/utils/authUtils.ts`)

Provides login, logout, and session check functions for all roles.

#### Admin Functions

```typescript
import { adminLogin, adminLogout, checkAdminSession } from '../utils/authUtils';

// Login
const data = await adminLogin(usernameOrEmail, password);
// Returns: { success: true, token: string, user: {...} }
// Automatically stores token and user in localStorage

// Logout
await adminLogout();
// Clears token and user from localStorage

// Check Session
const session = await checkAdminSession();
// Returns: { success: true, authenticated: true, user: {...} }
// Or: { success: false, authenticated: false } if token expired
```

#### Staff Functions

```typescript
import { staffLogin, staffLogout, checkStaffSession } from '../utils/authUtils';

// Login
const data = await staffLogin(usernameOrEmail, password);

// Logout
await staffLogout();

// Check Session
const session = await checkStaffSession();
```

#### Customer Functions

```typescript
import { customerLogin, customerLogout, checkCustomerSession } from '../utils/authUtils';

// Login
const data = await customerLogin(email, password, hasTable?, hasRedirect?);

// Logout
await customerLogout();

// Check Session
const session = await checkCustomerSession();
```

#### Utility Functions

```typescript
import { getCurrentUser, getCurrentUserRole, isAuthenticated, clearAuthData } from '../utils/authUtils';

// Get current user from localStorage
const user = getCurrentUser();

// Get current user role
const role = getCurrentUserRole(); // 'admin' | 'staff' | 'customer' | null

// Check if user is authenticated
const authenticated = isAuthenticated(); // boolean

// Clear all auth data
clearAuthData();
```

## Sample Implementations

### Login Form Example (Admin)

```typescript
import { adminLogin } from '../utils/authUtils';
import { useNavigate } from 'react-router-dom';

async function handleLogin(e: React.FormEvent) {
  e.preventDefault();
  setLoading(true);
  
  try {
    const data = await adminLogin(usernameOrEmail, password);
    
    // Verify token was saved
    const savedToken = localStorage.getItem('authToken');
    if (!savedToken) {
      setError("Failed to save authentication token. Please try again.");
      return;
    }
    
    // Redirect to dashboard
    navigate("/admin/dashboard");
  } catch (err: any) {
    setError(err.response?.data?.message || err.message || "Login failed");
  } finally {
    setLoading(false);
  }
}
```

### Logout Example

```typescript
import { adminLogout } from '../utils/authUtils';
import { useNavigate } from 'react-router-dom';

async function handleLogout() {
  await adminLogout();
  navigate('/admin/login');
}
```

### Session Check Example

```typescript
import { checkAdminSession } from '../utils/authUtils';
import { useEffect, useState } from 'react';

function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function verifySession() {
      try {
        const session = await checkAdminSession();
        if (session.authenticated && session.user) {
          setUser(session.user);
        } else {
          // Redirect to login
          window.location.href = '/admin/login';
        }
      } catch (err) {
        // Redirect to login on error
        window.location.href = '/admin/login';
      } finally {
        setLoading(false);
      }
    }
    
    verifySession();
  }, []);
  
  if (loading) return <div>Loading...</div>;
  if (!user) return null;
  
  return <div>Welcome, {user.fullName}!</div>;
}
```

### Making Authenticated API Calls

All authenticated API calls should use `axiosInstance` which automatically includes the Authorization header:

```typescript
import axiosInstance from '../utils/axiosInstance';
import { getApiUrl } from '../utils/apiConfig';

// GET request
async function fetchDashboardData() {
  try {
    const response = await axiosInstance.get(`${getApiUrl()}/api/customer/dashboard`);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 401) {
      // Token expired - axios interceptor will handle redirect
      throw new Error('Session expired');
    }
    throw error;
  }
}

// POST request
async function createOrder(orderData: any) {
  try {
    const response = await axiosInstance.post(`${getApiUrl()}/api/customer/orders`, orderData);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 401) {
      throw new Error('Session expired');
    }
    throw error;
  }
}
```

## Token Storage

- **Location**: `localStorage`
- **Key**: `authToken`
- **User Data Keys**:
  - Admin: `adminUser`
  - Staff: `staffUser`
  - Customer: `customerUser`
- **Additional**: `loginTimestamp` (optional, for debugging)

## Token Expiration Handling

The axios interceptor automatically handles token expiration:

1. **401 Unauthorized**: Token expired or invalid
   - Clears localStorage
   - Redirects to appropriate login page based on current route

2. **403 Forbidden**: Access denied
   - Logs warning
   - Request fails (component should handle)

## Migration Checklist

- [x] Install axios
- [x] Create axios instance with interceptors
- [x] Create auth utility functions
- [x] Update admin login form
- [x] Update staff login form
- [x] Update customer login form
- [x] Update session check hooks
- [ ] Update all authenticated API calls to use axiosInstance
- [ ] Update logout handlers
- [ ] Test on mobile devices (iPhone, iPad, Android)

## Notes

- **Mobile Compatibility**: JWT tokens in localStorage work reliably on all mobile devices, unlike cookies which are often blocked by ITP (Intelligent Tracking Prevention) on iOS Safari.
- **Automatic Token Injection**: The axios instance automatically adds the Authorization header to all requests, so you don't need to manually add it.
- **Error Handling**: The axios interceptor handles 401/403 responses automatically, but you should still handle other errors in your components.



