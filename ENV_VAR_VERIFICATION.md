# Environment Variables Verification Checklist

## ✅ Required Variables in Render (Backend)

Based on your images, verify these exact values:

### 1. Google OAuth Variables
```bash
GOOGLE_CLIENT_ID=734847560550-naskt5g4hv0pgkqf7609chjfko97j8g8.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_CALLBACK_URL=https://mauricios-cafe-bakery.onrender.com/api/auth/google/callback
```

**✅ Verify:**
- [ ] `GOOGLE_CLIENT_ID` matches exactly (no extra spaces, no quotes)
- [ ] `GOOGLE_CLIENT_SECRET` matches exactly (no extra spaces, no quotes)
- [ ] `GOOGLE_CALLBACK_URL` is exactly: `https://mauricios-cafe-bakery.onrender.com/api/auth/google/callback`
  - ✅ Must start with `https://`
  - ✅ Must end with `/api/auth/google/callback`
  - ✅ No trailing slash after `callback`

### 2. Frontend URL
```bash
FRONTEND_URL=https://mauricios-cafe-bakery.shop
```

**✅ Verify:**
- [ ] Matches your actual frontend domain
- [ ] No trailing slash

### 3. Session Secret
```bash
SESSION_SECRET=<your-secret-key>
```

**✅ Verify:**
- [ ] Is set (required for OAuth sessions)
- [ ] Is a long random string (at least 32 characters)

### 4. Node Environment
```bash
NODE_ENV=production
```

**✅ Verify:**
- [ ] Is set to `production` (ensures secure cookies)

## ✅ Required Variables in Vercel (Frontend)

### 1. API URL
```bash
VITE_API_URL=https://mauricios-cafe-bakery.onrender.com
```

**✅ Verify:**
- [ ] Is set to your Render backend URL
- [ ] No trailing slash
- [ ] Starts with `https://`

**⚠️ IMPORTANT:** This is critical! If this is wrong, the Google login button won't redirect to the correct backend URL.

## 🔍 How to Verify Variables Are Loaded

### Check Backend Logs (Render)

1. Go to **Render** → Your backend service → **Logs**
2. Look for this message when server starts:
   ```
   ✅ Google OAuth configured: { clientID: '734847560550-...', callbackURL: 'https://...' }
   ```

3. If you see:
   ```
   ❌ GOOGLE_CALLBACK_URL is not set!
   ```
   → The variable is missing or not loaded

### Check Frontend Console

1. Open your frontend in browser
2. Open **DevTools** (F12) → **Console**
3. Type: `import.meta.env.VITE_API_URL`
4. Should show: `"https://mauricios-cafe-bakery.onrender.com"`

If it shows `undefined` or wrong value:
- Variable not set in Vercel
- Frontend needs to be rebuilt after setting variable

## 🐛 Common Issues

### Issue 1: "Nothing Happens" When Clicking Button

**Possible Causes:**
1. `VITE_API_URL` not set in Vercel → Button redirects to wrong URL
2. Frontend not rebuilt after setting `VITE_API_URL`
3. JavaScript error preventing button click

**Fix:**
1. Check Vercel environment variables → `VITE_API_URL` should be set
2. Redeploy frontend in Vercel (variables require rebuild)
3. Check browser console for JavaScript errors

### Issue 2: Redirects to Wrong URL

**Check:**
- Open browser DevTools → Network tab
- Click "Login with Google"
- Check the first request URL
- Should be: `https://mauricios-cafe-bakery.onrender.com/api/auth/google`
- If different, `VITE_API_URL` is wrong

### Issue 3: Backend Says "Not Configured"

**Check Render logs for:**
```
❌ Google OAuth not configured - missing credentials
```

**Fix:**
- Verify all 3 Google variables are set in Render
- Check for typos in variable names
- Restart backend service after setting variables

## 📋 Quick Test

1. **Check Backend:**
   - Go to Render → Logs
   - Look for: `✅ Google OAuth configured`
   - If missing, variables not loaded

2. **Check Frontend:**
   - Open browser console
   - Type: `import.meta.env.VITE_API_URL`
   - Should show backend URL

3. **Test Button:**
   - Click "Login with Google"
   - Should redirect to: `https://mauricios-cafe-bakery.onrender.com/api/auth/google`
   - Then redirect to Google login page

## ✅ Correct Configuration Summary

### Render (Backend)
```
GOOGLE_CLIENT_ID=734847560550-naskt5g4hv0pgkqf7609chjfko97j8g8.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_CALLBACK_URL=https://mauricios-cafe-bakery.onrender.com/api/auth/google/callback
FRONTEND_URL=https://mauricios-cafe-bakery.shop
SESSION_SECRET=<your-secret>
NODE_ENV=production
```

### Vercel (Frontend)
```
VITE_API_URL=https://mauricios-cafe-bakery.onrender.com
```

---

**If "nothing happens":**
1. Check `VITE_API_URL` is set in Vercel
2. Redeploy frontend (variables require rebuild)
3. Check browser console for errors
4. Check network tab to see if request is made



