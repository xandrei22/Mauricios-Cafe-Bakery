# How to Verify if Deployed Build is Updated

## 🔍 Quick Check: Is Build Updated?

### Method 1: Check JavaScript File Hash (Easiest)

1. Open deployed site: `https://mauricios-cafe-bakery.vercel.app`
2. Open DevTools (`F12`)
3. Go to **Network** tab
4. Refresh page (`Ctrl+R`)
5. Look for `index-*.js` file
6. **Check the hash** (the part after `index-` and before `.js`)

**If hash is still `D9BaVIO` = OLD BUILD (outdated)**
**If hash is different = NEW BUILD (updated)**

### Method 2: Check Build Timestamp

1. Open DevTools → **Sources** tab
2. Find `index-*.js` file
3. Check file modification date
4. Compare with when you last pushed code

### Method 3: Test Runtime Safeguards

After new build is deployed, open browser console and try to login. You should see:

**If OLD BUILD:**
- ❌ CORS errors about credentials
- ❌ No interceptor logs

**If NEW BUILD:**
- ✅ Interceptor logs: `🔍🔍🔍 AXIOS INTERCEPTOR RUNNING...`
- ✅ No CORS errors
- ✅ If credentials detected, you'll see: `❌❌❌ CRITICAL: Credentials detected...`

---

## 🚨 If Build is Still Outdated

### Step 1: Force Complete Rebuild

**Option A: Via Vercel Dashboard**
1. Go to Vercel → Your Project
2. **Settings** → **Build & Development Settings**
3. Scroll to **Build Cache**
4. Click **"Clear Build Cache"** (this is critical!)
5. Go to **Deployments** tab
6. Click **"Redeploy"** on latest deployment
7. **IMPORTANT**: Select **"Rebuild"** (NOT "Use existing Build Cache")

**Option B: Force via Git**
```bash
# Make a small change to force rebuild
cd capstone/frontend
echo "// Force rebuild $(date)" >> src/utils/.rebuild-trigger.ts
git add .
git commit -m "Force clean rebuild - fix CORS credentials"
git push
```

### Step 2: Wait for Build to Complete

1. Go to Vercel Dashboard → **Deployments**
2. Watch the build progress
3. Wait for status: **"Ready"** (green)
4. **Build should take 2-5 minutes**

### Step 3: Verify New Build

1. **Clear browser cache completely**:
   - `Ctrl+Shift+Delete` → Clear all cached files
   - Or use Incognito/Private window

2. **Check new hash**:
   - Open site → Network tab
   - Look for `index-XXXXX-.js` (should be different hash)

3. **Test login**:
   - Should work without CORS errors
   - Console should show interceptor logs

---

## 🔧 If Still Not Working

### Check Vercel Build Logs

1. Vercel Dashboard → Latest Deployment
2. Click **"Build Logs"**
3. Look for:
   - ✅ `npm run build` completed
   - ✅ No build errors
   - ✅ Build output created

### Check Environment Variables

1. Vercel Dashboard → **Settings** → **Environment Variables**
2. Verify `VITE_API_URL` is set correctly
3. Should be: `https://mauricios-cafe-bakery.onrender.com`

### Test Local Build

```bash
cd capstone/frontend
npm run build
npm run preview
```

- Test if local build works
- If local works but deployed doesn't = Vercel build issue

---

## 📝 Summary

**The issue:** Vercel is serving old build (`index-D9BaVIO-.js`)

**The fix:**
1. Clear Vercel build cache
2. Force rebuild (not cached)
3. Wait for deployment
4. Clear browser cache
5. Verify new hash

**Verification:**
- New hash = build updated ✅
- Same hash = build still old ❌





