-- Fix loyalty_rewards table by adding missing columns
-- This addresses the "Failed to create reward" error

-- Add missing columns to loyalty_rewards table
ALTER TABLE loyalty_rewards 
ADD COLUMN IF NOT EXISTS reward_type ENUM('drink', 'food', 'discount', 'upgrade', 'bonus') DEFAULT 'drink',
ADD COLUMN IF NOT EXISTS image_url VARCHAR(500) DEFAULT NULL;

-- Update existing records to have a default reward_type
UPDATE loyalty_rewards 
SET reward_type = 'drink' 
WHERE reward_type IS NULL;

-- Add any other missing columns that might be needed
ALTER TABLE loyalty_rewards 
ADD COLUMN IF NOT EXISTS requires_order BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS max_redemptions_per_customer INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS validity_days INT DEFAULT 30,
ADD COLUMN IF NOT EXISTS terms_conditions TEXT;

-- Update existing loyalty_rewards with new fields
UPDATE loyalty_rewards SET 
    requires_order = TRUE,
    max_redemptions_per_customer = 1,
    validity_days = 30,
    terms_conditions = 'Must be redeemed within 30 days. One redemption per customer per reward type.'
WHERE requires_order IS NULL;



