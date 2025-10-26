const db = require('../config/db');
const fs = require('fs');
const path = require('path');

async function setupIngredientDeduction() {
    console.log('🚀 Setting up Ingredient Deduction System...');

    try {
        // Read the SQL schema file
        const schemaPath = path.join(__dirname, '../config/ingredient-deduction-schema.sql');
        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

        // Split the SQL into individual statements
        const statements = schemaSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        console.log(`📋 Found ${statements.length} SQL statements to execute`);

        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.trim()) {
                try {
                    await db.query(statement);
                    console.log(`✅ Executed statement ${i + 1}/${statements.length}`);
                } catch (error) {
                    // Some statements might fail if tables already exist, that's okay
                    if (error.code === 'ER_TABLE_EXISTS_ERROR' ||
                        error.code === 'ER_DUP_KEYNAME' ||
                        error.code === 'ER_DUP_FIELDNAME') {
                        console.log(`⚠️  Statement ${i + 1} skipped (already exists): ${error.message}`);
                    } else {
                        console.error(`❌ Error executing statement ${i + 1}:`, error.message);
                    }
                }
            }
        }

        // Verify the setup
        await verifySetup();

        console.log('🎉 Ingredient Deduction System setup completed successfully!');

    } catch (error) {
        console.error('❌ Failed to setup Ingredient Deduction System:', error);
        throw error;
    }
}

async function verifySetup() {
    console.log('🔍 Verifying setup...');

    try {
        // Check if required tables exist
        const requiredTables = [
            'inventory_transactions',
            'low_stock_alerts',
            'menu_item_ingredients',
            'order_ingredient_usage'
        ];

        for (const table of requiredTables) {
            const [result] = await db.query(`SHOW TABLES LIKE '${table}'`);
            if (result.length > 0) {
                console.log(`✅ Table '${table}' exists`);
            } else {
                console.log(`❌ Table '${table}' is missing`);
            }
        }

        // Check if views exist
        const [views] = await db.query("SHOW FULL TABLES WHERE Table_type = 'VIEW'");
        const viewNames = views.map(v => Object.values(v)[0]);

        if (viewNames.includes('ingredient_usage_summary')) {
            console.log('✅ View "ingredient_usage_summary" exists');
        } else {
            console.log('❌ View "ingredient_usage_summary" is missing');
        }

        if (viewNames.includes('order_ingredient_summary')) {
            console.log('✅ View "order_ingredient_summary" exists');
        } else {
            console.log('❌ View "order_ingredient_summary" is missing');
        }

        // Check if sample data exists
        const [ingredientCount] = await db.query('SELECT COUNT(*) as count FROM ingredients');
        console.log(`📊 Found ${ingredientCount[0].count} ingredients in database`);

        const [menuItemCount] = await db.query('SELECT COUNT(*) as count FROM menu_items');
        console.log(`🍽️  Found ${menuItemCount[0].count} menu items in database`);

        const [recipeCount] = await db.query('SELECT COUNT(*) as count FROM menu_item_ingredients');
        console.log(`📝 Found ${recipeCount[0].count} recipe ingredients in database`);

        // Check if orders table has the new columns
        try {
            const [orderColumns] = await db.query(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'orders' 
                AND COLUMN_NAME IN ('ingredient_deduction_status', 'ingredient_deduction_notes')
            `);

            if (orderColumns.length === 2) {
                console.log('✅ Orders table has ingredient deduction columns');
            } else {
                console.log('⚠️  Orders table missing some ingredient deduction columns');
            }
        } catch (error) {
            console.log('⚠️  Could not verify orders table columns:', error.message);
        }

    } catch (error) {
        console.error('❌ Error during verification:', error);
    }
}

async function createSampleRecipes() {
    console.log('🍳 Creating sample recipes...');

    try {
        // Get some sample ingredients and menu items
        const [ingredients] = await db.query('SELECT id, name FROM ingredients LIMIT 10');
        const [menuItems] = await db.query('SELECT id, name FROM menu_items LIMIT 10');

        if (ingredients.length === 0 || menuItems.length === 0) {
            console.log('⚠️  No ingredients or menu items found, skipping recipe creation');
            return;
        }

        // Create some sample recipes
        const sampleRecipes = [
            // Coffee recipes
            { menuItemId: 1, ingredientId: 1, quantity: 18, unit: 'g' }, // Espresso: 18g coffee
            { menuItemId: 1, ingredientId: 2, quantity: 30, unit: 'ml' }, // Espresso: 30ml water
            { menuItemId: 2, ingredientId: 1, quantity: 18, unit: 'g' }, // Americano: 18g coffee
            { menuItemId: 2, ingredientId: 2, quantity: 150, unit: 'ml' }, // Americano: 150ml water
            { menuItemId: 3, ingredientId: 1, quantity: 18, unit: 'g' }, // Cappuccino: 18g coffee
            { menuItemId: 3, ingredientId: 2, quantity: 30, unit: 'ml' }, // Cappuccino: 30ml water
            { menuItemId: 3, ingredientId: 3, quantity: 120, unit: 'ml' }, // Cappuccino: 120ml milk
        ];

        for (const recipe of sampleRecipes) {
            try {
                await db.query(`
                    INSERT IGNORE INTO menu_item_ingredients 
                    (menu_item_id, ingredient_id, quantity, unit) 
                    VALUES (?, ?, ?, ?)
                `, [recipe.menuItemId, recipe.ingredientId, recipe.quantity, recipe.unit]);
            } catch (error) {
                if (error.code !== 'ER_DUP_ENTRY') {
                    console.error(`❌ Error creating recipe:`, error.message);
                }
            }
        }

        console.log(`✅ Created ${sampleRecipes.length} sample recipes`);

    } catch (error) {
        console.error('❌ Error creating sample recipes:', error);
    }
}

// Run the setup if this file is executed directly
if (require.main === module) {
    setupIngredientDeduction()
        .then(() => {
            console.log('🎯 Setup completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Setup failed:', error);
            process.exit(1);
        });
}

module.exports = {
    setupIngredientDeduction,
    verifySetup,
    createSampleRecipes
};
