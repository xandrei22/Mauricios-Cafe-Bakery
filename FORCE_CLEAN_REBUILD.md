# Force Clean Rebuild to Fix CORS Credentials Issue

## 🚨 Problem
Even after redeploy, the browser is still using cached JavaScript that sends `credentials: 'include'`.

## ✅ Solution: Force Clean Rebuild

### Step 1: Clear Vercel Build Cache

1. Go to Vercel Dashboard → Your Project
2. Go to **Settings** → **Build & Development Settings**
3. Scroll to **Build Cache**
4. Click **Clear Build Cache**
5. Confirm the action

### Step 2: Force Clean Rebuild

**Option A: Via Vercel Dashboard (Recommended)**
1. Go to **Deployments** tab
2. Click **⋯** (three dots) on latest deployment
3. Click **Redeploy**
4. **IMPORTANT**: Select **"Rebuild"** (NOT "Use existing Build Cache")
5. Wait for deployment to complete

**Option B: Via Git (Force New Build)**
```bash
cd capstone
# Make a small change to force new build
echo "# Force rebuild $(date)" >> capstone/frontend/src/.rebuild-trigger
git add .
git commit -m "Force clean rebuild - fix CORS credentials"
git push
```

### Step 3: Clear Browser Cache

**Chrome/Edge:**
1. Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
2. Select **"Cached images and files"**
3. Time range: **"All time"**
4. Click **Clear data**

**Or Hard Refresh:**
- `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Or `Ctrl+F5`

**Or Clear Site Data:**
1. Open DevTools (`F12`)
2. Go to **Application** tab
3. Click **Clear storage** in left sidebar
4. Check **"Cache storage"** and **"Local storage"**
5. Click **Clear site data**

### Step 4: Verify New Build

1. Open deployed site: `https://mauricios-cafe-bakery.vercel.app`
2. Open DevTools → **Network** tab
3. Try to login
4. Click on `/api/customer/login` request
5. Check **Request Headers**:
   - ✅ Should have: `Authorization: Bearer <token>`
   - ❌ Should NOT have: `credentials: include` or `Cookie` header

### Step 5: Check Build Hash

The JavaScript file name should change after rebuild:
- Old: `index-D9BaVIO-.js` (current)
- New: `index-XXXXX-.js` (different hash)

If the hash is the same, the build cache wasn't cleared.

## 🔍 Verify Source Code is Correct

Run this to verify your source code:

```bash
cd capstone/frontend/src/utils
grep -r "credentials.*include\|withCredentials.*true" . --include="*.ts" --include="*.tsx"
```

Should return **NO MATCHES** (empty result).

## 🎯 Quick Fix Checklist

- [ ] Clear Vercel build cache
- [ ] Redeploy with "Rebuild" (not cached build)
- [ ] Clear browser cache completely
- [ ] Hard refresh page (`Ctrl+Shift+R`)
- [ ] Test login - check Network tab
- [ ] Verify no `credentials: include` in request headers
- [ ] Verify `Authorization: Bearer <token>` header is present

## ⚠️ If Still Not Working

1. **Check Vercel Build Logs:**
   - Go to deployment → **Build Logs**
   - Verify `npm run build` completed successfully
   - Check for any errors

2. **Check Environment Variables:**
   - Vercel Dashboard → Settings → Environment Variables
   - Verify `VITE_API_URL` is set correctly

3. **Test Locally:**
   ```bash
   cd capstone/frontend
   npm run build
   npm run preview
   ```
   - Test if local build works
   - If local works but deployed doesn't = Vercel build issue

4. **Check Browser Console:**
   - Look for the actual JavaScript file being loaded
   - Check if it's the new hash or old one
   - If old hash = browser cache issue

## 📝 Summary

The issue is **browser cache** or **Vercel build cache**. 

**Fix:**
1. Clear Vercel build cache
2. Redeploy with "Rebuild" (not cached)
3. Clear browser cache completely
4. Hard refresh page

The source code is correct - it's just a caching issue!













