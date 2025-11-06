-- Add email verification columns to customers table
-- This ensures proper email verification security

-- Add email_verified column
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS email_verified TINYINT(1) DEFAULT 0;

-- Add verification_token column
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255) DEFAULT NULL;

-- Add verification_expires column
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS verification_expires DATETIME DEFAULT NULL;

-- Set existing customers as verified (for migration)
UPDATE customers 
SET email_verified = 1 
WHERE email_verified IS NULL AND verification_token IS NULL;

-- Add index on verification_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_verification_token ON customers(verification_token);

-- Add index on email_verified for faster queries
CREATE INDEX IF NOT EXISTS idx_email_verified ON customers(email_verified);













