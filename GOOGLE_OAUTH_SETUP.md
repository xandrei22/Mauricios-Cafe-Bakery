# Google OAuth Setup for Vercel Deployment

## Frontend (Vercel) - No Environment Variables Needed! ✅

The frontend **does NOT need any Google OAuth environment variables** because:
- The login button redirects directly to your backend's Google OAuth endpoint
- The OAuth flow is handled entirely by your backend (Render)
- No client-side Google OAuth SDK is used

Looking at the code (`capstone/frontend/src/components/ui/login-form.tsx`, line 148):
```tsx
onClick={() => window.location.href = `/api/auth/google${tableFromUrl ? `?table=${encodeURIComponent(tableFromUrl)}` : ''}` }
```

This just redirects to `https://your-backend.onrender.com/api/auth/google`

---

## Backend (Render) - Required Environment Variables

These are the **only** environment variables needed:

```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://mauricios-cafe-bakery.onrender.com/api/auth/google/callback
```

---

## How to Set Up Google OAuth

### 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Configure the OAuth consent screen (if not done already):
   - Choose "External"
   - Fill in app name, user support email
   - Add your email as a test user
6. Create OAuth client:
   - Application type: **Web application**
   - Name: `Mauricio's Cafe Backend`
   - Authorized redirect URIs: 
     ```
     https://mauricios-cafe-bakery.onrender.com/api/auth/google/callback
     ```
7. Click **Create**
8. Copy the **Client ID** and **Client Secret**

### 2. Set Environment Variables in Render

Add these to your Render backend environment variables:

```bash
GOOGLE_CLIENT_ID=<paste-client-id-here>
GOOGLE_CLIENT_SECRET=<paste-client-secret-here>
GOOGLE_CALLBACK_URL=https://mauricios-cafe-bakery.onrender.com/api/auth/google/callback
```

### 3. Update Your Vercel Frontend (if needed)

No changes needed! The frontend already redirects to the correct backend endpoint.

---

## How Google Login Works

1. User clicks "Login with Google" button
2. Frontend redirects to: `https://backend.onrender.com/api/auth/google`
3. Backend redirects to Google's OAuth page
4. User grants permission
5. Google redirects back to: `https://backend.onrender.com/api/auth/google/callback`
6. Backend processes the OAuth token and creates/updates user
7. Backend redirects to your Vercel frontend with a session cookie
8. User is logged in!

---

## Testing

1. Deploy your backend with Google OAuth credentials
2. Open your Vercel frontend
3. Click "Login with Google" button
4. You should be redirected to Google's login page
5. After login, you should be redirected back and logged in

---

## Troubleshooting

### Issue: "Error 400: redirect_uri_mismatch"
**Solution:** Make sure the `GOOGLE_CALLBACK_URL` in Render matches exactly what's configured in Google Cloud Console

### Issue: Google login button doesn't work
**Solution:** 
1. Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in Render
2. Check Render logs for OAuth errors
3. Verify the callback URL is correct

### Issue: "redirect_uri mismatch" error
**Solution:** Add the exact callback URL to Google Cloud Console:
```
https://mauricios-cafe-bakery.onrender.com/api/auth/google/callback
```

---

## Summary

### Vercel (Frontend):
```
VITE_API_URL=https://mauricios-cafe-bakery.onrender.com
```
(That's it! No Google OAuth variables needed)

### Render (Backend):
```
FRONTEND_URL=https://mauricios-cafe-bakery.vercel.app
SESSION_SECRET=<your-secret-key>
NODE_ENV=production
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_CALLBACK_URL=https://mauricios-cafe-bakery.onrender.com/api/auth/google/callback
+ Database connection variables
```

---

## Security Notes

1. Never expose `GOOGLE_CLIENT_SECRET` in frontend code
2. Keep your Google OAuth credentials secure
3. Use HTTPS for all redirects (both Render and Vercel automatically provide this)





























