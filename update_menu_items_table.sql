-- Add missing columns to menu_items table for ProductDetailsForm functionality

-- Add cost column
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS cost DECIMAL(10,2) DEFAULT 0.00;

-- Add sync_with_inventory column
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS sync_with_inventory BOOLEAN DEFAULT FALSE;

-- Add add_ons column
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS add_ons BOOLEAN DEFAULT FALSE;

-- Add order_notes column
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS order_notes BOOLEAN DEFAULT FALSE;

-- Add notes column
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create menu_item_variants table if it doesn't exist
CREATE TABLE IF NOT EXISTS menu_item_variants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    menu_item_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
);

-- Update existing menu items with default values
UPDATE menu_items SET 
    cost = 0.00,
    sync_with_inventory = FALSE,
    add_ons = FALSE,
    order_notes = FALSE,
    notes = ''
WHERE cost IS NULL OR sync_with_inventory IS NULL OR add_ons IS NULL OR order_notes IS NULL OR notes IS NULL; 