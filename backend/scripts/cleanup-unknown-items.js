const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cafe_management',
    port: process.env.DB_PORT || 3306
};

async function cleanupUnknownItems() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database successfully');

        // Get all orders with items
        const [orders] = await connection.execute(`
            SELECT id, items, order_time
            FROM orders 
            WHERE payment_status = 'paid'
            ORDER BY order_time DESC
        `);

        console.log(`\nProcessing ${orders.length} paid orders...`);

        let updatedOrders = 0;
        let totalItemsCleaned = 0;

        for (const order of orders) {
            try {
                const items = JSON.parse(order.items || '[]');
                let hasChanges = false;
                const cleanedItems = [];

                for (const item of items) {
                    const menuItemId = item.menu_item_id || item.menuItemId || item.id;

                    if (menuItemId) {
                        // Check if menu item still exists
                        const [menuItems] = await connection.execute(
                            'SELECT id, name FROM menu_items WHERE id = ?', [menuItemId]
                        );

                        if (menuItems.length === 0) {
                            // This menu item no longer exists - skip it
                            console.log(`Order ${order.id}: Removing deleted item "${item.name || `Item ${menuItemId}`}" (ID: ${menuItemId})`);
                            hasChanges = true;
                            totalItemsCleaned++;
                            continue; // Skip this item
                        }
                    }
                    
                    // Keep the item if it exists or has no ID
                    cleanedItems.push(item);
                }

                // Update the order if we removed any items
                if (hasChanges) {
                    await connection.execute(
                        'UPDATE orders SET items = ? WHERE id = ?',
                        [JSON.stringify(cleanedItems), order.id]
                    );
                    updatedOrders++;
                    console.log(`Order ${order.id}: Updated items from ${items.length} to ${cleanedItems.length}`);
                }
            } catch (error) {
                console.error(`Error processing order ${order.id}:`, error.message);
            }
        }

        console.log(`\n=== CLEANUP COMPLETE ===`);
        console.log(`Orders updated: ${updatedOrders}`);
        console.log(`Total items removed: ${totalItemsCleaned}`);

        // Verify cleanup
        console.log('\n=== VERIFICATION ===');
        const [verificationOrders] = await connection.execute(`
            SELECT id, items
            FROM orders 
            WHERE payment_status = 'paid'
            ORDER BY order_time DESC
            LIMIT 10
        `);

        let remainingUnknown = 0;
        for (const order of verificationOrders) {
            const items = JSON.parse(order.items || '[]');
            for (const item of items) {
                const menuItemId = item.menu_item_id || item.menuItemId || item.id;
                if (menuItemId) {
                    const [menuItems] = await connection.execute(
                        'SELECT id FROM menu_items WHERE id = ?',
                        [menuItemId]
                    );
                    if (menuItems.length === 0) {
                        remainingUnknown++;
                    }
                }
            }
        }

        console.log(`Remaining unknown items in recent orders: ${remainingUnknown}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Ask for confirmation before running
console.log('This script will remove references to deleted menu items from all orders.');
console.log('This action cannot be undone. Make sure you have a database backup.');
console.log('\nTo proceed, run: node scripts/cleanup-unknown-items.js --confirm');

if (process.argv.includes('--confirm')) {
    cleanupUnknownItems();
} else {
    console.log('\nRun with --confirm flag to proceed with cleanup.');
}


