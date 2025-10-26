-- Add staff_id column to orders table for sales tracking
-- This enables the staff sales performance chart to work properly

-- Add staff_id column (MySQL will ignore if column already exists)
ALTER TABLE orders ADD COLUMN staff_id INT DEFAULT NULL;

-- Add foreign key constraint to link with users table
-- Note: This assumes the staff are stored in the users table with appropriate roles
-- MySQL will ignore if constraint already exists
ALTER TABLE orders ADD CONSTRAINT fk_orders_staff_id 
FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE SET NULL;

-- Add index for better query performance
-- MySQL will ignore if index already exists
CREATE INDEX idx_orders_staff_id ON orders(staff_id);

-- Verify the table structure
SHOW COLUMNS FROM orders;








