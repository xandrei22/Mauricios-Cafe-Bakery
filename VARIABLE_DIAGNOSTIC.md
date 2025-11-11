# Variable Diagnostic - Frontend-Backend Communication

## 🔍 Critical Variables to Check

### Frontend (Vercel) - Required Variables

#### ✅ `VITE_API_URL` (MOST IMPORTANT)
- **Where:** Vercel Dashboard → Settings → Environment Variables
- **Should be:** `https://mauricios-cafe-bakery.onrender.com`
- **Purpose:** Tells frontend where the backend is located
- **Used by:** `frontend/src/utils/apiConfig.ts` and `frontend/src/utils/axiosInstance.ts`

**Check if set:**
1. Go to Vercel Dashboard
2. Your Project → Settings → Environment Variables
3. Look for `VITE_API_URL`
4. Value should be: `https://mauricios-cafe-bakery.onrender.com` (NO trailing slash)

---

### Backend (Render) - Required Variables

#### ✅ `FRONTEND_URL`
- **Where:** Render Dashboard → Environment Variables
- **Should be:** `https://mauricios-cafe-bakery.vercel.app`
- **Purpose:** Tells backend where frontend is (for CORS and redirects)
- **Used by:** `backend/server.js` (CORS configuration)

#### ✅ `CORS_ALLOWED_ORIGINS` (Optional but recommended)
- **Where:** Render Dashboard → Environment Variables
- **Should be:** `https://mauricios-cafe-bakery.vercel.app`
- **Purpose:** Explicitly allows frontend origin for CORS
- **Used by:** `backend/server.js` (CORS configuration)

---

## 🧪 How to Verify Variables

### Step 1: Check Frontend Console

Open your deployed frontend and check browser console (F12):

**Look for these logs:**
```
🌐 Axios instance configured with API URL: https://mauricios-cafe-bakery.onrender.com
🌐 VITE_API_URL from env: https://mauricios-cafe-bakery.onrender.com
🌐 Current hostname: mauricios-cafe-bakery.vercel.app
```

**If you see:**
- `VITE_API_URL from env: NOT SET` → Variable not set in Vercel
- `Axios instance configured with API URL: http://localhost:5001` → Using fallback (wrong!)

### Step 2: Check Backend Logs

Check Render backend logs for:

```
🌐 CORS Allowed Origins: [ 'https://mauricios-cafe-bakery.vercel.app', ... ]
🌐 FRONTEND_URL env: https://mauricios-cafe-bakery.vercel.app
```

**If you see:**
- `FRONTEND_URL env: not set` → Variable not set in Render

---

## 🔧 Quick Fix Checklist

### Frontend (Vercel)

1. **Go to:** https://vercel.com/dashboard
2. **Select:** Your project "Mauricios-Cafe-Bakery"
3. **Go to:** Settings → Environment Variables
4. **Check/Add:**
   - **Key:** `VITE_API_URL`
   - **Value:** `https://mauricios-cafe-bakery.onrender.com`
   - **Environment:** Production, Preview, Development (all)
5. **Save and Redeploy**

### Backend (Render)

1. **Go to:** https://dashboard.render.com
2. **Select:** Your service "Mauricios-Cafe-Bakery"
3. **Go to:** Environment
4. **Check/Add:**
   - **Key:** `FRONTEND_URL`
   - **Value:** `https://mauricios-cafe-bakery.vercel.app`
   - **Key:** `CORS_ALLOWED_ORIGINS` (optional)
   - **Value:** `https://mauricios-cafe-bakery.vercel.app`
5. **Save** (Render will auto-restart)

---

## 🐛 Common Variable Issues

### Issue 1: Variable Name Mismatch

**Frontend expects:** `VITE_API_URL` (with `VITE_` prefix)
**If you set:** `API_URL` → Won't work! ❌

**Fix:** Must be `VITE_API_URL` in Vercel

### Issue 2: Variable in Wrong Platform

**`VITE_API_URL` must be in Vercel** (frontend), NOT Render (backend)
**`FRONTEND_URL` must be in Render** (backend), NOT Vercel (frontend)

### Issue 3: Trailing Slash

**Wrong:** `https://mauricios-cafe-bakery.onrender.com/`
**Correct:** `https://mauricios-cafe-bakery.onrender.com` (no trailing slash)

### Issue 4: Wrong URL

**Check your actual backend URL:**
- Visit: https://mauricios-cafe-bakery.onrender.com/api/health
- If it works, that's your backend URL
- Make sure `VITE_API_URL` matches exactly

---

## 📋 Complete Variable Checklist

### Vercel (Frontend) Environment Variables

- [ ] `VITE_API_URL` = `https://mauricios-cafe-bakery.onrender.com`
  - ✅ No trailing slash
  - ✅ Matches your actual Render backend URL
  - ✅ Set for all environments (Production, Preview, Development)

### Render (Backend) Environment Variables

- [ ] `FRONTEND_URL` = `https://mauricios-cafe-bakery.vercel.app`
  - ✅ No trailing slash
  - ✅ Matches your actual Vercel frontend URL
- [ ] `CORS_ALLOWED_ORIGINS` = `https://mauricios-cafe-bakery.vercel.app` (optional)
- [ ] `JWT_SECRET` = (your secret)
- [ ] `SESSION_SECRET` = (your secret)
- [ ] Database variables (MYSQL_*)
- [ ] Email variables (EMAIL_*, BREVO_*)
- [ ] Google OAuth variables (GOOGLE_*)

---

## 🔍 Code References

### Frontend Uses These Variables

**File:** `frontend/src/utils/apiConfig.ts`
```typescript
const envApiUrl = import.meta.env.VITE_API_URL;  // ← Reads from Vercel env vars
```

**File:** `frontend/src/utils/axiosInstance.ts`
```typescript
const apiUrl = getApiUrl() || 'https://mauricios-cafe-bakery.onrender.com';
// getApiUrl() reads VITE_API_URL from import.meta.env
```

### Backend Uses These Variables

**File:** `backend/server.js`
```javascript
const allowedOrigins = [
    process.env.FRONTEND_URL,  // ← Reads from Render env vars
    "https://mauricios-cafe-bakery.vercel.app",
    // ...
];
```

---

## 🎯 Quick Test

### Test 1: Frontend Console
```javascript
// Open browser console on your deployed frontend
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
// Should show: https://mauricios-cafe-bakery.onrender.com
```

### Test 2: Backend Health
```
Visit: https://mauricios-cafe-bakery.onrender.com/api/health
Should return: {"success": true, "message": "Server is running"}
```

### Test 3: Network Tab
1. Open DevTools → Network tab
2. Try to login
3. Check the request URL - should be:
   - `https://mauricios-cafe-bakery.onrender.com/api/customer/login`
   - NOT `mauricios-cafe-bakery.vercel.app/api/customer/login`

---

## ✅ Summary

**Most likely issue:** `VITE_API_URL` not set or wrong value in Vercel

**Quick fix:**
1. Check Vercel → Settings → Environment Variables
2. Verify `VITE_API_URL` = `https://mauricios-cafe-bakery.onrender.com`
3. Redeploy frontend
4. Check browser console for the `🌐` logs








