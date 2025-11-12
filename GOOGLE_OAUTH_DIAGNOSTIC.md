# Google OAuth Diagnostic Checklist

## ✅ Your Configuration (Verified Correct)

### Google Cloud Console
- ✅ Authorized redirect URIs: `https://mauricios-cafe-bakery.onrender.com/api/auth/google/callback`
- ✅ Authorized JavaScript origins: Frontend domains (correct)

### Render Environment Variables
- ✅ `GOOGLE_CLIENT_ID`: `734847560550-naskt5g4hv0pgkqf7609chjfko97j8g8.apps.googleusercontent.com`
- ✅ `GOOGLE_CLIENT_SECRET`: `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`
- ✅ `GOOGLE_CALLBACK_URL`: `https://mauricios-cafe-bakery.onrender.com/api/auth/google/callback`
- ✅ `FRONTEND_URL`: `https://mauricios-cafe-bakery.shop`

## 🔍 Why It Might Still Fail (Despite Correct Config)

### 1. **Session Cookie Not Being Sent/Received** (Most Common)

**Symptoms:**
- OAuth starts successfully (redirects to Google)
- After selecting account, fails with "Google authentication failed"
- Backend logs show: `❌ No session found in callback`

**Possible Causes:**
- Browser blocking third-party cookies
- CORS not allowing credentials for OAuth routes
- Session cookie `sameSite` or `secure` settings incorrect
- Session store (MySQL) not working

**Check:**
1. Open browser DevTools → Application → Cookies
2. Look for `connect.sid` cookie from `mauricios-cafe-bakery.onrender.com`
3. If missing, cookies are being blocked

**Fix:**
- Check `sameSite: 'none'` requires `secure: true` (both should be set in production)
- Verify CORS allows credentials for `/api/auth/google/*` routes

### 2. **Session Store (MySQL) Not Working**

**Symptoms:**
- Session saved before OAuth, but lost in callback
- Backend logs show database connection errors

**Check:**
1. Go to Render → Your backend → Logs
2. Look for MySQL connection errors
3. Check if `sessions` table exists in database

**Fix:**
- Verify database connection is working
- Check `MYSQL_PUBLIC_URL` is set correctly
- Ensure `sessions` table exists (created automatically by `express-mysql-session`)

### 3. **Passport Strategy Error**

**Symptoms:**
- Callback received successfully
- Session exists
- But `passport.authenticate` fails
- Backend logs show: `❌ Google OAuth: No user returned from passport`

**Possible Causes:**
- Database query failing in passport strategy
- Email already registered with password (expected error)
- Database connection issue during user lookup/creation

**Check:**
- Look for database errors in logs
- Check if user email already exists with password (not Google auth)

### 4. **CORS/Cookie Issues**

**Symptoms:**
- OAuth redirects work
- But session cookie not persisting across redirects

**Check:**
- Browser console for CORS errors
- Network tab → Check if `Set-Cookie` header is present in response
- Verify cookie attributes: `HttpOnly`, `Secure`, `SameSite=None`

## 🔧 Step-by-Step Debugging

### Step 1: Check Backend Logs

1. Go to **Render** → Your backend service → **Logs**
2. Click **"Login with Google"** on your frontend
3. Watch for these log messages:

**Expected Flow:**
```
🔍 Google OAuth initialization: { hasClientId: true, hasClientSecret: true, ... }
✅ Session saved before OAuth redirect
🔍 Session ID: abc123...
🔍 Initiating passport.authenticate for Google OAuth...
```

**Then after Google redirect:**
```
🔍 Google OAuth callback received
🔍 Callback URL: https://mauricios-cafe-bakery.onrender.com/api/auth/google/callback
🔍 Query params: { code: '...', state: '...' }
🔍 Session ID: abc123... (should match!)
🔍 Session exists: true
🔍 Passport authenticate callback triggered
```

**If you see errors:**
- `❌ Error saving session before OAuth` → Database/session store issue
- `❌ No session found in callback` → Cookie not being sent/received
- `❌ Google OAuth: No user returned from passport` → Passport strategy error

### Step 2: Check Browser Network Tab

1. Open **DevTools** (F12) → **Network** tab
2. Click **"Login with Google"**
3. Watch the requests:

**Expected:**
1. `GET /api/auth/google` → Status 302 (redirect to Google)
2. Redirect to `accounts.google.com` (you select account)
3. `GET /api/auth/google/callback?code=...` → Status 302 (redirect to frontend)

**Check:**
- Does the callback request include a `Cookie` header?
- Does the callback response include `Set-Cookie` header?
- Any CORS errors in console?

### Step 3: Check Session Cookie

1. Open **DevTools** → **Application** → **Cookies**
2. Look for cookies from `mauricios-cafe-bakery.onrender.com`
3. Should see `connect.sid` cookie

**If missing:**
- Cookies are being blocked
- Check browser settings (third-party cookies)
- Check cookie attributes in server.js

### Step 4: Verify Database Connection

1. Check Render logs for database connection errors
2. Verify `MYSQL_PUBLIC_URL` is set correctly
3. Check if `sessions` table exists:
   ```sql
   SHOW TABLES LIKE 'sessions';
   ```

## 🎯 Most Likely Issue

Based on your correct configuration, the **most likely issue** is:

**Session cookie not persisting** between the OAuth start and callback.

This happens because:
1. User clicks "Login with Google" → Backend sets session cookie
2. Browser redirects to Google (cross-origin)
3. Google redirects back to callback (cross-origin again)
4. Browser may block the cookie due to `sameSite` or `secure` settings

## 🔧 Quick Fix to Try

### Check Cookie Settings in server.js

The session cookie should have:
```javascript
cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Must be true in production
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Must be 'none' for cross-origin
    maxAge: 3600000,
    path: '/'
}
```

**Important:** `sameSite: 'none'` **requires** `secure: true`

### Verify in Render

1. Check `NODE_ENV=production` is set
2. This ensures `secure: true` and `sameSite: 'none'`

## 📋 Next Steps

1. **Check backend logs** for the specific error message
2. **Check browser console** for CORS/cookie errors
3. **Verify session cookie** is being set and received
4. **Check database connection** is working

Share the specific error message from your backend logs, and I can help pinpoint the exact issue!



