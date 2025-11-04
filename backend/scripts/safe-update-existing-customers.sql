-- Safe UPDATE query for existing customers (works with safe mode)

-- Option 1: Update based on id (uses primary key)
UPDATE customers SET email_verified = 1 WHERE id > 0;

-- Option 2: Check what was updated
SELECT id, email, email_verified, verification_token 
FROM customers 
LIMIT 10;

-- Verify all customers are now verified
SELECT 
    COUNT(*) as total_customers,
    SUM(email_verified) as verified_customers,
    SUM(1 - email_verified) as unverified_customers
FROM customers;










