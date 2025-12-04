# Fix: Google OAuth "invalid_client" Error

## 🔍 Error Analysis

The error `code: 'invalid_client'` means Google is **rejecting your Client ID or Client Secret** when trying to exchange the authorization code for an access token.

**What's working:**
- ✅ OAuth flow starts correctly
- ✅ User authorizes on Google
- ✅ Google redirects back with authorization code
- ✅ Callback URL is correct

**What's failing:**
- ❌ Token exchange fails because Google says "invalid_client"
- This means Client ID or Client Secret don't match what's in Google Cloud Console

## 🔧 Step-by-Step Fix

### Step 1: Verify OAuth Client in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Find your OAuth 2.0 Client ID
4. **Click on it** to view details

### Step 2: Copy Fresh Credentials

1. In the OAuth client details page:
   - **Copy the Client ID** (the full value)
   - **Click "Show"** next to Client Secret
   - **Copy the Client Secret** (the full value)

2. **Important:** Make sure you're copying from the **correct OAuth client**
   - If you have multiple clients, use the one with the correct callback URL

### Step 3: Update Render Environment Variables

1. Go to **Render Dashboard** → Your backend service → **Environment**
2. **Update these variables:**

   **GOOGLE_CLIENT_ID:**
   - Delete the old value
   - Paste the **exact** Client ID from Google Cloud Console
   - No spaces, no quotes, exact match

   **GOOGLE_CLIENT_SECRET:**
   - Delete the old value
   - Paste the **exact** Client Secret from Google Cloud Console
   - No spaces, no quotes, exact match

3. **Double-check:**
   - ✅ No extra spaces before/after
   - ✅ No quotes around values
   - ✅ Exact match with Google Cloud Console
   - ✅ Client ID ends with `.apps.googleusercontent.com`
   - ✅ Client Secret starts with `GOCSPX-`

### Step 4: Verify OAuth Client Status

1. In Google Cloud Console → OAuth 2.0 Client
2. **Check:**
   - ✅ Status shows "Enabled" (not disabled)
   - ✅ Application type is "Web application"
   - ✅ Authorized redirect URIs includes: `https://mauricios-cafe-bakery.onrender.com/api/auth/google/callback`

### Step 5: Restart Backend

1. Go to **Render Dashboard** → Your backend service
2. Click **Manual Deploy** → **Deploy latest commit**
   - OR click **Restart**
3. Wait for deployment to complete

### Step 6: Test Again

1. Clear browser cookies for your domain
2. Try Google login again
3. Check Render logs

## 🎯 Common Causes

### Cause 1: Client Secret Changed

If you regenerated the Client Secret in Google Cloud Console:
- The old secret in Render is now invalid
- **Fix:** Update Render with the new secret

### Cause 2: Using Wrong OAuth Client

If you have multiple OAuth clients:
- You might be using credentials from Client A
- But callback URL configured for Client B
- **Fix:** Use the same OAuth client for both

### Cause 3: Client ID/Secret Mismatch

The credentials don't match:
- Typo in Client ID
- Wrong Client Secret
- Extra spaces or characters
- **Fix:** Copy-paste directly from Google Cloud Console

### Cause 4: OAuth Client Deleted/Disabled

The OAuth client was:
- Deleted
- Disabled
- **Fix:** Create a new OAuth client and update credentials

## ✅ Verification Checklist

- [ ] Client ID in Render matches Google Cloud Console exactly
- [ ] Client Secret in Render matches Google Cloud Console exactly
- [ ] No extra spaces in environment variables
- [ ] No quotes around values
- [ ] OAuth client is enabled in Google Cloud Console
- [ ] Using the same OAuth client for credentials and callback URL
- [ ] Backend restarted after updating credentials
- [ ] Cleared browser cookies before testing

## 🚨 If Still Failing: Create New OAuth Client

If the credentials still don't work:

1. **Create a new OAuth client:**
   - Google Cloud Console → Credentials → Create Credentials → OAuth client ID
   - Application type: **Web application**
   - Name: `Mauricio's Cafe Backend`
   - Authorized redirect URIs: `https://mauricios-cafe-bakery.onrender.com/api/auth/google/callback`

2. **Copy the new credentials:**
   - Client ID
   - Client Secret

3. **Update in Render:**
   - `GOOGLE_CLIENT_ID` = new Client ID
   - `GOOGLE_CLIENT_SECRET` = new Client Secret

4. **Restart backend**

5. **Test again**

Sometimes creating a fresh OAuth client resolves credential issues.

## 🔍 Debug: Check What Passport Is Using

Add this temporary logging to see what credentials Passport is actually using:

The code already logs the callback URL, but you can verify the Client ID is being read correctly by checking the initialization log:

```
🔍 Google OAuth initialization: {
  hasClientId: true,
  hasClientSecret: true,
  callbackURL: '...'
}
```

If `hasClientId: true` and `hasClientSecret: true`, the variables are set, but they might not match Google Cloud Console.

---

**Most Common Fix:** Copy-paste the Client ID and Client Secret directly from Google Cloud Console into Render, ensuring no extra spaces or characters.




