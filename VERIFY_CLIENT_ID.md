# Verify Google OAuth Client ID

## ✅ Your Client ID

```
734847560550-naskt5g4hv0pgkqf7609chjfko97j8g8.apps.googleusercontent.com
```

## ✅ Format Check

- ✅ Starts with numbers: `734847560550-`
- ✅ Contains alphanumeric string: `naskt5g4hv0pgkqf7609chjfko97j8g8`
- ✅ Ends with: `.apps.googleusercontent.com`
- ✅ Total length: 72 characters
- ✅ Format is correct for Google OAuth Client ID

## 🔍 Verification Steps

### Step 1: Verify in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Find the OAuth 2.0 Client ID that matches: `734847560550-naskt5g4hv0pgkqf7609chjfko97j8g8`
4. **Click on it** to view details
5. **Verify:**
   - ✅ Client ID matches exactly
   - ✅ Status is "Enabled"
   - ✅ Application type is "Web application"
   - ✅ Authorized redirect URIs includes: `https://mauricios-cafe-bakery.onrender.com/api/auth/google/callback`

### Step 2: Verify in Render

1. Go to **Render Dashboard** → Your backend service → **Environment**
2. Find `GOOGLE_CLIENT_ID`
3. **Verify it matches exactly:**
   ```
   734847560550-naskt5g4hv0pgkqf7609chjfko97j8g8.apps.googleusercontent.com
   ```
4. **Check for:**
   - ✅ No extra spaces
   - ✅ No quotes around the value
   - ✅ Exact match with Google Cloud Console
   - ✅ No trailing characters

### Step 3: Verify Client Secret

1. In Google Cloud Console → OAuth 2.0 Client
2. **Click "Show"** next to Client Secret
3. **Copy the full value**
4. In Render, verify `GOOGLE_CLIENT_SECRET` matches exactly
5. **Check:**
   - ✅ Starts with `GOCSPX-`
   - ✅ No extra spaces
   - ✅ No quotes
   - ✅ Exact match

## 🎯 Common Issues

### Issue 1: Client ID Correct, But Secret Wrong

**Symptom:** `invalid_client` error persists

**Fix:**
- The Client Secret is more likely to be wrong
- Regenerate it in Google Cloud Console if needed
- Update in Render

### Issue 2: Using Wrong OAuth Client

**Symptom:** Client ID looks correct but still fails

**Fix:**
- Make sure you're using the OAuth client that has the correct callback URL configured
- If you have multiple clients, use the one with: `https://mauricios-cafe-bakery.onrender.com/api/auth/google/callback`

### Issue 3: Client Secret Regenerated

**Symptom:** Worked before, now fails

**Fix:**
- If you regenerated the Client Secret in Google Cloud Console, the old one in Render is now invalid
- Update Render with the new Client Secret

## ✅ Quick Test

After updating credentials in Render:

1. **Restart backend** (required)
2. **Check backend logs** for:
   ```
   ✅ Google OAuth configured: { clientID: '734847560550-...', callbackURL: '...' }
   ```
3. **Try Google login**
4. **Check logs** - should not see `invalid_client` error

## 🔧 If Still Failing

1. **Double-check Client Secret** - This is usually the issue
2. **Verify OAuth client is enabled** in Google Cloud Console
3. **Check callback URL** matches exactly in both places
4. **Create a new OAuth client** if credentials are corrupted

---

**Your Client ID format is correct!** The issue is likely:
- Client Secret mismatch
- OAuth client configuration
- Need to restart backend after updating credentials


