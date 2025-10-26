-- Notifications System Database Schema
-- This file creates the necessary tables for the notification system

-- Table to store all notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL COMMENT 'User who should receive the notification (NULL for system-wide)',
    user_type ENUM('admin', 'staff', 'customer') NULL COMMENT 'Type of user for the notification',
    notification_type ENUM('new_order', 'order_update', 'payment_update', 'low_stock', 'event_request', 'system_alert', 'loyalty_update') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSON NULL COMMENT 'Additional data for the notification (order details, etc.)',
    is_read BOOLEAN DEFAULT FALSE,
    is_email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP NULL,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    expires_at TIMESTAMP NULL COMMENT 'When the notification expires (NULL for no expiration)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_user_type (user_type),
    INDEX idx_notification_type (notification_type),
    INDEX idx_is_read (is_read),
    INDEX idx_priority (priority),
    INDEX idx_created_at (created_at),
    INDEX idx_expires_at (expires_at)
);

-- Table to track notification preferences for users
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
);

-- Table to track notification delivery attempts
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
);

-- Insert default notification preferences for admin users
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
WHERE u.role = 'admin';

-- Insert default notification preferences for staff users
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
WHERE u.role = 'staff';

-- Insert default notification preferences for customer users
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
) nt;














