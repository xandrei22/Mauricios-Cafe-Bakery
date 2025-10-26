-- Create required tables for complete loyalty rewards system
-- This ensures rewards can only be redeemed by customers who ordered from their account

-- Create loyalty_reward_redemptions table to track all reward redemptions with proof
CREATE TABLE IF NOT EXISTS loyalty_reward_redemptions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    reward_id INT NOT NULL,
    order_id VARCHAR(50) NOT NULL, -- Must be linked to an actual order
    points_redeemed INT NOT NULL,
    redemption_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    redemption_proof TEXT NOT NULL, -- Description of how reward was used
    staff_id INT NULL, -- Staff member who processed the redemption
    status ENUM('pending', 'completed', 'cancelled', 'expired') DEFAULT 'pending',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (reward_id) REFERENCES loyalty_rewards(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_customer_id (customer_id),
    INDEX idx_reward_id (reward_id),
    INDEX idx_order_id (order_id),
    INDEX idx_status (status),
    INDEX idx_redemption_date (redemption_date)
);

-- Create loyalty_reward_usage_log table to track when rewards are actually used
CREATE TABLE IF NOT EXISTS loyalty_reward_usage_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    redemption_id INT NOT NULL,
    usage_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    usage_type ENUM('drink', 'food', 'discount', 'upgrade', 'bonus') NOT NULL,
    menu_item_id INT NULL, -- If applicable
    discount_amount DECIMAL(10, 2) NULL,
    staff_confirmation_id INT NOT NULL, -- Staff member who confirmed usage
    confirmation_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (redemption_id) REFERENCES loyalty_reward_redemptions(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE SET NULL,
    FOREIGN KEY (staff_confirmation_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_redemption_id (redemption_id),
    INDEX idx_usage_date (usage_date),
    INDEX idx_staff_confirmation (staff_confirmation_id)
);

-- Add new columns to existing loyalty_transactions table if they don't exist
ALTER TABLE loyalty_transactions 
ADD COLUMN IF NOT EXISTS redemption_id INT NULL,
ADD COLUMN IF NOT EXISTS reward_id INT NULL,
ADD COLUMN IF NOT EXISTS order_id VARCHAR(50) NULL,
ADD FOREIGN KEY IF NOT EXISTS (redemption_id) REFERENCES loyalty_reward_redemptions(id) ON DELETE SET NULL,
ADD FOREIGN KEY IF NOT EXISTS (reward_id) REFERENCES loyalty_rewards(id) ON DELETE SET NULL,
ADD FOREIGN KEY IF NOT EXISTS (order_id) REFERENCES orders(order_id) ON DELETE SET NULL;

-- Add new columns to existing loyalty_rewards table if they don't exist
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

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_loyalty_redemption_customer_order 
ON loyalty_reward_redemptions(customer_id, order_id, status);

-- Insert sample reward redemption rules
INSERT IGNORE INTO loyalty_rewards (name, description, points_required, reward_type, discount_percentage, requires_order, max_redemptions_per_customer, validity_days, terms_conditions) VALUES
('Free Coffee on Order', 'Get a free coffee with any order', 50, 'drink', NULL, TRUE, 1, 30, 'Must be redeemed with an active order. Cannot be used on its own.'),
('Free Pastry with Drink', 'Get a free pastry when you order a drink', 30, 'food', NULL, TRUE, 1, 30, 'Must be redeemed with a drink order. Pastry selection subject to availability.'),
('50% Off Any Menu Item', 'Get 50% off any menu item', 25, 'discount', 50.00, TRUE, 2, 30, 'Must be redeemed with an order. Cannot be combined with other offers.'),
('Free Size Upgrade', 'Upgrade your drink to the next size for free', 15, 'upgrade', NULL, TRUE, 3, 30, 'Must be redeemed with a drink order. Applicable to all drink sizes.'),
('Double Points Bonus', 'Earn double points on your next order', 100, 'bonus', NULL, TRUE, 1, 60, 'Must be redeemed before placing an order. Points will be awarded after order completion.'),
('Free Add-on with Order', 'Get any add-on for free with your order', 10, 'bonus', NULL, TRUE, 5, 30, 'Must be redeemed with an order. Add-on selection subject to availability.'),
('Birthday Special', 'Get a free dessert on your birthday month', 0, 'food', NULL, TRUE, 1, 30, 'Available only during birthday month. Must be redeemed with an order.'),
('Loyalty Member Discount', 'Get 10% off your entire order', 20, 'discount', 10.00, TRUE, 1, 30, 'Must be redeemed with an order. Cannot be combined with other discounts.');

-- Create view for easy access to redemption history
CREATE OR REPLACE VIEW loyalty_redemption_summary AS
SELECT 
    lrr.id,
    lrr.customer_id,
    c.full_name as customer_name,
    c.email as customer_email,
    lr.name as reward_name,
    lr.reward_type,
    lrr.points_redeemed,
    lrr.order_id,
    lrr.redemption_date,
    lrr.status,
    lrr.redemption_proof,
    u.full_name as staff_name,
    lrr.notes
FROM loyalty_reward_redemptions lrr
JOIN customers c ON lrr.customer_id = c.id
JOIN loyalty_rewards lr ON lrr.reward_id = lr.id
LEFT JOIN users u ON lrr.staff_id = u.id
ORDER BY lrr.redemption_date DESC;

-- Create view for customer loyalty summary
CREATE OR REPLACE VIEW customer_loyalty_summary AS
SELECT 
    c.id,
    c.full_name,
    c.email,
    c.loyalty_points,
    c.created_at as member_since,
    COUNT(DISTINCT lrr.id) as total_redemptions,
    SUM(lrr.points_redeemed) as total_points_redeemed,
    COUNT(DISTINCT lt.id) as total_transactions,
    SUM(lt.points_earned) as total_points_earned,
    MAX(lt.created_at) as last_activity
FROM customers c
LEFT JOIN loyalty_reward_redemptions lrr ON c.id = lrr.customer_id AND lrr.status = 'completed'
LEFT JOIN loyalty_transactions lt ON c.id = lt.customer_id
GROUP BY c.id, c.full_name, c.email, c.loyalty_points, c.created_at;

-- This ensures rewards can only be redeemed by customers who ordered from their account

-- Create loyalty_reward_redemptions table to track all reward redemptions with proof
CREATE TABLE IF NOT EXISTS loyalty_reward_redemptions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    reward_id INT NOT NULL,
    order_id VARCHAR(50) NOT NULL, -- Must be linked to an actual order
    points_redeemed INT NOT NULL,
    redemption_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    redemption_proof TEXT NOT NULL, -- Description of how reward was used
    staff_id INT NULL, -- Staff member who processed the redemption
    status ENUM('pending', 'completed', 'cancelled', 'expired') DEFAULT 'pending',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (reward_id) REFERENCES loyalty_rewards(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_customer_id (customer_id),
    INDEX idx_reward_id (reward_id),
    INDEX idx_order_id (order_id),
    INDEX idx_status (status),
    INDEX idx_redemption_date (redemption_date)
);

-- Create loyalty_reward_usage_log table to track when rewards are actually used
CREATE TABLE IF NOT EXISTS loyalty_reward_usage_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    redemption_id INT NOT NULL,
    usage_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    usage_type ENUM('drink', 'food', 'discount', 'upgrade', 'bonus') NOT NULL,
    menu_item_id INT NULL, -- If applicable
    discount_amount DECIMAL(10, 2) NULL,
    staff_confirmation_id INT NOT NULL, -- Staff member who confirmed usage
    confirmation_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (redemption_id) REFERENCES loyalty_reward_redemptions(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE SET NULL,
    FOREIGN KEY (staff_confirmation_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_redemption_id (redemption_id),
    INDEX idx_usage_date (usage_date),
    INDEX idx_staff_confirmation (staff_confirmation_id)
);

-- Add new columns to existing loyalty_transactions table if they don't exist
ALTER TABLE loyalty_transactions 
ADD COLUMN IF NOT EXISTS redemption_id INT NULL,
ADD COLUMN IF NOT EXISTS reward_id INT NULL,
ADD COLUMN IF NOT EXISTS order_id VARCHAR(50) NULL,
ADD FOREIGN KEY IF NOT EXISTS (redemption_id) REFERENCES loyalty_reward_redemptions(id) ON DELETE SET NULL,
ADD FOREIGN KEY IF NOT EXISTS (reward_id) REFERENCES loyalty_rewards(id) ON DELETE SET NULL,
ADD FOREIGN KEY IF NOT EXISTS (order_id) REFERENCES orders(order_id) ON DELETE SET NULL;

-- Add new columns to existing loyalty_rewards table if they don't exist
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

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_loyalty_redemption_customer_order 
ON loyalty_reward_redemptions(customer_id, order_id, status);

-- Insert sample reward redemption rules
INSERT IGNORE INTO loyalty_rewards (name, description, points_required, reward_type, discount_percentage, requires_order, max_redemptions_per_customer, validity_days, terms_conditions) VALUES
('Free Coffee on Order', 'Get a free coffee with any order', 50, 'drink', NULL, TRUE, 1, 30, 'Must be redeemed with an active order. Cannot be used on its own.'),
('Free Pastry with Drink', 'Get a free pastry when you order a drink', 30, 'food', NULL, TRUE, 1, 30, 'Must be redeemed with a drink order. Pastry selection subject to availability.'),
('50% Off Any Menu Item', 'Get 50% off any menu item', 25, 'discount', 50.00, TRUE, 2, 30, 'Must be redeemed with an order. Cannot be combined with other offers.'),
('Free Size Upgrade', 'Upgrade your drink to the next size for free', 15, 'upgrade', NULL, TRUE, 3, 30, 'Must be redeemed with a drink order. Applicable to all drink sizes.'),
('Double Points Bonus', 'Earn double points on your next order', 100, 'bonus', NULL, TRUE, 1, 60, 'Must be redeemed before placing an order. Points will be awarded after order completion.'),
('Free Add-on with Order', 'Get any add-on for free with your order', 10, 'bonus', NULL, TRUE, 5, 30, 'Must be redeemed with an order. Add-on selection subject to availability.'),
('Birthday Special', 'Get a free dessert on your birthday month', 0, 'food', NULL, TRUE, 1, 30, 'Available only during birthday month. Must be redeemed with an order.'),
('Loyalty Member Discount', 'Get 10% off your entire order', 20, 'discount', 10.00, TRUE, 1, 30, 'Must be redeemed with an order. Cannot be combined with other discounts.');

-- Create view for easy access to redemption history
CREATE OR REPLACE VIEW loyalty_redemption_summary AS
SELECT 
    lrr.id,
    lrr.customer_id,
    c.full_name as customer_name,
    c.email as customer_email,
    lr.name as reward_name,
    lr.reward_type,
    lrr.points_redeemed,
    lrr.order_id,
    lrr.redemption_date,
    lrr.status,
    lrr.redemption_proof,
    u.full_name as staff_name,
    lrr.notes
FROM loyalty_reward_redemptions lrr
JOIN customers c ON lrr.customer_id = c.id
JOIN loyalty_rewards lr ON lrr.reward_id = lr.id
LEFT JOIN users u ON lrr.staff_id = u.id
ORDER BY lrr.redemption_date DESC;

-- Create view for customer loyalty summary
CREATE OR REPLACE VIEW customer_loyalty_summary AS
SELECT 
    c.id,
    c.full_name,
    c.email,
    c.loyalty_points,
    c.created_at as member_since,
    COUNT(DISTINCT lrr.id) as total_redemptions,
    SUM(lrr.points_redeemed) as total_points_redeemed,
    COUNT(DISTINCT lt.id) as total_transactions,
    SUM(lt.points_earned) as total_points_earned,
    MAX(lt.created_at) as last_activity
FROM customers c
LEFT JOIN loyalty_reward_redemptions lrr ON c.id = lrr.customer_id AND lrr.status = 'completed'
LEFT JOIN loyalty_transactions lt ON c.id = lt.customer_id
GROUP BY c.id, c.full_name, c.email, c.loyalty_points, c.created_at;
