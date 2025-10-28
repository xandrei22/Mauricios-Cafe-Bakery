const db = require('../config/db');

async function main() {
    const missingIngredients = [
        // Milk foam (we can use whipped cream as substitute)
        { name: 'Milk Foam', category: 'Dairy', sku: 'MILK-FOAM-100ML', actual_unit: 'ml', description: 'Steamed milk foam', initial_quantity: 50, reorder_level: 20, days_of_stock: 7, cost_per_actual_unit: 5 },

        // Drizzles and toppings
        { name: 'Caramel drizzle', category: 'Toppings', sku: 'CARM-DRIZZLE-100ML', actual_unit: 'ml', description: 'Caramel drizzle sauce', initial_quantity: 10, reorder_level: 4, days_of_stock: 7, cost_per_actual_unit: 15 },
        { name: 'Strawberry drizzle', category: 'Toppings', sku: 'STRW-DRIZZLE-100ML', actual_unit: 'ml', description: 'Strawberry drizzle sauce', initial_quantity: 10, reorder_level: 4, days_of_stock: 7, cost_per_actual_unit: 15 },
        { name: 'Toffee bits', category: 'Toppings', sku: 'TOFFEE-BITS-100G', actual_unit: 'g', description: 'Crushed toffee bits', initial_quantity: 5, reorder_level: 2, days_of_stock: 7, cost_per_actual_unit: 25 },
        { name: 'Chocolate shavings', category: 'Toppings', sku: 'CHOC-SHAVINGS-100G', actual_unit: 'g', description: 'Chocolate shavings', initial_quantity: 5, reorder_level: 2, days_of_stock: 7, cost_per_actual_unit: 30 },
        { name: 'Cherry topping', category: 'Toppings', sku: 'CHERRY-TOP-100G', actual_unit: 'g', description: 'Cherry topping', initial_quantity: 5, reorder_level: 2, days_of_stock: 7, cost_per_actual_unit: 20 },
        { name: 'Oreo crumbs', category: 'Toppings', sku: 'OREO-CRUMBS-100G', actual_unit: 'g', description: 'Oreo cookie crumbs', initial_quantity: 5, reorder_level: 2, days_of_stock: 7, cost_per_actual_unit: 15 },

        // Syrups
        { name: 'Irish cream syrup', category: 'Syrups', sku: 'IRISH-CREAM-1L', actual_unit: 'ml', description: 'Irish cream flavored syrup', initial_quantity: 5, reorder_level: 2, actual_unit: 'ml', days_of_stock: 7, cost_per_actual_unit: 50 },
        { name: 'Sea salt crème', category: 'Syrups', sku: 'SEA-SALT-CREME-1L', actual_unit: 'ml', description: 'Sea salt cream foam', initial_quantity: 5, reorder_level: 2, days_of_stock: 7, cost_per_actual_unit: 45 },
        { name: 'Brown sugar syrup', category: 'Syrups', sku: 'BROWN-SUGAR-1L', actual_unit: 'ml', description: 'Brown sugar flavored syrup', initial_quantity: 5, reorder_level: 2, days_of_stock: 7, cost_per_actual_unit: 35 },
        { name: 'Black forest syrup', category: 'Syrups', sku: 'BLACK-FOREST-1L', actual_unit: 'ml', description: 'Black forest flavored syrup', initial_quantity: 5, reorder_level: 2, days_of_stock: 7, cost_per_actual_unit: 40 },
        { name: 'Dark chocolate syrup', category: 'Syrups', sku: 'DARK-CHOC-1L', actual_unit: 'ml', description: 'Dark chocolate flavored syrup', initial_quantity: 5, reorder_level: 2, days_of_stock: 7, cost_per_actual_unit: 45 },

        // Spices and powders
        { name: 'Cinnamon powder', category: 'Spices', sku: 'CINNAMON-100G', actual_unit: 'g', description: 'Ground cinnamon powder', initial_quantity: 2, reorder_level: 1, days_of_stock: 30, cost_per_actual_unit: 10 },
        { name: 'Garlic powder', category: 'Spices', sku: 'GARLIC-POWDER-100G', actual_unit: 'g', description: 'Ground garlic powder', initial_quantity: 2, reorder_level: 1, days_of_stock: 30, cost_per_actual_unit: 8 },

        // Beverages
        { name: 'Chai tea concentrate', category: 'Tea', sku: 'CHAI-CONCENTRATE-1L', actual_unit: 'ml', description: 'Chai tea concentrate', initial_quantity: 5, reorder_level: 2, days_of_stock: 7, cost_per_actual_unit: 25 },
        { name: 'Cream soda', category: 'Beverages', sku: 'CREAM-SODA-330ML', actual_unit: 'ml', description: 'Cream soda', initial_quantity: 20, reorder_level: 8, days_of_stock: 7, cost_per_actual_unit: 15 },
        { name: 'Chamomile tea', category: 'Tea', sku: 'CHAMOMILE-TEA-100G', actual_unit: 'g', description: 'Chamomile tea leaves', initial_quantity: 2, reorder_level: 1, days_of_stock: 30, cost_per_actual_unit: 20 },
        { name: 'Simple syrup', category: 'Syrups', sku: 'SIMPLE-SYRUP-1L', actual_unit: 'ml', description: 'Simple sugar syrup', initial_quantity: 10, reorder_level: 4, days_of_stock: 7, cost_per_actual_unit: 5 },

        // Condiments
        { name: 'Mayonnaise', category: 'Condiments', sku: 'MAYO-500ML', actual_unit: 'ml', description: 'Mayonnaise', initial_quantity: 5, reorder_level: 2, days_of_stock: 14, cost_per_actual_unit: 8 },
        { name: 'Ketchup', category: 'Condiments', sku: 'KETCHUP-500ML', actual_unit: 'ml', description: 'Tomato ketchup', initial_quantity: 5, reorder_level: 2, days_of_stock: 14, cost_per_actual_unit: 6 },
        { name: 'Mustard', category: 'Condiments', sku: 'MUSTARD-500ML', actual_unit: 'ml', description: 'Yellow mustard', initial_quantity: 3, reorder_level: 1, days_of_stock: 14, cost_per_actual_unit: 7 },
        { name: 'Salsa', category: 'Condiments', sku: 'SALSA-500ML', actual_unit: 'ml', description: 'Tomato salsa', initial_quantity: 5, reorder_level: 2, days_of_stock: 7, cost_per_actual_unit: 12 },
        { name: 'Half & half cream', category: 'Dairy', sku: 'HALF-HALF-500ML', actual_unit: 'ml', description: 'Half and half cream', initial_quantity: 5, reorder_level: 2, days_of_stock: 7, cost_per_actual_unit: 18 },

        // Sausages
        { name: 'Hungarian sausage', category: 'Proteins', sku: 'HUNGARIAN-SAU-100G', actual_unit: 'g', description: 'Hungarian sausage', initial_quantity: 10, reorder_level: 4, days_of_stock: 7, cost_per_actual_unit: 35 },
        { name: 'Spicy sausage', category: 'Proteins', sku: 'SPICY-SAU-100G', actual_unit: 'g', description: 'Spicy sausage', initial_quantity: 10, reorder_level: 4, days_of_stock: 7, cost_per_actual_unit: 32 },

        // Other ingredients
        { name: 'Butter extract', category: 'Flavoring', sku: 'BUTTER-EXT-100ML', actual_unit: 'ml', description: 'Butter flavoring extract', initial_quantity: 2, reorder_level: 1, days_of_stock: 30, cost_per_actual_unit: 25 },
        { name: 'Mint leaf', category: 'Fresh Produce', sku: 'MINT-LEAF-100G', actual_unit: 'g', description: 'Fresh mint leaves', initial_quantity: 2, reorder_level: 1, days_of_stock: 3, cost_per_actual_unit: 15 },
        { name: 'Fried onions', category: 'Toppings', sku: 'FRIED-ONIONS-100G', actual_unit: 'g', description: 'Crispy fried onions', initial_quantity: 3, reorder_level: 1, days_of_stock: 7, cost_per_actual_unit: 20 }
    ];

    let success = 0;
    let failed = 0;

    for (const ing of missingIngredients) {
        try {
            await db.query(`
                INSERT INTO ingredients (
                    name, description, category, sku,
                    actual_unit,
                    actual_quantity, reorder_level, cost_per_actual_unit,
                    storage_location, days_of_stock, is_available
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                ing.name,
                ing.description || '',
                ing.category,
                ing.sku || '',
                ing.actual_unit,
                ing.initial_quantity,
                ing.reorder_level,
                ing.cost_per_actual_unit,
                'Storage',
                ing.days_of_stock,
                true
            ]);

            success += 1;
            console.log(`Added: ${ing.name} (${ing.sku})`);
        } catch (e) {
            failed += 1;
            console.error(`Failed: ${ing.name} -> ${e.message}`);
        }
    }

    console.log(`\nDone. Success: ${success}, Failed: ${failed}`);
    process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
    console.error('Missing ingredients script fatal error:', err);
    process.exit(1);
});


























