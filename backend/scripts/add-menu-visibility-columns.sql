-- Add visibility columns to menu_items table
-- This script adds the missing visibility columns for POS and customer menu

-- Add visible_in_pos column
ALTER TABLE menu_items 
ADD COLUMN visible_in_pos TINYINT(1) DEFAULT 1 COMMENT 'Whether item is visible in POS system';

-- Add visible_in_customer_menu column  
ALTER TABLE menu_items 
ADD COLUMN visible_in_customer_menu TINYINT(1) DEFAULT 1 COMMENT 'Whether item is visible in customer menu';

-- Add allow_customization column if it doesn't exist
ALTER TABLE menu_items 
ADD COLUMN allow_customization TINYINT(1) DEFAULT 1 COMMENT 'Whether item allows customization';

-- Add add_ons column if it doesn't exist
ALTER TABLE menu_items 
ADD COLUMN add_ons TINYINT(1) DEFAULT 0 COMMENT 'Whether item has add-ons';

-- Add order_notes column if it doesn't exist
ALTER TABLE menu_items 
ADD COLUMN order_notes TINYINT(1) DEFAULT 0 COMMENT 'Whether item allows order notes';

-- Add notes column if it doesn't exist
ALTER TABLE menu_items 
ADD COLUMN notes TEXT DEFAULT NULL COMMENT 'Additional notes for the menu item';

-- Add cost column if it doesn't exist
ALTER TABLE menu_items 
ADD COLUMN cost DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Cost price of the menu item';

-- Add indexes for better performance
CREATE INDEX idx_visible_in_pos ON menu_items(visible_in_pos);
CREATE INDEX idx_visible_in_customer_menu ON menu_items(visible_in_customer_menu);
CREATE INDEX idx_allow_customization ON menu_items(allow_customization);

-- Update existing items to be visible by default
UPDATE menu_items SET 
    visible_in_pos = 1,
    visible_in_customer_menu = 1,
    allow_customization = 1
WHERE visible_in_pos IS NULL OR visible_in_customer_menu IS NULL;


