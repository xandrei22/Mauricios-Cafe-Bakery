#!/usr/bin/env node

const db = require('../config/db');

async function testOrderData() {
    console.log('🔍 Testing Order Data Structure...\n');

    try {
        const connection = await db.getConnection();

        try {
            // Check the most recent orders
            const [orders] = await connection.query(`
                SELECT id, order_id, items, payment_status, created_at
                FROM orders 
                ORDER BY created_at DESC 
                LIMIT 5
            `);

            console.log(`Found ${orders.length} orders`);

            orders.forEach((order, index) => {
                console.log(`\n--- Order ${index + 1} ---`);
                console.log(`Order ID: ${order.order_id}`);
                console.log(`Database ID: ${order.id}`);
                console.log(`Payment Status: ${order.payment_status}`);
                console.log(`Items JSON: ${order.items}`);

                if (order.items) {
                    try {
                        const parsedItems = JSON.parse(order.items);
                        console.log('Parsed Items:');
                        console.log(JSON.stringify(parsedItems, null, 2));

                        if (parsedItems.length > 0) {
                            const firstItem = parsedItems[0];
                            console.log('First Item Keys:', Object.keys(firstItem));
                            console.log('First Item Values:', firstItem);
                        }
                    } catch (parseError) {
                        console.log('❌ Failed to parse items JSON:', parseError.message);
                    }
                } else {
                    console.log('❌ Items field is NULL or empty');
                }
            });

            // Check if there are any menu items with ingredients
            console.log('\n🔍 Checking menu item ingredients...');
            const [ingredients] = await connection.query(`
                SELECT mii.menu_item_id, mii.ingredient_id, mii.required_actual_amount,
                       i.name as ingredient_name, i.actual_quantity
                FROM menu_item_ingredients mii
                JOIN ingredients i ON mii.ingredient_id = i.id
                LIMIT 5
            `);

            if (ingredients.length > 0) {
                console.log(`✅ Found ${ingredients.length} ingredient mappings`);
                ingredients.forEach(ing => {
                    console.log(`Menu Item ID: ${ing.menu_item_id}, Ingredient: ${ing.ingredient_name}, Amount: ${ing.required_actual_amount}, Stock: ${ing.actual_quantity}`);
                });
            } else {
                console.log('❌ No ingredient mappings found');
            }

            // Check if there are any menu items at all
            console.log('\n🔍 Checking menu items...');
            const [menuItems] = await connection.query(`
                SELECT id, name, price, category
                FROM menu_items
                LIMIT 5
            `);

            if (menuItems.length > 0) {
                console.log(`✅ Found ${menuItems.length} menu items`);
                menuItems.forEach(item => {
                    console.log(`ID: ${item.id}, Name: ${item.name}, Price: ${item.price}, Category: ${item.category}`);
                });
            } else {
                console.log('❌ No menu items found');
            }

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test if this script is executed directly
if (require.main === module) {
    testOrderData()
        .then(() => {
            console.log('\n✅ Test completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Test failed:', error);
            process.exit(1);
        });
}


