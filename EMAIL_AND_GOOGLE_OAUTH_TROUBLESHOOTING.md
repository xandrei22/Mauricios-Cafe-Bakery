# Email Verification & Google OAuth Troubleshooting Guide

## ✅ What Was Fixed

### 1. Email Verification After Signup
- ✅ Enhanced error logging in `customerController.js` signup function
- ✅ Improved error details in `emailService.js` `sendVerificationEmail` function
- ✅ Added detailed logging for verification URL generation

### 2. Google OAuth Authentication
- ✅ Fixed syntax error in `passport.js` (optional chaining)
- ✅ Added comprehensive logging throughout Google OAuth flow
- ✅ Enhanced error handling in `authRoutes.js` callback

## 🔍 How to Verify It's Working

### Email Verification

1. **Check Backend Logs** when a user signs up:
   ```
   📧 Attempting to send verification email to: user@example.com
   📧 Verification URL: https://mauricios-cafe-bakery.shop/customer/verify-email?token=...
   ✅ Verification email sent successfully: { messageId: ..., accepted: [...], rejected: [] }
   ```

2. **If Email Fails**, you'll see:
   ```
   ❌ Error sending verification email: [error message]
   ❌ Error details: { code: ..., command: ..., response: ..., responseCode: ... }
   ```

3. **Check Email Service Configuration**:
   - Verify `BREVO_SMTP_USER` and `BREVO_SMTP_PASS` are set in backend `.env`
   - Check backend startup logs for: `✅ Brevo SMTP server is ready to send messages`

### Google OAuth

1. **Check Backend Logs** when clicking "Login with Google":
   ```
   🔍 Google OAuth initialization: { hasClientId: true, hasClientSecret: true, callbackURL: '...', frontendBase: '...' }
   🔍 Initiating passport.authenticate for Google OAuth...
   ```

2. **In Callback Route**, you'll see:
   ```
   🔍 Google OAuth callback received
   🔍 Callback URL: https://mauricios-cafe-bakery.onrender.com/api/auth/google/callback
   🔍 Starting Google OAuth authentication...
   🔍 Passport authenticate callback triggered
   ✅ Google OAuth: User authenticated successfully: { id: ..., email: ..., email_verified: true }
   ```

3. **If Google OAuth Fails**, check logs for:
   ```
   ❌ Google OAuth error: [error message]
   ❌ Google OAuth error stack: [stack trace]
   ```

## 🔧 Required Environment Variables

### Backend `.env` File:

```env
# Frontend URL
FRONTEND_URL=https://mauricios-cafe-bakery.shop

# Google OAuth (REQUIRED)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://mauricios-cafe-bakery.onrender.com/api/auth/google/callback

# Email Service (Brevo)
BREVO_SMTP_USER=your-email@example.com
BREVO_SMTP_PASS=your-smtp-password

# JWT Secret
JWT_SECRET=your-jwt-secret

# Session Secret (for Google OAuth sessions)
SESSION_SECRET=your-session-secret
```

## 🚨 Common Issues & Solutions

### Issue 1: Email Verification Not Sending

**Symptoms:**
- User signs up but doesn't receive verification email
- Backend logs show: `❌ Email service disabled - no credentials found`

**Solution:**
1. Check that `BREVO_SMTP_USER` and `BREVO_SMTP_PASS` are set correctly
2. Verify Brevo SMTP credentials are valid
3. Check backend startup logs for email service initialization
4. Check spam folder (emails might be filtered)

### Issue 2: Google OAuth Fails with "Google authentication failed"

**Symptoms:**
- Clicking "Login with Google" redirects to login page with error
- Backend logs show: `❌ Google OAuth error: ...`

**Solution:**
1. **Verify Google OAuth Credentials:**
   - Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
   - Verify credentials are correct in Google Cloud Console

2. **Verify Callback URL:**
   - Set `GOOGLE_CALLBACK_URL=https://mauricios-cafe-bakery.onrender.com/api/auth/google/callback`
   - In Google Cloud Console, add this exact URL to "Authorized redirect URIs"

3. **Check Session Configuration:**
   - Ensure `SESSION_SECRET` is set
   - Verify session middleware is applied to `/api/auth/google` routes

4. **Check CORS:**
   - Ensure `https://mauricios-cafe-bakery.shop` is in allowed origins
   - Verify `credentials: true` is set for OAuth routes

### Issue 3: Email Verification Link Doesn't Work

**Symptoms:**
- User receives email but link doesn't work
- Link points to wrong domain

**Solution:**
1. Verify `FRONTEND_URL` is set to `https://mauricios-cafe-bakery.shop`
2. Check verification URL in backend logs matches your domain
3. Ensure frontend route `/customer/verify-email` exists and handles token parameter

## 📝 Testing Steps

### Test Email Verification:
1. Sign up a new account
2. Check backend logs for email sending confirmation
3. Check email inbox (and spam folder) for verification email
4. Click verification link
5. Try logging in (should work after verification)

### Test Google OAuth:
1. Click "Login with Google" on login page
2. Check backend logs for OAuth initialization
3. Complete Google authentication
4. Check backend logs for successful callback
5. Verify redirect to dashboard with JWT token

## 🔄 Next Steps

After deploying these fixes:
1. **Restart your backend server** to load updated code
2. **Check backend logs** for any configuration errors
3. **Test both flows** (email signup and Google login)
4. **Monitor logs** for any errors during testing

If issues persist, check the detailed error logs in the backend console for specific error messages.








