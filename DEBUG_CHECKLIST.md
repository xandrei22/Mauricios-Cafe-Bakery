# JWT Authentication Debug Checklist

## ✅ Configuration Verified

### Frontend (Axios Interceptor)
- ✅ `withCredentials: false` - Prevents cookies from being sent
- ✅ Authorization header automatically added from localStorage
- ✅ Comprehensive logging added

### Backend (JWT Middleware)
- ✅ Checks for Authorization header
- ✅ Verifies Bearer token format
- ✅ Comprehensive logging added

### Backend (CORS)
- ✅ `credentials: false` - JWT-only mode (no cookies)
- ✅ `allowedHeaders: ['Content-Type', 'Authorization', ...]` - Authorization header allowed
- ✅ All methods allowed

## 🔍 Expected Log Flow

### Step 1: User Logs In
**Frontend Console:**
```
✅ Customer login successful - Token saved
✅ Customer login - Token saved: YES
✅ Customer login - User saved: YES
```

**Backend Logs:**
```
🔐 CUSTOMER LOGIN REQUEST RECEIVED
⚠️ Email verification check disabled - allowing login
✅ Returns: { success: true, token: "...", user: {...} }
```

### Step 2: Token Saved to localStorage
**Frontend Console:**
```
✅ Customer login - Token saved: YES
✅ Customer login - User saved: YES
```

**Browser localStorage:**
- `authToken`: JWT token string
- `customerUser`: JSON string of user object
- `loginTimestamp`: Timestamp string

### Step 3: Dashboard Loads → Calls check-session
**Frontend Console (Axios Interceptor):**
```
🔍 Axios Interceptor running
✅ Token found in localStorage: true
✅ Token length: 200+ (or actual length)
🔍 Request URL: /api/customer/check-session
🔍 Request method: get
✅ Added Authorization header: Bearer eyJhbGciOiJIUzI1NiIs...
✅ Full Authorization header value: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Backend Logs (JWT Middleware):**
```
🔍 JWT Middleware - Headers: ['host', 'user-agent', 'authorization', ...]
✅ JWT Middleware: Authorization header received: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Step 4: Backend Verifies Token
**Backend Logs:**
```
✅ JWT verified successfully
✅ User authenticated: { id: X, email: "...", role: "customer" }
```

**Frontend Console:**
```
✅ AuthContext: Using checkCustomerSession (JWT)
✅ Response: { success: true, authenticated: true, user: {...} }
```

### Step 5: Dashboard Shows
**Frontend:**
- User state set: `setAuthenticated(true)`
- User data set: `setUser(data.user)`
- Dashboard renders with user data

## ❌ Common Issues & Solutions

### Issue 1: "No Authorization header found"
**Symptoms:**
- Backend logs: `❌ JWT Middleware: No Authorization header found`
- Frontend: 401 error

**Possible Causes:**
1. Token not in localStorage when interceptor runs
   - **Check:** Frontend console should show `✅ Token found in localStorage: false`
   - **Fix:** Ensure login saves token before redirect

2. Axios interceptor not running
   - **Check:** Frontend console should show `🔍 Axios Interceptor running`
   - **Fix:** Ensure using `axiosInstance` not `fetch` or `axios.create()`

3. CORS blocking Authorization header
   - **Check:** Backend CORS config includes `Authorization` in `allowedHeaders`
   - **Fix:** Verify CORS config matches checklist above

### Issue 2: "Token not found in localStorage"
**Symptoms:**
- Frontend console: `⚠️ No token found in localStorage`
- 401 error

**Possible Causes:**
1. Login didn't save token
   - **Check:** Login response includes `token` field
   - **Fix:** Verify `customerLogin()` saves token to localStorage

2. Token cleared before check-session
   - **Check:** localStorage keys in console
   - **Fix:** Don't clear token on page load

### Issue 3: "Invalid token" or "Token expired"
**Symptoms:**
- Backend logs: `Invalid token` or `Token has expired`
- 401 error

**Possible Causes:**
1. Token expired (1 day expiry)
   - **Fix:** Re-login to get new token

2. Wrong JWT_SECRET
   - **Fix:** Ensure backend `JWT_SECRET` matches token signing secret

## 🧪 Testing Steps

1. **Clear browser data:**
   - Clear localStorage
   - Clear cookies
   - Hard refresh (Ctrl+Shift+R)

2. **Login:**
   - Enter credentials
   - Check browser console for token save confirmation
   - Check localStorage in DevTools

3. **Check Dashboard Load:**
   - Watch browser console for axios interceptor logs
   - Watch backend logs for JWT middleware logs
   - Verify Authorization header is sent and received

4. **Verify Success:**
   - Dashboard should load
   - User data should display
   - No 401 errors

## 📝 Quick Verification Commands

**In Browser Console:**
```javascript
// Check token exists
localStorage.getItem('authToken')

// Check user exists
localStorage.getItem('customerUser')

// Check all localStorage keys
Object.keys(localStorage)
```

**In Backend (if you have access):**
```javascript
// Check JWT_SECRET is set
process.env.JWT_SECRET

// Check CORS config
console.log(corsOptions)
```



