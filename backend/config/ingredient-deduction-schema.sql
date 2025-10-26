-- Ingredient Deduction System Database Schema
-- This file creates the necessary tables for automatic ingredient deduction

-- Table to track all inventory transactions (usage, restocking, adjustments)
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ingredient_id INT NOT NULL,
    transaction_type ENUM('usage', 'restock', 'adjustment', 'waste', 'transfer') NOT NULL,
    actual_amount DECIMAL(10,4) NOT NULL COMMENT 'Amount in actual units',
    display_amount DECIMAL(10,4) NOT NULL COMMENT 'Amount in display units',
    previous_actual_quantity DECIMAL(10,4) NOT NULL COMMENT 'Stock before transaction',
    new_actual_quantity DECIMAL(10,4) NOT NULL COMMENT 'Stock after transaction',
    order_id VARCHAR(255) NULL COMMENT 'Associated order ID if usage',
    menu_item_id INT NULL COMMENT 'Associated menu item if usage',
    notes TEXT NULL COMMENT 'Transaction notes',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_ingredient_id (ingredient_id),
    INDEX idx_transaction_type (transaction_type),
    INDEX idx_order_id (order_id),
    INDEX idx_created_at (created_at),
    
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
);

-- Table to track low stock alerts
CREATE TABLE IF NOT EXISTS low_stock_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ingredient_id INT NOT NULL,
    ingredient_name VARCHAR(255) NOT NULL,
    current_stock DECIMAL(10,4) NOT NULL,
    reorder_level DECIMAL(10,4) NOT NULL,
    alert_type ENUM('low_stock', 'out_of_stock', 'critical') NOT NULL DEFAULT 'low_stock',
    status ENUM('active', 'acknowledged', 'resolved') NOT NULL DEFAULT 'active',
    acknowledged_by INT NULL COMMENT 'Staff member who acknowledged',
    acknowledged_at TIMESTAMP NULL,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_ingredient_id (ingredient_id),
    INDEX idx_status (status),
    INDEX idx_alert_type (alert_type),
    INDEX idx_created_at (created_at),
    
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
);

-- Table to track ingredient usage by menu item (recipe requirements)
-- This should already exist, but let's ensure it has the right structure
CREATE TABLE IF NOT EXISTS menu_item_ingredients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    menu_item_id INT NOT NULL,
    ingredient_id INT NOT NULL,
    quantity DECIMAL(10,4) NOT NULL COMMENT 'Base quantity needed',
    unit VARCHAR(50) NOT NULL COMMENT 'Unit of measurement',
    is_optional BOOLEAN DEFAULT FALSE COMMENT 'Whether this ingredient is optional',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_menu_ingredient (menu_item_id, ingredient_id),
    INDEX idx_menu_item_id (menu_item_id),
    INDEX idx_ingredient_id (ingredient_id),
    
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
);

-- Table to track ingredient usage history for orders
CREATE TABLE IF NOT EXISTS order_ingredient_usage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(255) NOT NULL,
    menu_item_id INT NOT NULL,
    ingredient_id INT NOT NULL,
    quantity_used DECIMAL(10,4) NOT NULL COMMENT 'Amount actually used',
    unit VARCHAR(50) NOT NULL COMMENT 'Unit of measurement',
    customization_details JSON NULL COMMENT 'Customization details that affected usage',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_order_id (order_id),
    INDEX idx_menu_item_id (menu_item_id),
    INDEX idx_ingredient_id (ingredient_id),
    INDEX idx_created_at (created_at),
    
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
);

-- Insert sample data for menu item ingredients (if not exists)
INSERT IGNORE INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity, unit) VALUES
-- Coffee drinks
(1, 1, 18, 'g'),      -- Espresso: 18g coffee beans
(1, 2, 30, 'ml'),     -- Espresso: 30ml water
(2, 1, 18, 'g'),      -- Americano: 18g coffee beans
(2, 2, 150, 'ml'),    -- Americano: 150ml water
(3, 1, 18, 'g'),      -- Cappuccino: 18g coffee beans
(3, 2, 30, 'ml'),     -- Cappuccino: 30ml water
(3, 3, 120, 'ml'),    -- Cappuccino: 120ml milk
(4, 1, 18, 'g'),      -- Latte: 18g coffee beans
(4, 2, 30, 'ml'),     -- Latte: 30ml water
(4, 3, 180, 'ml'),    -- Latte: 180ml milk

-- Tea drinks
(5, 4, 2, 'g'),       -- Green Tea: 2g tea leaves
(5, 2, 200, 'ml'),    -- Green Tea: 200ml water
(6, 4, 2, 'g'),       -- Black Tea: 2g tea leaves
(6, 2, 200, 'ml'),    -- Black Tea: 200ml water

-- Pastries (example ingredients)
(7, 5, 100, 'g'),     -- Croissant: 100g flour
(7, 6, 50, 'g'),      -- Croissant: 50g butter
(7, 7, 1, 'pc'),      -- Croissant: 1 egg
(8, 5, 120, 'g'),     -- Muffin: 120g flour
(8, 6, 60, 'g'),      -- Muffin: 60g butter
(8, 8, 100, 'g');     -- Muffin: 100g sugar

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_order_ingredient 
ON inventory_transactions(order_id, ingredient_id);

CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_status_type 
ON low_stock_alerts(status, alert_type);

CREATE INDEX IF NOT EXISTS idx_menu_item_ingredients_quantity 
ON menu_item_ingredients(quantity);

-- Add comments to existing tables if they don't have them
ALTER TABLE ingredients 
MODIFY COLUMN actual_quantity DECIMAL(10,4) NOT NULL COMMENT 'Current stock level in actual units',
MODIFY COLUMN reorder_level DECIMAL(10,4) NOT NULL COMMENT 'Stock level that triggers reorder alert',
MODIFY COLUMN actual_unit VARCHAR(50) NOT NULL COMMENT 'Unit of measurement for actual stock';

-- Ensure the orders table has the necessary fields
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS ingredient_deduction_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending' COMMENT 'Status of ingredient deduction',
ADD COLUMN IF NOT EXISTS ingredient_deduction_notes TEXT NULL COMMENT 'Notes about ingredient deduction';

-- Create a view for easy monitoring of ingredient usage
CREATE OR REPLACE VIEW ingredient_usage_summary AS
SELECT 
    i.id as ingredient_id,
    i.name as ingredient_name,
    i.category,
    i.actual_quantity as current_stock,
    i.actual_unit,
    i.reorder_level,
    COUNT(it.id) as total_transactions,
    SUM(CASE WHEN it.transaction_type = 'usage' THEN it.actual_amount ELSE 0 END) as total_used,
    SUM(CASE WHEN it.transaction_type = 'restock' THEN it.actual_amount ELSE 0 END) as total_restocked,
    MAX(it.created_at) as last_transaction_date,
    CASE 
        WHEN i.actual_quantity <= i.reorder_level THEN 'Low Stock'
        WHEN i.actual_quantity = 0 THEN 'Out of Stock'
        ELSE 'In Stock'
    END as stock_status
FROM ingredients i
LEFT JOIN inventory_transactions it ON i.id = it.ingredient_id
GROUP BY i.id, i.name, i.category, i.actual_quantity, i.actual_unit, i.reorder_level;

-- Create a view for order ingredient usage
CREATE OR REPLACE VIEW order_ingredient_summary AS
SELECT 
    o.order_id,
    o.customer_name,
    o.order_time,
    o.status,
    COUNT(DISTINCT oiu.ingredient_id) as ingredients_used,
    SUM(oiu.quantity_used) as total_ingredients_used,
    GROUP_CONCAT(DISTINCT i.name SEPARATOR ', ') as ingredients_list
FROM orders o
LEFT JOIN order_ingredient_usage oiu ON o.order_id = oiu.order_id
LEFT JOIN ingredients i ON oiu.ingredient_id = i.id
GROUP BY o.order_id, o.customer_name, o.order_time, o.status;
