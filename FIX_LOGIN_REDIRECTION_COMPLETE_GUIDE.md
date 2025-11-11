# Complete Guide: Fix Login Redirection & Token Issues

## 🎯 Goal
Fix authentication so that **all users (admin, staff, customer) can successfully log in and be redirected to their respective dashboards** with proper token handling.

---

## 🔍 Current Issues

1. **Authorization header not being sent** with `check-session` requests
2. **Tokens not appearing in localStorage** after login
3. **401 Unauthorized errors** when accessing protected routes
4. **Old build files being cached** (browser loading `index-D9BaVIO-.js` instead of new build)

---

## ✅ Step-by-Step Fix

### Step 1: Verify Backend CORS Configuration

**File:** `backend/server.js`

**Check:**
- ✅ `credentials: true` is set (allows Authorization header)
- ✅ Your custom domain is in allowed origins:
  ```javascript
  origin === 'https://mauricios-cafe-bakery.shop' ||
  origin === 'https://www.mauricios-cafe-bakery.shop'
  ```
- ✅ `Authorization` header is in `allowedHeaders` array

**Current Status:** ✅ Already fixed - custom domain added

---

### Step 2: Verify Frontend Axios Interceptor

**File:** `frontend/src/utils/axiosInstance.ts`

**Check:**
- ✅ Interceptor is registered: `console.log('🔧 REGISTERING AXIOS REQUEST INTERCEPTOR...')`
- ✅ Token is retrieved from localStorage: `localStorage.getItem('authToken')`
- ✅ Authorization header is set in multiple ways:
  ```typescript
  (config.headers as any)['Authorization'] = bearerToken;
  (config.headers as any)['authorization'] = bearerToken;
  ```
- ✅ `withCredentials: false` is set (JWT-only, no cookies)

**Current Status:** ✅ Already implemented with extensive logging

---

### Step 3: Verify Token Saving After Login

**Files to check:**
- `frontend/src/utils/authUtils.ts` - `customerLogin()`, `adminLogin()`, `staffLogin()`
- `frontend/src/components/ui/login-form.tsx` - Customer login
- `frontend/src/components/admin/AdminAuthForm.tsx` - Admin login
- `frontend/src/components/staff/StaffAuthForm.tsx` - Staff login

**What to verify:**
1. ✅ Token is saved immediately after receiving response:
   ```typescript
   localStorage.setItem('authToken', data.token);
   localStorage.setItem('customerUser', JSON.stringify(data.user));
   localStorage.setItem('loginTimestamp', Date.now().toString());
   ```

2. ✅ Token is verified after saving:
   ```typescript
   const savedToken = localStorage.getItem('authToken');
   if (savedToken !== data.token) {
     // Retry logic
   }
   ```

3. ✅ Redirect happens AFTER token is confirmed saved:
   ```typescript
   // Wait for localStorage to sync
   await new Promise(resolve => setTimeout(resolve, 600));
   
   // Verify token exists before redirect
   const tokenCheck = localStorage.getItem('authToken');
   if (tokenCheck) {
     navigate(redirectPath, { replace: true });
   }
   ```

**Current Status:** ✅ Already implemented with retry logic

---

### Step 4: Verify ProtectedRoute Component

**File:** `frontend/src/components/auth/ProtectedRoute.tsx`

**What to check:**
1. ✅ For very recent logins (< 2 seconds), skip `check-session` and use localStorage:
   ```typescript
   const isVeryRecentLogin = loginTimestamp && (Date.now() - parseInt(loginTimestamp)) < 2000;
   if (isVeryRecentLogin && storedUser && storedToken) {
     // Use localStorage, skip check-session
     return;
   }
   ```

2. ✅ If `check-session` fails but token exists, fall back to localStorage:
   ```typescript
   catch (error) {
     // Fall back to localStorage if token exists
     if (storedToken && storedUser) {
       setIsAuthenticated(true);
     }
   }
   ```

**Current Status:** ✅ Already implemented

---

### Step 5: Clear Browser Cache & Test

**Critical:** The browser may still be loading old build files.

**Steps:**
1. **Hard refresh:**
   - Windows: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

2. **Or clear cache completely:**
   - Open DevTools (F12)
   - Right-click refresh button
   - Select "Empty Cache and Hard Reload"

3. **Or use Incognito/Private mode:**
   - This ensures no cached files are used

4. **Check Network tab:**
   - Look for `index-*.js` file
   - Should be `index-XSgD9sma.js` (NOT `index-D9BaVIO-.js`)

---

### Step 6: Verify Console Logs

After login, check browser console for:

**✅ Good signs:**
- `🔧 REGISTERING AXIOS REQUEST INTERCEPTOR...`
- `🌐 AXIOS REQUEST INTERCEPTOR FIRED:`
- `🔍 AXIOS INTERCEPTOR - check-session request:` with `hasToken: true`
- `✅ AXIOS REQUEST - Authorization header attached`
- `🔍 FINAL CHECK - Config being returned:` with `hasAuthorization: true`

**❌ Bad signs:**
- `⚠️ AXIOS REQUEST - No token found for protected endpoint`
- `❌ CRITICAL: Authorization header NOT SET`
- `❌ OLD BUILD SCRIPT DETECTED`

---

### Step 7: Verify Network Tab

1. Open DevTools → Network tab
2. Try to log in
3. Find the `check-session` request
4. Click on it
5. Check **Request Headers** section
6. **Should see:** `Authorization: Bearer eyJhbGc...` (long token)

**If Authorization header is missing:**
- The axios interceptor isn't running (old build issue)
- Token isn't in localStorage (timing issue)
- Header is being stripped (CORS issue)

---

### Step 8: Verify localStorage

1. Open DevTools → Application → Local Storage
2. After login, check for:
   - ✅ `authToken` - Should have a long JWT token
   - ✅ `customerUser` / `adminUser` / `staffUser` - Should have user data
   - ✅ `loginTimestamp` - Should have recent timestamp
   - ✅ `buildVersion` - Should be `XSgD9sma-v2`

**If tokens are missing:**
- Login function isn't saving properly
- localStorage is blocked (check browser settings)
- Timing issue (token saved after redirect)

---

## 🔧 Quick Fixes

### Fix 1: Force New Build to Load

If browser is still loading old build:

1. **In browser console, run:**
   ```javascript
   localStorage.setItem('buildVersion', 'force-reload-' + Date.now());
   location.reload(true);
   ```

2. **Or manually clear:**
   - Application → Storage → Clear site data
   - Hard refresh

### Fix 2: Verify Token is Saved

**In browser console after login:**
```javascript
console.log('Token:', localStorage.getItem('authToken'));
console.log('User:', localStorage.getItem('customerUser'));
console.log('Timestamp:', localStorage.getItem('loginTimestamp'));
```

**Should see:**
- Token: Long JWT string starting with `eyJ...`
- User: JSON string with user data
- Timestamp: Recent number (milliseconds since epoch)

### Fix 3: Manually Set Authorization Header (Temporary Test)

**In browser console:**
```javascript
// Test if manual header works
fetch('https://mauricios-cafe-bakery.onrender.com/api/customer/check-session', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('authToken')
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

**If this works but axios doesn't:**
- Axios interceptor issue
- Old build problem

---

## 📋 Testing Checklist

After implementing fixes, test each user type:

### Customer Login
- [ ] Login form accepts email/password
- [ ] Token appears in localStorage immediately
- [ ] Redirects to `/customer/dashboard`
- [ ] No 401 errors in console
- [ ] Dashboard loads successfully

### Admin Login
- [ ] Login form accepts email/password
- [ ] Token appears in localStorage immediately
- [ ] Redirects to `/admin/dashboard`
- [ ] No 401 errors in console
- [ ] Dashboard loads successfully

### Staff Login
- [ ] Login form accepts email/password
- [ ] Token appears in localStorage immediately
- [ ] Redirects to `/staff/dashboard`
- [ ] No 401 errors in console
- [ ] Dashboard loads successfully

---

## 🚨 Common Issues & Solutions

### Issue: "401 Unauthorized" on check-session

**Causes:**
1. Authorization header not sent
2. Token expired or invalid
3. Token not in localStorage when request is made

**Solutions:**
1. Check Network tab - is Authorization header present?
2. Check localStorage - is token there?
3. Check console - are interceptor logs showing?
4. Hard refresh to load new build

### Issue: "Token not in localStorage"

**Causes:**
1. Login function not saving token
2. Timing issue - redirect happens before save
3. localStorage blocked by browser

**Solutions:**
1. Add delays before redirect (already implemented)
2. Verify token after save (already implemented)
3. Check browser settings - allow localStorage

### Issue: "Old build still loading"

**Causes:**
1. Browser cache
2. Vercel serving cached build
3. Service worker cache

**Solutions:**
1. Hard refresh (`Ctrl + Shift + R`)
2. Clear browser cache completely
3. Use Incognito mode
4. Wait for Vercel to rebuild (check dashboard)

---

## 🎯 Expected Behavior After Fix

1. **User logs in** → Token saved to localStorage immediately
2. **Redirect happens** → After 600-800ms delay (ensures localStorage sync)
3. **ProtectedRoute checks auth** → Uses localStorage for recent logins (< 2s)
4. **Background check-session** → Runs after 5 seconds with Authorization header
5. **Dashboard loads** → User sees their dashboard successfully

---

## 📝 Summary

**All fixes are already implemented in the codebase:**
- ✅ CORS allows custom domain
- ✅ Axios interceptor adds Authorization header
- ✅ Token saving with retry logic
- ✅ ProtectedRoute handles recent logins
- ✅ Cache-busting script for old builds

**What you need to do:**
1. **Wait for Vercel to rebuild** (check dashboard)
2. **Hard refresh browser** (`Ctrl + Shift + R`)
3. **Test login** for each user type
4. **Check console logs** to verify interceptor is running
5. **Check Network tab** to verify Authorization header is sent

**If still not working:** 
- Check Vercel deployment status
- Verify new build hash in Network tab
- Check browser console for errors
- Verify localStorage has tokens after login




