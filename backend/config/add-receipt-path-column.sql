-- Add receipt_path column to orders table for storing uploaded receipt images
-- This script should be run manually in MySQL if needed
-- ALTER TABLE orders ADD COLUMN receipt_path VARCHAR(255) DEFAULT NULL COMMENT 'Path to uploaded receipt image for e-payment verification';

-- Add index for better query performance
-- CREATE INDEX idx_orders_receipt_path ON orders(receipt_path);


