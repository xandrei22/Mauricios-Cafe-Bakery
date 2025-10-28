const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cafe_management',
    port: process.env.DB_PORT || 3306
};

async function checkUnknownItems() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database successfully');

        // Check orders with items that reference non-existent menu items
        const [orders] = await connection.execute(`
            SELECT id, items, order_time, customer_name
            FROM orders 
            WHERE payment_status = 'paid'
            ORDER BY order_time DESC
            LIMIT 50
        `);

        console.log(`\nFound ${orders.length} recent paid orders`);

        const unknownItems = new Map();
        let totalUnknownCount = 0;

        for (const order of orders) {
            try {
                const items = JSON.parse(order.items || '[]');

                for (const item of items) {
                    const menuItemId = item.menu_item_id || item.menuItemId || item.id;

                    if (menuItemId) {
                        // Check if menu item still exists
                        const [menuItems] = await connection.execute(
                            'SELECT id, name FROM menu_items WHERE id = ?', [menuItemId]
                        );

                        if (menuItems.length === 0) {
                            // This menu item no longer exists
                            const itemName = item.name || `Deleted Item ${menuItemId}`;
                            const count = unknownItems.get(itemName) || 0;
                            unknownItems.set(itemName, count + (item.quantity || 1));
                            totalUnknownCount += (item.quantity || 1);

                            console.log(`Order ${order.id} (${order.order_time}): Contains deleted item "${itemName}" (ID: ${menuItemId})`);
                        }
                    } else if (!item.name) {
                        // Item has no name and no ID
                        const itemName = 'Unknown Item';
                        const count = unknownItems.get(itemName) || 0;
                        unknownItems.set(itemName, count + (item.quantity || 1));
                        totalUnknownCount += (item.quantity || 1);

                        console.log(`Order ${order.id} (${order.order_time}): Contains unnamed item`);
                    }
                }
            } catch (error) {
                console.error(`Error parsing items for order ${order.id}:`, error.message);
            }
        }

        console.log(`\n=== SUMMARY ===`);
        console.log(`Total unknown/deleted items found: ${totalUnknownCount}`);
        console.log(`Unique unknown items: ${unknownItems.size}`);

        if (unknownItems.size > 0) {
            console.log('\nUnknown items breakdown:');
            for (const [itemName, count] of unknownItems.entries()) {
                console.log(`  - ${itemName}: ${count} orders`);
            }
        }

        // Check current menu items count
        const [menuItems] = await connection.execute('SELECT COUNT(*) as count FROM menu_items');
        console.log(`\nCurrent active menu items: ${menuItems[0].count}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkUnknownItems();




