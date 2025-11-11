-- Update existing customers to be verified
-- This is safe to run (won't fail if already verified)

UPDATE customers 
SET email_verified = 1 
WHERE email_verified = 0;

-- Or if the above doesn't work, try this:
UPDATE customers 
SET email_verified = 1;

-- Verify the update worked
SELECT COUNT(*) as verified_customers 
FROM customers 
WHERE email_verified = 1;

SELECT COUNT(*) as unverified_customers 
FROM customers 
WHERE email_verified = 0;
























