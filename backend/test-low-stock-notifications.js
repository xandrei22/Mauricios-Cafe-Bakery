const db = require('./config/db');
const notificationService = require('./services/notificationService');

async function testLowStockNotifications() {
    try {
        console.log('🔍 Checking for low stock items...');
        
        // Get low stock items
        const [lowStockItems] = await db.query(`
            SELECT 
                id,
                name,
                actual_quantity,
                reorder_level,
                actual_unit,
                display_unit,
                category
            FROM ingredients 
            WHERE is_available = TRUE 
            AND actual_quantity <= reorder_level
            ORDER BY (actual_quantity / reorder_level) ASC
            LIMIT 10
        `);

        console.log(`Found ${lowStockItems.length} low stock items:`);
        lowStockItems.forEach(item => {
            console.log(`- ${item.name}: ${item.actual_quantity} ${item.actual_unit} (reorder: ${item.reorder_level})`);
        });

        if (lowStockItems.length > 0) {
            // Group items by severity
            const criticalItems = lowStockItems.filter(item => item.actual_quantity <= 0);
            const lowStockItems_filtered = lowStockItems.filter(item => item.actual_quantity > 0);

            // Create notification data
            const allItems = lowStockItems.map(item => ({
                name: item.name,
                quantity: item.actual_quantity,
                unit: item.actual_unit,
                reorderLevel: item.reorder_level,
                category: item.category,
                status: item.actual_quantity <= 0 ? 'out_of_stock' : 'low_stock'
            }));

            let title = 'Inventory Alert';
            let message = '';
            let priority = 'medium';

            if (criticalItems.length > 0 && lowStockItems_filtered.length > 0) {
                title = 'Critical & Low Stock Alert';
                message = `${criticalItems.length} item(s) are out of stock and ${lowStockItems_filtered.length} item(s) are running low`;
                priority = 'urgent';
            } else if (criticalItems.length > 0) {
                title = 'Critical Stock Alert';
                message = `${criticalItems.length} item(s) are out of stock`;
                priority = 'urgent';
            } else {
                title = 'Low Stock Alert';
                message = `${lowStockItems_filtered.length} item(s) are running low on stock`;
                priority = 'high';
            }

            // Create notification for admin
            console.log('\n📱 Creating notification for admin...');
            await notificationService.createNotification({
                type: 'low_stock',
                title: title,
                message: message,
                data: {
                    items: allItems,
                    criticalCount: criticalItems.length,
                    lowStockCount: lowStockItems_filtered.length,
                    totalCount: lowStockItems.length
                },
                userType: 'admin',
                priority: priority
            });

            console.log('✅ Low stock notification created for admin');

            // Check if notification was created
            const [notifications] = await db.query(`
                SELECT id, title, message, notification_type, user_type, created_at 
                FROM notifications 
                WHERE user_type = 'admin' 
                ORDER BY created_at DESC 
                LIMIT 3
            `);

            console.log('\n📋 Recent admin notifications:');
            notifications.forEach(notif => {
                console.log(`- [${notif.notification_type}] ${notif.title}: ${notif.message} (${notif.created_at})`);
            });

        } else {
            console.log('✅ No low stock items found');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

testLowStockNotifications();














