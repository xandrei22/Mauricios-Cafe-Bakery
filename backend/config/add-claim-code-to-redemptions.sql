-- Add claim_code column to loyalty_reward_redemptions table
ALTER TABLE loyalty_reward_redemptions 
ADD COLUMN claim_code VARCHAR(8) UNIQUE AFTER status;

-- Add index for faster lookups by claim code
CREATE INDEX idx_claim_code ON loyalty_reward_redemptions(claim_code);



















