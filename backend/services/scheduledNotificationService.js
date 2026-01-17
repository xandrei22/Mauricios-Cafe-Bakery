const cron = require('node-cron');
const lowStockMonitorService = require('./lowStockMonitorService');
const notificationThrottlingService = require('./notificationThrottlingService');

class ScheduledNotificationService {
    constructor() {
        this.isRunning = false;
        this.criticalJob = null;
        this.lowStockJob = null;
        this.fallbackJob = null;
    }

    /**
     * Start the scheduled notification service
     */
    start() {
        if (this.isRunning) {
            console.log('Scheduled notification service is already running');
            return;
        }

        this.isRunning = true;
        console.log('🕐 Starting scheduled notification service...');

        // Schedule critical stock notifications at 7:00 AM daily
        this.criticalJob = cron.schedule('0 7 * * *', async() => {
            console.log('🕐 Running scheduled critical stock check at 7:00 AM...');
            await this.checkAndSendCriticalNotifications();
        }, {
            scheduled: true,
            timezone: "Asia/Manila"
        });

        // Schedule low stock notifications at 7:00 AM daily
        this.lowStockJob = cron.schedule('0 7 * * *', async() => {
            console.log('🕐 Running scheduled low stock check at 7:00 AM (daily)...');
            await this.checkAndSendLowStockNotifications();
        }, {
            scheduled: true,
            timezone: "Asia/Manila"
        });

        // Fallback: Check every 10 minutes between 7 AM and 9 AM to catch the window
        this.fallbackJob = cron.schedule('*/10 7-8 * * *', async() => {
            const now = new Date();
            const currentHour = now.getHours();

            // Only check if we're within the notification window (7-9 AM)
            if (currentHour >= 7 && currentHour < 9) {
                console.log('🕐 Running fallback notification check (7-9 AM window)...');
                await this.checkAndSendMissedNotifications();
            }
        }, {
            scheduled: true,
            timezone: "Asia/Manila"
        });

        console.log('✅ Scheduled notification service started');
        console.log('   - Critical stock notifications: Daily at 7:00 AM (window: 7-9 AM)');
        console.log('   - Low stock notifications: Daily at 7:00 AM (window: 7-9 AM)');
        console.log('   - Notifications stop automatically once stock is replenished');
    }

    /**
     * Stop the scheduled notification service
     */
    stop() {
        if (this.criticalJob) {
            this.criticalJob.destroy();
            this.criticalJob = null;
        }
        if (this.lowStockJob) {
            this.lowStockJob.destroy();
            this.lowStockJob = null;
        }
        if (this.fallbackJob) {
            this.fallbackJob.destroy();
            this.fallbackJob = null;
        }
        this.isRunning = false;
        console.log('🛑 Scheduled notification service stopped');
    }

    /**
     * Check and send critical stock notifications
     */
    async checkAndSendCriticalNotifications() {
        try {
            console.log('🔍 Checking for critical stock items...');

            const lowStockItems = await lowStockMonitorService.getLowStockItems();
            const criticalItems = lowStockItems.filter(item => item.stock_status === 'out_of_stock');

            if (criticalItems.length > 0) {
                console.log(`⚠️  Found ${criticalItems.length} critical items`);

                // Check if we can send critical notifications (within time window and throttling)
                const canSend = await notificationThrottlingService.shouldSendNotification('low_stock_critical');

                if (canSend) {
                    console.log('📧 Sending scheduled critical stock notification...');

                    // Trigger the low stock check which will handle the throttling
                    await lowStockMonitorService.checkLowStockItems();
                } else {
                    console.log('⏰ Critical stock notification throttled or outside time window');
                }
            } else {
                console.log('✅ No critical items found - stock has been replenished');
            }
        } catch (error) {
            console.error('❌ Error in scheduled critical stock check:', error);
        }
    }

    /**
     * Check and send low stock notifications
     */
    async checkAndSendLowStockNotifications() {
        try {
            console.log('🔍 Checking for low stock items...');

            const lowStockItems = await lowStockMonitorService.getLowStockItems();
            const lowStockOnly = lowStockItems.filter(item => item.stock_status === 'low_stock');

            if (lowStockOnly.length > 0) {
                console.log(`⚠️  Found ${lowStockOnly.length} low stock items`);

                // Check if we can send low stock notifications (within time window and throttling)
                const canSend = await notificationThrottlingService.shouldSendNotification('low_stock_low');

                if (canSend) {
                    console.log('📧 Sending scheduled low stock notification...');

                    // Trigger the low stock check which will handle the throttling
                    await lowStockMonitorService.checkLowStockItems();
                } else {
                    console.log('⏰ Low stock notification throttled or outside time window');
                }
            } else {
                console.log('✅ No low stock items found - stock has been replenished');
            }
        } catch (error) {
            console.error('❌ Error in scheduled low stock check:', error);
        }
    }

    /**
     * Manually trigger critical stock check (for testing)
     */
    async triggerCriticalCheck() {
        console.log('🔍 Manual critical stock check triggered');
        await this.checkAndSendCriticalNotifications();
    }

    /**
     * Manually trigger low stock check (for testing)
     */
    async triggerLowStockCheck() {
        console.log('🔍 Manual low stock check triggered');
        await this.checkAndSendLowStockNotifications();
    }

    /**
     * Check and send missed notifications (fallback mechanism)
     * Only runs between 7 AM and 9 AM
     */
    async checkAndSendMissedNotifications() {
        try {
            // Only proceed if we're within the notification window
            if (!notificationThrottlingService.isNotificationTime()) {
                return;
            }

            console.log('🔄 Checking for missed notifications (7-9 AM window)...');

            // Check if we already sent notifications today
            const today = new Date().toISOString().split('T')[0];
            const db = require('../config/db');
            const connection = await db.getConnection();

            try {
                // Check if critical notifications were sent today
                const [criticalSent] = await connection.query(`
                    SELECT COUNT(*) as count FROM notifications 
                    WHERE notification_type = 'low_stock' 
                    AND priority = 'urgent' 
                    AND DATE(created_at) = ?
                `, [today]);

                // Check if low stock notifications were sent today
                const [lowStockSent] = await connection.query(`
                    SELECT COUNT(*) as count FROM notifications 
                    WHERE notification_type = 'low_stock' 
                    AND priority = 'high' 
                    AND DATE(created_at) = ?
                `, [today]);

                // Send critical notifications if not sent today and items are still critical
                if (criticalSent[0].count === 0) {
                    console.log('📧 Checking for missed critical stock notifications...');
                    await this.checkAndSendCriticalNotifications();
                }

                // Send low stock notifications if not sent today (daily now, not every 3 days)
                if (lowStockSent[0].count === 0) {
                    console.log('📧 Checking for missed low stock notifications...');
                    await this.checkAndSendLowStockNotifications();
                } else {
                    console.log('✅ Low stock notifications already sent today');
                }

            } finally {
                connection.release();
            }

        } catch (error) {
            console.error('❌ Error in fallback notification check:', error);
        }
    }

    /**
     * Get service status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            criticalJobRunning: this.criticalJob ? this.criticalJob.running : false,
            lowStockJobRunning: this.lowStockJob ? this.lowStockJob.running : false,
            fallbackJobRunning: this.fallbackJob ? this.fallbackJob.running : false,
            criticalSchedule: '0 7 * * * (Daily at 7:00 AM, window: 7-9 AM)',
            lowStockSchedule: '0 7 * * * (Daily at 7:00 AM, window: 7-9 AM)',
            fallbackSchedule: '*/10 7-8 * * * (Every 10 minutes between 7-9 AM)'
        };
    }
}

module.exports = new ScheduledNotificationService();