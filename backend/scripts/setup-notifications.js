const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupNotifications() {
    let connection;
    
    try {
        // Create database connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'coffee_shop',
            multipleStatements: true
        });

        console.log('🔗 Connected to database');

        // Read and execute the notifications schema
        const schemaPath = path.join(__dirname, '../config/notifications-schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        console.log('📄 Executing notifications schema...');
        await connection.execute(schema);
        
        console.log('✅ Notifications schema executed successfully!');
        console.log('📋 Created tables:');
        console.log('   - notifications');
        console.log('   - notification_preferences');
        console.log('   - notification_delivery_log');
        console.log('   - Default notification preferences for all users');
        
        console.log('\n🎉 Notification system setup complete!');
        console.log('\n📝 Next steps:');
        console.log('   1. Restart your backend server');
        console.log('   2. The notification system will automatically work with:');
        console.log('      - New orders');
        console.log('      - Low stock alerts');
        console.log('      - Event requests');
        console.log('      - Order status updates');
        console.log('      - Payment updates');
        console.log('   3. Email notifications will be sent if EMAIL_USER and EMAIL_PASSWORD are configured');

    } catch (error) {
        console.error('❌ Error setting up notifications:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run the setup
setupNotifications();














