-- Enhanced Admin Inventory & POS Management Schema
-- Extends existing schema with admin control features

-- Add columns to menu_items table for admin control
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS pos_visible BOOLEAN DEFAULT TRUE;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS customer_visible BOOLEAN DEFAULT TRUE;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS allow_customization BOOLEAN DEFAULT TRUE;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS created_by_admin_id INT DEFAULT NULL;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_seasonal BOOLEAN DEFAULT FALSE;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS seasonal_start DATE DEFAULT NULL;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS seasonal_end DATE DEFAULT NULL;

-- Unit conversion table for flexible measurement handling
CREATE TABLE IF NOT EXISTS unit_conversions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    from_unit VARCHAR(20) NOT NULL,
    to_unit VARCHAR(20) NOT NULL,
    conversion_factor DECIMAL(10,6) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'volume', 'weight', 'count'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert standard unit conversions
INSERT INTO unit_conversions (from_unit, to_unit, conversion_factor, category) VALUES
-- Volume conversions
('l', 'ml', 1000.000000, 'volume'),
('ml', 'l', 0.001000, 'volume'),
('cup', 'ml', 240.000000, 'volume'),
('ml', 'cup', 0.004167, 'volume'),
('shot', 'ml', 25.000000, 'volume'),
('ml', 'shot', 0.040000, 'volume'),
('pump', 'ml', 15.000000, 'volume'),
('ml', 'pump', 0.066667, 'volume'),
('tsp', 'ml', 5.000000, 'volume'),
('ml', 'tsp', 0.200000, 'volume'),
('dollop', 'ml', 30.000000, 'volume'),
('ml', 'dollop', 0.033333, 'volume'),

-- Weight conversions
('kg', 'g', 1000.000000, 'weight'),
('g', 'kg', 0.001000, 'weight'),
('oz', 'g', 28.349500, 'weight'),
('g', 'oz', 0.035274, 'weight'),
('sprinkle', 'g', 0.500000, 'weight'),
('g', 'sprinkle', 2.000000, 'weight'),

-- Count conversions
('dozen', 'pieces', 12.000000, 'count'),
('pieces', 'dozen', 0.083333, 'count');

-- Inventory deduction log for tracking automatic deductions
CREATE TABLE IF NOT EXISTS inventory_deductions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id VARCHAR(50) NOT NULL,
    menu_item_id INT NOT NULL,
    ingredient_id INT NOT NULL,
    deducted_actual_amount DECIMAL(10,3) NOT NULL,
    deducted_display_amount DECIMAL(10,3) NOT NULL,
    previous_stock DECIMAL(10,3) NOT NULL,
    new_stock DECIMAL(10,3) NOT NULL,
    deduction_type ENUM('standard', 'customized') NOT NULL,
    customization_details JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
);

-- Admin activity log for tracking admin actions
CREATE TABLE IF NOT EXISTS admin_activity_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id INT NOT NULL,
    action_type ENUM('create_drink', 'update_drink', 'delete_drink', 'toggle_pos_visibility', 'toggle_customization', 'inventory_adjustment') NOT NULL,
    target_type ENUM('menu_item', 'ingredient', 'recipe') NOT NULL,
    target_id INT NOT NULL,
    old_values JSON DEFAULT NULL,
    new_values JSON DEFAULT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admin(id) ON DELETE CASCADE
);

-- POS synchronization settings
CREATE TABLE IF NOT EXISTS pos_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_name VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_by_admin_id INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by_admin_id) REFERENCES admin(id) ON DELETE SET NULL
);

-- Insert default POS settings
INSERT INTO pos_settings (setting_name, setting_value, description) VALUES
('auto_hide_out_of_stock', 'true', 'Automatically hide menu items when ingredients are out of stock'),
('allow_partial_customization', 'true', 'Allow customers to order with partial customizations when some ingredients are unavailable'),
('low_stock_warning_threshold', '0.2', 'Show low stock warning when ingredient is below 20% of reorder level'),
('sync_admin_customer_pos', 'true', 'Keep admin and customer POS views synchronized');
