# Fix: Google OAuth "Unauthorized" Error

## 🔍 Error Analysis

The error `TokenError: Unauthorized` means Google is **rejecting the token exchange**. This happens when Passport tries to exchange the authorization code for an access token.

## ❌ Common Causes

### 1. **Callback URL Mismatch** (Most Common)

The callback URL in your code doesn't match what's configured in Google Cloud Console.

**Check:**
- Render environment variable: `GOOGLE_CALLBACK_URL`
- Google Cloud Console → OAuth 2.0 Client → Authorized redirect URIs

**Must match EXACTLY:**
- ✅ `https://mauricios-cafe-bakery.onrender.com/api/auth/google/callback`
- ❌ `https://mauricios-cafe-bakery.onrender.com/api/auth/google/callback/` (trailing slash)
- ❌ `http://mauricios-cafe-bakery.onrender.com/api/auth/google/callback` (http instead of https)

### 2. **Client ID/Secret Mismatch**

The credentials in Render don't match the OAuth client in Google Cloud Console.

**Check:**
- Render: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- Google Cloud Console → OAuth 2.0 Client → Copy the exact values

### 3. **OAuth Client Configuration Issue**

The OAuth client in Google Cloud Console might be:
- Disabled
- In testing mode without your email as a test user
- Missing required scopes

## 🔧 Step-by-Step Fix

### Step 1: Verify Google Cloud Console Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID
4. **Check these settings:**

   **Authorized redirect URIs:**
   ```
   https://mauricios-cafe-bakery.onrender.com/api/auth/google/callback
   ```
   - ✅ Must be EXACTLY this (no trailing slash)
   - ✅ Must use `https://` (not `http://`)
   - ✅ Must include `/api/auth/google/callback` path

   **Authorized JavaScript origins:**
   ```
   https://mauricios-cafe-bakery.onrender.com
   ```
   - ✅ Should include your backend domain

5. **Click Save** (wait 1-2 minutes for changes to propagate)

### Step 2: Verify Render Environment Variables

1. Go to **Render Dashboard** → Your backend service → **Environment**
2. **Verify these exact values:**

   ```
   GOOGLE_CLIENT_ID=734847560550-naskt5g4hv0pgkqf7609chjfko97j8g8.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=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
   GOOGLE_CALLBACK_URL=https://mauricios-cafe-bakery.onrender.com/api/auth/google/callback
   ```

3. **Check for:**
   - ✅ No extra spaces
   - ✅ No quotes around values
   - ✅ Exact match with Google Cloud Console
   - ✅ No trailing slashes

### Step 3: Verify OAuth Client Status

1. In Google Cloud Console → OAuth 2.0 Client
2. **Check:**
   - ✅ Status is "Enabled"
   - ✅ Application type is "Web application"
   - ✅ If in "Testing" mode, your email is added as a test user

### Step 4: Restart Backend

1. Go to **Render Dashboard** → Your backend service
2. Click **Manual Deploy** → **Deploy latest commit**
   - OR click **Restart** if no code changes
3. Wait for deployment to complete

### Step 5: Test Again

1. Clear browser cookies for your domain
2. Try Google login again
3. Check Render logs for the error

## 🎯 Most Likely Fix

Based on the error, the **callback URL mismatch** is the most common cause.

**Double-check:**
1. Google Cloud Console → Authorized redirect URIs
   - Should be: `https://mauricios-cafe-bakery.onrender.com/api/auth/google/callback`
   - No trailing slash
   - Exact match

2. Render → `GOOGLE_CALLBACK_URL`
   - Should be: `https://mauricios-cafe-bakery.onrender.com/api/auth/google/callback`
   - No trailing slash
   - Exact match

3. **They must match EXACTLY** - even a single character difference will cause this error

## 🔍 Additional Checks

### Check OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. **Verify:**
   - ✅ App is published (or your email is a test user)
   - ✅ Scopes include: `email`, `profile`
   - ✅ App name and support email are set

### Check Client Credentials

1. In Google Cloud Console → OAuth 2.0 Client
2. **Copy the Client ID and Secret again**
3. **Update in Render** (even if they look the same)
4. **Restart backend**

### Check for Multiple OAuth Clients

1. Make sure you're using the **same OAuth client** in:
   - Google Cloud Console
   - Render environment variables
2. If you have multiple clients, use the correct one

## ✅ Verification Checklist

- [ ] Callback URL in Google Cloud Console matches Render exactly
- [ ] Client ID in Google Cloud Console matches Render exactly
- [ ] Client Secret in Google Cloud Console matches Render exactly
- [ ] No trailing slashes in callback URL
- [ ] Using `https://` not `http://`
- [ ] OAuth client is enabled
- [ ] OAuth consent screen is configured
- [ ] Backend restarted after any changes
- [ ] Waited 1-2 minutes after Google Cloud Console changes

## 🚨 If Still Failing

1. **Create a new OAuth client** in Google Cloud Console
2. **Copy the new Client ID and Secret**
3. **Update in Render**
4. **Update callback URL** in new OAuth client
5. **Restart backend**
6. **Test again**

Sometimes creating a fresh OAuth client resolves configuration issues.

---

**Most Common Fix:** Ensure the callback URL matches EXACTLY between Google Cloud Console and Render (no trailing slashes, exact path).





