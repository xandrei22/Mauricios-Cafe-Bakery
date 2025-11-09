# Backend Connection Troubleshooting

## "Cannot connect to server" Error

If you're seeing "Cannot connect to server" error, check these:

### 1. Is Backend Server Running?

**Check locally:**
```bash
cd capstone/backend
node server.js
# Should see: "Server running on http://localhost:5001"
```

**Check on Render/Railway:**
- Go to your backend service dashboard
- Check if service status is "Live" or "Running"
- Check logs for errors

### 2. Check Backend Logs

**On Render/Railway:**
- Go to your backend service → Logs tab
- Look for:
  - `Server running on http://localhost:5001` ✅ (server started)
  - `❌ Failed to establish database connection pool` ❌ (database issue)
  - `❌ CORS: Origin NOT allowed` ❌ (CORS issue)
  - Any syntax errors ❌ (code issue)

### 3. Verify Database Connection

**Check backend logs for:**
```
✅ Database connection pool established successfully
```

**If you see:**
```
❌ Failed to establish database connection pool
```

**Fix:**
- Check database service is running
- Verify `MYSQL_URL` or database credentials are set
- Restart database service if needed

### 4. Check CORS Configuration

**Backend should log:**
```
🔍 CORS Request: { origin: 'https://...', method: 'POST', path: '/api/customer/login' }
✅ CORS: Headers applied to POST /api/customer/login
```

**If you see:**
```
❌ CORS: Origin NOT allowed
```

**Fix:**
- Add your frontend URL to `allowedOrigins` in `server.js`
- Restart backend server

### 5. Network/URL Issues

**Check:**
- Frontend `VITE_API_URL` is set correctly
- Backend URL is accessible (try opening in browser)
- No firewall blocking requests

### 6. Common Issues

#### Issue: Backend Server Crashed
**Symptom:** No logs, service shows "Stopped"
**Fix:** 
- Check logs for syntax errors
- Restart service
- Verify all dependencies installed

#### Issue: Database Connection Failed
**Symptom:** Backend starts but can't connect to database
**Fix:**
- Check database credentials
- Verify database service is running
- Check `MYSQL_URL` environment variable

#### Issue: CORS Blocking
**Symptom:** Preflight succeeds (204) but POST fails
**Fix:**
- Verify CORS headers are on all responses
- Check `Access-Control-Allow-Credentials: false` matches frontend `credentials: 'omit'`
- Restart backend after CORS changes

### 7. Quick Test

**Test backend directly:**
```bash
curl -X POST https://your-backend-url.onrender.com/api/customer/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://your-frontend.vercel.app" \
  -d '{"email":"test@test.com","password":"test"}'
```

**Expected:**
- Should return JSON response (even if login fails)
- Should include CORS headers in response

### 8. Restart Backend

**After any code changes:**
1. Restart backend server (required!)
2. Check logs for startup messages
3. Verify no errors in logs
4. Test connection again

## Still Not Working?

1. **Check Render/Railway Status Page**: https://status.render.com or https://status.railway.app
2. **Check Backend Logs**: Look for specific error messages
3. **Test Backend URL**: Try accessing `https://your-backend-url.onrender.com/api/health` in browser
4. **Verify Environment Variables**: Check all required env vars are set

