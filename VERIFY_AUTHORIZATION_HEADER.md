# How to Verify Authorization Header is Being Sent

## ✅ Current Implementation

Your `axiosInstance` **automatically adds the Authorization header** to every request via the request interceptor:

```typescript
// frontend/src/utils/axiosInstance.ts (Lines 34-93)
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  
  if (token && token.trim()) {
    config.headers['Authorization'] = `Bearer ${token.trim()}`;
  }
  
  return config;
});
```

**✅ This means:** Every request made with `axiosInstance` automatically includes the Authorization header - you don't need to add it manually!

---

## 🔍 How to Verify It's Working

### Method 1: Check Browser Console

After logging in, make any API call and check the console. You should see:

```
✅ AXIOS REQUEST - Authorization header attached
  url: "/api/customer/check-session"
  method: "get"
  hasToken: true
  tokenLength: 200+
  tokenPreview: "eyJhbGciOiJIUzI1NiIs..."
  headerSet: true
```

### Method 2: Check Network Tab (Chrome DevTools)

1. **Open Chrome DevTools** (F12)
2. **Go to Network tab**
3. **Make a request** (e.g., login, check-session, etc.)
4. **Click on the request** in the Network tab
5. **Click "Headers" tab**
6. **Scroll to "Request Headers"**

**You should see:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**If you DON'T see this:**
- Check if token exists: `localStorage.getItem('authToken')` in console
- Check console for warnings: `⚠️ AXIOS REQUEST - No token found`

### Method 3: Verify Token Exists

Open browser console and run:

```javascript
// Check if token exists
const token = localStorage.getItem('authToken');
console.log('Token exists:', !!token);
console.log('Token length:', token?.length);
console.log('Token preview:', token?.substring(0, 50) + '...');

// Check user data
const adminUser = localStorage.getItem('adminUser');
const staffUser = localStorage.getItem('staffUser');
const customerUser = localStorage.getItem('customerUser');
console.log('User data:', adminUser || staffUser || customerUser);
```

---

## ✅ What's Already Fixed

### All Auth Functions Use axiosInstance

- ✅ `adminLogin()` → `axiosInstance.post('/api/admin/login')`
- ✅ `staffLogin()` → `axiosInstance.post('/api/staff/login')`
- ✅ `customerLogin()` → `axiosInstance.post('/api/customer/login')`
- ✅ `checkAdminSession()` → `axiosInstance.get('/api/admin/check-session')`
- ✅ `checkStaffSession()` → `axiosInstance.get('/api/staff/check-session')`
- ✅ `checkCustomerSession()` → `axiosInstance.get('/api/customer/check-session')`

**All of these automatically get the Authorization header!**

### Token Storage

- ✅ All user types store token in: `localStorage.setItem('authToken', token)`
- ✅ Interceptor reads from: `localStorage.getItem('authToken')`
- ✅ **Same key for all users** - works for admin, staff, and customer

---

## 🐛 Troubleshooting

### Issue: "No Authorization header found" in backend logs

**Check 1: Token exists?**
```javascript
// In browser console:
localStorage.getItem('authToken')
// Should return a long JWT token string
```

**Check 2: Using axiosInstance?**
```typescript
// ✅ CORRECT - Uses axiosInstance (auto-adds header)
await axiosInstance.get('/api/customer/check-session');

// ❌ WRONG - Using fetch (no header added)
await fetch('/api/customer/check-session');
```

**Check 3: Network tab shows header?**
- Open Network tab
- Find the request
- Check Request Headers
- Look for `Authorization: Bearer ...`

### Issue: Token is null/undefined

**Possible causes:**
1. Login didn't complete successfully
2. Token wasn't saved to localStorage
3. localStorage was cleared

**Fix:**
```javascript
// Check what's in localStorage
console.log('All localStorage keys:', Object.keys(localStorage));
console.log('authToken:', localStorage.getItem('authToken'));
console.log('adminUser:', localStorage.getItem('adminUser'));
console.log('staffUser:', localStorage.getItem('staffUser'));
console.log('customerUser:', localStorage.getItem('customerUser'));
```

### Issue: Header not being sent

**Verify interceptor is working:**
1. Check browser console for logs: `✅ AXIOS REQUEST - Authorization header attached`
2. If you see `⚠️ AXIOS REQUEST - No token found`, the token is missing
3. Check Network tab to see if header is actually sent

---

## 📋 Quick Verification Checklist

- [ ] Login successfully (admin/staff/customer)
- [ ] Check browser console for: `✅ AXIOS REQUEST - Authorization header attached`
- [ ] Open Network tab → find request → check Request Headers
- [ ] Verify `Authorization: Bearer ...` header exists
- [ ] Backend logs should NOT show "No Authorization header found"

---

## 🎯 Summary

**Your implementation is CORRECT:**

1. ✅ `axiosInstance` automatically adds Authorization header
2. ✅ Token is read from `localStorage.getItem('authToken')`
3. ✅ Works for all user types (admin, staff, customer)
4. ✅ All auth functions use `axiosInstance`
5. ✅ Enhanced logging added to verify it's working

**You don't need to manually add headers** - the interceptor does it automatically!

---

## 🔧 Enhanced Logging Added

The interceptor now logs:
- ✅ When Authorization header is attached (with token preview)
- ⚠️ When protected endpoint is called without token
- 📊 Token length and preview for debugging

Check your browser console after making requests to see these logs.



