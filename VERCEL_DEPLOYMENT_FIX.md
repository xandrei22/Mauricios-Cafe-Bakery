# Vercel Deployment Login Fix

## Problem
When deploying the frontend to Vercel and the backend to Render, login fails due to cross-domain cookie issues. The session cookies are not being properly sent/received between domains.

## Root Cause
1. **Session Cookie Configuration**: The `sameSite` attribute was set to `'lax'`, which doesn't work for cross-origin requests
2. **CORS Configuration**: The CORS settings needed to properly handle Vercel preview domains
3. **Missing Proxy Trust**: The server wasn't properly trusting proxy headers for correct cookie handling

## Fixes Applied

### 1. Session Cookie Configuration (server.js line 157-173)
Changed from:
```javascript
cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax',  // ❌ Doesn't work for cross-origin
    httpOnly: true,
    rolling: true
}
```

To:
```javascript
cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'none',  // ✅ Required for cross-origin cookies
    httpOnly: true,
    rolling: true,
    domain: process.env.COOKIE_DOMAIN,
    proxy: true  // ✅ Trust proxy for correct secure flag handling
}
```

### 2. CORS Configuration
- Updated to properly log allowed/blocked origins
- Added support for all Vercel preview domains ending with `.vercel.app` or `vercel.app`
- Enhanced Socket.IO CORS to use a function instead of array

## Required Environment Variables

### Vercel Environment Variables
You need to set these in your Vercel project settings:

1. **VITE_API_URL**: Your Render backend URL
   ```
   https://mauricios-cafe-bakery.onrender.com
   ```

### Render Environment Variables
Make sure these are set in your Render backend environment:

1. **FRONTEND_URL**: Your Vercel frontend URL
   ```
   https://mauricios-cafe-bakery.vercel.app
   ```

2. **SESSION_SECRET**: A secure random string for session encryption
   ```
   (Generate a secure random string)
   ```

3. **NODE_ENV**: Set to production
   ```
   production
   ```

4. **COOKIE_DOMAIN** (optional): If you need cookies to work across subdomains
   ```
   (Leave empty or unset if not needed)
   ```

### Database Connection
Make sure your Render backend has proper MySQL database connection settings configured.

## How to Set Environment Variables in Vercel

1. Go to your project in Vercel dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the `VITE_API_URL` variable with your Render backend URL
4. Redeploy your application

## Testing the Fix

After deploying the updated backend to Render:

1. Try logging in through the Vercel frontend
2. Check browser DevTools → Application → Cookies
   - You should see a `sessionId` cookie set for the Render domain
3. Check the Network tab for login requests
   - Look for `Set-Cookie` headers in the response
   - The login request should include credentials

## Troubleshooting

### If login still fails:

1. **Check CORS logs**: Look at Render logs for "✅ CORS allowed" or "❌ CORS blocked" messages
2. **Check cookie attributes**: In browser DevTools, verify:
   - `HttpOnly: true`
   - `Secure: true` (HTTPS required)
   - `SameSite: None` (for cross-origin)
   - `Domain` matches your Render domain

3. **Verify environment variables**: 
   - Check Vercel has `VITE_API_URL` set correctly
   - Check Render has `FRONTEND_URL` and `SESSION_SECRET` set

4. **Check SSL/HTTPS**: Both Vercel and Render must use HTTPS in production

### Common Issues:

**Issue**: Cookies not being set
- **Solution**: Ensure `sameSite: 'none'` AND `secure: true` are both set

**Issue**: CORS errors in console
- **Solution**: Check that your Vercel domain is in the allowed origins list

**Issue**: 401 Unauthorized after login
- **Solution**: Check that session storage is working properly in your database

## Additional Notes

- The backend is deployed on Render (server-based hosting)
- The frontend is deployed on Vercel (serverless hosting)
- Sessions are stored in MySQL database using `express-mysql-session`
- Socket.IO is used for real-time updates
- All cookies require HTTPS in production (`secure: true`)

## Next Steps

1. ✅ Fixed session cookie configuration
2. ✅ Updated CORS settings
3. 🔄 Deploy backend to Render
4. 🔄 Verify environment variables in both Vercel and Render
5. 🔄 Test login functionality
6. 🔄 Monitor logs for any CORS or session errors

