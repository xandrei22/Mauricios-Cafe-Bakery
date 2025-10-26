const db = require('../config/db');

class NotificationThrottlingService {
    constructor() {
        this.CRITICAL_INTERVAL_HOURS = 24; // 1 day for critical items
        this.LOW_STOCK_INTERVAL_DAYS = 3; // 3 days for low stock items
        this.NOTIFICATION_TIME = '08:00:00'; // 8:00 AM
    }

    /**
     * Check if a notification can be sent based on throttling rules
     * @param {string} notificationType - 'low_stock_critical' or 'low_stock_low'
     * @returns {Promise<boolean>} - true if notification can be sent
     */
    async canSendNotification(notificationType) {
        try {
            const connection = await db.getConnection();
            
            try {
                // Get the last sent time for this notification type
                const [rows] = await connection.query(`
                    SELECT last_sent_at FROM notification_throttling 
                    WHERE notification_type = ?
                `, [notificationType]);

                if (rows.length === 0) {
                    // No record found, allow sending
                    return true;
                }

                const lastSentAt = new Date(rows[0].last_sent_at);
                const now = new Date();
                
                // Check if enough time has passed based on notification type
                if (notificationType === 'low_stock_critical') {
                    // For critical items, check if 24 hours have passed
                    const hoursDiff = (now - lastSentAt) / (1000 * 60 * 60);
                    return hoursDiff >= this.CRITICAL_INTERVAL_HOURS;
                } else if (notificationType === 'low_stock_low') {
                    // For low stock items, check if 3 days have passed
                    const daysDiff = (now - lastSentAt) / (1000 * 60 * 60 * 24);
                    return daysDiff >= this.LOW_STOCK_INTERVAL_DAYS;
                }

                return false;
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error('Error checking notification throttling:', error);
            // On error, allow sending to avoid missing critical notifications
            return true;
        }
    }

    /**
     * Update the last sent time for a notification type
     * @param {string} notificationType - 'low_stock_critical' or 'low_stock_low'
     */
    async updateLastSentTime(notificationType) {
        try {
            const connection = await db.getConnection();
            
            try {
                await connection.query(`
                    INSERT INTO notification_throttling (notification_type, last_sent_at) 
                    VALUES (?, NOW())
                    ON DUPLICATE KEY UPDATE last_sent_at = NOW()
                `, [notificationType]);
                
                console.log(`Updated last sent time for ${notificationType} notifications`);
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error('Error updating notification throttling:', error);
        }
    }

    /**
     * Check if it's the right time to send notifications (8:00 AM)
     * @returns {boolean} - true if it's 8:00 AM
     */
    isNotificationTime() {
        const now = new Date();
        const currentTime = now.toTimeString().split(' ')[0]; // Get HH:MM:SS
        return currentTime.startsWith(this.NOTIFICATION_TIME);
    }

    /**
     * Get time until next notification window (8:00 AM)
     * @returns {number} - milliseconds until next 8:00 AM
     */
    getTimeUntilNextNotification() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(8, 0, 0, 0); // Set to 8:00 AM tomorrow
        
        return tomorrow.getTime() - now.getTime();
    }

    /**
     * Check if notifications should be sent based on both throttling and time
     * @param {string} notificationType - 'low_stock_critical' or 'low_stock_low'
     * @returns {Promise<boolean>} - true if notification should be sent
     */
    async shouldSendNotification(notificationType) {
        // Check if it's the right time (8:00 AM)
        if (!this.isNotificationTime()) {
            return false;
        }

        // Check throttling rules
        return await this.canSendNotification(notificationType);
    }

    /**
     * Get throttling status for debugging
     * @returns {Promise<Object>} - throttling status for both types
     */
    async getThrottlingStatus() {
        try {
            const connection = await db.getConnection();
            
            try {
                const [rows] = await connection.query(`
                    SELECT notification_type, last_sent_at, 
                           TIMESTAMPDIFF(HOUR, last_sent_at, NOW()) as hours_since_last_sent,
                           TIMESTAMPDIFF(DAY, last_sent_at, NOW()) as days_since_last_sent
                    FROM notification_throttling
                    ORDER BY notification_type
                `);

                const status = {};
                rows.forEach(row => {
                    status[row.notification_type] = {
                        lastSentAt: row.last_sent_at,
                        hoursSinceLastSent: row.hours_since_last_sent,
                        daysSinceLastSent: row.days_since_last_sent,
                        canSend: row.notification_type === 'low_stock_critical' 
                            ? row.hours_since_last_sent >= this.CRITICAL_INTERVAL_HOURS
                            : row.days_since_last_sent >= this.LOW_STOCK_INTERVAL_DAYS
                    };
                });

                return status;
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error('Error getting throttling status:', error);
            return {};
        }
    }
}

module.exports = new NotificationThrottlingService();
