-- Simple ALTER TABLE statements (run each one separately)
-- Check if column exists first, then run the ALTER

-- 1. Check if email_verified exists
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'customers' 
AND COLUMN_NAME = 'email_verified';

-- If it doesn't exist, run:
ALTER TABLE customers ADD COLUMN email_verified TINYINT(1) DEFAULT 0;

-- 2. Check if verification_token exists
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'customers' 
AND COLUMN_NAME = 'verification_token';

-- If it doesn't exist, run:
ALTER TABLE customers ADD COLUMN verification_token VARCHAR(255) DEFAULT NULL;

-- 3. Check if verification_expires exists
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'customers' 
AND COLUMN_NAME = 'verification_expires';

-- If it doesn't exist, run:
ALTER TABLE customers ADD COLUMN verification_expires DATETIME DEFAULT NULL;

-- 4. Set existing customers as verified
UPDATE customers SET email_verified = 1 WHERE email_verified = 0;















