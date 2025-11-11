# Frontend JWT Implementation Summary

## ✅ Current Implementation Status

### All User Types (Customer, Admin, Staff)

#### 1. **Login Flow** ✅
- **Customer**: `customerLogin()` in `authUtils.ts` (line 316)
- **Admin**: `adminLogin()` in `authUtils.ts` (line 72)
- **Staff**: `staffLogin()` in `authUtils.ts` (line 196)

**All login functions:**
- Use `axiosInstance.post()` to send credentials
- Receive JWT token in response
- Save token to `localStorage` as `authToken`
- Save user data to `localStorage` as `customerUser`/`adminUser`/`staffUser`
- Include retry logic (up to 10 attempts) to ensure token is saved
- Verify token is saved before returning

#### 2. **Token Storage** ✅
- Token stored in: `localStorage.getItem('authToken')`
- User data stored in: `localStorage.getItem('customerUser')` / `adminUser` / `staffUser`
- Login timestamp: `localStorage.getItem('loginTimestamp')`

#### 3. **API Requests** ✅
- **All API calls use `axiosInstance`** which automatically adds `Authorization: Bearer <token>` header
- **No direct `fetch()` calls** to API endpoints (except in commented-out code)
- Interceptor in `axiosInstance.ts` (line 23-117) adds Authorization header to ALL requests

#### 4. **Session Checking** ✅
- **Customer**: `checkCustomerSession()` in `authUtils.ts` (line 473) - uses `axiosInstance.get()`
- **Admin**: `checkAdminSession()` in `authUtils.ts` (line 140) - uses `axiosInstance.get()`
- **Staff**: `checkStaffSession()` in `authUtils.ts` (line 295) - uses `axiosInstance.get()`

#### 5. **Logout** ✅
- **Customer**: `customerLogout()` in `authUtils.ts` (line 456) - uses `axiosInstance.post()`
- **Admin**: `adminLogout()` in `authUtils.ts` (line 172) - uses `axiosInstance.post()`
- **Staff**: `staffLogout()` in `authUtils.ts` (line 278) - uses `axiosInstance.post()`
- All clear `localStorage` items: `authToken`, `customerUser`/`adminUser`/`staffUser`, `loginTimestamp`

### Axios Instance Configuration ✅

**File**: `capstone/frontend/src/utils/axiosInstance.ts`

- **Base URL**: Configured via `getApiUrl()` from `apiConfig.ts`
- **withCredentials**: `false` (JWT-only, no cookies)
- **Request Interceptor** (line 23-117):
  - Gets token from `localStorage.getItem('authToken')`
  - Adds `Authorization: Bearer <token>` header to ALL requests
  - Logs extensively for `check-session` requests for debugging
  - Ensures `withCredentials: false` is set

- **Response Interceptor** (line 120-176):
  - Handles 401 Unauthorized (token expired/invalid)
  - Clears auth data and redirects to login
  - Skips redirect for `check-session` endpoints

### Login Forms ✅

1. **Customer Login**: `components/ui/login-form.tsx`
   - Uses `customerLogin()` from `authUtils`
   - Verifies token is saved before redirecting
   - Includes retry logic (up to 10 attempts)

2. **Admin Login**: `components/admin/AdminAuthForm.tsx`
   - Uses `adminLogin()` from `authUtils`
   - Verifies token is saved before redirecting
   - Includes retry logic (up to 10 attempts)

3. **Staff Login**: `components/staff/StaffAuthForm.tsx`
   - Uses `staffLogin()` from `authUtils`
   - Verifies token is saved before redirecting
   - Includes retry logic (up to 10 attempts)

### Auth Context ✅

**File**: `components/customer/AuthContext.tsx`

- Uses `checkCustomerSession()` from `authUtils` (uses `axiosInstance`)
- Uses `customerLogout()` from `authUtils` (uses `axiosInstance`)
- No direct `fetch()` calls to API endpoints
- Includes localStorage fallback for mobile devices

## 🔧 How It Works

### Login Process:
1. User submits credentials
2. Frontend calls `customerLogin()` / `adminLogin()` / `staffLogin()`
3. Function uses `axiosInstance.post('/api/customer/login', ...)`
4. `axiosInstance` automatically adds `Authorization: Bearer <token>` header (if token exists)
5. Backend validates credentials and returns JWT token
6. Frontend saves token to `localStorage.setItem('authToken', token)`
7. Frontend verifies token is saved (with retry logic)
8. User is redirected to dashboard

### Authenticated Requests:
1. Frontend makes API call using `axiosInstance.get()` / `.post()` / etc.
2. Request interceptor runs automatically
3. Interceptor gets token from `localStorage.getItem('authToken')`
4. Interceptor adds `Authorization: Bearer <token>` header
5. Request is sent with Authorization header
6. Backend JWT middleware validates token
7. Request succeeds or fails based on token validity

## ⚠️ Important Notes

1. **No Cookies**: All authentication uses JWT tokens in `Authorization` header. No cookies are used (except for Google OAuth).

2. **localStorage**: Token is stored in `localStorage`, not `sessionStorage` or cookies.

3. **Automatic Header**: The `axiosInstance` interceptor automatically adds the Authorization header to ALL requests. No manual header setting needed.

4. **Token Expiry**: If backend returns 401, the response interceptor clears auth data and redirects to login.

5. **Mobile Support**: Includes special handling for mobile devices (iOS/Android) with localStorage fallback.

## 🚀 Deployment Checklist

Before deploying to production:

- [x] All login functions save token to localStorage
- [x] All API calls use `axiosInstance` (not direct `fetch()`)
- [x] `axiosInstance` has request interceptor that adds Authorization header
- [x] `axiosInstance` has `withCredentials: false`
- [x] All session check functions use `axiosInstance`
- [x] All logout functions use `axiosInstance`
- [x] No direct `fetch()` calls to API endpoints (except commented code)

## 📝 Next Steps

1. **Rebuild frontend**: `cd capstone/frontend && npm run build`
2. **Deploy to Vercel**: Push to GitHub or trigger manual deploy
3. **Test login**: Verify token is saved and Authorization header is sent
4. **Check browser console**: Look for interceptor logs confirming header is set
5. **Check Network tab**: Verify `Authorization: Bearer <token>` header is present in requests

## 🔍 Debugging

If Authorization header is missing:

1. Check browser console for interceptor logs:
   - `🔍🔍🔍 AXIOS INTERCEPTOR RUNNING FOR CHECK-SESSION 🔍🔍🔍`
   - `🔑🔑🔑 AUTHORIZATION HEADER SET 🔑🔑🔑`

2. Check localStorage:
   ```javascript
   localStorage.getItem('authToken')
   ```

3. Check Network tab:
   - Look for `Authorization` header in request headers
   - Verify header value is `Bearer <token>`

4. Verify `axiosInstance` is being used:
   - All API calls should use `axiosInstance.get()` / `.post()` / etc.
   - No direct `fetch()` calls to `/api/*` endpoints










