const db = require('../config/db');
const inventoryService = require('../services/inventoryService');

async function main() {
    const ingredients = [
        // Whole Milk
        {
            name: 'Whole Milk',
            category: 'Dairy',
            sku: 'MILK-1L-FRESH',
            actual_unit: 'L',
            description: 'Fresh whole milk, refrigerated',
            initial_quantity: 154,
            reorder_level: 60,
            days_of_stock: 7,
            cost_per_actual_unit: 120
        },
        // Espresso Beans
        {
            name: 'Espresso Beans (Roast - ground per shot)',
            category: 'Coffee Beans',
            sku: 'BEANS-1KG-ESP',
            actual_unit: 'kg',
            description: 'Espresso roast whole beans',
            initial_quantity: 24,
            reorder_level: 9,
            days_of_stock: 7,
            cost_per_actual_unit: 900
        },
        // General Syrup TOTAL (also add per flavor)
        {
            name: 'General Syrup (TOTAL)',
            category: 'Syrups (liquid flavor)',
            sku: 'SYRUP-1L-MIX',
            actual_unit: 'L',
            description: 'Various flavor syrups (caramel, chocolate, vanilla, etc.)',
            initial_quantity: 20,
            reorder_level: 8,
            days_of_stock: 7,
            cost_per_actual_unit: 400
        },

        // Syrup flavor breakdowns (entered as separate SKUs)
        { name: 'Caramel syrup', category: 'Syrups (liquid flavor)', sku: 'SYR-CARM-1L', actual_unit: 'L', description: 'Caramel syrup', initial_quantity: 4.0, reorder_level: 1.6, days_of_stock: 7, cost_per_actual_unit: 400 },
        { name: 'Chocolate syrup', category: 'Syrups (liquid flavor)', sku: 'SYR-CHOC-1L', actual_unit: 'L', description: 'Chocolate syrup', initial_quantity: 3.0, reorder_level: 1.2, days_of_stock: 7, cost_per_actual_unit: 400 },
        { name: 'White chocolate syrup', category: 'Syrups (liquid flavor)', sku: 'SYR-WHTCH-1L', actual_unit: 'L', description: 'White chocolate syrup', initial_quantity: 2.0, reorder_level: 0.8, days_of_stock: 7, cost_per_actual_unit: 400 },
        { name: 'Ube syrup', category: 'Syrups (liquid flavor)', sku: 'SYR-UBE-1L', actual_unit: 'L', description: 'Ube syrup', initial_quantity: 2.0, reorder_level: 0.8, days_of_stock: 7, cost_per_actual_unit: 400 },
        { name: 'Strawberry syrup', category: 'Syrups (liquid flavor)', sku: 'SYR-STRW-1L', actual_unit: 'L', description: 'Strawberry syrup', initial_quantity: 2.0, reorder_level: 0.8, days_of_stock: 7, cost_per_actual_unit: 400 },
        { name: 'Vanilla syrup', category: 'Syrups (liquid flavor)', sku: 'SYR-VAN-1L', actual_unit: 'L', description: 'Vanilla syrup', initial_quantity: 3.0, reorder_level: 1.2, days_of_stock: 7, cost_per_actual_unit: 400 },
        { name: 'Cherry syrup', category: 'Syrups (liquid flavor)', sku: 'SYR-CHR-1L', actual_unit: 'L', description: 'Cherry syrup', initial_quantity: 1.0, reorder_level: 0.4, days_of_stock: 7, cost_per_actual_unit: 400 },
        { name: 'Toffee syrup', category: 'Syrups (liquid flavor)', sku: 'SYR-TF-1L', actual_unit: 'L', description: 'Toffee syrup', initial_quantity: 1.0, reorder_level: 0.4, days_of_stock: 7, cost_per_actual_unit: 400 },

        // Matcha Powder
        { name: 'Matcha Powder', category: 'Teas / Powders', sku: 'MATCHA-100G', actual_unit: '100 g pack', description: 'Culinary matcha powder', initial_quantity: 5, reorder_level: 2, days_of_stock: 7, cost_per_actual_unit: 600 },

        // Tablea
        { name: 'Tablea (Batangas Tablea)', category: 'Chocolate / Local Mixes', sku: 'TABLEA-100G', actual_unit: '100 g', description: 'Tablea chocolate powder/tablets', initial_quantity: 2, reorder_level: 1, days_of_stock: 7, cost_per_actual_unit: 120 },

        // Condensed Milk
        { name: 'Condensed Milk', category: 'Dairy / Canned', sku: 'COND-300G', actual_unit: '300 g tin', description: 'Sweetened condensed milk', initial_quantity: 10, reorder_level: 4, days_of_stock: 7, cost_per_actual_unit: 60 },

        // Whipped Cream
        { name: 'Whipped Cream', category: 'Toppings', sku: 'WHIP-1KG', actual_unit: 'kg', description: 'Whipped topping (aerosol or tub)', initial_quantity: 9, reorder_level: 3.5, days_of_stock: 7, cost_per_actual_unit: 220 },

        // Ice
        { name: 'Ice (bagged)', category: 'Consumables', sku: 'ICE-KG', actual_unit: 'kg', description: 'Bagged ice for frappes/iced drinks', initial_quantity: 31, reorder_level: 10, days_of_stock: 7, cost_per_actual_unit: 10 },

        // Coconut Cream
        { name: 'Coconut Cream', category: 'Dairy / Canned', sku: 'COCONUT-400ML', actual_unit: '400 ml can', description: 'Coconut cream for cocktails/coladas', initial_quantity: 6, reorder_level: 2, days_of_stock: 7, cost_per_actual_unit: 80 },

        // Pineapple Juice
        { name: 'Pineapple Juice', category: 'Juices', sku: 'PINE-1L', actual_unit: 'L', description: 'Pineapple juice (not from concentrate preferred)', initial_quantity: 4, reorder_level: 1.5, days_of_stock: 7, cost_per_actual_unit: 100 },

        // Orange Juice
        { name: 'Orange Juice', category: 'Juices', sku: 'ORANGE-1L', actual_unit: 'L', description: 'Orange juice (for Early Sunrise)', initial_quantity: 3, reorder_level: 1, days_of_stock: 7, cost_per_actual_unit: 120 },

        // Lemon Juice
        { name: 'Lemon Juice', category: 'Juices / Fresh produce', sku: 'LEMON-1L', actual_unit: 'L', description: 'Concentrated lemon juice or fresh-squeezed equivalent', initial_quantity: 2, reorder_level: 0.6, days_of_stock: 7, cost_per_actual_unit: 150 },

        // Grenadine
        { name: 'Grenadine', category: 'Syrups / Mixers', sku: 'GREN-1L', actual_unit: 'L', description: 'Grenadine syrup (cocktail)', initial_quantity: 1, reorder_level: 0.3, days_of_stock: 7, cost_per_actual_unit: 400 },

        // Cola
        { name: 'Cola', category: 'Bottled Beverages', sku: 'COLA-330ML', actual_unit: '330 ml', description: 'Cola (soda)', initial_quantity: 7, reorder_level: 2, days_of_stock: 7, cost_per_actual_unit: 40 },

        // Sugar
        { name: 'Sugar (granulated)', category: 'Dry Goods', sku: 'SUGAR-1KG', actual_unit: 'kg', description: 'Granulated sugar (for syrups and table use)', initial_quantity: 6, reorder_level: 2, days_of_stock: 7, cost_per_actual_unit: 70 },

        // Chocolate Chips
        { name: 'Chocolate Chips / Dark Chocolate', category: 'Baking / Toppings', sku: 'CHOC-1KG', actual_unit: 'kg', description: 'Dark chocolate chips', initial_quantity: 1.5, reorder_level: 0.5, days_of_stock: 7, cost_per_actual_unit: 400 },

        // Oreo
        { name: 'Oreo (crushable for frappes)', category: 'Dry Goods', sku: 'OREO-100G', actual_unit: '100 g pack', description: 'Oreos (for Choco/Oreo fraps)', initial_quantity: 6, reorder_level: 2, days_of_stock: 7, cost_per_actual_unit: 80 },

        // Ground Beef
        { name: 'Ground Beef', category: 'Proteins', sku: 'BEEF-1KG', actual_unit: 'kg', description: 'Lean ground beef', initial_quantity: 7, reorder_level: 2.5, days_of_stock: 7, cost_per_actual_unit: 300 },

        // Hotdog Sausages
        { name: 'Hotdog Sausages (regular)', category: 'Proteins / Bakery', sku: 'HOTD-PCS', actual_unit: 'pcs', description: 'Hotdog sausage, ~80 g each', initial_quantity: 200, reorder_level: 70, days_of_stock: 7, cost_per_actual_unit: 30 },

        // Hotdog Buns
        { name: 'Hotdog Buns', category: 'Bakery / Bread', sku: 'BUN-PCS', actual_unit: 'pcs', description: 'Standard hotdog buns', initial_quantity: 220, reorder_level: 80, days_of_stock: 7, cost_per_actual_unit: 8 },

        // Nacho Chips
        { name: 'Nacho Chips', category: 'Dry Goods / Snacks', sku: 'NACHO-1KG', actual_unit: 'kg', description: 'Nacho corn chips', initial_quantity: 2, reorder_level: 0.7, days_of_stock: 7, cost_per_actual_unit: 200 },

        // Cheese Sauce
        { name: 'Cheese Sauce', category: 'Sauces / Toppings', sku: 'CHEESE-1KG', actual_unit: 'kg', description: 'Ready cheese sauce (for nachos/fries/sandwiches)', initial_quantity: 3, reorder_level: 1.0, days_of_stock: 7, cost_per_actual_unit: 400 },

        // Chili con Carne
        { name: 'Chili con Carne', category: 'Prepared / Proteins', sku: 'CHILI-1KG', actual_unit: 'kg', description: 'Chili con carne mix (for chili dog, nachos)', initial_quantity: 3, reorder_level: 1, days_of_stock: 7, cost_per_actual_unit: 300 },

        // French Fries
        { name: 'French Fries (frozen)', category: 'Frozen / Sides', sku: 'FRIES-1KG', actual_unit: 'kg', description: 'Frozen pre-cut fries', initial_quantity: 7, reorder_level: 2.5, days_of_stock: 7, cost_per_actual_unit: 120 },

        // Ube Mix / Syrup
        { name: 'Ube Mix / Ube Syrup', category: 'Syrups / Mixes', sku: 'UBE-SYRUP-1L', actual_unit: 'L', description: 'Ube flavoring syrup for lattes/fraps', initial_quantity: 2, reorder_level: 0.7, days_of_stock: 7, cost_per_actual_unit: 400 },

        // Toffee Nut / Butterscotch Syrup (both as separate SKUs if needed)
        { name: 'Toffee Nut Syrup', category: 'Syrups', sku: 'TF-SYR-1L', actual_unit: 'L', description: 'Flavour syrup for specialty lattes', initial_quantity: 1, reorder_level: 0.4, days_of_stock: 7, cost_per_actual_unit: 400 },
        { name: 'Butterscotch Syrup', category: 'Syrups', sku: 'BUTT-SYR-1L', actual_unit: 'L', description: 'Flavour syrup for specialty lattes', initial_quantity: 1, reorder_level: 0.4, days_of_stock: 7, cost_per_actual_unit: 400 },

        // Garlic white sauce
        { name: 'Garlic white sauce', category: 'Sauces', sku: 'GARLICWS-1KG', actual_unit: 'kg', description: 'Garlic white sauce / aioli', initial_quantity: 1.5, reorder_level: 0.5, days_of_stock: 7, cost_per_actual_unit: 300 },

        // Paper / disposables (admin can refine quantities later)
        { name: 'Straws (pack)', category: 'Consumables', sku: 'STRAW-100', actual_unit: 'pcs / pack', description: 'Packaging & disposables', initial_quantity: 0, reorder_level: 0, days_of_stock: 7, cost_per_actual_unit: 0 },
        { name: 'Lids (pack)', category: 'Consumables', sku: 'LID-100', actual_unit: 'pcs / pack', description: 'Packaging & disposables', initial_quantity: 0, reorder_level: 0, days_of_stock: 7, cost_per_actual_unit: 0 },
        { name: 'Napkins (pack)', category: 'Consumables', sku: 'NAP-100', actual_unit: 'pcs / pack', description: 'Packaging & disposables', initial_quantity: 0, reorder_level: 0, days_of_stock: 7, cost_per_actual_unit: 0 }
    ];

    let success = 0;
    let failed = 0;

    for (const ing of ingredients) {
        try {
            await inventoryService.createIngredient(ing);
            success += 1;
            console.log(`Added: ${ing.name} (${ing.sku})`);
        } catch (e) {
            failed += 1;
            console.error(`Failed: ${ing.name} (${ing.sku}) -> ${e.message}`);
        }
    }

    console.log(`\nDone. Success: ${success}, Failed: ${failed}`);
    process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
    console.error('Seed script fatal error:', err);
    process.exit(1);















