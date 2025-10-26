const notificationService = require('./services/notificationService');

async function testNotificationFix() {
    try {
        console.log('🔍 Testing notification API fix...');
        
        // Test getting notifications for admin
        const notifications = await notificationService.getNotifications(1, 'admin', 10, 0);
        console.log(`\n✅ Found ${notifications.length} notifications for admin:`);
        
        notifications.forEach((notif, i) => {
            console.log(`${i+1}. [${notif.notification_type}] ${notif.title}`);
            console.log(`   Message: ${notif.message}`);
            console.log(`   Read: ${notif.is_read}, Created: ${notif.created_at}`);
            console.log('');
        });

        // Test unread count
        const unreadCount = await notificationService.getUnreadCount(1, 'admin');
        console.log(`📊 Unread notifications: ${unreadCount}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error testing notifications:', error.message);
        process.exit(1);
    }
}

testNotificationFix();














