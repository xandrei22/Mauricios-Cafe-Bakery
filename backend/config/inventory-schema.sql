-- Enhanced Inventory Schema for Coffee Shop
-- Tracks actual ingredient amounts and converts to customer-friendly units

-- Ingredients table (stores actual inventory)
CREATE TABLE IF NOT EXISTS ingredients (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    sku VARCHAR(50) UNIQUE NOT NULL, -- Stock Keeping Unit
    actual_unit VARCHAR(20) NOT NULL, -- e.g., 'ml', 'g', 'pieces'
    actual_quantity DECIMAL(10,3) NOT NULL DEFAULT 0, -- e.g., 1000.000 ml
    display_unit VARCHAR(20) NOT NULL, -- e.g., 'shot', 'cup', 'piece'
    conversion_rate DECIMAL(10,3) NOT NULL, -- e.g., 25.000 (25ml = 1 shot)
    reorder_level DECIMAL(10,3) DEFAULT 0,
    cost_per_actual_unit DECIMAL(10,3) DEFAULT 0,
    storage_location VARCHAR(100),
    days_of_stock INT DEFAULT 0, -- Estimated days of stock remaining
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Menu items table
CREATE TABLE IF NOT EXISTS menu_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    display_price DECIMAL(10,2) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Menu item ingredients (recipe requirements)
CREATE TABLE IF NOT EXISTS menu_item_ingredients (
    id INT PRIMARY KEY AUTO_INCREMENT,
    menu_item_id INT NOT NULL,
    ingredient_id INT NOT NULL,
    required_actual_amount DECIMAL(10,3) NOT NULL, -- e.g., 25.000 ml
    required_display_amount DECIMAL(10,3) NOT NULL, -- e.g., 1.000 shot
    is_optional BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
);

-- Inventory transactions (tracks all changes)
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ingredient_id INT NOT NULL,
    transaction_type ENUM('purchase', 'usage', 'adjustment', 'waste', 'return') NOT NULL,
    actual_amount DECIMAL(10,3) NOT NULL,
    display_amount DECIMAL(10,3) NOT NULL,
    previous_actual_quantity DECIMAL(10,3) NOT NULL,
    new_actual_quantity DECIMAL(10,3) NOT NULL,
    order_id VARCHAR(50) NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
);

-- Sample data for coffee shop ingredients
INSERT INTO ingredients (name, description, category, sku, actual_unit, actual_quantity, display_unit, conversion_rate, reorder_level, cost_per_actual_unit, storage_location, days_of_stock) VALUES
('Almond Milk', 'Unsweetened almond milk', 'milk', 'ALM-MILK-001', 'ml', 1000.000, 'shot', 25.000, 500.000, 0.050, 'Refrigerator', 7),
('Oat Milk', 'Barista oat milk', 'milk', 'OAT-MILK-001', 'ml', 1500.000, 'shot', 30.000, 750.000, 0.060, 'Refrigerator', 10),
('Whole Milk', 'Fresh whole milk', 'milk', 'WHOLE-MILK-001', 'ml', 2000.000, 'shot', 25.000, 1000.000, 0.040, 'Refrigerator', 5),
('Coffee Beans', 'Premium arabica beans', 'coffee', 'COFFEE-BEANS-001', 'g', 5000.000, 'shot', 18.000, 2000.000, 0.080, 'Dry Storage', 30),
('Espresso Beans', 'Dark roast espresso beans', 'coffee', 'ESPRESSO-BEANS-001', 'g', 3000.000, 'shot', 18.000, 1500.000, 0.090, 'Dry Storage', 20),
('Vanilla Syrup', 'Vanilla flavored syrup', 'syrup', 'VANILLA-SYRUP-001', 'ml', 1000.000, 'pump', 15.000, 500.000, 0.020, 'Refrigerator', 15),
('Caramel Syrup', 'Caramel flavored syrup', 'syrup', 'CARAMEL-SYRUP-001', 'ml', 1000.000, 'pump', 15.000, 500.000, 0.025, 'Refrigerator', 15),
('Chocolate Syrup', 'Dark chocolate syrup', 'syrup', 'CHOCO-SYRUP-001', 'ml', 800.000, 'pump', 20.000, 400.000, 0.030, 'Refrigerator', 12),
('Sugar', 'White granulated sugar', 'sweetener', 'SUGAR-001', 'g', 2000.000, 'tsp', 4.000, 1000.000, 0.010, 'Dry Storage', 60),
('Honey', 'Pure honey', 'sweetener', 'HONEY-001', 'ml', 500.000, 'tsp', 5.000, 250.000, 0.040, 'Dry Storage', 45),
('Whipped Cream', 'Fresh whipped cream', 'topping', 'WHIP-CREAM-001', 'ml', 1000.000, 'dollop', 30.000, 500.000, 0.060, 'Refrigerator', 3),
('Cinnamon Powder', 'Ground cinnamon', 'spice', 'CINNAMON-001', 'g', 200.000, 'sprinkle', 0.500, 100.000, 0.200, 'Dry Storage', 90);

-- Sample menu items
INSERT INTO menu_items (name, description, category, base_price, display_price) VALUES
('Espresso', 'Single shot of espresso', 'coffee', 150.00, 150.00),
('Double Espresso', 'Double shot of espresso', 'coffee', 200.00, 200.00),
('Americano', 'Espresso with hot water', 'coffee', 175.00, 175.00),
('Cappuccino', 'Espresso with steamed milk and foam', 'coffee', 225.00, 225.00),
('Latte', 'Espresso with steamed milk', 'coffee', 250.00, 250.00),
('Mocha', 'Espresso with chocolate and steamed milk', 'coffee', 275.00, 275.00),
('Vanilla Latte', 'Latte with vanilla syrup', 'coffee', 275.00, 275.00),
('Caramel Macchiato', 'Espresso with caramel and steamed milk', 'coffee', 285.00, 285.00),
('Almond Milk Latte', 'Latte with almond milk', 'coffee', 275.00, 275.00),
('Oat Milk Cappuccino', 'Cappuccino with oat milk', 'coffee', 245.00, 245.00);

-- Sample menu item ingredients (recipes)
INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, required_actual_amount, required_display_amount) VALUES
-- Espresso (1 shot)
(1, 4, 18.000, 1.000), -- Coffee Beans: 18g = 1 shot

-- Double Espresso (2 shots)
(2, 4, 36.000, 2.000), -- Coffee Beans: 36g = 2 shots

-- Americano (1 shot + hot water)
(3, 4, 18.000, 1.000), -- Coffee Beans: 18g = 1 shot

-- Cappuccino (1 shot + 60ml milk)
(4, 4, 18.000, 1.000), -- Coffee Beans: 18g = 1 shot
(4, 3, 60.000, 2.400), -- Whole Milk: 60ml = 2.4 shots

-- Latte (1 shot + 120ml milk)
(5, 4, 18.000, 1.000), -- Coffee Beans: 18g = 1 shot
(5, 3, 120.000, 4.800), -- Whole Milk: 120ml = 4.8 shots

-- Mocha (1 shot + 30ml chocolate + 90ml milk)
(6, 4, 18.000, 1.000), -- Coffee Beans: 18g = 1 shot
(6, 8, 30.000, 1.500), -- Chocolate Syrup: 30ml = 1.5 pumps
(6, 3, 90.000, 3.600), -- Whole Milk: 90ml = 3.6 shots

-- Vanilla Latte (1 shot + 15ml vanilla + 105ml milk)
(7, 4, 18.000, 1.000), -- Coffee Beans: 18g = 1 shot
(7, 6, 15.000, 1.000), -- Vanilla Syrup: 15ml = 1 pump
(7, 3, 105.000, 4.200), -- Whole Milk: 105ml = 4.2 shots

-- Caramel Macchiato (1 shot + 15ml caramel + 105ml milk)
(8, 4, 18.000, 1.000), -- Coffee Beans: 18g = 1 shot
(8, 7, 15.000, 1.000), -- Caramel Syrup: 15ml = 1 pump
(8, 3, 105.000, 4.200), -- Whole Milk: 105ml = 4.2 shots

-- Almond Milk Latte (1 shot + 120ml almond milk)
(9, 4, 18.000, 1.000), -- Coffee Beans: 18g = 1 shot
(9, 1, 120.000, 4.800), -- Almond Milk: 120ml = 4.8 shots

-- Oat Milk Cappuccino (1 shot + 60ml oat milk)
(10, 4, 18.000, 1.000), -- Coffee Beans: 18g = 1 shot
(10, 2, 60.000, 2.000); -- Oat Milk: 60ml = 2 shots 