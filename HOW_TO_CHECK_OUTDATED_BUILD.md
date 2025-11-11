# How to Check if Frontend Build is Outdated

## 🔍 Where to Check for Outdated Build

### 1. **Browser Console (Easiest Way)**

### Step 1: Open Deployed Site
Go to: `https://mauricios-cafe-bakery.vercel.app`

### Step 2: Open Browser DevTools
- Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
- Go to **Console** tab

### Step 3: Check for Old Code
Look for these indicators of **OUTDATED BUILD**:

#### ❌ Outdated Build Signs:
```javascript
// If you see CORS errors like this:
"Access to fetch at '...' has been blocked by CORS policy: 
The value of the 'Access-Control-Allow-Credentials' header in the response is '' 
which must be 'true' when the request's credentials mode is 'include'."

// This means the build is sending credentials: 'include'
```

#### ✅ Current Build Signs:
```javascript
// Should see these logs if interceptor is working:
"🔍🔍🔍 AXIOS INTERCEPTOR RUNNING FOR CHECK-SESSION 🔍🔍🔍"
"🔑🔑🔑 AUTHORIZATION HEADER SET 🔑🔑🔑"

// Should NOT see CORS errors about credentials
```

### Step 4: Check Network Tab
1. Go to **Network** tab in DevTools
2. Try to login
3. Click on the `/api/customer/login` request
4. Check **Request Headers**:
   - ❌ **Outdated**: Has `credentials: include` or `Cookie` header
   - ✅ **Current**: Has `Authorization: Bearer <token>` header, NO credentials

---

### 2. **Vercel Dashboard**

### Step 1: Go to Vercel
1. Visit: https://vercel.com
2. Login to your account
3. Select your project: `Mauricios-Cafe-Bakery`

### Step 2: Check Deployment
1. Click on **Deployments** tab
2. Look at the **latest deployment**:
   - **Commit hash**: Compare with your latest git commit
   - **Deployment time**: Should be recent
   - **Status**: Should be "Ready" (green)

### Step 3: Check Build Logs
1. Click on the latest deployment
2. Scroll to **Build Logs**
3. Look for:
   - ✅ `npm run build` completed successfully
   - ✅ Build output shows latest changes

---

### 3. **Compare Git Commits**

### Step 1: Check Local Git
```bash
cd capstone
git log --oneline -5
```

### Step 2: Check Vercel Deployment
- In Vercel dashboard, check the commit hash of latest deployment
- Compare with your local `git log`

### Step 3: If Different
- Local has newer commits = **Build is outdated**
- Need to push and redeploy

---

### 4. **Check Source Code vs Deployed**

### Step 1: Check Local Source
```bash
cd capstone/frontend/src/utils
cat axiosInstance.ts | grep -i "withCredentials"
```

Should show:
```typescript
withCredentials: false, // ✅ JWT-only: No cookies needed
```

### Step 2: Check Deployed Build
1. Open: `https://mauricios-cafe-bakery.vercel.app`
2. Open DevTools → **Sources** tab
3. Navigate to: `webpack://` or `index-*.js`
4. Search for: `withCredentials` or `credentials`
5. If you find `withCredentials: true` or `credentials: 'include'` = **OUTDATED**

---

### 5. **Quick Test Script**

Add this to browser console on deployed site:

```javascript
// Test if build is outdated
fetch('https://mauricios-cafe-bakery.onrender.com/api/health')
  .then(r => r.json())
  .then(data => {
    console.log('✅ Server is reachable:', data);
  })
  .catch(err => {
    console.error('❌ Connection failed:', err);
    if (err.message.includes('CORS') || err.message.includes('credentials')) {
      console.error('⚠️ OUTDATED BUILD: Still sending credentials');
    }
  });
```

---

## 🚨 How to Fix Outdated Build

### Option 1: Auto-Deploy (Recommended)
```bash
cd capstone
git add .
git commit -m "Fix: JWT-only authentication"
git push
```
Vercel will automatically rebuild and deploy.

### Option 2: Manual Redeploy
1. Go to Vercel dashboard
2. Click on your project
3. Go to **Deployments** tab
4. Click **⋯** (three dots) on latest deployment
5. Click **Redeploy**
6. Select **Use existing Build Cache** (faster) or **Rebuild** (clean)

### Option 3: Force Rebuild
```bash
cd capstone/frontend
npm run build
# Then manually upload dist/ folder to Vercel
```

---

## ✅ Verification Checklist

After redeploy, verify:

- [ ] No CORS errors in browser console
- [ ] Login works without errors
- [ ] Network tab shows `Authorization: Bearer <token>` header
- [ ] No `credentials: include` in request headers
- [ ] Console shows interceptor logs
- [ ] `/api/health` endpoint responds successfully

---

## 📝 Summary

**Easiest way to check:**
1. Open deployed site in browser
2. Open DevTools → Console tab
3. Try to login
4. If you see CORS errors about credentials = **OUTDATED BUILD**

**Fix:**
- Push latest code to GitHub
- Vercel will auto-deploy
- Or manually trigger redeploy in Vercel dashboard










