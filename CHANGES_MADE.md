# Changes Made - Login Fix

## Files Modified in Commit `9ea3742`

### 1. Staff Login Form
**File:** `frontend/src/components/staff/StaffAuthForm.tsx`

**Line 23-24:** Added API URL variable
```tsx
// Get the API URL from environment variable
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
```

**Line 33:** Changed from relative to absolute URL
```tsx
// Before:
const res = await fetch("/api/staff/login", {

// After:
const res = await fetch(`${API_URL}/api/staff/login`, {
```

---

### 2. Customer Login Form
**File:** `frontend/src/components/ui/login-form.tsx`

**Line 27-28:** Added API URL variable
```tsx
// Get the API URL from environment variable
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
```

**Line 49:** Changed from relative to absolute URL
```tsx
// Before:
const res = await fetch("/api/customer/login", {

// After:
const res = await fetch(`${API_URL}/api/customer/login`, {
```

**Line 151:** Fixed Google login redirect
```tsx
// Before:
onClick={() => window.location.href = `/api/auth/google...`

// After:
onClick={() => window.location.href = `${API_URL}/api/auth/google...`
```

---

### 3. Customer Signup Form
**File:** `frontend/src/components/ui/signup-form.tsx`

**Line 33-34:** Added API URL variable
```tsx
// Get the API URL from environment variable
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
```

**Line 57:** Changed from relative to absolute URL
```tsx
// Before:
const res = await fetch("/api/customer/signup", {

// After:
const res = await fetch(`${API_URL}/api/customer/signup`, {
```

---

### 4. Admin Login Form
**File:** `frontend/src/components/admin/AdminAuthForm.tsx`
(Previously fixed in earlier commit)

**Line 25-26:** Added API URL variable
```tsx
// Get the API URL from environment variable
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
```

**Line 33:** Changed from relative to absolute URL
```tsx
// Before:
const res = await fetch("/api/admin/login", {

// After:
const res = await fetch(`${API_URL}/api/admin/login`, {
```

---

### 5. Vercel Configuration
**File:** `vercel.json`
(Modified in earlier commit)

**Lines 3-5:** Added API proxy
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

---

### 6. Backend Server Configuration
**File:** `backend/server.js`
(Modified in earlier commit)

**Line 165:** Changed session cookie SameSite
```javascript
// Before:
sameSite: 'lax',

// After:
sameSite: 'none', // Required for cross-origin cookies
```

---

## Summary

All login forms now:
1. ✅ Use `VITE_API_URL` environment variable
2. ✅ Make requests to backend (not Vercel)
3. ✅ Work with cross-origin cookies
4. ✅ Can be configured via Vercel environment variables

## Files Changed in Total:
- `frontend/src/components/admin/AdminAuthForm.tsx`
- `frontend/src/components/staff/StaffAuthForm.tsx`
- `frontend/src/components/ui/login-form.tsx`
- `frontend/src/components/ui/signup-form.tsx`
- `vercel.json`
- `backend/server.js`





























