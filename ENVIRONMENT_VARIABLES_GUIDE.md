# Environment Variables Guide

This document lists all required and optional environment variables for both Vercel (frontend) and Render (backend) deployments.

---

## 🎨 VERCEL (Frontend) Environment Variables

### Required Variables

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `VITE_API_URL` | `https://mauricios-cafe-bakery.onrender.com` | Backend API URL (your Render backend URL) |

### How to Set in Vercel

1. Go to your Vercel project dashboard
2. Click on **Settings** → **Environment Variables**
3. Click **Add New**
4. Add the variable name and value
5. Select the environment (Production, Preview, or Development)
6. Click **Save**
7. **Redeploy your application** for changes to take effect

---

## ⚙️ RENDER (Backend) Environment Variables

### Required Variables

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `FRONTEND_URL` | `https://mauricios-cafe-bakery.vercel.app` | Your Vercel frontend URL |
| `SESSION_SECRET` | `your-super-secret-key-here` | Secret key for session encryption (generate a random string) |
| `NODE_ENV` | `production` | Environment mode (development/production) |
| `PORT` | `5001` | Port for the server (Render usually handles this automatically) |

### Database Variables

Choose **ONE** of these options:

#### Option 1: Using MYSQL_URL (Recommended for Render)
Render provides this automatically when you create a PostgreSQL database. For MySQL, you need to set it manually.

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `MYSQL_URL` | `mysql://user:password@hostname:3306/database_name` | Full MySQL connection URL |

#### Option 2: Individual Database Variables

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `DB_HOST` | `your-database-host.render.com` | MySQL database host |
| `DB_USER` | `root` | MySQL database user |
| `DB_PASSWORD` | `your-password` | MySQL database password |
| `DB_NAME` | `cafeiq` | MySQL database name |
| `DB_PORT` | `3306` | MySQL database port |

### Optional Variables

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `GOOGLE_CLIENT_ID` | `your-google-client-id` | Google OAuth Client ID (for Google Sign-In) |
| `GOOGLE_CLIENT_SECRET` | `your-google-client-secret` | Google OAuth Client Secret (for Google Sign-In) |
| `GOOGLE_CALLBACK_URL` | `https://your-backend-url.onrender.com/api/auth/google/callback` | Google OAuth callback URL |
| `EMAIL_USER` | `your-email@gmail.com` | Gmail address for sending emails |
| `EMAIL_PASSWORD` | `your-app-password` | Gmail app password (not your regular password) |
| `COOKIE_DOMAIN` | `.example.com` | Cookie domain (leave empty unless needed) |
| `DISABLE_BACKGROUND_JOBS` | `0` | Set to `1` to disable background jobs (testing purposes) |

---

## 🔧 How to Generate SESSION_SECRET

**Option 1: Using Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Option 2: Using OpenSSL**
```bash
openssl rand -hex 32
```

**Option 3: Online Generator**
Go to https://generate-secret.vercel.app/32

Copy the generated string and use it as your `SESSION_SECRET`.

---

## 🚀 Setting Environment Variables in Render

1. Go to your Render dashboard
2. Click on your backend service
3. Click on **Environment** in the left sidebar
4. Click **Add Environment Variable**
5. Enter the variable name and value
6. Click **Save Changes**
7. Your service will automatically redeploy

---

## 📋 Quick Setup Checklist

### For Vercel (Frontend):
- [ ] Add `VITE_API_URL` with your Render backend URL

### For Render (Backend):
- [ ] Add `FRONTEND_URL` with your Vercel frontend URL
- [ ] Add `SESSION_SECRET` (generate a secure random string)
- [ ] Add `NODE_ENV` set to `production`
- [ ] Add database connection variables (`MYSQL_URL` or individual DB vars)
- [ ] (Optional) Add Google OAuth credentials if using Google Sign-In
- [ ] (Optional) Add email credentials if using email features

---

## 🌐 Complete Example

### Vercel Environment Variables Example
```
VITE_API_URL=https://mauricios-cafe-bakery.onrender.com
```

### Render Environment Variables Example
```
FRONTEND_URL=https://mauricios-cafe-bakery.vercel.app
SESSION_SECRET=a7f8b9c2d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
NODE_ENV=production
PORT=5001
MYSQL_URL=mysql://user:password@hostname:3306/database_name
```

---

## 🔍 Verifying Environment Variables

### After deployment, check the logs:

**Render Backend Logs:**
- Look for: `✅ Database connection pool established successfully`
- Look for: `Email server is ready to send messages` (if email is configured)
- Look for: `Server running on http://localhost:5001`
- Look for: `✅ CORS allowed for origin:` when accessing from frontend

**Vercel Frontend:**
- Check browser console for any API connection errors
- Verify that API calls are going to the correct backend URL

---

## ⚠️ Common Issues

### Issue: "Invalid origin" errors in logs
**Solution:** Check that `FRONTEND_URL` in Render matches your actual Vercel URL

### Issue: Login not working / sessions not persisting
**Solution:** Ensure:
1. Both sites use HTTPS (Vercel and Render automatically provide this)
2. `SESSION_SECRET` is set correctly in Render
3. `NODE_ENV=production` is set in Render
4. Cookies show `SameSite=None` and `Secure=true` in browser DevTools

### Issue: Database connection errors
**Solution:** Check that database connection variables are set correctly in Render

### Issue: Email not sending
**Solution:** 
1. Make sure `EMAIL_USER` and `EMAIL_PASSWORD` are set
2. Use Gmail app password (not your regular Gmail password)
3. Check Render logs for email errors

---

## 🔐 Security Notes

1. **Never commit environment variables to Git**
2. **Use strong, random values for `SESSION_SECRET`**
3. **Keep your `EMAIL_PASSWORD` secret** (use Gmail app password)
4. **Rotate secrets regularly in production**

---

## 📞 Need Help?

If you encounter issues:
1. Check the Render logs for error messages
2. Check the browser console for frontend errors
3. Verify all environment variables are set correctly
4. Ensure both Vercel and Render deployments are using HTTPS




