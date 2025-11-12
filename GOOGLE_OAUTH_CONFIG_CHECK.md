# Google OAuth Configuration Check

## ✅ What's Correct

### Render (Backend) Environment Variables
- ✅ `GOOGLE_CALLBACK_URL`: `https://mauricios-cafe-bakery.onrender.com/api/auth/google/callback` - **CORRECT**
- ✅ `GOOGLE_CLIENT_ID`: Set (partially visible: `734847560550-...`)
- ✅ `GOOGLE_CLIENT_SECRET`: Set (partially visible: `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...`)

### Google Cloud Console - Authorized Redirect URIs
- ✅ `https://mauricios-cafe-bakery.onrender.com/api/auth/google/callback` - **CORRECT** (matches Render)
- ✅ `http://localhost:5001/api/auth/google/callback` - **CORRECT** (for local development)

## ❌ Issues Found

### 1. Incorrect Redirect URIs in Google Cloud Console

**Problem:** These redirect URIs are pointing to frontend domains, but callbacks must go to the backend:

- ❌ `https://mauricios-cafe-bakery.vercel.app/api/auth/google/callback` - **WRONG** (frontend domain)
- ❌ `https://mauricios-cafe-bakery.shop/api/auth/google/callback` - **WRONG** (frontend domain)

**Why this is wrong:**
- Google OAuth callbacks must go to your **backend** server (Render)
- The frontend domains (`vercel.app`, `.shop`) don't have the backend API routes
- This will cause `redirect_uri_mismatch` errors

**Fix:** Remove these from Google Cloud Console. Only keep:
- ✅ `https://mauricios-cafe-bakery.onrender.com/api/auth/google/callback`
- ✅ `http://localhost:5001/api/auth/google/callback` (for local dev)

### 2. Unnecessary Environment Variable in Vercel

**Problem:** `VITE_GOOGLE_CLIENT_ID` is in Vercel (frontend), but:
- The frontend doesn't use Google OAuth directly - it just redirects to the backend
- No Google OAuth SDK or client-side authentication is used
- This variable is not referenced anywhere in the frontend code

**Fix:** You can remove `VITE_GOOGLE_CLIENT_ID` from Vercel. It's not used and won't affect functionality.

## 🔧 How to Fix

### Step 1: Update Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Under **Authorized redirect URIs**, **REMOVE**:
   - `https://mauricios-cafe-bakery.vercel.app/api/auth/google/callback`
   - `https://mauricios-cafe-bakery.shop/api/auth/google/callback`
5. **KEEP ONLY**:
   - `https://mauricios-cafe-bakery.onrender.com/api/auth/google/callback`
   - `http://localhost:5001/api/auth/google/callback` (for local dev)
6. Click **Save**

### Step 2: Clean Up Vercel Environment Variables (Optional)

1. Go to Vercel dashboard → Your frontend project → Settings → Environment Variables
2. Find `VITE_GOOGLE_CLIENT_ID`
3. Delete it (it's not used - frontend just redirects to backend for OAuth)

## ✅ Correct Configuration Summary

### Google Cloud Console - Authorized Redirect URIs
```
✅ https://mauricios-cafe-bakery.onrender.com/api/auth/google/callback
✅ http://localhost:5001/api/auth/google/callback
```

### Render (Backend) Environment Variables
```
✅ GOOGLE_CLIENT_ID=734847560550-...
✅ GOOGLE_CLIENT_SECRET=GOCSPX-...
✅ GOOGLE_CALLBACK_URL=https://mauricios-cafe-bakery.onrender.com/api/auth/google/callback
```

### Vercel (Frontend) Environment Variables
```
✅ VITE_API_URL=https://mauricios-cafe-bakery.onrender.com
(No Google OAuth variables needed - frontend redirects to backend)
```

## 🎯 Why This Matters

The OAuth flow works like this:
1. User clicks "Login with Google" on frontend
2. Frontend redirects to: `https://mauricios-cafe-bakery.onrender.com/api/auth/google`
3. Backend redirects to Google
4. User authorizes
5. **Google redirects back to callback URL** → Must be backend (`onrender.com`)
6. Backend processes auth and redirects to frontend with token

If the callback URL points to frontend (`vercel.app` or `.shop`), Google will try to redirect there, but those domains don't have the `/api/auth/google/callback` route, causing the OAuth flow to fail.

## ✅ After Fixing

Test the Google login:
1. Click "Login with Google"
2. Should redirect to Google account selection
3. After selecting account, should redirect back and log you in
4. Check backend logs for any errors

---

**Status:** Configuration needs cleanup - remove incorrect redirect URIs from Google Cloud Console

