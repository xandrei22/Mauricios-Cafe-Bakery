# Vercel (Frontend) Environment Variables

## 🔑 Required Variables in Vercel

### 1. **VITE_API_URL** ⭐ REQUIRED
- **Used in:** `frontend/src/utils/apiConfig.ts` (lines 13, 19)
- **Used in:** `frontend/src/components/ui/login-form.tsx` (line 173) - Google OAuth redirect
- **Purpose:** Tells frontend where the backend API is located
- **Format:** `https://your-backend-url.onrender.com`
- **Example:** `https://mauricios-cafe-bakery.onrender.com`
- **⚠️ CRITICAL:** 
  - No trailing slash
  - Must use `https://`
  - Must point to your Render backend
- **Used for:**
  - All API calls (login, signup, orders, etc.)
  - Google OAuth redirect (`/api/auth/google`)

## ❌ NOT Needed in Vercel

### Google OAuth Variables
- ❌ `VITE_GOOGLE_CLIENT_ID` - **NOT USED** (frontend doesn't use Google OAuth directly)
- ❌ `VITE_GOOGLE_CLIENT_SECRET` - **NOT USED** (never expose secrets in frontend)
- ❌ `GOOGLE_CALLBACK_URL` - **NOT USED** (backend handles OAuth)

**Why?** The frontend just redirects to the backend's OAuth endpoint. The backend handles all OAuth logic.

## 📋 Complete Variable List for Vercel

```bash
# Required - Backend API URL
VITE_API_URL=https://mauricios-cafe-bakery.onrender.com
```

That's it! Only one variable is needed.

## 🔍 How It Works

### Frontend Code Flow

1. **API Calls:**
   ```typescript
   // frontend/src/utils/apiConfig.ts
   const apiUrl = import.meta.env.VITE_API_URL || 'https://mauricios-cafe-bakery.onrender.com';
   ```

2. **Google OAuth:**
   ```typescript
   // frontend/src/components/ui/login-form.tsx
   const baseUrl = getApiUrl(); // Uses VITE_API_URL
   const redirectUrl = `${baseUrl}/api/auth/google`;
   window.location.href = redirectUrl; // Redirects to backend
   ```

3. **All API Requests:**
   - Uses `VITE_API_URL` to build full API endpoint URLs
   - Example: `${VITE_API_URL}/api/customer/login`

## ✅ Verification

### Check in Browser Console

1. Open your deployed frontend
2. Open DevTools (F12) → Console
3. Type: `import.meta.env.VITE_API_URL`
4. Should show: `"https://mauricios-cafe-bakery.onrender.com"`

**If `undefined`:**
- Variable not set in Vercel
- Frontend needs to be rebuilt after setting variable

### Check Network Tab

1. Open DevTools → Network tab
2. Click "Login with Google"
3. Should see request to: `https://mauricios-cafe-bakery.onrender.com/api/auth/google`
4. If different URL → `VITE_API_URL` is wrong or not set

## 🔧 How to Set in Vercel

1. Go to **Vercel Dashboard** → Your project
2. Click **Settings** → **Environment Variables**
3. Click **Add New**
4. **Key:** `VITE_API_URL`
5. **Value:** `https://mauricios-cafe-bakery.onrender.com`
6. **Environments:** Select all (Production, Preview, Development)
7. Click **Save**
8. **Redeploy** frontend (variables require rebuild)

## ⚠️ Important Notes

### Why Only One Variable?

The frontend is a **static site** that:
- Makes API calls to the backend
- Redirects to backend for OAuth
- Doesn't need Google OAuth credentials (backend handles it)

### Why Redeploy After Setting?

Vite environment variables (`VITE_*`) are **baked into the build** at build time. Changing them requires:
1. Setting the variable in Vercel
2. **Redeploying** the frontend (push to Git or manual redeploy)

### Fallback Behavior

If `VITE_API_URL` is not set:
- **On localhost:** Falls back to `http://localhost:5001`
- **On Vercel:** Falls back to `https://mauricios-cafe-bakery.onrender.com`
- **On custom domain (.shop):** Falls back to `https://mauricios-cafe-bakery.onrender.com`

But it's **better to set it explicitly** to avoid confusion.

## 🎯 Summary

**Vercel (Frontend) needs:**
- ✅ `VITE_API_URL=https://mauricios-cafe-bakery.onrender.com`

**Vercel (Frontend) does NOT need:**
- ❌ Any Google OAuth variables
- ❌ Any backend secrets
- ❌ Any database credentials

---

**All Google OAuth variables go in Render (backend), not Vercel (frontend)!**




