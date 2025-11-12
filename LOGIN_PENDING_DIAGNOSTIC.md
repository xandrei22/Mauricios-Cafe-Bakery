# Login Request "Pending" - Diagnostic Guide

## 🔍 Why Login Requests Are Pending

A "pending" status means the browser sent the request but **never received a response**. This is usually caused by:

### 1. **CORS Preflight Failure** ⚠️ **MOST COMMON**
**Symptom:** Request shows as "pending" in Network tab, no response received

**Causes:**
- CORS preflight (OPTIONS request) is blocked
- Backend not responding to OPTIONS requests
- CORS headers mismatch

**Fixed:** ✅ CORS configuration is now consistent:
- `corsOptions.credentials: false`
- No `Access-Control-Allow-Credentials` headers
- Frontend `withCredentials: false`

### 2. **Backend Server Not Running/Not Accessible**
**Symptom:** All requests pending, no backend logs

**Check:**
- Is backend server running? Check Render/Railway logs
- Is backend URL correct? Check `VITE_API_URL` in frontend
- Can you access backend directly? Try: `https://mauricios-cafe-bakery.onrender.com/api/test`

### 3. **Network/Timeout Issues**
**Symptom:** Request times out after 30 seconds

**Check:**
- Network connectivity
- Backend server health
- Firewall/proxy blocking requests

### 4. **CORS Origin Not Allowed**
**Symptom:** Request pending, browser console shows CORS error

**Check:**
- Is `https://mauricios-cafe-bakery.vercel.app` in `allowedOrigins`?
- Check backend logs for "CORS: Origin not allowed"

---

## ✅ **CORS Configuration Status**

### Backend (`server.js`):
- ✅ `corsOptions.credentials: false` (JWT-only)
- ✅ No `Access-Control-Allow-Credentials` headers
- ✅ `allowedOrigins` includes Vercel URL
- ✅ OPTIONS requests handled immediately

### Frontend (`axiosInstance.ts`):
- ✅ `withCredentials: false` (JWT-only)
- ✅ Authorization header added automatically
- ✅ Timeout: 30 seconds

---

## 🔧 **How to Debug**

### 1. **Check Browser Console**
Open DevTools → Console tab:
- Look for CORS errors
- Look for network errors
- Check if OPTIONS request succeeded

### 2. **Check Network Tab**
Open DevTools → Network tab:
- Find the `login` request
- Check if OPTIONS preflight succeeded (status 204)
- Check Request Headers (should have `Authorization: Bearer <token>`)
- Check Response Headers (should have `Access-Control-Allow-Origin`)

### 3. **Check Backend Logs**
On Render/Railway:
- Look for "🔐 CUSTOMER LOGIN REQUEST RECEIVED"
- Look for "🔍 CORS Request" logs
- Look for "✅ CORS: Origin allowed" or "❌ CORS: Origin not allowed"

### 4. **Test Backend Directly**
```bash
# Test if backend is accessible
curl https://mauricios-cafe-bakery.onrender.com/api/test

# Test login endpoint (should return 400/401, not timeout)
curl -X POST https://mauricios-cafe-bakery.onrender.com/api/customer/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://mauricios-cafe-bakery.vercel.app" \
  -d '{"email":"test@test.com","password":"test"}'
```

---

## 🚨 **Common Issues & Fixes**

### Issue 1: CORS Preflight Failing
**Symptom:** OPTIONS request returns error or pending

**Fix:**
- Ensure `app.options('*', cors(corsOptions))` is in `server.js`
- Ensure OPTIONS requests are handled before routes
- Check `allowedOrigins` includes frontend URL

### Issue 2: Backend Not Responding
**Symptom:** No backend logs, request times out

**Fix:**
- Check if backend server is running
- Check backend URL in frontend `.env`
- Check backend health endpoint

### Issue 3: Origin Not in Allowed List
**Symptom:** Backend logs show "❌ CORS: Origin not allowed"

**Fix:**
- Add frontend URL to `allowedOrigins` in `server.js`
- Ensure URL matches exactly (no trailing slash, correct protocol)

---

## 📋 **Verification Checklist**

- [ ] Backend server is running (check Render/Railway)
- [ ] Backend URL is correct in frontend `.env` (`VITE_API_URL`)
- [ ] Frontend URL is in `allowedOrigins` in `server.js`
- [ ] CORS preflight (OPTIONS) succeeds (status 204)
- [ ] Login request includes `Authorization` header (if token exists)
- [ ] No CORS errors in browser console
- [ ] Backend logs show request received

---

## 🎯 **Quick Fixes Applied**

1. ✅ Removed `Access-Control-Allow-Credentials: 'true'` (was causing mismatch)
2. ✅ Ensured `corsOptions.credentials: false` matches frontend
3. ✅ Verified OPTIONS handling is correct
4. ✅ Verified login routes are properly configured

**Next Steps:**
1. Check backend logs to see if requests are reaching the server
2. Check browser Network tab for OPTIONS preflight status
3. Verify backend URL is correct in frontend













