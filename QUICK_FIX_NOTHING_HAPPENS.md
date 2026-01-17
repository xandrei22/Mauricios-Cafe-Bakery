# Quick Fix: "Nothing Happens" When Clicking Google Login

## 🔍 Most Likely Issue: Frontend Environment Variable

If clicking "Login with Google" does **nothing**, the most common cause is:

**`VITE_API_URL` not set in Vercel OR frontend not rebuilt**

## ✅ Quick Fix Steps

### Step 1: Verify Vercel Environment Variable

1. Go to **Vercel Dashboard** → Your project → **Settings** → **Environment Variables**
2. Look for: `VITE_API_URL`
3. Value should be: `https://mauricios-cafe-bakery.onrender.com`
4. **If missing or wrong:**
   - Click **Add New**
   - Name: `VITE_API_URL`
   - Value: `https://mauricios-cafe-bakery.onrender.com`
   - Environment: **Production, Preview, Development** (all)
   - Click **Save**

### Step 2: Redeploy Frontend

**⚠️ CRITICAL:** After setting `VITE_API_URL`, you **MUST** redeploy!

1. Go to **Vercel Dashboard** → Your project → **Deployments**
2. Click the **three dots** (⋯) on the latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete

**Why?** Vite environment variables are baked into the build at build time. Changing them requires a rebuild.

### Step 3: Test the Button

1. Open your frontend: `https://mauricios-cafe-bakery.shop/customer-login`
2. Open **Browser DevTools** (F12) → **Console**
3. Type: `import.meta.env.VITE_API_URL`
4. Should show: `"https://mauricios-cafe-bakery.onrender.com"`
5. If `undefined` → Variable not set or frontend not rebuilt

### Step 4: Check Network Tab

1. Open **DevTools** → **Network** tab
2. Click **"Login with Google"** button
3. Should see a request to: `https://mauricios-cafe-bakery.onrender.com/api/auth/google`
4. If no request appears → Button not working (check console for errors)
5. If request goes to wrong URL → `VITE_API_URL` is wrong

## 🔍 Debugging Steps

### Check Browser Console

Open console and look for:
- **JavaScript errors** → Fix those first
- **CORS errors** → Backend CORS issue
- **Network errors** → Backend not reachable

### Check What URL the Button Uses

Add this temporary code to see what URL is being used:

1. Open browser console
2. Type:
   ```javascript
   // Check what getApiUrl() returns
   fetch('https://mauricios-cafe-bakery.onrender.com/api/health')
     .then(r => r.json())
     .then(console.log)
   ```
3. If this works → Backend is reachable
4. If this fails → Backend is down or CORS issue

### Test the Button Directly

In browser console, type:
```javascript
window.location.href = 'https://mauricios-cafe-bakery.onrender.com/api/auth/google';
```

If this redirects to Google → Backend is working, issue is with button
If this shows error → Backend issue

## ✅ Verification Checklist

- [ ] `VITE_API_URL` is set in Vercel
- [ ] Frontend has been **redeployed** after setting variable
- [ ] Browser console shows: `import.meta.env.VITE_API_URL` = correct URL
- [ ] Network tab shows request to backend when clicking button
- [ ] No JavaScript errors in console
- [ ] Backend is running (check Render dashboard)

## 🎯 Expected Behavior

When you click "Login with Google":

1. **Immediate redirect** to: `https://mauricios-cafe-bakery.onrender.com/api/auth/google`
2. **Then redirect** to: `accounts.google.com` (Google login page)
3. **After selecting account** → Redirects back to your app

If step 1 doesn't happen → `VITE_API_URL` issue
If step 2 doesn't happen → Backend OAuth configuration issue

---

**Most Common Fix:**
1. Set `VITE_API_URL=https://mauricios-cafe-bakery.onrender.com` in Vercel
2. Redeploy frontend
3. Test again





