# Event Submission Debug Checklist

## ✅ All Fixes Applied

### Backend:
1. ✅ JWT authentication on all routes
2. ✅ Auto-migration for database schema
3. ✅ Direct SQL fallback if migration fails
4. ✅ Comprehensive error logging
5. ✅ Data validation and sanitization
6. ✅ Better error messages

### Frontend:
1. ✅ JWT token in all requests
2. ✅ Better error display
3. ✅ Detailed logging

## 🔍 How to Debug the 500 Error

### Step 1: Check Server Logs
Look for these log markers in your server logs (Render/Railway):

```
📥 [Controller] ========== EVENT CREATION REQUEST ==========
📥 [Controller] Event creation request received
📥 [Controller] Request body: {...}
📥 [Controller] Authenticated user: {...}
```

### Step 2: Check for These Errors

**If you see:**
- `❌ JWT Middleware: No Authorization header found` → Frontend not sending token
- `❌ [eventModel] Database error` → Database schema issue
- `❌ Missing columns` → Schema migration needed
- `❌ [Controller] Database error` → Check the specific error code

### Step 3: Common Error Codes

- `ER_BAD_FIELD_ERROR` → Missing database column
- `ER_NO_SUCH_TABLE` → Events table doesn't exist
- `ER_DUP_ENTRY` → Duplicate entry (unlikely)
- `ECONNREFUSED` → Database connection issue

### Step 4: Run Test Script

```bash
cd capstone/backend
node scripts/test-event-insert.js
```

This will:
- Check if events table exists
- List all columns
- Add missing columns
- Test an INSERT
- Show any errors

### Step 5: Manual Database Check

If you have database access, run:
```sql
DESCRIBE events;
```

Should show columns:
- customer_id
- customer_name
- contact_name
- contact_number
- event_start_time
- event_end_time
- address
- event_type
- notes
- cups

## 🚀 Quick Fix

If the test script shows missing columns, the system will auto-fix on next event submission. But you can also run:

```bash
cd capstone/backend
node scripts/fix-events-table.js
```

## 📋 What to Check in Browser Console

1. **Request being sent?** Look for: `📤 Submitting event form with data`
2. **JWT token?** Look for: `✅ JWT token added to request headers`
3. **Response?** Look for: `📥 Response status: 500` and `📥 Response data`

## 🔧 If Still Failing

1. **Check server logs** - Look for `[Controller]` or `[eventModel]` logs
2. **Check browser console** - Look for detailed error messages
3. **Run test script** - `node scripts/test-event-insert.js`
4. **Check database** - Verify events table structure

The detailed logging will show exactly where it's failing!



