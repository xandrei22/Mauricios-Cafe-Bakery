# JWT Migration Status - Customer Authentication

## ✅ Current State: FULLY JWT-ONLY

### Backend Status
- ✅ **Customer Login** (`/api/customer/login`): JWT-only, NO sessions
  - Returns JWT token in response body
  - NO `req.session.customerUser` is set
  - NO `req.session.save()` is called
  
- ✅ **Customer Check-Session** (`/api/customer/check-session`): JWT-only
  - Uses `authenticateJWT` middleware
  - Requires `Authorization: Bearer <token>` header
  - NO session checks

- ✅ **Customer Logout** (`/api/customer/logout`): JWT-only
  - Simply returns success message
  - Client clears localStorage

### Frontend Status
- ✅ **Login Form**: Uses `customerLogin()` from `authUtils.ts`
  - Stores token in `localStorage.setItem('authToken', token)`
  - Stores user in `localStorage.setItem('customerUser', user)`
  
- ✅ **Axios Instance**: Configured for JWT
  - `withCredentials: false` (correct for JWT - we don't want cookies)
  - Automatically adds `Authorization: Bearer <token>` header
  - Token retrieved from `localStorage.getItem('authToken')`

## ⚠️ Important Clarifications

### Why `withCredentials: false` is CORRECT
- **JWT authentication does NOT use cookies**
- Setting `withCredentials: true` would try to send cookies, which we don't need
- The Authorization header is sent automatically by axios interceptor

### Why You Might See Cookies in Logs
- Old cookies from previous sessions may still exist in browser
- `express-session` middleware still runs (needed for Google OAuth)
- **But we IGNORE these cookies** - we only use JWT tokens

### The Real Issue
The problem is NOT sessions - it's that the **Authorization header isn't being sent/received**.

## 🔍 Debugging Steps

### 1. Check Frontend Logs
After login, you should see:
```
🔍 Axios Interceptor - localStorage keys: ['authToken', 'customerUser', ...]
✅ Axios: Added Authorization header to request: /api/customer/check-session
✅ Axios: Token length: 200+
✅ Axios: Full Authorization header: Bearer eyJhbGciOiJIUzI1NiIs...
```

### 2. Check Backend Logs
When check-session is called, you should see:
```
🔍 JWT Middleware - All headers: ['host', 'user-agent', 'authorization', ...]
🔍 JWT Middleware - Authorization header: Bearer eyJhbGciOiJIUzI1NiIs...
```

If you see:
```
❌ JWT Middleware: No Authorization header found
```
Then the header isn't being sent from frontend.

## 🚨 Common Issues

### Issue 1: Token Not Saved After Login
**Symptom**: `⚠️ Axios: No token found in localStorage`
**Fix**: Check that `customerLogin()` is being called and token is in response

### Issue 2: Authorization Header Not Sent
**Symptom**: Backend logs show `Authorization header: MISSING`
**Possible Causes**:
1. Token not in localStorage when axios interceptor runs
2. Axios interceptor not running (wrong axios instance used)
3. Browser blocking custom headers (CORS issue)

### Issue 3: CORS Blocking Authorization Header
**Symptom**: Header sent but not received
**Fix**: Ensure backend CORS config allows `Authorization` header:
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: false, // JWT doesn't need credentials
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

## ✅ Verification Checklist

- [ ] Customer login returns JWT token in response
- [ ] Token is saved to localStorage after login
- [ ] Axios interceptor logs show token exists
- [ ] Axios interceptor logs show Authorization header being added
- [ ] Backend JWT middleware logs show Authorization header received
- [ ] Check-session returns `{ success: true, authenticated: true, user: {...} }`
- [ ] No `req.session.customerUser` is set anywhere in customer routes

## 📝 Next Steps

1. **Test login flow** and check browser console for axios interceptor logs
2. **Check backend logs** for JWT middleware logs
3. **Verify CORS** allows Authorization header
4. **Clear browser cookies** to remove old session cookies (they're harmless but confusing)

## 🎯 Summary

**We are NOT using sessions for customer authentication.** We are using JWT tokens only. The cookies you see in logs are:
- Old cookies from before migration (harmless)
- Created by express-session middleware (for Google OAuth only)
- **Ignored by our JWT authentication system**

The real issue is ensuring the Authorization header is sent and received correctly.



