-- Add email verification fields to customers table
ALTER TABLE customers 
ADD COLUMN email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN verification_token VARCHAR(255) NULL,
ADD COLUMN verification_expires DATETIME NULL;

-- Add index for verification token for faster lookups
CREATE INDEX idx_verification_token ON customers(verification_token);
