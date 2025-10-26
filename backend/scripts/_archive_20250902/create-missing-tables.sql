-- Create missing tables for ingredient deduction system
-- Run this script in your MySQL database

-- Create menu_items table
CREATE TABLE IF NOT EXISTS `menu_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT,
    `base_price` DECIMAL(10,2) NOT NULL,
    `category` VARCHAR(50),
    `image_url` VARCHAR(255),
    `is_available` TINYINT(1) DEFAULT 1,
    `preparation_time` INT,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `is_customizable` TINYINT(1) DEFAULT 0,
    `visible_in_pos` TINYINT(1) DEFAULT 1,
    `visible_in_customer_menu` TINYINT(1) DEFAULT 1,
    `add_ons` TINYINT(1) DEFAULT 0,
    `order_notes` TINYINT(1) DEFAULT 1,
    `notes` TEXT,
    `allow_customization` TINYINT(1) DEFAULT 0,
    `created_by_admin_id` INT,
    `is_seasonal` TINYINT(1) DEFAULT 0,
    `seasonal_start` DATE,
    `seasonal_end` DATE,
    `display_price` DECIMAL(10,2),
    `pos_visible` TINYINT(1) DEFAULT 1,
    `customer_visible` TINYINT(1) DEFAULT 1,
    `cost` DECIMAL(10,2)
);

-- Create menu_item_ingredients table
CREATE TABLE IF NOT EXISTS `menu_item_ingredients` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `menu_item_id` INT NOT NULL,
    `ingredient_id` INT NOT NULL,
    `quantity` DECIMAL(5,2) DEFAULT 1.00,
    `is_required` TINYINT(1) DEFAULT 1,
    `required_actual_amount` DECIMAL(10,3),
    `required_display_amount` DECIMAL(10,3),
    `is_optional` TINYINT(1) DEFAULT 0,
    `recipe_unit` VARCHAR(20),
    FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`id`) ON DELETE CASCADE,
    INDEX `idx_menu_item_id` (`menu_item_id`),
    INDEX `idx_ingredient_id` (`ingredient_id`)
);

-- Insert a sample coffee menu item
INSERT INTO `menu_items` (`name`, `description`, `base_price`, `category`, `is_available`) 
VALUES ('Coffee', 'Basic coffee drink', 100.00, 'Beverages', 1)
ON DUPLICATE KEY UPDATE `name` = `name`;

-- Get the coffee menu item ID
SET @coffee_id = LAST_INSERT_ID();
IF @coffee_id = 0 THEN
    SELECT @coffee_id := id FROM menu_items WHERE name = 'Coffee' LIMIT 1;
END IF;

-- Get the sugar ingredient ID
SET @sugar_id = (SELECT id FROM ingredients WHERE LOWER(name) LIKE '%sugar%' LIMIT 1);

-- Create coffee-sugar recipe if both exist
IF @coffee_id > 0 AND @sugar_id > 0 THEN
    INSERT INTO `menu_item_ingredients` 
    (`menu_item_id`, `ingredient_id`, `required_actual_amount`, `required_display_amount`, `recipe_unit`, `is_optional`)
    VALUES (@coffee_id, @sugar_id, 0.01, 0.01, 'kg', FALSE)
    ON DUPLICATE KEY UPDATE `required_actual_amount` = VALUES(`required_actual_amount`);
END IF;

-- Verify tables were created
SELECT 'menu_items' as table_name, COUNT(*) as record_count FROM menu_items
UNION ALL
SELECT 'menu_item_ingredients' as table_name, COUNT(*) as record_count FROM menu_item_ingredients;

-- Show sample data
SELECT 'Sample menu items:' as info;
SELECT id, name, base_price, category FROM menu_items LIMIT 5;

SELECT 'Sample recipes:' as info;
SELECT mii.*, mi.name as menu_name, i.name as ingredient_name
FROM menu_item_ingredients mii
JOIN menu_items mi ON mii.menu_item_id = mi.id
JOIN ingredients i ON mii.ingredient_id = i.id
LIMIT 5;

