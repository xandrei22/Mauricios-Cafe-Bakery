-- Fix missing columns for customer menu functionality
-- Run this script if you're getting "Unknown column" errors

-- Add missing columns to ingredients table
ALTER TABLE ingredients 
ADD COLUMN IF NOT EXISTS display_unit VARCHAR(20) NOT NULL DEFAULT 'units',
ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(10,3) NOT NULL DEFAULT 1.000;

-- Add missing columns to menu_items table
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS pos_visible BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS customer_visible BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS allow_customization BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS created_by_admin_id INT NULL,
ADD COLUMN IF NOT EXISTS is_seasonal BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS seasonal_start DATE NULL,
ADD COLUMN IF NOT EXISTS seasonal_end DATE NULL,
ADD COLUMN IF NOT EXISTS display_price DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- Add missing columns to menu_item_ingredients table
ALTER TABLE menu_item_ingredients 
ADD COLUMN IF NOT EXISTS required_actual_amount DECIMAL(10,3) DEFAULT 1.000,
ADD COLUMN IF NOT EXISTS required_display_amount DECIMAL(10,3) DEFAULT 1.000,
ADD COLUMN IF NOT EXISTS is_optional BOOLEAN DEFAULT FALSE;

-- Update existing menu items to have display_price if it's NULL
UPDATE menu_items SET display_price = base_price WHERE display_price = 0.00 OR display_price IS NULL;

-- Update existing menu item ingredients to have required amounts if they're NULL
UPDATE menu_item_ingredients 
SET required_actual_amount = quantity, 
    required_display_amount = quantity 
WHERE required_actual_amount IS NULL OR required_display_amount IS NULL;

-- Update existing ingredients to have display_unit if it's NULL
UPDATE ingredients 
SET display_unit = actual_unit 
WHERE display_unit = 'units' AND actual_unit != 'units';

-- Update existing ingredients to have conversion_rate if it's NULL
UPDATE ingredients 
SET conversion_rate = 1.000 
WHERE conversion_rate IS NULL OR conversion_rate = 0;

