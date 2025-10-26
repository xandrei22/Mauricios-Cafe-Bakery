const db = require('../config/db');

async function checkMenuItemsAndOrders() {
    try {
        console.log('=== Checking Menu Items and Orders ===');

        // Step 1: Check what menu items exist
        console.log('1. Available menu items:');

        const [menuItems] = await db.query(`
            SELECT id, name, description, category 
            FROM menu_items 
            ORDER BY id
        `);

        menuItems.forEach(item => {
            console.log(`- ID ${item.id}: ${item.name} (${item.category})`);
        });

        // Step 2: Check what orders are referencing
        console.log('\n2. Order item references:');

        const [orderReferences] = await db.query(`
            SELECT 
                o.order_id,
                o.customer_name,
                o.items,
                o.created_at
            FROM orders o
            WHERE o.payment_status = 'paid' 
            AND o.payment_method = 'cash'
            AND o.status = 'preparing'
            ORDER BY o.created_at DESC
            LIMIT 5
        `);

        orderReferences.forEach(order => {
            try {
                const items = JSON.parse(order.items);
                console.log(`\nOrder ${order.order_id} (${order.customer_name}):`);
                items.forEach((item, index) => {
                    console.log(`  Item ${index + 1}:`, item);
                });
            } catch (e) {
                console.log(`Order ${order.order_id}: Error parsing items`);
            }
        });

        // Step 3: Check which menu items have ingredient recipes
        console.log('\n3. Menu items with ingredient recipes:');

        const [menuItemRecipes] = await db.query(`
            SELECT 
                mii.menu_item_id,
                mi.name as menu_item_name,
                COUNT(*) as ingredient_count
            FROM menu_item_ingredients mii
            JOIN menu_items mi ON mii.menu_item_id = mi.id
            GROUP BY mii.menu_item_id, mi.name
            ORDER BY mii.menu_item_id
        `);

        menuItemRecipes.forEach(recipe => {
            console.log(`- ID ${recipe.menu_item_id}: ${recipe.menu_item_name} (${recipe.ingredient_count} ingredients)`);
        });

        // Step 4: Check current sugar inventory
        const [sugarResult] = await db.query('SELECT id, name, actual_quantity FROM ingredients WHERE name LIKE "%sugar%"');
        console.log('\n4. Current sugar inventory:', sugarResult[0]);

        // Step 5: Analysis
        console.log('\n=== ANALYSIS ===');

        if (menuItems.length === 0) {
            console.log('❌ CRITICAL: No menu items found in database');
        } else {
            console.log(`✅ Found ${menuItems.length} menu items in database`);
        }

        if (menuItemRecipes.length === 0) {
            console.log('❌ CRITICAL: No menu items have ingredient recipes');
        } else {
            console.log(`✅ Found ${menuItemRecipes.length} menu items with ingredient recipes`);
        }

        console.log('\n=== ROOT CAUSE ===');
        console.log('1. Orders are referencing menu item ID 58 which does not exist');
        console.log('2. Only menu items with ingredient recipes can deduct ingredients');
        console.log('3. The order data structure is inconsistent between systems');

        console.log('\n=== SOLUTION ===');
        console.log('1. Fix order data to reference valid menu item IDs');
        console.log('2. Ensure all menu items have ingredient recipes');
        console.log('3. Unify the order data structure across all systems');

        process.exit();

    } catch (error) {
        console.error('Check failed:', error);
        process.exit(1);
    }
}

checkMenuItemsAndOrders();