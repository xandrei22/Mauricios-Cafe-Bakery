const db = require('./config/db');

async function checkNotifications() {
    try {
        const [rows] = await db.query(`
            SELECT id, title, message, data, created_at 
            FROM notifications 
            WHERE user_type = 'admin' 
            AND notification_type = 'low_stock' 
            ORDER BY created_at DESC 
            LIMIT 5
        `);

        console.log('Recent low stock notifications:');
        rows.forEach((notif, i) => {
            const data = JSON.parse(notif.data || '{}');
            console.log(`${i+1}. [${notif.created_at}] ${notif.title}`);
            console.log(`   Message: ${notif.message}`);
            console.log(`   Data: Critical=${data.criticalCount}, Low=${data.lowStockCount}, Total=${data.totalCount}`);
            console.log('');
        });

        // Also check current low stock items
        const [lowStockItems] = await db.query(`
            SELECT 
                name,
                actual_quantity,
                reorder_level,
                actual_unit
            FROM ingredients 
            WHERE is_available = TRUE 
            AND actual_quantity <= reorder_level
            ORDER BY actual_quantity ASC
        `);

        console.log(`\nCurrent low stock items in database: ${lowStockItems.length}`);
        const critical = lowStockItems.filter(item => item.actual_quantity <= 0);
        const low = lowStockItems.filter(item => item.actual_quantity > 0);
        
        console.log(`- Critical (out of stock): ${critical.length}`);
        console.log(`- Low stock: ${low.length}`);
        console.log(`- Total: ${lowStockItems.length}`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkNotifications();














