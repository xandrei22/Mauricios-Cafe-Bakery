# Google OAuth Troubleshooting Guide

## Common Issues and Solutions

### Issue: "Google authentication failed" Error

This error can occur for several reasons. Check your backend logs for specific error messages.

#### 1. Check Backend Logs

When you click "Login with Google", check your Render backend logs for:

**Initial OAuth Start:**
```
🔍 Google OAuth initialization: { hasClientId: true, hasClientSecret: true, callbackURL: '...' }
✅ Session saved before OAuth redirect
🔍 Session ID: ...
🔍 Initiating passport.authenticate for Google OAuth...
```

**OAuth Callback:**
```
🔍 Google OAuth callback received
🔍 Callback URL: ...
🔍 Query params: { code: '...', state: '...' }
🔍 Session ID: ...
🔍 Session exists: true
🔍 Passport authenticate callback triggered
```

#### 2. Common Error Messages

**"❌ Google OAuth not configured"**
- **Cause:** Missing environment variables
- **Fix:** Check Render environment variables:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_CALLBACK_URL`

**"❌ No session found in callback"**
- **Cause:** Session cookie not being sent/received
- **Possible reasons:**
  - CORS not allowing credentials
  - Session store not working
  - Cookie blocked by browser
- **Fix:** 
  - Check CORS allows credentials for OAuth routes
  - Verify session store (MySQL) is connected
  - Check browser console for cookie errors

**"❌ Google OAuth error from Google: redirect_uri_mismatch"**
- **Cause:** Callback URL doesn't match Google Cloud Console
- **Fix:** 
  - Check `GOOGLE_CALLBACK_URL` in Render matches exactly
  - Verify in Google Cloud Console → OAuth 2.0 Client → Authorized redirect URIs
  - Must be: `https://mauricios-cafe-bakery.onrender.com/api/auth/google/callback`

**"❌ Google OAuth: No user returned from passport"**
- **Cause:** Passport authentication failed
- **Possible reasons:**
  - Invalid Google credentials
  - Database connection issue
  - Error in passport strategy
- **Fix:** Check backend logs for detailed error message

**"❌ Error saving session before OAuth"**
- **Cause:** Session store (MySQL) not working
- **Fix:**
  - Check database connection
  - Verify `sessions` table exists
  - Check `SESSION_SECRET` is set

### 3. Step-by-Step Debugging

1. **Check Environment Variables in Render:**
   ```
   GOOGLE_CLIENT_ID=734847560550-...
   GOOGLE_CLIENT_SECRET=GOCSPX-...
   GOOGLE_CALLBACK_URL=https://mauricios-cafe-bakery.onrender.com/api/auth/google/callback
   SESSION_SECRET=...
   ```

2. **Check Google Cloud Console:**
   - Go to APIs & Services → Credentials
   - Click your OAuth 2.0 Client ID
   - Verify Authorized redirect URIs includes:
     ```
     https://mauricios-cafe-bakery.onrender.com/api/auth/google/callback
     ```

3. **Check Backend Logs:**
   - Go to Render → Your backend service → Logs
   - Click "Login with Google"
   - Look for error messages starting with `❌` or `🔍`

4. **Check Browser Console:**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Look for CORS errors or cookie warnings
   - Go to Network tab and check the OAuth redirects

5. **Test Session Store:**
   - Check if `sessions` table exists in your MySQL database
   - Verify database connection is working
   - Check Render logs for database connection errors

### 4. Quick Fixes

**If session is not persisting:**
- Ensure `SESSION_SECRET` is set in Render
- Check MySQL connection is working
- Verify `sessions` table exists (it should be created automatically)

**If redirect_uri_mismatch:**
- Copy the exact callback URL from Render environment variables
- Paste it into Google Cloud Console → Authorized redirect URIs
- Save and wait 1-2 minutes for changes to propagate

**If CORS errors:**
- Check `credentials: true` is set in CORS config (it is, on line 71)
- Verify frontend origin is allowed in CORS origin function

### 5. Testing the Flow

1. **Clear browser cookies** for your domain
2. **Open browser DevTools** → Network tab
3. **Click "Login with Google"**
4. **Watch the network requests:**
   - Should see redirect to `accounts.google.com`
   - After selecting account, should redirect to `onrender.com/api/auth/google/callback`
   - Then redirect to frontend with `?token=...&google=true`

5. **Check backend logs** during each step

### 6. Common Configuration Mistakes

❌ **Wrong callback URL in Google Cloud Console:**
- Using frontend URL instead of backend URL
- Missing `/api/auth/google/callback` path
- Using `http://` instead of `https://` in production

❌ **Environment variables not set:**
- Variables set in wrong service (frontend vs backend)
- Typos in variable names
- Missing `GOOGLE_CALLBACK_URL`

❌ **Session store not working:**
- Database not connected
- `sessions` table doesn't exist
- `SESSION_SECRET` not set

---

**Need more help?** Check the backend logs for the specific error message and search for it in this guide.



