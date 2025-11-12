# Google OAuth Environment Variables - Complete List

## 🔑 Required Variables in Render (Backend)

### 1. **GOOGLE_CLIENT_ID** ⭐ REQUIRED
- **Used in:** `backend/controllers/passport.js` (line 45)
- **Used in:** `backend/routes/authRoutes.js` (line 43, 58)
- **Purpose:** Google OAuth Client ID from Google Cloud Console
- **Format:** `734847560550-xxxxx.apps.googleusercontent.com`
- **Example:** `734847560550-naskt5g4hv0pgkqf7609chjfko97j8g8.apps.googleusercontent.com`
- **Where to get:** Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID

### 2. **GOOGLE_CLIENT_SECRET** ⭐ REQUIRED
- **Used in:** `backend/controllers/passport.js` (line 46)
- **Used in:** `backend/routes/authRoutes.js` (line 43, 59)
- **Purpose:** Google OAuth Client Secret from Google Cloud Console
- **Format:** `GOCSPX-xxxxx`
- **Example:** `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`
- **Where to get:** Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client → Show Secret
- **⚠️ CRITICAL:** Must match Google Cloud Console exactly (character by character)

### 3. **GOOGLE_CALLBACK_URL** ⭐ REQUIRED
- **Used in:** `backend/controllers/passport.js` (line 32, 47)
- **Used in:** `backend/routes/authRoutes.js` (line 47, 52, 60, 125)
- **Purpose:** Where Google redirects after user authorizes
- **Format:** `https://your-backend-url.onrender.com/api/auth/google/callback`
- **Example:** `https://mauricios-cafe-bakery.onrender.com/api/auth/google/callback`
- **⚠️ CRITICAL:** Must match Google Cloud Console → Authorized redirect URIs exactly
- **⚠️ CRITICAL:** No trailing slash, must use `https://`

### 4. **FRONTEND_URL** ⭐ REQUIRED
- **Used in:** `backend/routes/authRoutes.js` (line 40, 97, 113, 280)
- **Purpose:** Where to redirect user after OAuth completes
- **Format:** `https://your-frontend-domain`
- **Example:** `https://mauricios-cafe-bakery.shop`
- **Default:** Falls back to `https://mauricios-cafe-bakery.shop` if not set
- **Used for:** Redirecting to frontend with JWT token after OAuth

### 5. **SESSION_SECRET** ⭐ REQUIRED (for OAuth sessions)
- **Used in:** `backend/server.js` (line 168)
- **Purpose:** Secret key for encrypting session cookies
- **Format:** Long random string (at least 32 characters)
- **Example:** `your-random-secret-key-here-32-chars-minimum`
- **Used for:** Google OAuth session cookies (temporary, during OAuth flow only)

### 6. **JWT_SECRET** ⭐ REQUIRED (for JWT tokens)
- **Used in:** `backend/routes/authRoutes.js` (line 212)
- **Purpose:** Secret key for signing JWT tokens
- **Format:** Long random string (at least 32 characters)
- **Example:** `your-jwt-secret-key-here-32-chars-minimum`
- **Used for:** Generating JWT token after OAuth completes

### 7. **NODE_ENV** (Optional but recommended)
- **Used in:** `backend/server.js` (line 177, 178)
- **Purpose:** Sets production/development mode
- **Format:** `production` or `development`
- **Example:** `production`
- **Effect:** 
  - `production`: Sets `secure: true` and `sameSite: 'none'` for cookies (required for OAuth)
  - `development`: Uses `secure: false` and `sameSite: 'lax'`

## 📋 Complete Variable List for Render

```bash
# Google OAuth (Required)
GOOGLE_CLIENT_ID=734847560550-naskt5g4hv0pgkqf7609chjfko97j8g8.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_CALLBACK_URL=https://mauricios-cafe-bakery.onrender.com/api/auth/google/callback

# Frontend URL (Required)
FRONTEND_URL=https://mauricios-cafe-bakery.shop

# Session & JWT (Required)
SESSION_SECRET=your-session-secret-key-here
JWT_SECRET=your-jwt-secret-key-here

# Environment (Recommended)
NODE_ENV=production
```

## 🔍 Where Each Variable Is Used

### `GOOGLE_CLIENT_ID`
- **passport.js:45** - Passport GoogleStrategy configuration
- **authRoutes.js:43** - Validation check
- **authRoutes.js:58** - Logging

### `GOOGLE_CLIENT_SECRET`
- **passport.js:46** - Passport GoogleStrategy configuration
- **authRoutes.js:43** - Validation check
- **authRoutes.js:59** - Logging

### `GOOGLE_CALLBACK_URL`
- **passport.js:32** - Read from env
- **passport.js:47** - Passport GoogleStrategy configuration
- **authRoutes.js:47** - Validation check
- **authRoutes.js:52** - Validation check
- **authRoutes.js:60** - Logging
- **authRoutes.js:125** - Logging

### `FRONTEND_URL`
- **authRoutes.js:40** - Default redirect URL (OAuth start)
- **authRoutes.js:97** - Default redirect URL (OAuth callback)
- **authRoutes.js:113** - Default redirect URL (OAuth callback)
- **authRoutes.js:280** - Default redirect URL (error handler)

### `SESSION_SECRET`
- **server.js:168** - Session cookie encryption

### `JWT_SECRET`
- **authRoutes.js:212** - JWT token signing after OAuth

### `NODE_ENV`
- **server.js:177** - Cookie `secure` setting
- **server.js:178** - Cookie `sameSite` setting

## ✅ Verification Checklist

- [ ] `GOOGLE_CLIENT_ID` - Matches Google Cloud Console exactly
- [ ] `GOOGLE_CLIENT_SECRET` - Matches Google Cloud Console exactly (character by character)
- [ ] `GOOGLE_CALLBACK_URL` - Matches Google Cloud Console exactly (no trailing slash)
- [ ] `FRONTEND_URL` - Your actual frontend domain
- [ ] `SESSION_SECRET` - Set (long random string)
- [ ] `JWT_SECRET` - Set (long random string)
- [ ] `NODE_ENV` - Set to `production` (recommended)

## 🎯 Most Critical for OAuth

1. **GOOGLE_CLIENT_SECRET** - Must match exactly (most common issue)
2. **GOOGLE_CLIENT_ID** - Must match exactly
3. **GOOGLE_CALLBACK_URL** - Must match Google Cloud Console exactly
4. **NODE_ENV=production** - Required for secure cookies in production

---

**All variables must be set in Render (backend), not Vercel (frontend).**


