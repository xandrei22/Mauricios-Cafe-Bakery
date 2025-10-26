#!/usr/bin/env node

const db = require('../config/db');

async function setupMenuRecipes() {
    console.log('🍳 Setting up Menu Item Ingredient Recipes...\n');

    try {
        const connection = await db.getConnection();

        try {
            // Check what we have
            console.log('🔍 Checking current setup...');

            // Check menu items
            const [menuItems] = await connection.query(`
                SELECT id, name, base_price, category FROM menu_items
            `);

            if (menuItems.length === 0) {
                console.log('❌ No menu items found. Create some menu items first.');
                return;
            }

            console.log(`✅ Found ${menuItems.length} menu items:`);
            menuItems.forEach(item => {
                console.log(`  - ID: ${item.id}, Name: ${item.name}, Price: ${item.base_price}, Category: ${item.category}`);
            });

            // Check ingredients
            const [ingredients] = await connection.query(`
                SELECT id, name, actual_quantity, actual_unit FROM ingredients
            `);

            if (ingredients.length === 0) {
                console.log('❌ No ingredients found. Add some ingredients first.');
                return;
            }

            console.log(`✅ Found ${ingredients.length} ingredients:`);
            ingredients.forEach(ing => {
                console.log(`  - ID: ${ing.id}, Name: ${ing.ingredient_name}, Stock: ${ing.actual_quantity} ${ing.actual_unit}`);
            });

            // Check existing recipes
            const [existingRecipes] = await connection.query(`
                SELECT mii.*, mi.name as menu_name, i.name as ingredient_name
                FROM menu_item_ingredients mii
                JOIN menu_items mi ON mii.menu_item_id = mi.id
                JOIN ingredients i ON mii.ingredient_id = i.id
            `);

            if (existingRecipes.length > 0) {
                console.log(`\n📋 Found ${existingRecipes.length} existing recipes:`);
                existingRecipes.forEach(recipe => {
                    console.log(`  - ${recipe.menu_name} uses ${recipe.ingredient_name} (${recipe.required_actual_amount} ${recipe.recipe_unit || 'units'})`);
                });
            } else {
                console.log('\n❌ No ingredient recipes found. Creating default recipes...');
            }

            // Create default recipes if none exist
            if (existingRecipes.length === 0) {
                console.log('\n🔧 Creating default ingredient recipes...');

                // Find coffee menu item
                const [coffeeItem] = await connection.query(`
                    SELECT id, name FROM menu_items WHERE LOWER(name) LIKE '%coffee%' LIMIT 1
                `);

                if (coffeeItem.length > 0) {
                    const coffeeId = coffeeItem[0].id;
                    console.log(`Found coffee item: ID ${coffeeId}`);

                    // Find sugar ingredient
                    const [sugarIngredient] = await connection.query(`
                        SELECT id, name, actual_unit FROM ingredients WHERE LOWER(name) LIKE '%sugar%' LIMIT 1
                    `);

                    if (sugarIngredient.length > 0) {
                        const sugarId = sugarIngredient[0].id;
                        const sugarUnit = sugarIngredient[0].actual_unit;

                        // Calculate amount based on unit
                        let sugarAmount = 0.01; // Default 10g
                        if (sugarUnit && sugarUnit.toLowerCase().includes('kg')) {
                            sugarAmount = 0.01; // 10g in kg
                        } else if (sugarUnit && sugarUnit.toLowerCase().includes('g')) {
                            sugarAmount = 10.0; // 10g
                        }

                        // Create coffee-sugar recipe
                        await connection.query(`
                            INSERT INTO menu_item_ingredients 
                            (menu_item_id, ingredient_id, required_actual_amount, required_display_amount, recipe_unit, is_optional)
                            VALUES (?, ?, ?, ?, ?, FALSE)
                        `, [coffeeId, sugarId, sugarAmount, sugarAmount, sugarUnit]);

                        console.log(`✅ Created recipe: Coffee uses ${sugarAmount} ${sugarUnit} of sugar`);
                    }

                    // Find coffee beans ingredient
                    const [coffeeBeans] = await connection.query(`
                        SELECT id, name, actual_unit FROM ingredients WHERE LOWER(name) LIKE '%coffee%' OR LOWER(name) LIKE '%bean%' LIMIT 1
                    `);

                    if (coffeeBeans.length > 0) {
                        const beansId = coffeeBeans[0].id;
                        const beansUnit = coffeeBeans[0].actual_unit;

                        // Calculate amount based on unit
                        let beansAmount = 0.018; // Default 18g (1 shot)
                        if (beansUnit && beansUnit.toLowerCase().includes('kg')) {
                            beansAmount = 0.018; // 18g in kg
                        } else if (beansUnit && beansUnit.toLowerCase().includes('g')) {
                            beansAmount = 18.0; // 18g
                        }

                        // Create coffee-beans recipe
                        await connection.query(`
                            INSERT INTO menu_item_ingredients 
                            (menu_item_id, ingredient_id, required_actual_amount, required_display_amount, recipe_unit, is_optional)
                            VALUES (?, ?, ?, ?, ?, FALSE)
                        `, [coffeeId, beansId, beansAmount, beansAmount, beansUnit]);

                        console.log(`✅ Created recipe: Coffee uses ${beansAmount} ${beansUnit} of coffee beans`);
                    }
                }

                // Check if we created any recipes
                const [newRecipes] = await connection.query(`
                    SELECT mii.*, mi.name as menu_name, i.name as ingredient_name
                    FROM menu_item_ingredients mii
                    JOIN menu_items mi ON mii.menu_item_id = mi.id
                    JOIN ingredients i ON mii.ingredient_id = i.id
                `);

                if (newRecipes.length > 0) {
                    console.log(`\n🎉 Successfully created ${newRecipes.length} ingredient recipes!`);
                    newRecipes.forEach(recipe => {
                        console.log(`  - ${recipe.menu_name} uses ${recipe.ingredient_name} (${recipe.required_actual_amount} ${recipe.recipe_unit || 'units'})`);
                    });
                } else {
                    console.log('\n❌ Failed to create any recipes. Check your menu items and ingredients.');
                }
            }

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('❌ Setup failed:', error);
    }
}

// Run the setup if this script is executed directly
if (require.main === module) {
    setupMenuRecipes()
        .then(() => {
            console.log('\n✅ Menu recipe setup completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Menu recipe setup failed:', error);
            process.exit(1);
        });
}

module.exports = { setupMenuRecipes };