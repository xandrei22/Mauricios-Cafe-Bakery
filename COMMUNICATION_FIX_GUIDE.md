# Frontend-Backend Communication Fix Guide

## 🔍 Most Likely Issues

### Issue 1: `VITE_API_URL` Not Set or Wrong Value

**Check:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Look for `VITE_API_URL`
3. Should be: `https://mauricios-cafe-bakery.onrender.com` (NO trailing slash)

**If missing or wrong:**
- Add/Update: `VITE_API_URL` = `https://mauricios-cafe-bakery.onrender.com`
- Apply to: All Environments
- **Redeploy** frontend

### Issue 2: vercel.json Rewrite Conflict

Your `vercel.json` has:
```json
{
  "rewrites": [{
    "source": "/api/(.*)",
    "destination": "https://mauricios-cafe-bakery.onrender.com/api/$1"
  }]
}
```

**This is OK** - it's a fallback for relative URLs. But `axiosInstance` uses the full URL, so it bypasses this.

**However**, if `VITE_API_URL` is not set, the frontend might fall back to relative URLs which would use this rewrite.

### Issue 3: Backend URL Changed

**Verify your actual backend URL:**
1. Visit: `https://mauricios-cafe-bakery.onrender.com/api/health`
2. If it works, that's your backend URL
3. Make sure `VITE_API_URL` matches exactly

---

## ✅ Step-by-Step Fix

### Step 1: Verify Frontend Variable

**In Vercel:**
1. Dashboard → Your Project → Settings → Environment Variables
2. Find `VITE_API_URL`
3. Should be: `https://mauricios-cafe-bakery.onrender.com`
4. If wrong or missing, update it
5. **Redeploy** (push to Git or manual redeploy)

### Step 2: Verify Backend Variable

**In Render:**
1. Dashboard → Your Service → Environment
2. Find `FRONTEND_URL`
3. Should be: `https://mauricios-cafe-bakery.vercel.app`
4. If wrong or missing, update it
5. **Save** (auto-restarts)

### Step 3: Test in Browser

**Open your deployed frontend:**
1. Open DevTools (F12) → Console tab
2. Look for these logs:
   ```
   🌐 Axios instance configured with API URL: https://mauricios-cafe-bakery.onrender.com
   🌐 VITE_API_URL from env: https://mauricios-cafe-bakery.onrender.com
   ```

**If you see:**
- `VITE_API_URL from env: NOT SET` → Variable not set in Vercel
- `Axios instance configured with API URL: http://localhost:5001` → Using fallback (wrong!)

### Step 4: Test Network Request

1. Open DevTools → Network tab
2. Try to login
3. Check the request:
   - **URL should be:** `https://mauricios-cafe-bakery.onrender.com/api/customer/login`
   - **NOT:** `mauricios-cafe-bakery.vercel.app/api/customer/login`
   - **Headers should include:** `Authorization: Bearer ...`

---

## 🔧 Quick Diagnostic Script

**Run this in browser console on your deployed frontend:**

```javascript
// Check API URL configuration
console.log('=== FRONTEND-BACKEND COMMUNICATION DIAGNOSTIC ===');
console.log('1. VITE_API_URL from env:', import.meta.env.VITE_API_URL || 'NOT SET');
console.log('2. Current hostname:', window.location.hostname);
console.log('3. Expected backend URL:', 'https://mauricios-cafe-bakery.onrender.com');

// Check token
console.log('4. Auth token exists:', !!localStorage.getItem('authToken'));
console.log('5. Token length:', localStorage.getItem('authToken')?.length || 0);

// Test backend connection
fetch('https://mauricios-cafe-bakery.onrender.com/api/health')
  .then(r => r.json())
  .then(data => {
    console.log('6. Backend health check:', data);
    console.log('✅ Backend is reachable!');
  })
  .catch(err => {
    console.error('❌ Backend is NOT reachable:', err);
  });
```

---

## 📋 Variable Reference

### Frontend (Vercel) Needs:
```
VITE_API_URL=https://mauricios-cafe-bakery.onrender.com
```

### Backend (Render) Needs:
```
FRONTEND_URL=https://mauricios-cafe-bakery.vercel.app
CORS_ALLOWED_ORIGINS=https://mauricios-cafe-bakery.vercel.app
```

---

## 🎯 Most Common Fix

**90% of the time, the issue is:**

1. `VITE_API_URL` not set in Vercel
2. OR wrong value (has trailing slash, wrong URL, etc.)

**Fix:**
1. Go to Vercel → Settings → Environment Variables
2. Set `VITE_API_URL` = `https://mauricios-cafe-bakery.onrender.com`
3. Redeploy frontend
4. Check browser console for the `🌐` logs

---

## ✅ After Fixing

**You should see in browser console:**
```
🌐 Axios instance configured with API URL: https://mauricios-cafe-bakery.onrender.com
🌐 VITE_API_URL from env: https://mauricios-cafe-bakery.onrender.com
🌐 Current hostname: mauricios-cafe-bakery.vercel.app
```

**And in Network tab:**
- Request URL: `https://mauricios-cafe-bakery.onrender.com/api/customer/login`
- Request Headers: `Authorization: Bearer eyJhbGciOiJ...`













