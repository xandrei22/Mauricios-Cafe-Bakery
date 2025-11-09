# Frontend-Backend Communication Diagnostic

## Quick Diagnostic Steps

### Step 1: Check Browser Console
Open DevTools (F12) → Console tab and look for:

**✅ Good Signs:**
```
🔍 Axios Interceptor running
✅ Token found in localStorage: true
🔍 Request URL: /api/customer/login
🔍 Request method: post
✅ Added Authorization header: Bearer ...
```

**❌ Bad Signs:**
```
❌ Axios request error: ...
CORS error
Failed to fetch
net::ERR_FAILED
```

### Step 2: Check Network Tab
Open DevTools → Network tab → Filter by "Fetch/XHR"

**✅ Good Signs:**
- Requests show status `200` or `204`
- Request URL shows your backend URL: `https://mauricios-cafe-bakery.onrender.com/api/...`
- Request Headers include `Authorization: Bearer <token>`
- Response Headers include `Access-Control-Allow-Origin`

**❌ Bad Signs:**
- Status shows `CORS error` (red)
- Status shows `502 Bad Gateway`
- Status shows `net::ERR_FAILED`
- Request URL shows `localhost:5001` (in production)

### Step 3: Check VITE_API_URL
**In Vercel:**
1. Go to Vercel Dashboard → Your Project
2. Settings → Environment Variables
3. Check if `VITE_API_URL` is set
4. Value should be: `https://mauricios-cafe-bakery.onrender.com`

**In Browser Console:**
```javascript
// Run this in browser console
console.log('API URL:', import.meta.env.VITE_API_URL);
```

**Expected:**
- Production: `https://mauricios-cafe-bakery.onrender.com`
- Development: `http://localhost:5001` or your custom URL

### Step 4: Test Backend Directly
**In Browser:**
Open: `https://mauricios-cafe-bakery.onrender.com/api/health`

**Expected:**
- ✅ Returns JSON response → Backend is running
- ❌ 502 Bad Gateway → Backend is down
- ❌ CORS error → CORS config issue
- ❌ Timeout → Backend not accessible

### Step 5: Check Backend Logs
**On Render/Railway:**
Look for these messages:

**✅ Good Signs:**
```
Server running on http://localhost:5001
✅ Database connection pool established successfully
🔍 CORS Request: { origin: 'https://...', method: 'POST' }
✅ CORS: Headers applied to POST /api/customer/login
```

**❌ Bad Signs:**
```
❌ Failed to establish database connection pool
❌ CORS: Origin NOT allowed
❌ Server error: ...
```

## Common Issues & Fixes

### Issue 1: "Cannot connect to server"
**Possible Causes:**
1. Backend server not running
2. `VITE_API_URL` not set in Vercel
3. Backend URL incorrect
4. Network/firewall blocking

**Fixes:**
1. ✅ Check backend service status → Restart if needed
2. ✅ Set `VITE_API_URL` in Vercel → Redeploy frontend
3. ✅ Verify backend URL is correct
4. ✅ Check backend logs for errors

### Issue 2: CORS Errors
**Possible Causes:**
1. Frontend still sending `credentials: 'include'`
2. Backend CORS not configured correctly
3. Backend not restarted after CORS changes

**Fixes:**
1. ✅ Remove all `credentials: 'include'` from frontend
2. ✅ Verify backend CORS headers are applied
3. ✅ Restart backend server

### Issue 3: 401 Unauthorized
**Possible Causes:**
1. Token not in localStorage
2. Token not being sent in Authorization header
3. Token expired or invalid

**Fixes:**
1. ✅ Check `localStorage.getItem('authToken')` in console
2. ✅ Verify Authorization header in Network tab
3. ✅ Check backend logs for JWT verification errors

### Issue 4: Requests Going to localhost in Production
**Possible Causes:**
1. `VITE_API_URL` not set in Vercel
2. Frontend not rebuilt after setting env var
3. Browser cache showing old code

**Fixes:**
1. ✅ Set `VITE_API_URL` in Vercel environment variables
2. ✅ Redeploy frontend (Vercel auto-deploys on push)
3. ✅ Clear browser cache

## Verification Checklist

- [ ] Backend service is "Live" or "Running"
- [ ] Backend logs show "Server running on http://localhost:5001"
- [ ] Backend logs show "Database connection pool established successfully"
- [ ] `VITE_API_URL` is set in Vercel environment variables
- [ ] Frontend has been redeployed after setting `VITE_API_URL`
- [ ] Browser console shows correct API URL (not localhost in production)
- [ ] Network tab shows requests going to backend URL
- [ ] No `credentials: 'include'` in frontend code
- [ ] Backend CORS headers are being applied
- [ ] Browser cache cleared

## Test Commands

**In Browser Console:**
```javascript
// Check API URL
console.log('API URL:', import.meta.env.VITE_API_URL);

// Check token
console.log('Token:', localStorage.getItem('authToken'));

// Test API call
fetch('https://mauricios-cafe-bakery.onrender.com/api/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

**Expected Result:**
- API URL shows your backend URL
- Token exists (if logged in)
- Health check returns JSON response

