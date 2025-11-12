# Frontend URL Update Summary

## ✅ Changes Made

All references to the frontend URL have been updated to use `https://mauricios-cafe-bakery.shop` as the default fallback instead of `http://localhost:5173`.

### Files Updated:

1. **`backend/routes/authRoutes.js`**
   - Google OAuth initialization route
   - Google OAuth callback route
   - Error handling routes

2. **`backend/controllers/customerController.js`**
   - Customer login controller
   - Customer signup (email verification links)
   - Forgot password (reset links)
   - Resend verification email

## 🔧 Environment Variables Required

Make sure these are set in your backend `.env` file:

```env
# Frontend URL (optional - defaults to https://mauricios-cafe-bakery.shop)
FRONTEND_URL=https://mauricios-cafe-bakery.shop

# Google OAuth (required for Google login)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://mauricios-cafe-bakery.onrender.com/api/auth/google/callback

# Email Service (Brevo)
BREVO_SMTP_USER=your-email@example.com
BREVO_SMTP_PASS=your-smtp-password
```

## 📧 Email Links Now Use Correct Domain

All email links (verification, password reset) will now use `https://mauricios-cafe-bakery.shop`:
- Email verification: `https://mauricios-cafe-bakery.shop/customer/verify-email?token=...`
- Password reset: `https://mauricios-cafe-bakery.shop/customer/reset-password?token=...`

## 🔐 Google OAuth Configuration

**Important:** Make sure your Google OAuth callback URL is set correctly:

1. In Google Cloud Console, set the authorized redirect URI to:
   ```
   https://mauricios-cafe-bakery.onrender.com/api/auth/google/callback
   ```

2. Set `GOOGLE_CALLBACK_URL` in your backend environment variables to:
   ```
   GOOGLE_CALLBACK_URL=https://mauricios-cafe-bakery.onrender.com/api/auth/google/callback
   ```

## ✅ Verification

After deploying, test:
1. **Email Verification:** Sign up a new account and check the verification email link
2. **Password Reset:** Request a password reset and check the reset link
3. **Google Login:** Try logging in with Google and verify redirects work correctly

All links should now point to `https://mauricios-cafe-bakery.shop` instead of localhost.








