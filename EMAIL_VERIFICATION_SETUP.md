# Email Verification Setup

## Problem
The `customers` table is missing email verification columns, causing signup to fail with:
```
Unknown column 'email_verified' in 'field list'
```

## Solution
Add the email verification columns to your Railway database.

## Step-by-Step Instructions

### Option 1: Run SQL Migration (Recommended)

1. **Go to Railway Dashboard**
   - Navigate to your MySQL database service
   - Click on the "Database" tab
   - Click "Connect" (opens in a new window)

2. **Run the SQL Script**
   - Copy the contents of `capstone/backend/scripts/add-email-verification-columns.sql`
   - Paste into the SQL editor
   - Execute the script

The SQL script will:
- ✅ Add `email_verified` column (defaults to 0/false)
- ✅ Add `verification_token` column
- ✅ Add `verification_expires` column
- ✅ Mark existing customers as verified (for migration)
- ✅ Add indexes for faster queries

### Option 2: Run Node.js Script

From Railway Shell:

```bash
cd /opt/render/project/src
node scripts/add-email-verification-columns.js
```

### Verify Columns Exist

Run this to check:
```bash
node check-customers-schema.js
```

You should see:
```
✓ email_verified: EXISTS
✓ verification_token: EXISTS
✓ verification_expires: EXISTS
```

## After Adding Columns

1. **Backend will automatically restart** (Railway detects the schema change)
2. **Test signup** - should work now
3. **Users will receive verification emails**

## How Email Verification Works

1. **Customer signs up** → account created with `email_verified = FALSE`
2. **Verification email sent** with unique token (30 minutes valid)
3. **Customer clicks link** → `email_verified = TRUE`
4. **Customer can now log in** (login checks for verified status)

## Security Benefits

✅ **Prevents fake accounts** - ensures email addresses are valid  
✅ **Reduces spam registrations** - bots can't complete signup  
✅ **Protects user data** - ensures legitimate email ownership  
✅ **Compliance** - follows email verification best practices

## Resend Verification Email

If a customer loses their verification email, they can request a new one at:
```
POST /api/customer/resend-verification
Body: { "email": "customer@email.com" }
```

## Manual Verification (Admin Only)

If needed, admins can manually verify customers in the database:
```sql
UPDATE customers SET email_verified = 1 WHERE id = <customer_id>;
```































