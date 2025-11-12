# Admin Login Network Error Fix

## 🔍 Problem

Admin login shows "Network error. Please try again." - This means the frontend cannot communicate with the backend.

## ✅ Source Code is Correct

The admin login (`AdminAuthForm.tsx`) uses:
- ✅ `adminLogin()` from `authUtils.ts`
- ✅ Which uses `axiosInstance.post('/api/admin/login')`
- ✅ `axiosInstance` automatically adds Authorization header
- ✅ Uses `withCredentials: false` (correct for JWT)

**The source code is correct!** The issue is likely configuration or build-related.

---

## 🎯 Most Likely Causes

### 1. `VITE_API_URL` Not Set in Vercel (90% of cases)

**Check:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Look for `VITE_API_URL`
3. Should be: `https://mauricios-cafe-bakery.onrender.com` (NO trailing slash)

**If missing:**
- Add: `VITE_API_URL` = `https://mauricios-cafe-bakery.onrender.com`
- Apply to: All Environments
- **Redeploy** frontend

### 2. Frontend Build is Outdated

**The minified code you saw earlier was using old `fetch()` code.**

**Fix:**
- Push your latest changes to Git
- Vercel will auto-rebuild
- OR manually trigger rebuild in Vercel dashboard

### 3. Backend Not Running

**Check:**
- Visit: `https://mauricios-cafe-bakery.onrender.com/api/health`
- Should return: `{"success": true, "message": "Server is running"}`

### 4. CORS Still Blocking

**Check backend logs in Render:**
- Should see: `✅ CORS headers set for origin: https://mauricios-cafe-bakery.vercel.app`
- If you see CORS warnings, the backend CORS fix needs to be deployed

---

## 🔧 Step-by-Step Fix

### Step 1: Verify VITE_API_URL in Vercel

1. **Go to:** https://vercel.com/dashboard
2. **Select:** Your project "Mauricios-Cafe-Bakery"
3. **Go to:** Settings → Environment Variables
4. **Check:** `VITE_API_URL` exists and equals `https://mauricios-cafe-bakery.onrender.com`
5. **If missing/wrong:** Add/Update it
6. **Redeploy** frontend

### Step 2: Check Browser Console

**Open your deployed admin login page:**
1. Open DevTools (F12) → Console tab
2. Look for these logs:
   ```
   🌐 Axios instance configured with API URL: https://mauricios-cafe-bakery.onrender.com
   🌐 VITE_API_URL from env: https://mauricios-cafe-bakery.onrender.com
   ```

**If you see:**
- `VITE_API_URL from env: NOT SET` → Variable not set in Vercel
- `Axios instance configured with API URL: http://localhost:5001` → Using fallback (wrong!)

### Step 3: Check Network Tab

1. Open DevTools → Network tab
2. Try to login
3. Look for the request to `/api/admin/login`
4. **Check:**
   - **URL should be:** `https://mauricios-cafe-bakery.onrender.com/api/admin/login`
   - **NOT:** `mauricios-cafe-bakery.vercel.app/api/admin/login`
   - **Status:** Should be 200 (success) or 401 (wrong credentials)
   - **NOT:** CORS error or Network Error

### Step 4: Check Backend Logs

**In Render Dashboard → Logs:**
- Look for: `✅ CORS headers set for origin: https://mauricios-cafe-bakery.vercel.app`
- Look for: `🔐 ADMIN LOGIN REQUEST RECEIVED`
- If you don't see these, the request isn't reaching the backend

---

## 🐛 Common Issues

### Issue 1: Wrong API URL

**Symptom:** Network tab shows request going to `vercel.app` instead of `onrender.com`

**Fix:** `VITE_API_URL` not set or wrong value in Vercel

### Issue 2: CORS Error

**Symptom:** Network tab shows "CORS error" status

**Fix:** 
1. Deploy latest backend code (with CORS fixes)
2. Check backend logs for CORS messages
3. Verify `FRONTEND_URL` is set in Render

### Issue 3: Backend Not Running

**Symptom:** Network tab shows "Failed to fetch" or timeout

**Fix:**
1. Check Render dashboard - is backend service running?
2. Visit backend health endpoint directly
3. Wake up backend if it's sleeping

---

## ✅ Verification Checklist

After fixing:

- [ ] `VITE_API_URL` set in Vercel = `https://mauricios-cafe-bakery.onrender.com`
- [ ] Frontend redeployed (latest code)
- [ ] Browser console shows correct API URL
- [ ] Network tab shows request to `onrender.com` (not `vercel.app`)
- [ ] Backend logs show CORS headers being set
- [ ] Backend logs show login request received
- [ ] No CORS errors in Network tab

---

## 🎯 Quick Test

**Run this in browser console on admin login page:**

```javascript
// Check API URL configuration
console.log('=== ADMIN LOGIN DIAGNOSTIC ===');
console.log('1. VITE_API_URL:', import.meta.env.VITE_API_URL || 'NOT SET');
console.log('2. Expected backend:', 'https://mauricios-cafe-bakery.onrender.com');

// Test backend connection
fetch('https://mauricios-cafe-bakery.onrender.com/api/health')
  .then(r => r.json())
  .then(data => {
    console.log('3. Backend health:', data);
    console.log('✅ Backend is reachable!');
  })
  .catch(err => {
    console.error('❌ Backend is NOT reachable:', err);
  });
```

---

## 📋 Summary

**The admin login source code is correct** - it uses `axiosInstance` properly.

**The "Network error" is caused by:**
1. ❌ `VITE_API_URL` not set in Vercel (most likely)
2. ❌ Frontend build is outdated
3. ❌ Backend not running or not reachable
4. ❌ CORS still blocking (backend needs latest code deployed)

**Quick fix:**
1. Set `VITE_API_URL` in Vercel
2. Redeploy frontend
3. Check browser console for the `🌐` logs
4. Check Network tab for the actual request URL











