const mysql = require('mysql2/promise');
require('dotenv').config();

async function testNotifications() {
    let connection;
    
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'coffee_shop'
        });

        console.log('🔗 Connected to database');

        // Check if notifications table exists
        const [tables] = await connection.query('SHOW TABLES LIKE "notifications"');
        console.log('📋 Notifications table exists:', tables.length > 0);

        if (tables.length > 0) {
            // Check table structure
            const [columns] = await connection.query('DESCRIBE notifications');
            console.log('📊 Notifications table columns:');
            columns.forEach(col => {
                console.log(`   - ${col.Field}: ${col.Type}`);
            });

            // Check if there are any notifications
            const [notifications] = await connection.query('SELECT COUNT(*) as count FROM notifications');
            console.log(`📬 Total notifications: ${notifications[0].count}`);

            // Check notification preferences
            const [prefs] = await connection.query('SELECT COUNT(*) as count FROM notification_preferences');
            console.log(`⚙️  Notification preferences: ${prefs[0].count}`);
        } else {
            console.log('❌ Notifications table does not exist. Please run the setup script first.');
        }

    } catch (error) {
        console.error('❌ Error testing notifications:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

testNotifications();














