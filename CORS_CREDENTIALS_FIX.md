# CORS Credentials Fix - Critical Issue

## ❌ Current Error

```
Access to fetch at 'https://mauricios-cafe-bakery.onrender.com/api/...' 
from origin 'https://mauricios-cafe-bakery.vercel.app' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: 
The value of the 'Access-Control-Allow-Credentials' header in the response is '' 
which must be 'true' when the request's credentials mode is 'include'.
```

## 🔍 Root Cause

The **deployed frontend build on Vercel is outdated** and still using old code that sends:
- `credentials: 'include'` in fetch requests
- `withCredentials: true` in axios requests

But the backend is correctly configured for **JWT-only authentication** with:
- `credentials: false` in CORS options
- No `Access-Control-Allow-Credentials` header (correct for JWT-only)

## ✅ Solution

### 1. Source Code is Already Correct ✅

**Frontend (`axiosInstance.ts`):**
- ✅ `withCredentials: false` (line 18)
- ✅ Interceptor sets `config.withCredentials = false` (line 109)

**Backend (`server.js`):**
- ✅ `corsOptions.credentials: false` (line 183)
- ✅ No `Access-Control-Allow-Credentials` header set (correct for JWT-only)

### 2. Rebuild and Redeploy Frontend 🚀

The source code is correct, but **Vercel is serving an old build**. You need to:

```bash
cd capstone/frontend
npm run build
```

Then:
1. **Commit and push** to trigger Vercel auto-deploy:
   ```bash
   git add .
   git commit -m "Fix: Remove credentials from all API requests (JWT-only)"
   git push
   ```

2. **OR manually trigger** a redeploy in Vercel dashboard:
   - Go to Vercel dashboard
   - Select your project
   - Click "Redeploy" → "Use existing Build Cache" → "Redeploy"

### 3. Clear Browser Cache 🧹

After redeploy, users should:
1. **Hard refresh**: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. **Or clear cache**: Browser Settings → Clear browsing data → Cached images and files

## 🔍 Verification

After redeploy, check browser console:

1. **Login should work** without CORS errors
2. **Network tab** should show:
   - ✅ No `credentials: include` in request headers
   - ✅ `Authorization: Bearer <token>` header present
   - ✅ Status 200 (not CORS error)

3. **Console logs** should show:
   - ✅ `🔍🔍🔍 AXIOS INTERCEPTOR RUNNING FOR CHECK-SESSION 🔍🔍🔍`
   - ✅ `🔑🔑🔑 AUTHORIZATION HEADER SET 🔑🔑🔑`
   - ❌ No CORS errors

## 📝 Why This Happens

1. **Old Build**: Vercel cached an old build that had `credentials: 'include'`
2. **Browser Cache**: Users' browsers cached the old JavaScript bundle
3. **CDN Cache**: Vercel's CDN may have cached the old build

## ⚠️ Important Notes

- **Backend is correct** - no changes needed
- **Source code is correct** - no changes needed
- **Only need to rebuild/redeploy frontend** to update the deployed build

## 🎯 Quick Fix Checklist

- [ ] Rebuild frontend: `cd capstone/frontend && npm run build`
- [ ] Commit and push changes
- [ ] Wait for Vercel deployment to complete
- [ ] Clear browser cache
- [ ] Test login (customer, admin, staff)
- [ ] Verify no CORS errors in console
- [ ] Verify `Authorization` header is present in Network tab
