# CORS and 502 Error Fix Guide

## Current Issues

Based on the Network tab, you're seeing:
1. **CORS errors** - Multiple login requests blocked by CORS
2. **502 Bad Gateway** - Backend server not responding or crashed

## Why Both Errors?

### CORS Errors
- Browser blocks requests when CORS headers don't match
- Even if backend is running, wrong CORS config = CORS error
- Frontend sends `credentials: 'omit'` but backend might not be configured correctly

### 502 Bad Gateway
- Backend server is not running, OR
- Backend server crashed, OR
- Backend server is running but can't process requests (database connection failed, etc.)

## Fix Steps

### Step 1: Check Backend Server Status

**On Render/Railway:**
1. Go to your backend service dashboard
2. Check service status:
   - ✅ "Live" or "Running" = Server is up
   - ❌ "Stopped" or "Crashed" = Server is down

**If server is down:**
- Check logs for errors
- Look for: `❌ Failed to establish database connection pool`
- Look for: Syntax errors in server.js
- Restart the service

### Step 2: Verify Backend Logs

**Look for these messages:**
```
✅ Server running on http://localhost:5001
✅ Database connection pool established successfully
✅ CORS: Vercel origin allowed: https://mauricios-cafe-bakery-9z17uuwtf-josh-sayats-projects.vercel.app
```

**If you see errors:**
- Database connection failed → Fix database connection
- CORS origin not allowed → Add origin to allowed list
- Syntax error → Fix code and restart

### Step 3: Test Backend Directly

**Try accessing backend health endpoint:**
```
https://mauricios-cafe-bakery.onrender.com/api/health
```

**Expected results:**
- ✅ Returns JSON response → Backend is running
- ❌ 502 Bad Gateway → Backend is down
- ❌ CORS error → CORS config issue
- ❌ Timeout → Backend not accessible

### Step 4: Restart Backend After Code Changes

**After any server.js changes:**
1. **Render**: Go to service → Click "Manual Deploy" or "Restart"
2. **Railway**: Go to service → Click "Redeploy" or "Restart"
3. Wait for deployment to complete
4. Check logs to verify server started

### Step 5: Verify CORS Configuration

**Backend should log:**
```
🔍 CORS Request: { origin: 'https://...', method: 'POST', path: '/api/customer/login' }
✅ CORS: Vercel origin allowed: https://...
✅ CORS: Headers applied to POST /api/customer/login
```

**If you see:**
```
❌ CORS: Origin NOT allowed
```

**Fix:** The origin check should now allow all `.vercel.app` URLs automatically.

## Current CORS Configuration

The backend now:
- ✅ Allows all `*.vercel.app` URLs (including preview URLs)
- ✅ Sets `Access-Control-Allow-Credentials: false` (matches frontend `credentials: 'omit'`)
- ✅ Applies CORS headers to ALL responses (including errors)
- ✅ Handles preflight (OPTIONS) requests correctly

## Quick Checklist

- [ ] Backend service is "Live" or "Running"
- [ ] Backend logs show "Server running on http://localhost:5001"
- [ ] Backend logs show "Database connection pool established successfully"
- [ ] Backend logs show "✅ CORS: Vercel origin allowed" for your frontend URL
- [ ] Backend health endpoint returns response (not 502)
- [ ] Frontend is using latest code (cleared cache)
- [ ] All `credentials: 'include'` removed from frontend

## If Still Getting CORS Errors

1. **Check backend logs** - Look for CORS origin check messages
2. **Verify frontend URL** - Make sure it matches what backend sees
3. **Clear browser cache** - Old JavaScript might still have `credentials: 'include'`
4. **Check Network tab** - Look at request headers, should NOT have `credentials: include`

## If Still Getting 502 Errors

1. **Check backend service status** - Is it running?
2. **Check backend logs** - Any errors on startup?
3. **Check database connection** - Is database accessible?
4. **Restart backend service** - Sometimes a restart fixes it

## Expected Behavior After Fix

1. **Preflight (OPTIONS)**: Returns `204` ✅
2. **POST request**: Returns `200` with JSON response ✅
3. **No CORS errors** in Network tab ✅
4. **No 502 errors** ✅
5. **Login works** ✅

