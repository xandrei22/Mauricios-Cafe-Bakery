# Hybrid Authentication Setup

## Overview

This backend now uses a **hybrid authentication approach**:
- ✅ **JWT tokens** for all normal logins (customer, admin, staff)
- ✅ **Sessions** only for Google OAuth routes (Passport.js requirement)
- ✅ **CORS** configured for JWT-only (`credentials: false` globally)
- ✅ **Mobile-friendly** - No cookie dependencies for normal logins

## How It Works

### Normal Logins (JWT-Only)
- **Customer Login**: `/api/customer/login` → Returns JWT token
- **Admin Login**: `/api/admin/login` → Returns JWT token
- **Staff Login**: `/api/staff/login` → Returns JWT token
- **No sessions** - Completely stateless
- **No cookies** - Token stored in `localStorage` on frontend
- **Works on mobile** - No cookie blocking issues

### Google OAuth (Session-Based)
- **OAuth Start**: `/api/auth/google` → Uses session to store state
- **OAuth Callback**: `/api/auth/google/callback` → Uses session for Passport.js
- **Sessions only active** for `/api/auth/google/*` routes
- **Cookies sent only** for OAuth flow (temporary, 1 hour max)
- **After OAuth** → Returns JWT token (same as normal login)

## Key Changes

### Before (Global Sessions)
```javascript
// Sessions applied to ALL routes
app.use(session({ ... }));
app.use(passport.session());
```

### After (Hybrid)
```javascript
// Sessions ONLY for Google OAuth
const sessionMiddleware = session({ ... });
app.use('/api/auth/google', sessionMiddleware, passport.session());
```

## Benefits

1. **Mobile Compatibility**: Normal logins don't use cookies → No Safari blocking
2. **Stateless API**: JWT tokens work everywhere → Better scalability
3. **OAuth Still Works**: Passport.js gets sessions it needs → Google login functional
4. **CORS Simplified**: `credentials: false` globally → No cookie/CORS conflicts
5. **Easy Migration**: When OAuth moves to JWT, just delete session code

## CORS Configuration

```javascript
credentials: false  // ✅ Global setting - no cookies by default
```

**Exception**: Google OAuth routes (`/api/auth/google/*`) will send cookies because they use sessions, but this is temporary and only during the OAuth flow.

## Frontend Impact

### Normal Logins
- ✅ Use `axiosInstance` (has `withCredentials: false`)
- ✅ Store JWT in `localStorage`
- ✅ Send `Authorization: Bearer <token>` header
- ✅ No cookies needed

### Google OAuth
- ✅ Redirects to `/api/auth/google`
- ✅ Browser handles OAuth flow (cookies sent automatically)
- ✅ Receives JWT token after OAuth completes
- ✅ Stores JWT in `localStorage` (same as normal login)

## Testing

### Test Normal Login (JWT)
```bash
curl -X POST https://your-backend.com/api/customer/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://your-frontend.vercel.app" \
  -d '{"email":"test@test.com","password":"test"}'
```

**Expected**: Returns JWT token, no cookies

### Test Google OAuth
```bash
# Start OAuth flow
curl -I https://your-backend.com/api/auth/google
```

**Expected**: Redirects to Google, sets session cookie (temporary)

## Migration Path

When ready to move OAuth to JWT:
1. Remove `sessionMiddleware` and `sessionStore`
2. Remove `passport.session()` middleware
3. Update OAuth callback to return JWT instead of using session
4. Delete session-related code

## Troubleshooting

### Issue: Google OAuth not working
**Check**: Sessions are only applied to `/api/auth/google/*` routes
**Fix**: Verify `app.use('/api/auth/google', sessionMiddleware, passport.session())` is before route registration

### Issue: Normal logins still using sessions
**Check**: Sessions are NOT applied globally
**Fix**: Verify `app.use(session(...))` is removed from global middleware

### Issue: CORS errors on normal logins
**Check**: CORS is set to `credentials: false`
**Fix**: Verify frontend uses `credentials: 'omit'` or `withCredentials: false`

## Summary

✅ **JWT for normal logins** - Stateless, mobile-friendly
✅ **Sessions for OAuth only** - Passport.js requirement
✅ **CORS configured correctly** - No cookie conflicts
✅ **Mobile Safari compatible** - No cookie blocking
✅ **Easy to maintain** - Clear separation of concerns

