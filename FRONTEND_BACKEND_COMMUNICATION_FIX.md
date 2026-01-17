# Frontend-Backend Communication Issue - CORS Error Fix

## 🔍 Problem Identified

Your frontend (deployed on Vercel at `mauricios-cafe-bakery.vercel.app`) is **not able to communicate with your backend** due to a CORS error. This is shown in the browser's Network tab as a "CORS error" status.

## ✅ Changes Made

### 1. **Improved Error Handling** (`frontend/src/utils/axiosInstance.ts`)
   - Added better detection and reporting of network/CORS errors
   - Added debug logging to show which API URL is being used
   - More descriptive error messages for connection failures

### 2. **Enhanced CORS Configuration** (`backend/server.js`)
   - Added more explicit CORS headers
   - Added logging to track which origins are being allowed
   - Added `Access-Control-Max-Age` header for better preflight caching
   - Added additional middleware to ensure CORS headers are set on all responses

## 🔧 What You Need to Check

### **CRITICAL: Verify Backend URL Configuration**

The frontend needs to know where your backend is. Check the following:

1. **Is `VITE_API_URL` set in Vercel?**
   - Go to your Vercel project dashboard
   - Navigate to Settings → Environment Variables
   - Look for `VITE_API_URL`
   - It should be set to: `https://mauricios-cafe-bakery.onrender.com` (or your actual backend URL)

2. **Is your backend running?**
   - Check if your Render backend is online
   - Visit: `https://mauricios-cafe-bakery.onrender.com/api/health`
   - You should see a JSON response with `{"success": true, ...}`

3. **Check browser console**
   - Open your deployed frontend
   - Open browser DevTools (F12)
   - Check the Console tab
   - Look for logs starting with `🌐` - these will show:
     - What API URL is being used
     - Whether `VITE_API_URL` is set
     - Current hostname

## 🚨 Common Issues

### Issue 1: `VITE_API_URL` Not Set in Vercel
**Symptom:** Console shows `VITE_API_URL from env: NOT SET`

**Fix:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add new variable:
   - **Key:** `VITE_API_URL`
   - **Value:** `https://mauricios-cafe-bakery.onrender.com`
   - **Environment:** Production, Preview, Development (select all)
3. **Redeploy** your frontend (Vercel will rebuild with the new env var)

### Issue 2: Backend Not Running
**Symptom:** Network tab shows connection refused or timeout

**Fix:**
1. Check Render dashboard to see if backend is running
2. If backend is sleeping, wake it up or upgrade to a plan that keeps it awake
3. Verify backend health endpoint: `https://mauricios-cafe-bakery.onrender.com/api/health`

### Issue 3: Wrong Backend URL
**Symptom:** CORS error persists even with correct configuration

**Fix:**
1. Verify your actual backend URL in Render
2. Update `VITE_API_URL` in Vercel to match exactly
3. Make sure there's no trailing slash: `https://mauricios-cafe-bakery.onrender.com` (not `https://mauricios-cafe-bakery.onrender.com/`)

## 🧪 Testing Steps

1. **Check browser console:**
   ```
   Open DevTools → Console tab
   Look for: "🌐 Axios instance configured with API URL: ..."
   ```

2. **Test backend directly:**
   ```
   Visit: https://mauricios-cafe-bakery.onrender.com/api/health
   Should return: {"success": true, "message": "Server is running", ...}
   ```

3. **Test from frontend:**
   ```
   Open Network tab in DevTools
   Try to login
   Check if the request to /api/customer/login shows:
   - Status: 200 (success) or 401 (wrong credentials) - GOOD
   - Status: CORS error or Network Error - BAD (backend not reachable)
   ```

## 📝 Next Steps

1. **Verify `VITE_API_URL` is set in Vercel**
2. **Redeploy frontend** after setting the environment variable
3. **Check backend is running** on Render
4. **Test login again** and check browser console for the debug logs
5. **If still failing**, check the Network tab to see the exact error

## 🔍 Debug Information

The improved error handling will now show in the console:
- What API URL is being used
- Whether environment variables are set
- Detailed error information for network failures

Look for these console messages:
- `🌐 Axios instance configured with API URL: ...`
- `🌐 VITE_API_URL from env: ...`
- `🚨 Network/CORS Error: ...` (if there's a connection issue)
