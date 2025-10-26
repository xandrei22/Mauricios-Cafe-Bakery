-- Create required tables for ingredient deduction system
-- Run this script in your MySQL database

-- Create ingredient deduction queue table
CREATE TABLE IF NOT EXISTS `ingredient_deduction_queue` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_id` INT NOT NULL,
    `items` JSON NOT NULL,
    `status` ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    `error_message` TEXT,
    `attempts` INT DEFAULT 0,
    `max_attempts` INT DEFAULT 3,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `processed_at` TIMESTAMP NULL,
    INDEX `idx_status` (`status`),
    INDEX `idx_order_id` (`order_id`),
    INDEX `idx_created_at` (`created_at`)
);

-- Create system logs table
CREATE TABLE IF NOT EXISTS `system_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `action` VARCHAR(100) NOT NULL,
    `table_name` VARCHAR(50) NOT NULL,
    `record_id` INT,
    `details` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_action` (`action`),
    INDEX `idx_created_at` (`created_at`)
);

-- Create database trigger for automatic ingredient deduction
DELIMITER //

CREATE TRIGGER IF NOT EXISTS `trigger_ingredient_deduction_after_payment`
AFTER UPDATE ON `orders`
FOR EACH ROW
BEGIN
    -- Only trigger when payment_status changes from something else to 'paid'
    IF OLD.payment_status != 'paid' AND NEW.payment_status = 'paid' THEN
        -- Insert a record into the queue table for ingredient deduction
        -- Fix the items structure to ensure proper format
        INSERT INTO `ingredient_deduction_queue` (
            `order_id`, 
            `items`, 
            `status`, 
            `created_at`
        ) VALUES (
            NEW.id,
            JSON_ARRAY(
                JSON_OBJECT(
                    'id', JSON_EXTRACT(NEW.items, '$[0].id'),
                    'menu_item_id', JSON_EXTRACT(NEW.items, '$[0].menu_item_id'),
                    'quantity', COALESCE(JSON_EXTRACT(NEW.items, '$[0].quantity'), 1),
                    'name', COALESCE(JSON_EXTRACT(NEW.items, '$[0].name'), 'Unknown Item'),
                    'customizations', JSON_EXTRACT(NEW.items, '$[0].customizations')
                )
            ),
            'pending',
            NOW()
        );
        
        -- Log the trigger activation
        INSERT INTO `system_logs` (
            `action`, 
            `table_name`, 
            `record_id`, 
            `details`, 
            `created_at`
        ) VALUES (
            'ingredient_deduction_triggered',
            'orders',
            NEW.id,
            CONCAT('Payment completed for order ', NEW.order_id, '. Ingredient deduction queued.'),
            NOW()
        );
    END IF;
END //

DELIMITER ;

-- Verify tables were created
SELECT 'ingredient_deduction_queue' as table_name, COUNT(*) as record_count FROM ingredient_deduction_queue
UNION ALL
SELECT 'system_logs' as table_name, COUNT(*) as record_count FROM system_logs;

-- Show trigger
SHOW TRIGGERS LIKE 'orders';
