-- Simple fix: Make order_id nullable in loyalty_reward_redemptions
-- This allows customers to redeem rewards without an active order
-- 
-- IMPORTANT: Run this query to find the foreign key constraint name first:
-- SELECT CONSTRAINT_NAME 
-- FROM information_schema.KEY_COLUMN_USAGE 
-- WHERE TABLE_NAME = 'loyalty_reward_redemptions' 
-- AND COLUMN_NAME = 'order_id' 
-- AND REFERENCED_TABLE_NAME IS NOT NULL
-- AND TABLE_SCHEMA = DATABASE();
--
-- Then replace 'CONSTRAINT_NAME_HERE' below with the actual name and run:

-- Step 1: Drop the foreign key constraint (replace CONSTRAINT_NAME_HERE with actual name)
-- ALTER TABLE loyalty_reward_redemptions DROP FOREIGN KEY CONSTRAINT_NAME_HERE;

-- Step 2: Make order_id nullable
ALTER TABLE loyalty_reward_redemptions 
MODIFY COLUMN order_id VARCHAR(50) NULL;

-- Step 3 (Optional): Re-add foreign key with ON DELETE SET NULL
-- ALTER TABLE loyalty_reward_redemptions 
-- ADD CONSTRAINT fk_redemption_order_id 
-- FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE SET NULL;



