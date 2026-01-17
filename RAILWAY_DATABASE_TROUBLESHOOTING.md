# Railway Database Connection Troubleshooting

## Why You Can't Connect to Railway Database

Even if you didn't change environment variables, Railway databases can have connection issues due to:

1. **Railway service restarts** - Database credentials might have changed
2. **Database service paused** - Railway pauses inactive databases
3. **Network changes** - Railway might have changed internal networking
4. **Variable format changes** - Railway uses different variable names than Render

## Railway MySQL Environment Variables

Railway provides MySQL databases with these **specific variable names**:

| Variable | Description | Example |
|----------|-------------|---------|
| `MYSQLHOST` | Database hostname | `containers-us-west-xxx.railway.app` |
| `MYSQLUSER` | Database username | `root` |
| `MYSQLPASSWORD` | Database password | `your-password` |
| `MYSQLDATABASE` | Database name | `railway` |
| `MYSQLPORT` | Database port | `3306` |

**⚠️ Important**: Railway does NOT automatically create `MYSQL_URL`. You need to use the individual variables above.

## How to Fix Railway Database Connection

### Step 1: Check Railway Database Service Status

1. Go to Railway Dashboard → Your Project
2. Find your **MySQL database service**
3. Check if it's **"Active"** (green status)
4. If paused/stopped, click **"Start"** or **"Restart"**

### Step 2: Verify Environment Variables in Railway

1. Go to Railway Dashboard → Your **Backend Service** (not database)
2. Click **"Variables"** tab
3. Check if these variables exist:
   - `MYSQLHOST`
   - `MYSQLUSER`
   - `MYSQLPASSWORD`
   - `MYSQLDATABASE`
   - `MYSQLPORT`

### Step 3: Get Database Variables from Railway

**Option A: From Database Service**
1. Go to Railway Dashboard → Your **MySQL Database Service**
2. Click **"Variables"** tab
3. Copy all `MYSQL*` variables

**Option B: From Database Connection Tab**
1. Go to Railway Dashboard → Your **MySQL Database Service**
2. Click **"Data"** or **"Connect"** tab
3. Railway shows connection details there

### Step 4: Set Variables in Backend Service

1. Go to Railway Dashboard → Your **Backend Service**
2. Click **"Variables"** tab
3. Click **"New Variable"**
4. Add each variable:
   ```
   MYSQLHOST = containers-us-west-xxx.railway.app
   MYSQLUSER = root
   MYSQLPASSWORD = your-password-here
   MYSQLDATABASE = railway
   MYSQLPORT = 3306
   ```

### Step 5: Restart Backend Service

1. Go to Railway Dashboard → Your **Backend Service**
2. Click **"Deployments"** tab
3. Click **"Redeploy"** or **"Restart"**
4. Check logs for connection success

## Expected Backend Logs (Success)

After fixing, you should see:
```
✅ Using Railway MySQL variables (MYSQLHOST, MYSQLUSER, etc.)
✅ Database connection pool established successfully
📊 Connection details: {
  host: 'containers-us-west-xxx.railway.app',
  port: 3306,
  database: 'railway',
  user: 'root'
}
```

## Expected Backend Logs (Failure)

If still failing, you'll see:
```
✅ Using generic DB_* environment variables
❌ Failed to establish database connection pool: ...
🔍 Available environment variables: {
  hasMYSQL_URL: false,
  hasMYSQLHOST: false,  ← Should be true!
  hasMYSQLUSER: false,  ← Should be true!
  ...
}
```

## Alternative: Create MYSQL_URL Manually

If Railway doesn't provide `MYSQL_URL`, you can create it manually:

1. In Railway → Backend Service → Variables
2. Add new variable:
   ```
   MYSQL_URL = mysql://MYSQLUSER:MYSQLPASSWORD@MYSQLHOST:MYSQLPORT/MYSQLDATABASE
   ```
3. Replace with actual values:
   ```
   MYSQL_URL = mysql://root:password123@containers-us-west-xxx.railway.app:3306/railway
   ```

## Common Railway Database Issues

### Issue 1: Database Service is Paused
**Symptom**: Connection timeout or "Connection closed"
**Fix**: Go to Railway → Database Service → Click "Start"

### Issue 2: Variables Not Set in Backend Service
**Symptom**: Backend logs show "Using generic DB_* variables" and connection fails
**Fix**: Copy `MYSQL*` variables from Database Service to Backend Service

### Issue 3: Database Credentials Changed
**Symptom**: "Access denied" error
**Fix**: Get fresh credentials from Railway → Database Service → Variables

### Issue 4: Network/Firewall Issue
**Symptom**: Connection timeout
**Fix**: 
- Ensure backend and database are in same Railway project
- Check Railway status page: https://status.railway.app
- Try restarting both services

## Quick Checklist

- [ ] Database service is "Active" in Railway
- [ ] Backend service has `MYSQLHOST` variable
- [ ] Backend service has `MYSQLUSER` variable
- [ ] Backend service has `MYSQLPASSWORD` variable
- [ ] Backend service has `MYSQLDATABASE` variable
- [ ] Backend service has `MYSQLPORT` variable (or defaults to 3306)
- [ ] Backend service restarted after adding variables
- [ ] Check backend logs for connection success

## Still Not Working?

1. **Check Railway Status**: https://status.railway.app
2. **Check Backend Logs**: Railway → Backend Service → Logs tab
3. **Verify Database is Accessible**: Try connecting with MySQL client
4. **Contact Railway Support**: If database service shows errors

## Migration from Render to Railway

If you're migrating from Render to Railway:

1. **Remove Render variables** (`MYSQL_URL` from Render)
2. **Add Railway variables** (`MYSQLHOST`, `MYSQLUSER`, etc.)
3. **Update `FRONTEND_URL`** if frontend is still on Vercel
4. **Restart backend service**

The code now supports both Render and Railway automatically! 🎉

