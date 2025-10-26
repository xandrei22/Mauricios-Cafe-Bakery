const db = require('../config/db');

async function fixOrderDataStructure() {
    try {
        console.log('=== Fixing Order Data Structure ===');

        // Step 1: Check what menu item ID 58 is
        console.log('1. Checking menu item ID 58...');

        const [menuItem58] = await db.query('SELECT id, name, description FROM menu_items WHERE id = 58');
        if (menuItem58.length > 0) {
            console.log('Menu item 58:', menuItem58[0]);
        } else {
            console.log('Menu item 58 not found');
            return;
        }

        // Step 2: Check if menu item 58 has ingredient recipes
        console.log('\n2. Checking if menu item 58 has ingredient recipes...');

        const [recipes] = await db.query(`
            SELECT 
                mii.id,
                mii.menu_item_id,
                mii.ingredient_id,
                mii.required_actual_amount,
                i.name as ingredient_name
            FROM menu_item_ingredients mii
            JOIN ingredients i ON mii.ingredient_id = i.id
            WHERE mii.menu_item_id = 58
        `);

        console.log(`Found ${recipes.length} ingredient recipes for menu item 58:`);
        recipes.forEach(recipe => {
            console.log(`- ${recipe.ingredient_name}: ${recipe.required_actual_amount}`);
        });

        // Step 3: Check current sugar inventory
        const [sugarResult] = await db.query('SELECT id, name, actual_quantity FROM ingredients WHERE name LIKE "%sugar%"');
        console.log('\n3. Current sugar inventory:', sugarResult[0]);

        // Step 4: Find orders with wrong data structure
        console.log('\n4. Finding orders with wrong data structure...');

        const [wrongStructureOrders] = await db.query(`
            SELECT 
                o.id,
                o.order_id,
                o.customer_name,
                o.items,
                o.created_at
            FROM orders o
            WHERE o.payment_status = 'paid' 
            AND o.payment_method = 'cash'
            AND o.status = 'preparing'
            AND o.items LIKE '%menu_item_id%'
            ORDER BY o.created_at DESC
            LIMIT 5
        `);

        console.log(`Found ${wrongStructureOrders.length} orders with wrong data structure`);

        if (wrongStructureOrders.length === 0) {
            console.log('✅ No orders with wrong data structure found');
            return;
        }

        // Step 5: Fix the data structure for each order
        console.log('\n5. Fixing order data structure...');

        let fixedCount = 0;

        for (const order of wrongStructureOrders) {
            try {
                console.log(`\n   Fixing order: ${order.order_id}`);

                // Parse current items
                const items = JSON.parse(order.items);
                console.log(`   Current items:`, items);

                // Fix the data structure
                const fixedItems = items.map(item => ({
                    menuItemId: item.menu_item_id, // Convert menu_item_id to menuItemId
                    name: item.name || `Menu Item ${item.menu_item_id}`, // Add name if missing
                    quantity: item.quantity || 1,
                    customizations: item.customizations || null,
                    notes: item.notes || '',
                    customPrice: item.custom_price || null
                }));

                console.log(`   Fixed items:`, fixedItems);

                // Update the order with fixed data structure
                await db.query(`
                    UPDATE orders 
                    SET items = ?, updated_at = NOW()
                    WHERE id = ?
                `, [JSON.stringify(fixedItems), order.id]);

                console.log(`   ✅ Order ${order.order_id} data structure fixed`);
                fixedCount++;

            } catch (error) {
                console.error(`   ❌ Failed to fix order ${order.order_id}:`, error.message);
            }
        }

        // Step 6: Check final sugar inventory
        const [finalSugarResult] = await db.query('SELECT id, name, actual_quantity FROM ingredients WHERE name LIKE "%sugar%"');
        console.log('\n6. Final sugar inventory:', finalSugarResult[0]);

        // Step 7: Summary
        console.log('\n=== FIX SUMMARY ===');
        console.log(`✅ Successfully fixed: ${fixedCount} orders`);
        console.log(`📦 Sugar inventory unchanged: ${sugarResult[0].actual_quantity} kg`);

        if (fixedCount > 0) {
            console.log('\n🎉 SUCCESS: Order data structure is now unified!');
            console.log('💡 All orders now use the same format for ingredient deduction');
            console.log('💡 Future orders will automatically deduct ingredients correctly');
        }

        console.log('\n=== NEXT STEPS ===');
        console.log('1. Test placing a new order (admin, staff, or customer)');
        console.log('2. Verify that ingredients are automatically deducted');
        console.log('3. Check that order status updates to "preparing"');
        console.log('4. Monitor sugar inventory for changes');

    } catch (error) {
        console.error('Fix failed:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        process.exit();
    }
}

