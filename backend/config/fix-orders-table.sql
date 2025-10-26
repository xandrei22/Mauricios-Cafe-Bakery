-- Fix orders table by adding missing columns
-- Run this script to resolve "Unknown column" errors

-- Add notes column if it doesn't exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;

-- Add estimated_ready_time column if it doesn't exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_ready_time TIMESTAMP DEFAULT NULL;

-- Add queue_position column if it doesn't exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS queue_position INT DEFAULT 0;

-- Add qr_code column if it doesn't exist (for digital payments)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qr_code TEXT DEFAULT NULL;

-- Fix payment_transactions table by adding missing columns
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS staff_id VARCHAR(50) DEFAULT NULL;

-- Verify the table structures
DESCRIBE orders;
DESCRIBE payment_transactions;
