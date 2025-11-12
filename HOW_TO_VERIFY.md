# How to Verify VITE_API_URL is Set Correctly

## Step 1: Check Your Browser URL

Look at the URL bar when you're viewing environment variables:

### ✅ If you see "vercel.com":
```
https://vercel.com/dashboard/[your-project]/settings/environment-variables
OR
https://dashboard.vercel.com/v/[your-project]/settings
```
**THIS IS CORRECT** ✅

### ❌ If you see "render.com":
```
https://dashboard.render.com/web/[your-service]/environment-variables
OR
https://render.com/web/services/[your-service]/environment-variables
```
**THIS IS WRONG** ❌ You need to go to Vercel instead!

---

## Step 2: Verify the Variable Value

In Vercel environment variables page, you should see:

```
VITE_API_URL
Value: https://mauricios-cafe-bakery.onrender.com
Updated: [recent timestamp]
Environments: All Environments (or specific ones)
```

---

## Step 3: Check Vercel Deployment

1. Go to Vercel → Your Project → Deployments
2. Check the **latest deployment**
3. Look for: "Building" → "Ready" (should complete successfully)
4. The timestamp should be AFTER you added the variable

### If deployment was BEFORE you added the variable:
- The deployment doesn't have the variable yet!
- You need to **redeploy**

---

## Step 4: Redeploy if Needed

### Option 1: Auto-Redeploy
- Just wait - Vercel auto-redeploys when env vars change
- Check Deployments tab for new build

### Option 2: Manual Redeploy
1. Go to Deployments tab
2. Click "..." on latest deployment
3. Click "Redeploy"
4. Or make a small change and push to trigger deploy

---

## Troubleshooting

### Problem: "Still getting 405 errors"
**Solution:**
1. Verify `VITE_API_URL` is set in Vercel (not Render)
2. Check deployment timestamp is AFTER setting the variable
3. Clear browser cache (Ctrl+Shift+Del)
4. Hard refresh (Ctrl+F5)

### Problem: "Login still doesn't work"
**Solution:**
1. Check browser console for actual requests being made
2. Look at Network tab - are requests going to Render or Vercel?
3. Verify the request URL starts with `https://mauricios-cafe-bakery.onrender.com`
4. If still going to Vercel URL, the variable isn't being read properly

---

## Quick Test

Open browser console on your deployed Vercel site and run:
```javascript
console.log(import.meta.env.VITE_API_URL)
```

**Expected result:**
```
https://mauricios-cafe-bakery.onrender.com
```

**If you see:**
- `undefined` → Variable not set in Vercel
- `http://localhost:5001` → Variable not set (using default)
- Empty string → Variable set but empty
































