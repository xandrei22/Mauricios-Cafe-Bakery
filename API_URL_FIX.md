# API URL Fix - Login Issue Resolution

## Problem
When the app was deployed to Vercel, it was still trying to connect to `localhost:5001` instead of the production backend on Render. This caused all login attempts to fail with "net::ERR_CONNECTION_REFUSED" errors.

## Root Cause
The frontend code was hardcoded to fall back to `localhost:5001` when the `VITE_API_URL` environment variable wasn't set. In production on Vercel:
- Without `VITE_API_URL` set, the code would try to connect to localhost
- This failed because there's no backend running on localhost in production

## Solution
Created a centralized API configuration utility that automatically detects the environment and uses the appropriate API URL:

### Created File: `frontend/src/utils/apiConfig.ts`

This utility:
1. First checks for `VITE_API_URL` environment variable
2. If in localhost (development), uses `http://localhost:5001`
3. If in production (Vercel), returns empty string for relative paths, which allows Vercel's proxy configuration in `vercel.json` to route API calls to Render

The Vercel proxy configuration already exists in `vercel.json`:
```json
{
  "rewrites": [{
    "source": "/api/(.*)",
    "destination": "https://mauricios-cafe-bakery.onrender.com/api/$1"
  }]
}
```

This means any request to `/api/*` on Vercel gets proxied to the Render backend.

### Updated Files (Critical Authentication)
1. ✅ `frontend/src/components/customer/AuthContext.tsx`
2. ✅ `frontend/src/components/ui/login-form.tsx`
3. ✅ `frontend/src/components/ui/signup-form.tsx`
4. ✅ `frontend/src/components/admin/AdminAuthForm.tsx`
5. ✅ `frontend/src/components/staff/StaffAuthForm.tsx`
6. ✅ `frontend/src/contexts/AlertContext.tsx`
7. ✅ `frontend/src/hooks/useSessionValidation.ts`

## How It Works

### Development (localhost)
```typescript
const API_URL = getApiUrl(); // Returns: 'http://localhost:5001'
fetch(`${API_URL}/api/customer/login`, ...) // Calls: http://localhost:5001/api/customer/login
```

### Production (Vercel)
```typescript
const API_URL = getApiUrl(); // Returns: '' (empty string)
fetch(`${API_URL}/api/customer/login`, ...) // Calls: /api/customer/login (relative)
// Vercel rewrites this to: https://mauricios-cafe-bakery.onrender.com/api/customer/login
```

## Remaining Files
There are approximately 50 other files that still use the old pattern:
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
```

These should be updated to:
```typescript
import { getApiUrl } from '../../utils/apiConfig';
const API_URL = getApiUrl();
```

### To Update Remaining Files
1. Find files with: `import.meta.env.VITE_API_URL || 'http://localhost:5001'`
2. Add import: `import { getApiUrl } from '../../utils/apiConfig';`
3. Replace: `const API_URL = getApiUrl();`

## Testing
1. **Development**: Run locally and verify login works
2. **Production**: Deploy to Vercel and test login on the live site

## Next Steps
1. Commit and push these changes
2. Deploy to Vercel
3. Test login on the production site
4. Optionally update remaining files for consistency



