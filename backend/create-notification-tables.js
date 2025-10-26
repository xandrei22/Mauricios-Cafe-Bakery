const db = require('./config/db');

async function createTables() {
    try {
        console.log('Creating notifications table...');
        
        await db.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NULL,
                user_type ENUM('admin', 'staff', 'customer') NULL,
                notification_type ENUM('new_order', 'order_update', 'payment_update', 'low_stock', 'event_request', 'system_alert', 'loyalty_update') NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                data JSON NULL,
                is_read BOOLEAN DEFAULT FALSE,
                is_email_sent BOOLEAN DEFAULT FALSE,
                priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
                expires_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id),
                INDEX idx_user_type (user_type),
                INDEX idx_notification_type (notification_type),
                INDEX idx_is_read (is_read),
                INDEX idx_priority (priority),
                INDEX idx_created_at (created_at),
                INDEX idx_expires_at (expires_at)
            )
        `);
        
        console.log('Creating notification_preferences table...');
        
        await db.query(`
            CREATE TABLE IF NOT EXISTS notification_preferences (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                user_type ENUM('admin', 'staff', 'customer') NOT NULL,
                notification_type ENUM('new_order', 'order_update', 'payment_update', 'low_stock', 'event_request', 'system_alert', 'loyalty_update') NOT NULL,
                email_enabled BOOLEAN DEFAULT TRUE,
                in_app_enabled BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_user_notification (user_id, user_type, notification_type),
                INDEX idx_user_id (user_id),
                INDEX idx_user_type (user_type),
                INDEX idx_notification_type (notification_type)
            )
        `);
        
        console.log('Creating notification_delivery_log table...');
        
        await db.query(`
            CREATE TABLE IF NOT EXISTS notification_delivery_log (
                id INT AUTO_INCREMENT PRIMARY KEY,
                notification_id INT NOT NULL,
                delivery_method ENUM('email', 'in_app', 'sms') NOT NULL,
                status ENUM('pending', 'sent', 'failed', 'bounced') DEFAULT 'pending',
                error_message TEXT NULL,
                attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                delivered_at TIMESTAMP NULL,
                INDEX idx_notification_id (notification_id),
                INDEX idx_status (status),
                INDEX idx_delivery_method (delivery_method),
                INDEX idx_attempted_at (attempted_at),
                FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE
            )
        `);
        
        console.log('✅ All notification tables created successfully!');
        
        // Insert default preferences for existing users
        console.log('Setting up default notification preferences...');
        
        // For admin users
        await db.query(`
            INSERT IGNORE INTO notification_preferences (user_id, user_type, notification_type, email_enabled, in_app_enabled)
            SELECT 
                u.id,
                'admin',
                nt.notification_type,
                CASE 
                    WHEN nt.notification_type IN ('new_order', 'low_stock', 'event_request') THEN TRUE
                    ELSE FALSE
                END,
                TRUE
            FROM users u
            CROSS JOIN (
                SELECT 'new_order' as notification_type
                UNION SELECT 'order_update'
                UNION SELECT 'payment_update'
                UNION SELECT 'low_stock'
                UNION SELECT 'event_request'
                UNION SELECT 'system_alert'
                UNION SELECT 'loyalty_update'
            ) nt
            WHERE u.role = 'admin'
        `);
        
        // For staff users
        await db.query(`
            INSERT IGNORE INTO notification_preferences (user_id, user_type, notification_type, email_enabled, in_app_enabled)
            SELECT 
                u.id,
                'staff',
                nt.notification_type,
                CASE 
                    WHEN nt.notification_type IN ('new_order', 'low_stock') THEN TRUE
                    ELSE FALSE
                END,
                TRUE
            FROM users u
            CROSS JOIN (
                SELECT 'new_order' as notification_type
                UNION SELECT 'order_update'
                UNION SELECT 'payment_update'
                UNION SELECT 'low_stock'
                UNION SELECT 'event_request'
                UNION SELECT 'system_alert'
                UNION SELECT 'loyalty_update'
            ) nt
            WHERE u.role = 'staff'
        `);
        
        // For customer users
        await db.query(`
            INSERT IGNORE INTO notification_preferences (user_id, user_type, notification_type, email_enabled, in_app_enabled)
            SELECT 
                c.id,
                'customer',
                nt.notification_type,
                CASE 
                    WHEN nt.notification_type IN ('order_update', 'payment_update', 'loyalty_update') THEN TRUE
                    ELSE FALSE
                END,
                TRUE
            FROM customers c
            CROSS JOIN (
                SELECT 'new_order' as notification_type
                UNION SELECT 'order_update'
                UNION SELECT 'payment_update'
                UNION SELECT 'low_stock'
                UNION SELECT 'event_request'
                UNION SELECT 'system_alert'
                UNION SELECT 'loyalty_update'
            ) nt
        `);
        
        console.log('✅ Default notification preferences set up!');
        console.log('\n🎉 Notification system is now ready!');
        
    } catch (error) {
        console.error('❌ Error creating tables:', error);
    } finally {
        process.exit(0);
    }
}

createTables();














