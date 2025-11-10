# Quick Fix: Login & Dashboard Redirection Checklist

## 🎯 Immediate Actions

### 1. Verify Backend is Running
- [ ] Go to Render dashboard
- [ ] Check backend service is "Live"
- [ ] Verify latest deployment includes CORS fix for `mauricios-cafe-bakery.shop`

### 2. Verify Frontend is Deployed
- [ ] Go to Vercel dashboard
- [ ] Check latest deployment is "Ready"
- [ ] Verify build completed successfully (no errors)

### 3. Clear Browser Cache
- [ ] Open DevTools (F12)
- [ ] Right-click refresh → "Empty Cache and Hard Reload"
- [ ] OR use Incognito/Private window

### 4. Test Login Flow

**For Customer:**
1. Go to `https://mauricios-cafe-bakery.shop/login`
2. Enter email and password
3. Click "Login"
4. **Check:**
   - [ ] Console shows: `🔧 REGISTERING AXIOS REQUEST INTERCEPTOR...`
   - [ ] Console shows: `✅ CUSTOMER TOKEN SAVED SUCCESSFULLY`
   - [ ] Redirects to `/customer/dashboard`
   - [ ] No 401 errors

**For Admin:**
1. Go to `https://mauricios-cafe-bakery.shop/admin/login`
2. Enter email and password
3. Click "Login"
4. **Check:**
   - [ ] Token in localStorage
   - [ ] Redirects to `/admin/dashboard`
   - [ ] No 401 errors

**For Staff:**
1. Go to `https://mauricios-cafe-bakery.shop/staff/login`
2. Enter email and password
3. Click "Login"
4. **Check:**
   - [ ] Token in localStorage
   - [ ] Redirects to `/staff/dashboard`
   - [ ] No 401 errors

---

## 🔍 Debug Steps

### Check localStorage (After Login)
```javascript
// Run in browser console
console.log('Token:', localStorage.getItem('authToken') ? 'EXISTS' : 'MISSING');
console.log('User:', localStorage.getItem('customerUser') || localStorage.getItem('adminUser') || localStorage.getItem('staffUser') ? 'EXISTS' : 'MISSING');
console.log('Build:', localStorage.getItem('buildVersion'));
```

**Expected:**
- Token: EXISTS (long JWT string)
- User: EXISTS (JSON string)
- Build: `XSgD9sma-v2` or similar

### Check Network Tab
1. Open Network tab
2. Try to log in
3. Find `check-session` request
4. Click it → Headers tab
5. **Check Request Headers:**
   - [ ] `Authorization: Bearer eyJ...` is present
   - [ ] NOT showing `401 Unauthorized`

### Check Console Logs
**After login, you should see:**
- [ ] `🔧 REGISTERING AXIOS REQUEST INTERCEPTOR...`
- [ ] `🌐 AXIOS REQUEST INTERCEPTOR FIRED:`
- [ ] `🔍 AXIOS INTERCEPTOR - check-session request:` with `hasToken: true`
- [ ] `✅ AXIOS REQUEST - Authorization header attached`
- [ ] `🔍 FINAL CHECK - Config being returned:` with `hasAuthorization: true`

**If you see:**
- `❌ OLD BUILD SCRIPT DETECTED` → Hard refresh needed
- `⚠️ AXIOS REQUEST - No token found` → Token not saved
- `❌ CRITICAL: Authorization header NOT SET` → Interceptor issue

---

## 🚨 If Still Not Working

### Issue: 401 Unauthorized
**Fix:**
1. Check Network tab - is Authorization header sent?
2. Check localStorage - is token there?
3. Hard refresh browser
4. Check Vercel deployment - is new build deployed?

### Issue: No Redirect After Login
**Fix:**
1. Check console for errors
2. Check localStorage - is token saved?
3. Wait 1-2 seconds - redirect has delay
4. Check if `loginTimestamp` is set

### Issue: Old Build Loading
**Fix:**
1. Clear browser cache completely
2. Use Incognito mode
3. Check Vercel - wait for new deployment
4. Manually set: `localStorage.setItem('buildVersion', 'force-reload'); location.reload();`

---

## ✅ Success Criteria

**All users should:**
1. ✅ Log in successfully
2. ✅ See token in localStorage immediately
3. ✅ Be redirected to their dashboard
4. ✅ See no 401 errors in console
5. ✅ Dashboard loads completely

**If all checkboxes are ✅, the fix is complete!**

