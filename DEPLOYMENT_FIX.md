# Login Issues After Deployment - Complete Fix

## The Problem

When deployed to Vercel, Render, and Railway:
- **405 Method Not Allowed** on `/api/admin/login`
- **Network errors** on all API calls
- Login requests go to `vercel.app` instead of backend

## Root Cause

1. **Frontend using relative URLs**: The admin login uses `/api/admin/login` instead of the full backend URL
2. **Vercel rewrites**: The `vercel.json` was rewriting ALL requests (including `/api/*`) to `index.html`
3. **Missing environment variable**: `VITE_API_URL` wasn't set in Vercel

## Fixes Applied

### ✅ 1. Fixed Admin Login (AdminAuthForm.tsx)
Changed from relative URL to absolute URL:
```diff
- const res = await fetch("/api/admin/login", {
+ const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
+ const res = await fetch(`${API_URL}/api/admin/login`, {
```

### ✅ 2. Fixed Vercel Rewrites (vercel.json)
Added API proxy to redirect to backend:
```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://mauricios-cafe-bakery.onrender.com/api/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## What You Need to Do

### 1. Set Environment Variable in Vercel
Go to Vercel Dashboard → Settings → Environment Variables

Add:
```
VITE_API_URL=https://mauricios-cafe-bakery.onrender.com
```

**Note**: Replace with your actual backend URL (Render or Railway)

### 2. Update vercel.json for Your Backend URL

If your backend is on **Railway** instead of Render, update line 5 in `vercel.json`:

```json
"destination": "https://YOUR-RAILWAY-APP.up.railway.app/api/$1"
```

Or if you're using **Render**:
```json
"destination": "https://YOUR-APP.onrender.com/api/$1"
```

### 3. Redeploy Vercel
1. Push your changes to git
2. Vercel will auto-deploy
3. Make sure `VITE_API_URL` environment variable is set

### 4. Verify Backend is Running
Check your Render/Railway dashboard:
- Service should be "Live" or "Running"
- Check logs for any errors
- Verify the backend URL is accessible

## Environment Variables Summary

### Vercel (Frontend)
```
VITE_API_URL=https://your-backend-url.onrender.com
```
(Replace with your actual backend URL)

### Render/Railway (Backend)
```
FRONTEND_URL=https://mauricios-cafe-bakery.vercel.app
SESSION_SECRET=<generate-random-hex-string>
NODE_ENV=production

# Database (if not using managed database)
DB_HOST=...
DB_USER=...
DB_PASSWORD=...
DB_NAME=cafeiq
```

Or if using `MYSQL_URL`:
```
MYSQL_URL=mysql://user:pass@host:3306/database
```

## Testing

1. Open your Vercel frontend
2. Try logging in as admin
3. Check browser Network tab:
   - Should see requests to `https://your-backend.onrender.com/api/admin/login`
   - Should get 200 OK response
   - Should set session cookies

## Common Issues

### Issue: Still getting 405 errors
**Solution**: 
1. Clear browser cache
2. Make sure `VITE_API_URL` is set in Vercel
3. Redeploy Vercel

### Issue: CORS errors
**Solution**: Backend CORS is already configured in `server.js` to allow Vercel domains

### Issue: Backend not responding
**Solution**: 
1. Check Render/Railway logs
2. Verify database connection
3. Make sure backend service is running

### Issue: Using Railway instead of Render
**Solution**: Update `vercel.json` line 5 with your Railway URL

## Additional Notes

- The frontend now properly uses `VITE_API_URL` for all API calls
- Vercel will proxy `/api/*` requests to your backend
- Sessions will work across Vercel (frontend) and Render/Railway (backend)
- Make sure both are using HTTPS (they automatically do)

## Next Steps

1. ✅ Set `VITE_API_URL` in Vercel
2. ✅ Update `vercel.json` with your actual backend URL  
3. ✅ Push changes to git (Vercel auto-deploys)
4. ✅ Test login functionality
5. ✅ Check browser DevTools Network tab for errors

## Support

If still having issues:
1. Check Render/Railway backend logs
2. Check Vercel deployment logs
3. Check browser console for JavaScript errors
4. Verify environment variables are set correctly

















































