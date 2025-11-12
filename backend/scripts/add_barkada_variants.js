const db = require('../config/db');

async function main() {
    const barkadaVariants = [{
            name: 'Classic Hotdog (Barkada)',
            description: 'Classic hotdog with sausage and bun - Barkada size',
            category: 'Sandwiches',
            base_price: 150.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Hotdog Sausages (regular)', quantity: 2, unit: 'pcs', actual_quantity: 160, actual_unit: 'g' },
                { name: 'Hotdog Buns', quantity: 2, unit: 'pcs', actual_quantity: 2, actual_unit: 'pcs' },
                { name: 'Mayonnaise', quantity: 20, unit: 'g', actual_quantity: 20, actual_unit: 'g' },
                { name: 'Ketchup', quantity: 20, unit: 'g', actual_quantity: 20, actual_unit: 'g' },
                { name: 'Mustard', quantity: 10, unit: 'g', actual_quantity: 10, actual_unit: 'g' }
            ]
        },
        {
            name: 'Hungarian Sausage (Barkada)',
            description: 'Hungarian sausage with cheese sauce - Barkada size',
            category: 'Sandwiches',
            base_price: 220.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Hungarian sausage', quantity: 2, unit: 'pcs', actual_quantity: 200, actual_unit: 'g' },
                { name: 'Hotdog Buns', quantity: 2, unit: 'pcs', actual_quantity: 2, actual_unit: 'pcs' },
                { name: 'Cheese Sauce', quantity: 40, unit: 'g', actual_quantity: 40, actual_unit: 'g' },
                { name: 'Ketchup', quantity: 20, unit: 'g', actual_quantity: 20, actual_unit: 'g' },
                { name: 'Mustard', quantity: 10, unit: 'g', actual_quantity: 10, actual_unit: 'g' }
            ]
        },
        {
            name: 'American Spicy Hotdog (Barkada)',
            description: 'Spicy sausage with chili con carne and cheese - Barkada size',
            category: 'Sandwiches',
            base_price: 200.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Spicy sausage', quantity: 2, unit: 'pcs', actual_quantity: 160, actual_unit: 'g' },
                { name: 'Hotdog Buns', quantity: 2, unit: 'pcs', actual_quantity: 2, actual_unit: 'pcs' },
                { name: 'Chili con Carne', quantity: 60, unit: 'g', actual_quantity: 60, actual_unit: 'g' },
                { name: 'Cheese Sauce', quantity: 40, unit: 'g', actual_quantity: 40, actual_unit: 'g' }
            ]
        },
        {
            name: 'Chili Dog (Barkada)',
            description: 'Hotdog with chili con carne and cheese sauce - Barkada size',
            category: 'Sandwiches',
            base_price: 180.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Hotdog Sausages (regular)', quantity: 2, unit: 'pcs', actual_quantity: 160, actual_unit: 'g' },
                { name: 'Hotdog Buns', quantity: 2, unit: 'pcs', actual_quantity: 2, actual_unit: 'pcs' },
                { name: 'Chili con Carne', quantity: 60, unit: 'g', actual_quantity: 60, actual_unit: 'g' },
                { name: 'Cheese Sauce', quantity: 30, unit: 'g', actual_quantity: 30, actual_unit: 'g' },
                { name: 'Fried onions', quantity: 10, unit: 'g', actual_quantity: 10, actual_unit: 'g' }
            ]
        }
    ];

    let success = 0;
    let failed = 0;

    for (const item of barkadaVariants) {
        try {
            // Insert menu item
            const [result] = await db.query(`
                INSERT INTO menu_items (
                    name, description, category, base_price, display_price,
                    is_available, allow_customization, visible_in_customer_menu,
                    visible_in_pos, is_customizable, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `, [
                item.name,
                item.description,
                item.category,
                item.base_price,
                item.base_price, // display_price same as base_price
                item.is_available,
                item.allow_customization,
                item.visible_in_customer_menu,
                item.visible_in_pos,
                item.is_customizable
            ]);

            const menuItemId = result.insertId;

            // Insert ingredients for this menu item
            if (item.ingredients && item.ingredients.length > 0) {
                for (const ingredient of item.ingredients) {
                    // Find the ingredient ID by name
                    const [ingredientRows] = await db.query(
                        'SELECT id FROM ingredients WHERE name = ?', [ingredient.name]
                    );

                    if (ingredientRows.length > 0) {
                        const ingredientId = ingredientRows[0].id;

                        // Insert menu item ingredient
                        await db.query(`
                            INSERT INTO menu_item_ingredients (
                                menu_item_id, ingredient_id, required_actual_amount,
                                required_display_amount, is_optional
                            ) VALUES (?, ?, ?, ?, ?)
                        `, [
                            menuItemId,
                            ingredientId,
                            ingredient.actual_quantity,
                            ingredient.actual_quantity, // display amount same as actual
                            false // not optional
                        ]);
                    } else {
                        console.warn(`Ingredient not found: ${ingredient.name} for menu item: ${item.name}`);
                    }
                }
            }

            success += 1;
            console.log(`Added: ${item.name} (${item.category}) - ₱${item.base_price}`);
        } catch (e) {
            failed += 1;
            console.error(`Failed: ${item.name} -> ${e.message}`);
        }
    }

    console.log(`\nDone. Success: ${success}, Failed: ${failed}`);
    process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
    console.error('Barkada variants script fatal error:', err);
    process.exit(1);
});

















































