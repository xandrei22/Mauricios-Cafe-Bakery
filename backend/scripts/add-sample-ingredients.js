const db = require('../config/db');

const sampleIngredients = [
    // Milk types
    { name: 'Regular Milk', category: 'Milk', sku: 'MILK-REG-001', actual_unit: 'ml', display_unit: 'ml', cost_per_actual_unit: 0.05, visible_in_customization: true },
    { name: 'Almond Milk', category: 'Milk', sku: 'MILK-ALM-002', actual_unit: 'ml', display_unit: 'ml', cost_per_actual_unit: 0.08, visible_in_customization: true },
    { name: 'Oat Milk', category: 'Milk', sku: 'MILK-OAT-003', actual_unit: 'ml', display_unit: 'ml', cost_per_actual_unit: 0.07, visible_in_customization: true },
    { name: 'Soy Milk', category: 'Milk', sku: 'MILK-SOY-004', actual_unit: 'ml', display_unit: 'ml', cost_per_actual_unit: 0.06, visible_in_customization: true },
    { name: 'Coconut Milk', category: 'Milk', sku: 'MILK-COC-005', actual_unit: 'ml', display_unit: 'ml', cost_per_actual_unit: 0.09, visible_in_customization: true },

    // Sweeteners
    { name: 'Sugar', category: 'Sweetener', sku: 'SWEET-SUG-001', actual_unit: 'g', display_unit: 'g', cost_per_actual_unit: 0.02, visible_in_customization: true },
    { name: 'Vanilla Syrup', category: 'Sweetener', sku: 'SWEET-VAN-002', actual_unit: 'ml', display_unit: 'pump', cost_per_actual_unit: 0.15, visible_in_customization: true },
    { name: 'Caramel Syrup', category: 'Sweetener', sku: 'SWEET-CAR-003', actual_unit: 'ml', display_unit: 'pump', cost_per_actual_unit: 0.18, visible_in_customization: true },
    { name: 'Chocolate Syrup', category: 'Sweetener', sku: 'SWEET-CHO-004', actual_unit: 'ml', display_unit: 'pump', cost_per_actual_unit: 0.20, visible_in_customization: true },
    { name: 'Honey', category: 'Sweetener', sku: 'SWEET-HON-005', actual_unit: 'g', display_unit: 'g', cost_per_actual_unit: 0.25, visible_in_customization: true },

    // Toppings
    { name: 'Whipped Cream', category: 'Topping', sku: 'TOP-WHIP-001', actual_unit: 'g', display_unit: 'serving', cost_per_actual_unit: 0.30, visible_in_customization: true },
    { name: 'Chocolate Chips', category: 'Topping', sku: 'TOP-CHIP-002', actual_unit: 'g', display_unit: 'serving', cost_per_actual_unit: 0.25, visible_in_customization: true },
    { name: 'Cinnamon Powder', category: 'Topping', sku: 'TOP-CIN-003', actual_unit: 'g', display_unit: 'dash', cost_per_actual_unit: 0.10, visible_in_customization: true },
    { name: 'Cocoa Powder', category: 'Topping', sku: 'TOP-COC-004', actual_unit: 'g', display_unit: 'dash', cost_per_actual_unit: 0.12, visible_in_customization: true },

    // Spices
    { name: 'Cinnamon', category: 'Spice', sku: 'SPICE-CIN-001', actual_unit: 'g', display_unit: 'dash', cost_per_actual_unit: 0.05, visible_in_customization: true },
    { name: 'Nutmeg', category: 'Spice', sku: 'SPICE-NUT-002', actual_unit: 'g', display_unit: 'dash', cost_per_actual_unit: 0.08, visible_in_customization: true },
    { name: 'Cardamom', category: 'Spice', sku: 'SPICE-CAR-003', actual_unit: 'g', display_unit: 'dash', cost_per_actual_unit: 0.15, visible_in_customization: true },

    // Extras
    { name: 'Extra Shot', category: 'Extra', sku: 'EXTRA-SHOT-001', actual_unit: 'shot', display_unit: 'shot', cost_per_actual_unit: 0.50, visible_in_customization: true },
    { name: 'Decaf Shot', category: 'Extra', sku: 'EXTRA-DECAF-002', actual_unit: 'shot', display_unit: 'shot', cost_per_actual_unit: 0.45, visible_in_customization: true },
    { name: 'Ice', category: 'Extra', sku: 'EXTRA-ICE-003', actual_unit: 'g', display_unit: 'serving', cost_per_actual_unit: 0.01, visible_in_customization: true },

    // Flavors
    { name: 'Vanilla Extract', category: 'Flavor', sku: 'FLAVOR-VAN-001', actual_unit: 'ml', display_unit: 'dash', cost_per_actual_unit: 0.20, visible_in_customization: true },
    { name: 'Mint Extract', category: 'Flavor', sku: 'FLAVOR-MINT-002', actual_unit: 'ml', display_unit: 'dash', cost_per_actual_unit: 0.25, visible_in_customization: true },
    { name: 'Orange Extract', category: 'Flavor', sku: 'FLAVOR-ORANGE-003', actual_unit: 'ml', display_unit: 'dash', cost_per_actual_unit: 0.22, visible_in_customization: true }
];

async function addSampleIngredients() {
    try {
        console.log('Adding sample ingredients to database...');

        for (const ingredient of sampleIngredients) {
            try {
                // Check if ingredient already exists
                const [existing] = await db.query(
                    'SELECT id FROM ingredients WHERE name = ? AND category = ?', [ingredient.name, ingredient.category]
                );

                if (existing.length > 0) {
                    console.log(`Ingredient "${ingredient.name}" already exists, skipping...`);
                    continue;
                }

                // Insert new ingredient
                await db.query(`
                    INSERT INTO ingredients (
                        name, 
                        category, 
                        sku,
                        actual_unit, 
                        display_unit, 
                        cost_per_actual_unit, 
                        visible_in_customization,
                        is_available,
                        created_at,
                        updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                `, [
                    ingredient.name,
                    ingredient.category,
                    ingredient.sku,
                    ingredient.actual_unit,
                    ingredient.display_unit,
                    ingredient.cost_per_actual_unit,
                    ingredient.visible_in_customization,
                    true
                ]);

                console.log(`Added ingredient: ${ingredient.name} (${ingredient.category})`);
            } catch (error) {
                console.error(`Error adding ingredient ${ingredient.name}:`, error);
            }
        }

        console.log('Sample ingredients added successfully!');

        // Show current ingredients count
        const [count] = await db.query('SELECT COUNT(*) as count FROM ingredients WHERE visible_in_customization = TRUE');
        console.log(`Total ingredients available for customization: ${count[0].count}`);

    } catch (error) {
        console.error('Error adding sample ingredients:', error);
    } finally {
        process.exit(0);
    }
}

addSampleIngredients();