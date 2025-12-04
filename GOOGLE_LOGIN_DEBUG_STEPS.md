# Google Login Debug Steps

## ✅ What's Working

From your console logs, I can see:
- ✅ `VITE_API_URL` is set correctly: `https://mauricios-cafe-bakery.onrender.com`
- ✅ Frontend is connecting to backend
- ✅ Button is working (redirects to backend)
- ✅ OAuth flow starts (redirects to Google)

## ❌ What's Failing

The callback is failing - you're being redirected back to login with `?error=GOOGLE`

This means:
1. Google redirects back to your callback URL ✅
2. Backend receives the callback ✅
3. **Something fails in the callback handler** ❌
4. Backend redirects to login with error ❌

## 🔍 Check Backend Logs (CRITICAL)

The backend logs will tell us exactly what's failing. Here's what to look for:

### Step 1: Open Render Logs

1. Go to **Render Dashboard** → Your backend service
2. Click **Logs** tab
3. Keep it open

### Step 2: Try Google Login

1. Click "Login with Google" on your frontend
2. Select your Google account
3. Watch the Render logs

### Step 3: Look for These Error Messages

**If you see:**
```
❌ No session found in callback
```
→ Session cookie issue (we already fixed this, but check if it's still happening)

**If you see:**
```
❌ Google OAuth: No user returned from passport
❌ Google OAuth info: ...
```
→ Passport authentication failed - check the `info` object for details

**If you see:**
```
❌ Google OAuth error: ...
❌ Google OAuth error message: ...
❌ Google OAuth error stack: ...
```
→ Database or passport strategy error - check the error message

**If you see:**
```
❌ Error generating JWT token
```
→ JWT_SECRET issue

**If you see:**
```
❌ Error saving session before OAuth
```
→ Database connection issue

## 🎯 Most Likely Issues

### Issue 1: Database Connection Problem

**Symptoms:**
- Error in passport strategy when querying database
- "No user returned from passport" with database error in logs

**Check:**
- Is MySQL database connected?
- Can backend access the database?
- Check Render logs for database connection errors

### Issue 2: Email Already Registered with Password

**Symptoms:**
- User tries to login with Google
- Email already exists in database with password (not Google auth)
- Backend prevents Google login

**Check logs for:**
```
⚠️ Google OAuth: Email already registered with password
```

**Fix:**
- User must login with email/password, not Google
- OR delete the account and let them sign up with Google

### Issue 3: Passport Strategy Error

**Symptoms:**
- Error in the passport strategy callback
- Database query fails
- User creation fails

**Check logs for:**
- Database errors
- SQL query errors
- Table/column name mismatches

### Issue 4: Session Store Not Working

**Symptoms:**
- Session not persisting
- "No session found in callback"

**Check:**
- `SESSION_SECRET` is set in Render
- MySQL `sessions` table exists
- Database connection is working

## 🔧 Quick Diagnostic Test

### Test 1: Check Backend Health

In browser console, type:
```javascript
fetch('https://mauricios-cafe-bakery.onrender.com/api/health')
  .then(r => r.json())
  .then(console.log)
```

Should return: `{ success: true, message: 'Server is running' }`

### Test 2: Check OAuth Route

In browser, manually go to:
```
https://mauricios-cafe-bakery.onrender.com/api/auth/google
```

Should redirect to Google login page. If it does → OAuth start is working.

### Test 3: Check Backend Logs During Login

1. Open Render logs
2. Click "Login with Google"
3. Watch for error messages
4. Copy the exact error message

## 📋 What to Share

To help debug, please share:

1. **Backend logs** from Render when you try to login
   - Look for lines starting with `❌` or `🔍`
   - Copy the full error message

2. **Network tab** from browser DevTools
   - Check the callback request
   - What status code does it return?
   - What's the final redirect URL?

3. **Console errors** (if any)
   - Any JavaScript errors?
   - Any CORS errors?

## 🎯 Next Steps

1. **Check Render logs** - This is the most important step
2. **Look for the specific error message** starting with `❌`
3. **Share the error** so we can fix it

The logs will tell us exactly what's failing in the OAuth callback!





