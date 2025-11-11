# ⚠️ IMPORTANT: Rebuild Frontend After Changes

## 🔍 Issue Identified

The minified/compiled code you showed is using **old code** with:
- ❌ `fetch()` directly instead of `axiosInstance`
- ❌ `credentials: "include"` (wrong for JWT)

**But the source code is CORRECT** - it uses `customerLogin()` from `authUtils.ts` which uses `axiosInstance`.

## ✅ Solution: Rebuild Frontend

The frontend needs to be **rebuilt** to include the latest changes.

### Steps to Rebuild

1. **Stop the dev server** (if running)
   ```bash
   # Press Ctrl+C in the terminal running the dev server
   ```

2. **Clear build cache** (recommended)
   ```bash
   cd capstone/frontend
   rm -rf node_modules/.vite
   rm -rf dist
   ```

3. **Rebuild the frontend**
   ```bash
   # If using npm
   npm run build
   
   # If using yarn
   yarn build
   
   # If using pnpm
   pnpm build
   ```

4. **For Vercel deployment:**
   - Push your changes to Git
   - Vercel will automatically rebuild
   - Or trigger a manual redeploy in Vercel dashboard

### Verify After Rebuild

1. **Check the built files** in `frontend/dist/`
2. **Search for** `axiosInstance` in the built JS files
3. **Should NOT see** `credentials: "include"` or direct `fetch()` calls for login

---

## ✅ Current Source Code Status

### ✅ Login Form (`frontend/src/components/ui/login-form.tsx`)

**Line 74:** Uses `customerLogin()` from `authUtils.ts`
```typescript
await customerLogin(email, password, hasTable, false);
```

**This is CORRECT** - `customerLogin()` uses `axiosInstance` internally.

### ✅ Auth Utils (`frontend/src/utils/authUtils.ts`)

**Line 324:** Uses `axiosInstance.post()`
```typescript
const response = await axiosInstance.post('/api/customer/login', {...});
```

**This is CORRECT** - `axiosInstance` automatically adds Authorization header.

### ✅ Axios Instance (`frontend/src/utils/axiosInstance.ts`)

**Lines 34-93:** Request interceptor adds Authorization header
```typescript
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});
```

**This is CORRECT** - Automatically adds header to all requests.

---

## 🎯 What Needs to Happen

1. ✅ **Source code is correct** - Already using `axiosInstance`
2. ⚠️ **Built code is outdated** - Needs rebuild
3. ✅ **After rebuild** - Will use `axiosInstance` with Authorization header

---

## 📋 Verification Checklist

After rebuilding:

- [ ] Check `frontend/dist/` for updated files
- [ ] Search built JS for `axiosInstance` (should be present)
- [ ] Search built JS for `credentials: "include"` (should NOT be in login code)
- [ ] Test login in browser
- [ ] Check Network tab - should see `Authorization: Bearer ...` header
- [ ] Check console - should see `✅ AXIOS REQUEST - Authorization header attached`

---

## 🚀 Quick Fix

**For local development:**
```bash
cd capstone/frontend
npm run dev  # This will use the latest source code
```

**For production (Vercel):**
- Push changes to Git
- Vercel auto-rebuilds on push
- Or manually trigger rebuild in Vercel dashboard

---

## ✅ Summary

- ✅ **Source code is correct** - Uses `axiosInstance` properly
- ⚠️ **Built code is outdated** - Needs rebuild
- ✅ **After rebuild** - Everything will work correctly

The minified code you saw is from an **old build**. Once you rebuild, it will use the correct `axiosInstance` implementation with automatic Authorization header injection.








