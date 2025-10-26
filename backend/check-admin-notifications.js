const db = require('./config/db');

async function checkAdminNotifications() {
    try {
        const [rows] = await db.query(`
            SELECT id, title, message, notification_type, user_type, is_read, created_at 
            FROM notifications 
            WHERE user_type = 'admin' 
            ORDER BY created_at DESC 
            LIMIT 10
        `);

        console.log('Recent admin notifications:');
        rows.forEach((notif, i) => {
            console.log(`${i+1}. [${notif.notification_type}] ${notif.title}`);
            console.log(`   Message: ${notif.message}`);
            console.log(`   Read: ${notif.is_read}, Created: ${notif.created_at}`);
            console.log('');
        });

        // Check unread count
        const [unreadRows] = await db.query(`
            SELECT COUNT(*) as count 
            FROM notifications 
            WHERE user_type = 'admin' AND is_read = 0
        `);

        console.log(`Unread notifications: ${unreadRows[0].count}`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkAdminNotifications();














