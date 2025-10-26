-- Database trigger to automatically deduct ingredients when payment is completed
-- This ensures ingredient deduction happens regardless of how payment is completed

DELIMITER //

CREATE TRIGGER IF NOT EXISTS trigger_ingredient_deduction_after_payment
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
    -- Only trigger when payment_status changes from something else to 'paid'
    IF OLD.payment_status != 'paid' AND NEW.payment_status = 'paid' THEN
        -- Transform the items JSON to ensure consistent structure for ingredient deduction
        -- Customer orders use 'menuItemId', admin orders use 'id', we need 'menu_item_id'
        SET @transformed_items = JSON_REPLACE(
            NEW.items,
            '$[*].menu_item_id', 
            JSON_EXTRACT(NEW.items, '$[*].menuItemId')
        );
        
        -- If the above didn't work (no menuItemId), try to use 'id' field
        IF @transformed_items = NEW.items THEN
            SET @transformed_items = JSON_REPLACE(
                NEW.items,
                '$[*].menu_item_id', 
                JSON_EXTRACT(NEW.items, '$[*].id')
            );
        END IF;
        
        -- Insert a record into a queue table for ingredient deduction
        -- This prevents blocking the payment transaction
        INSERT INTO ingredient_deduction_queue (
            order_id, 
            items, 
            status, 
            created_at
        ) VALUES (
            NEW.id,
            @transformed_items,
            'pending',
            NOW()
        );
        
        -- Log the trigger activation
        INSERT INTO system_logs (
            action, 
            table_name, 
            record_id, 
            details, 
            created_at
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

-- Create the queue table if it doesn't exist
CREATE TABLE IF NOT EXISTS ingredient_deduction_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    items JSON NOT NULL,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    error_message TEXT,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    INDEX idx_status (status),
    INDEX idx_order_id (order_id),
    INDEX idx_created_at (created_at)
);

-- Create system logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id INT,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
);
