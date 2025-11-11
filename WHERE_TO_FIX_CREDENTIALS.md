# Where to Fix Credentials Issue

## 📍 Exact Files to Check

### 1. **`capstone/frontend/src/utils/axiosInstance.ts`**

#### Line 18 - Axios Instance Creation:
```typescript
withCredentials: false, // ⭐ CRITICAL: JWT-only - MUST be false
```

#### Line 109 - Request Interceptor:
```typescript
// ⭐ CRITICAL: JWT-only - NEVER send credentials (no cookies)
config.withCredentials = false;
```

**✅ These are already correct in your source code!**

---

### 2. **`capstone/frontend/src/utils/apiClient.ts`**

#### Line 51 - Fetch Wrapper:
```typescript
credentials: 'omit', // JWT-only: No cookies needed
```

**✅ This is already correct!**

---

### 3. **`capstone/frontend/src/utils/authUtils.ts`**

#### Line 324 - Customer Login:
```typescript
const response = await axiosInstance.post('/api/customer/login', {
  // Uses axiosInstance which has withCredentials: false
});
```

**✅ This is already correct!**

---

## 🔍 How to Verify Your Source Code

Run these commands to check:

```bash
# Check axiosInstance
cd capstone/frontend/src/utils
grep -n "withCredentials" axiosInstance.ts
# Should show: withCredentials: false

# Check for any credentials: 'include'
cd capstone/frontend/src
grep -r "credentials.*include" . --include="*.ts" --include="*.tsx"
# Should return: NO MATCHES (empty)

# Check for withCredentials: true
grep -r "withCredentials.*true" . --include="*.ts" --include="*.tsx"
# Should return: NO MATCHES (empty)
```

---

## ⚠️ The Real Problem

**Your source code is CORRECT!** The issue is:

1. **Deployed build is outdated** - Vercel is serving old JavaScript bundle
2. **Browser cache** - Your browser cached the old bundle

The file `index-D9BaVIO-.js` is the OLD build. After a clean rebuild, it should be `index-XXXXX-.js` (different hash).

---

## ✅ What to Do

### Step 1: Verify Source Code (Already Done ✅)
Your source code is correct - no changes needed.

### Step 2: Force Clean Rebuild on Vercel
1. Vercel Dashboard → Settings → Clear Build Cache
2. Deployments → Redeploy → Select **"Rebuild"** (not cached)

### Step 3: Clear Browser Cache
- `Ctrl+Shift+Delete` → Clear cached files
- Or `Ctrl+Shift+R` for hard refresh

### Step 4: Verify New Build
After rebuild, check:
- JavaScript file name should change (new hash)
- Network tab should show NO `credentials: include`

---

## 📝 Summary

**Files to check:**
- ✅ `frontend/src/utils/axiosInstance.ts` (line 18, 109) - Already correct
- ✅ `frontend/src/utils/apiClient.ts` (line 51) - Already correct
- ✅ `frontend/src/utils/authUtils.ts` (line 324) - Already correct

**No changes needed in source code!** Just need to:
1. Clear Vercel build cache
2. Force clean rebuild
3. Clear browser cache










