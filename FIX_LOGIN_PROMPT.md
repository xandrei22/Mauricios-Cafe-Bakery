# 🔧 PROMPT: Fix Login Redirection & Token Issues

## Your Task
Fix the authentication system so that **all users (admin, staff, customer) can successfully log in and be automatically redirected to their respective dashboards** with proper token handling in request headers.

---

## Current Problems
1. Users log in successfully but get **401 Unauthorized** errors
2. **Authorization header is missing** from `check-session` requests
3. **Tokens are not appearing in localStorage** after login
4. Users are **not redirected to dashboards** after successful login
5. Browser is **loading old cached build files** (`index-D9BaVIO-.js`)

---

## Files to Check & Fix

### 1. Backend CORS Configuration
**File:** `backend/server.js` (lines 35-72)

**Verify:**
- ✅ `credentials: true` is set
- ✅ Your domain is allowed: `origin === 'https://mauricios-cafe-bakery.shop'`
- ✅ `Authorization` is in `allowedHeaders` array

**If missing, add:**
```javascript
origin === 'https://mauricios-cafe-bakery.shop' ||
origin === 'https://www.mauricios-cafe-bakery.shop'
```

---

### 2. Frontend Axios Interceptor
**File:** `frontend/src/utils/axiosInstance.ts`

**Verify the interceptor:**
1. Is registered and logs: `🔧 REGISTERING AXIOS REQUEST INTERCEPTOR...`
2. Retrieves token: `const token = localStorage.getItem('authToken');`
3. Sets Authorization header:
   ```typescript
   if (token && token.trim()) {
     const bearerToken = `Bearer ${token.trim()}`;
     (config.headers as any)['Authorization'] = bearerToken;
     (config.headers as any)['authorization'] = bearerToken;
   }
   ```
4. Logs for check-session requests to verify header is set

**If missing, add logging:**
```typescript
if (config.url && config.url.includes('/check-session')) {
  console.log('🔍 AXIOS INTERCEPTOR - check-session request:', {
    hasToken: !!token,
    headerSet: !!(config.headers['Authorization'])
  });
}
```

---

### 3. Token Saving After Login
**Files:**
- `frontend/src/utils/authUtils.ts` - `customerLogin()`, `adminLogin()`, `staffLogin()`
- `frontend/src/components/ui/login-form.tsx`
- `frontend/src/components/admin/AdminAuthForm.tsx`
- `frontend/src/components/staff/StaffAuthForm.tsx`

**Verify:**
1. Token is saved immediately after receiving response:
   ```typescript
   localStorage.setItem('authToken', data.token);
   localStorage.setItem('customerUser', JSON.stringify(data.user));
   localStorage.setItem('loginTimestamp', Date.now().toString());
   ```

2. Token is verified after saving:
   ```typescript
   const savedToken = localStorage.getItem('authToken');
   if (savedToken !== data.token) {
     // Retry saving
   }
   ```

3. Redirect happens AFTER token is confirmed:
   ```typescript
   // Wait for localStorage sync
   await new Promise(resolve => setTimeout(resolve, 600));
   
   // Verify before redirect
   const tokenCheck = localStorage.getItem('authToken');
   if (tokenCheck) {
     navigate('/customer/dashboard', { replace: true });
   }
   ```

---

### 4. ProtectedRoute Component
**File:** `frontend/src/components/auth/ProtectedRoute.tsx`

**Verify:**
1. For very recent logins (< 2 seconds), uses localStorage and skips check-session:
   ```typescript
   const isVeryRecentLogin = loginTimestamp && (Date.now() - parseInt(loginTimestamp)) < 2000;
   if (isVeryRecentLogin && storedUser && storedToken) {
     setIsAuthenticated(true);
     return; // Skip check-session
   }
   ```

2. If check-session fails, falls back to localStorage:
   ```typescript
   catch (error) {
     if (storedToken && storedUser) {
       setIsAuthenticated(true); // Use localStorage
     }
   }
   ```

---

### 5. Clear Browser Cache
**Critical:** Old build files must be cleared.

**Steps:**
1. Open DevTools (F12)
2. Right-click refresh button → "Empty Cache and Hard Reload"
3. OR use Incognito/Private window
4. OR manually: `localStorage.clear(); location.reload(true);`

---

## Testing Steps

### Test Customer Login
1. Go to: `https://mauricios-cafe-bakery.shop/login`
2. Enter credentials and click "Login"
3. **Check browser console:**
   - Should see: `🔧 REGISTERING AXIOS REQUEST INTERCEPTOR...`
   - Should see: `✅ CUSTOMER TOKEN SAVED SUCCESSFULLY`
   - Should see: `🔍 AXIOS INTERCEPTOR - check-session request:` with `hasToken: true`
4. **Check Network tab:**
   - Find `check-session` request
   - Verify `Authorization: Bearer ...` header exists
5. **Check localStorage:**
   - `authToken` should exist
   - `customerUser` should exist
6. **Expected:** Redirects to `/customer/dashboard` with no 401 errors

### Test Admin Login
1. Go to: `https://mauricios-cafe-bakery.shop/admin/login`
2. Enter credentials and click "Login"
3. **Expected:** Redirects to `/admin/dashboard` with no 401 errors

### Test Staff Login
1. Go to: `https://mauricios-cafe-bakery.shop/staff/login`
2. Enter credentials and click "Login"
3. **Expected:** Redirects to `/staff/dashboard` with no 401 errors

---

## Debug Commands

### Check localStorage (Run in browser console)
```javascript
console.log('Token:', localStorage.getItem('authToken') ? 'EXISTS' : 'MISSING');
console.log('User:', localStorage.getItem('customerUser') || localStorage.getItem('adminUser') || localStorage.getItem('staffUser') ? 'EXISTS' : 'MISSING');
console.log('Build:', localStorage.getItem('buildVersion'));
```

### Check if Authorization header is sent
1. Open Network tab
2. Try to log in
3. Find `check-session` request
4. Click it → Headers tab
5. Look for `Authorization: Bearer ...` in Request Headers

### Force new build to load
```javascript
// Run in browser console
localStorage.setItem('buildVersion', 'force-reload-' + Date.now());
location.reload(true);
```

---

## Success Criteria

✅ **All users can:**
1. Log in successfully
2. See token in localStorage immediately after login
3. Be automatically redirected to their dashboard
4. See no 401 errors in console
5. Dashboard loads completely

✅ **Console shows:**
- `🔧 REGISTERING AXIOS REQUEST INTERCEPTOR...`
- `✅ TOKEN SAVED SUCCESSFULLY`
- `✅ AXIOS REQUEST - Authorization header attached`

✅ **Network tab shows:**
- `check-session` request has `Authorization: Bearer ...` header
- Status is `200 OK` (not `401 Unauthorized`)

---

## If Still Not Working

1. **Check Vercel deployment:**
   - Is latest deployment "Ready"?
   - Did build complete successfully?

2. **Check Render backend:**
   - Is service "Live"?
   - Are CORS settings correct?

3. **Check browser:**
   - Is old build still loading? (check Network tab for `index-D9BaVIO-.js`)
   - Is localStorage blocked? (check browser settings)

4. **Check console errors:**
   - Any CORS errors?
   - Any network errors?
   - Any JavaScript errors?

---

## Quick Fix Checklist

- [ ] Backend CORS allows your domain
- [ ] Axios interceptor is registered and running
- [ ] Token is saved to localStorage after login
- [ ] Redirect happens after token is confirmed
- [ ] ProtectedRoute uses localStorage for recent logins
- [ ] Browser cache is cleared
- [ ] New build is loaded (not old `index-D9BaVIO-.js`)
- [ ] Authorization header is sent with requests
- [ ] No 401 errors in console
- [ ] All users can reach their dashboards

---

**Once all checkboxes are ✅, the login system should work perfectly!**




