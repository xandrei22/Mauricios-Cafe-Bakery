-- Fix order_id to allow NULL values in loyalty_reward_redemptions
-- This allows customers to redeem rewards without an active order

-- Step 1: Drop the foreign key constraint on order_id
-- Note: MySQL doesn't support IF EXISTS with DROP FOREIGN KEY
-- First, find the constraint name, then drop it
-- Common constraint names: loyalty_reward_redemptions_ibfk_3, fk_redemption_order_id, etc.

-- Try dropping common constraint names (run each line separately if one fails)
-- ALTER TABLE loyalty_reward_redemptions DROP FOREIGN KEY loyalty_reward_redemptions_ibfk_3;
-- ALTER TABLE loyalty_reward_redemptions DROP FOREIGN KEY fk_redemption_order_id;

-- Or use this query to find the constraint name first:
-- SELECT CONSTRAINT_NAME 
-- FROM information_schema.KEY_COLUMN_USAGE 
-- WHERE TABLE_NAME = 'loyalty_reward_redemptions' 
-- AND COLUMN_NAME = 'order_id' 
-- AND REFERENCED_TABLE_NAME IS NOT NULL
-- AND TABLE_SCHEMA = DATABASE();

-- Step 2: Make order_id nullable
ALTER TABLE loyalty_reward_redemptions 
MODIFY COLUMN order_id VARCHAR(50) NULL;

-- Step 3: Re-add the foreign key constraint with ON DELETE SET NULL to allow NULL values
-- (Only if you want to keep the foreign key constraint)
-- ALTER TABLE loyalty_reward_redemptions 
-- ADD CONSTRAINT fk_redemption_order_id 
-- FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE SET NULL;

