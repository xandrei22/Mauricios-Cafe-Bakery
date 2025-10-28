# Backend Deployment Steps - Admin/Staff Login Fix

## Problem
The backend server is returning 401 "Invalid username or password" errors even with correct credentials.

## Root Causes
1. ✅ **FIXED:** Missing `express.json()` middleware (server.js lines 147-148)
2. ❓ **POSSIBLE:** Admin user doesn't exist in production database
3. ❓ **POSSIBLE:** Password hash mismatch

## Deployment Steps

### Step 1: Commit and Push Changes
```bash
git add .
git commit -m "Fix: Add JSON parsing middleware to resolve login errors"
git push origin main
```

### Step 2: Render Will Auto-Deploy
- Render will detect the push
- It will rebuild and restart the server with the new middleware

### Step 3: Verify Admin User Exists (Run on Render Shell)

1. **Open Render Shell**
   - Go to your Render dashboard
   - Click on the backend service
   - Click "Shell" tab
   - Open the shell

2. **Check for admin users**
   ```bash
   node debug-admin-login.js
   ```

3. **If no admin user exists, create one**
   ```bash
   node scripts/create-admin.js admin yourpassword admin@cafe.com "Admin Name"
   ```

   **Example:**
   ```bash
   node scripts/create-admin.js joshjosh1622he yourpassword joshjosh1622he@gmail.com "Josh Admin"
   ```

### Step 4: Test Login
- Go to: https://mauricios-cafe-bakery.vercel.app/admin/login
- Enter your credentials
- Should work now!

## What Was Fixed

### File: `capstone/backend/server.js`
**Added (Lines 147-148):**
```javascript
// Parse JSON and URL-encoded request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
```

**Why:** Without this middleware, `req.body` is undefined, causing the login handler to crash.

### File: `capstone/frontend/src/components/admin/AdminAuthForm.tsx`
**Changed (Line 39):**
```typescript
// Before:
usernameOrEmail,

// After:
username: usernameOrEmail,
```

**Why:** Backend expects `username` field, not `usernameOrEmail`.

## Still Getting 401 Error?

If you still get "Invalid username or password" after deployment:

1. **Run the debug script on Render:**
   ```bash
   cd /opt/render/project/src
   node debug-admin-login.js
   ```

2. **Check if your user exists:**
   ```bash
   node debug-admin-login.js joshjosh1622he
   ```

3. **Recreate your admin account:**
   ```bash
   node scripts/create-admin.js joshjosh1622he 16Josh1010 joshjosh1622he@gmail.com "Josh Admin"
   ```

4. **Test login again**

## Troubleshooting

### Issue: Database connection error
**Solution:** Check that `MYSQL_URL` or `DB_HOST` environment variables are set in Render dashboard → Settings → Environment

### Issue: Table doesn't exist
**Solution:** Run the database setup:
```bash
node setup-database.js
```

### Issue: CORS errors in console
**Solution:** Already handled in `server.js` CORS configuration (lines 88-122). If still occurring, check allowed origins include your Vercel URL.

