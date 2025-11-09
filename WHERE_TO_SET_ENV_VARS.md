# Where to Set Environment Variables

## 🎯 Quick Answer

You have **TWO separate deployments** that need different environment variables:

### 1. **Vercel** (Frontend) - ADD THIS:
```
VITE_API_URL=https://mauricios-cafe-bakery.onrender.com
```

### 2. **Render** (Backend) - Already looks good ✅
You already have these variables set correctly.

---

## 📍 Detailed Explanation

### Your Current Setup:

#### **Vercel (Frontend)** - `https://mauricios-cafe-bakery.vercel.app`
Needs to know where the backend is:
- ✅ ADD: `VITE_API_URL=https://mauricios-cafe-bakery.onrender.com`
- This tells the frontend where to send API requests

#### **Render (Backend)** - `https://mauricios-cafe-bakery.onrender.com`
Already configured correctly:
- ✅ `FRONTEND_URL=https://mauricios-cafe-bakery.vercel.app/`
- ✅ `EMAIL_USER=...`
- ✅ `EMAIL_PASS=...`
- ✅ `GOOGLE_CLIENT_ID=...`
- ✅ `GOOGLE_CLIENT_SECRET=...`
- ✅ All other backend variables

---

## 🔧 How to Add VITE_API_URL to Vercel

### Step 1: Go to Vercel Dashboard
- Visit: https://vercel.com/dashboard
- Open your **Mauricio's Cafe and Bakery** project

### Step 2: Open Settings
- Click **Settings** in the sidebar
- Click **Environment Variables**

### Step 3: Add Variable
- Click **Add New**
- Key: `VITE_API_URL`
- Value: `https://mauricios-cafe-bakery.onrender.com`
- Select all environments (Production, Preview, Development)
- Click **Save**

### Step 4: Redeploy
- Go to **Deployments** tab
- Click **...** on the latest deployment
- Click **Redeploy**
- OR it may auto-redeploy

---

## ✅ Summary

| Platform | What You See | What's Needed |
|----------|--------------|--------------|
| **Vercel** (Frontend) | Your Vercel env variables | ⚠️ ADD `VITE_API_URL` |
| **Render** (Backend) | Your screenshot | ✅ Already configured |

---

## 🎯 The Difference

**Vercel Frontend:**
- Shows variables starting with `VITE_*`
- Frontend needs to know WHERE the backend is
- Needs: `VITE_API_URL` pointing to Render

**Render Backend:**
- Shows `FRONTEND_URL`, `EMAIL_USER`, etc.
- Backend needs to know WHERE the frontend is
- Already has: `FRONTEND_URL` pointing to Vercel

---

## 🔍 How to Check

**Vercel Environment Variables:**
1. Go to Vercel Dashboard → Your Project
2. Settings → Environment Variables
3. Look for `VITE_API_URL` (currently missing!)

**Render Environment Variables:**
- The screenshot you showed (already has everything ✅)
























