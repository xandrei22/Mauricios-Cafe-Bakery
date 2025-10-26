const db = require('../config/db');

async function checkInventory() {
    try {
        console.log('=== Current Inventory Status ===');

        // Check sugar inventory
        const [sugarResult] = await db.query('SELECT id, name, actual_quantity FROM ingredients WHERE name LIKE "%sugar%"');
        console.log('Sugar inventory:', sugarResult[0]);

        // Check recent orders
        const [recentOrders] = await db.query(`
            SELECT id, order_id, customer_name, status, payment_status, payment_method, created_at 
            FROM orders 
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        console.log('\nRecent orders:');
        recentOrders.forEach(order => {
            console.log(`- ${order.order_id}: ${order.customer_name} (${order.status}, ${order.payment_status}, ${order.payment_method}) - ${order.created_at}`);
        });

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

