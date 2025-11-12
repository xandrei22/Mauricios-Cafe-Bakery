# Test if VITE_API_URL is Working

## Quick Test:

1. **Open your deployed Vercel site:**
   ```
   https://mauricios-cafe-bakery.vercel.app
   ```

2. **Open browser console (F12)**
3. **Run this command:**
   ```javascript
   console.log(import.meta.env.VITE_API_URL)
   ```

4. **Check the result:**

### ✅ Expected (Working):
```
"https://mauricios-cafe-bakery.onrender.com"
```

### ❌ If you see this (NOT Working):
```
"http://localhost:5001"
```
or
```
undefined
```

---

## What This Means:

### ✅ Shows Render URL:
- Variable IS set correctly
- If login still doesn't work, try redeploying Vercel

### ❌ Shows Localhost or Undefined:
- Variable NOT set in Vercel
- OR deployment happened before setting the variable
- Need to set variable in Vercel and redeploy

---

## Next Steps:

### If Variable Shows Correctly:
1. Clear browser cache
2. Hard refresh (Ctrl+F5)
3. Test login again

### If Variable Shows Wrong:
1. Go to Vercel Dashboard
2. Settings → Environment Variables
3. Verify VITE_API_URL exists
4. If not, add it (value: https://mauricios-cafe-bakery.onrender.com)
5. Redeploy
































