-- Fix events table schema to match the event request functionality
-- This script adds the necessary columns if they don't exist

-- Check and add columns for event requests
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS customer_id INT NULL,
ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS contact_number VARCHAR(20) NULL,
ADD COLUMN IF NOT EXISTS event_start_time TIME NULL,
ADD COLUMN IF NOT EXISTS event_end_time TIME NULL,
ADD COLUMN IF NOT EXISTS address TEXT NULL,
ADD COLUMN IF NOT EXISTS event_type VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS notes TEXT NULL,
ADD COLUMN IF NOT EXISTS cups INT NULL,
ADD COLUMN IF NOT EXISTS admin_response_date DATETIME NULL;

-- Update status enum to include 'pending', 'accepted', 'rejected'
-- Note: This might fail if the enum already has these values
ALTER TABLE events 
MODIFY COLUMN status ENUM('draft','published','cancelled','completed','pending','accepted','rejected') DEFAULT 'pending';

-- Add index for customer_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_events_customer_id ON events(customer_id);

-- Add index for status if it doesn't exist  
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);



