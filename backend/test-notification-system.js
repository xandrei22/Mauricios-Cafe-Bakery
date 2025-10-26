const scheduledNotificationService = require('./services/scheduledNotificationService');
const notificationService = require('./services/notificationService');

async function testNotificationSystem() {
    console.log('🧪 Testing Notification System...\n');

    try {
        // Test 1: Check service status
        console.log('1. Checking service status...');
        const status = scheduledNotificationService.getStatus();
        console.log('Service Status:', JSON.stringify(status, null, 2));

        // Test 2: Manually trigger critical stock check
        console.log('\n2. Testing critical stock check...');
        await scheduledNotificationService.triggerCriticalCheck();

        // Test 3: Manually trigger low stock check
        console.log('\n3. Testing low stock check...');
        await scheduledNotificationService.triggerLowStockCheck();

        // Test 4: Test fallback mechanism
        console.log('\n4. Testing fallback mechanism...');
        await scheduledNotificationService.checkAndSendMissedNotifications();

        // Test 5: Create a test notification
        console.log('\n5. Creating test notification...');
        const testNotification = await notificationService.createNotification({
            type: 'low_stock',
            title: 'Test Critical Stock Alert',
            message: 'This is a test notification to verify the system is working',
            data: {
                test: true,
                items: [
                    { name: 'Test Item 1', current: 0, reorder: 10 },
                    { name: 'Test Item 2', current: 5, reorder: 20 }
                ]
            },
            userId: 1, // Assuming admin user ID is 1
            userType: 'admin',
            priority: 'urgent'
        });

        console.log('Test notification created:', testNotification.id);

        console.log('\n✅ Notification system test completed successfully!');
        console.log('\n📋 Next steps:');
        console.log('1. Check your email for notifications');
        console.log('2. Check the admin dashboard for in-app notifications');
        console.log('3. Verify the notification icon shows new notifications');

    } catch (error) {
        console.error('❌ Error testing notification system:', error);
    }
}

// Run the test
testNotificationSystem().then(() => {
    console.log('\n🏁 Test completed');
    process.exit(0);
}).catch(error => {
    console.error('💥 Test failed:', error);
    process.exit(1);
});