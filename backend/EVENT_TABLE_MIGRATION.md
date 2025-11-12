# Events Table Migration Guide

## Problem
The `events` table in the database doesn't have the required columns for event request functionality. The code expects columns like `customer_id`, `customer_name`, `contact_name`, `contact_number`, `event_start_time`, `event_end_time`, `address`, `event_type`, `notes`, `cups`, etc., but the current table schema doesn't include these.

## Solution
Run the migration script to add the missing columns to the `events` table.

## Steps to Fix

### Option 1: Run the Migration Script (Recommended)

1. **Navigate to the backend directory:**
   ```bash
   cd capstone/backend
   ```

2. **Run the migration script:**
   ```bash
   node scripts/fix-events-table.js
   ```

   The script will:
   - Check which columns exist in the `events` table
   - Add any missing columns needed for event requests
   - Update the `status` enum to include 'pending', 'accepted', 'rejected'
   - Add indexes for better query performance

### Option 2: Run SQL Manually

If you prefer to run SQL directly, you can use the SQL file:

```bash
mysql -u your_user -p your_database < config/fix-events-table.sql
```

Or execute the SQL commands directly in your database management tool.

## What the Migration Does

The migration adds the following columns to the `events` table:

- `customer_id` (INT NULL) - ID of the customer making the request
- `customer_name` (VARCHAR(255) NULL) - Name of the customer
- `contact_name` (VARCHAR(255) NULL) - Contact person name
- `contact_number` (VARCHAR(20) NULL) - Contact phone number
- `event_start_time` (TIME NULL) - Event start time
- `event_end_time` (TIME NULL) - Event end time
- `address` (TEXT NULL) - Event address
- `event_type` (VARCHAR(100) NULL) - Type of event (birthday, wedding, etc.)
- `notes` (TEXT NULL) - Additional notes
- `cups` (INT NULL) - Number of cups requested
- `admin_response_date` (DATETIME NULL) - When admin responded

It also updates the `status` enum to include:
- 'pending' - Event request is pending admin review
- 'accepted' - Event request has been accepted
- 'rejected' - Event request has been rejected

## Verification

After running the migration, verify the table structure:

```sql
DESCRIBE events;
```

You should see all the columns listed above.

## Troubleshooting

If you encounter errors:

1. **"Column already exists"** - This is fine, the script will skip existing columns
2. **"Table doesn't exist"** - You may need to create the events table first using the main database schema
3. **Connection errors** - Ensure your database connection is configured correctly in `.env`

## Production Deployment

For production deployments:

1. Run the migration script as part of your deployment process
2. Or include it in your database migration system
3. Or run it manually once on the production database

The script is idempotent - it's safe to run multiple times.

