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

        // Schedule critical stock notifications at 8:00 AM daily, with fallback to next available time
        this.criticalJob = cron.schedule('0 8 * * *', async() => {
            console.log('🕐 Running scheduled critical stock check at 8:00 AM...');
            await this.checkAndSendCriticalNotifications();
        }, {
            scheduled: true,
            timezone: "Asia/Manila"
        });

        // Schedule low stock notifications at 8:00 AM every 3 days, with fallback to next available time
        this.lowStockJob = cron.schedule('0 8 */3 * *', async() => {
            console.log('🕐 Running scheduled low stock check at 8:00 AM (every 3 days)...');
            await this.checkAndSendLowStockNotifications();
        }, {
            scheduled: true,
            timezone: "Asia/Manila"
        });

        // Fallback: Check every hour if 8 AM was missed and send notifications
        this.fallbackJob = cron.schedule('0 * * * *', async() => {
            const now = new Date();
            const currentHour = now.getHours();

            // If it's past 8 AM and we haven't sent today's notifications
            if (currentHour > 8) {
                console.log('🕐 Running fallback notification check...');
                await this.checkAndSendMissedNotifications();
            }
        }, {
            scheduled: true,
            timezone: "Asia/Manila"
        });

        console.log('✅ Scheduled notification service started');
        console.log('   - Critical stock notifications: Daily at 8:00 AM');
        console.log('   - Low stock notifications: Every 3 days at 8:00 AM');
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
                console.log(`⚠️  Found ${criticalItems.length} critical items at 8:00 AM`);

                // Check if we can send critical notifications
                const canSend = await notificationThrottlingService.canSendNotification('low_stock_critical');

                if (canSend) {
                    console.log('📧 Sending scheduled critical stock notification...');

                    // Trigger the low stock check which will handle the throttling
                    await lowStockMonitorService.checkLowStockItems();
                } else {
                    console.log('⏰ Critical stock notification already sent recently, skipping scheduled check');
                }
            } else {
                console.log('✅ No critical items found at 8:00 AM');
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
                console.log(`⚠️  Found ${lowStockOnly.length} low stock items at 8:00 AM`);

                // Check if we can send low stock notifications
                const canSend = await notificationThrottlingService.canSendNotification('low_stock_low');

                if (canSend) {
                    console.log('📧 Sending scheduled low stock notification...');

                    // Trigger the low stock check which will handle the throttling
                    await lowStockMonitorService.checkLowStockItems();
                } else {
                    console.log('⏰ Low stock notification already sent recently, skipping scheduled check');
                }
            } else {
                console.log('✅ No low stock items found at 8:00 AM');
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
     */
    async checkAndSendMissedNotifications() {
        try {
            console.log('🔄 Checking for missed notifications...');

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

                // Send critical notifications if not sent today
                if (criticalSent[0].count === 0) {
                    console.log('📧 Sending missed critical stock notifications...');
                    await this.checkAndSendCriticalNotifications();
                }

                // Send low stock notifications if not sent today and it's been 3+ days
                if (lowStockSent[0].count === 0) {
                    // Check if it's been 3+ days since last low stock notification
                    const [lastLowStock] = await connection.query(`
                        SELECT MAX(created_at) as last_sent FROM notifications 
                        WHERE notification_type = 'low_stock' 
                        AND priority = 'high'
                    `);

                    if (lastLowStock[0].last_sent) {
                        const lastSent = new Date(lastLowStock[0].last_sent);
                        const daysDiff = Math.floor((new Date() - lastSent) / (1000 * 60 * 60 * 24));

                        if (daysDiff >= 3) {
                            console.log('📧 Sending missed low stock notifications...');
                            await this.checkAndSendLowStockNotifications();
                        }
                    } else {
                        // No previous low stock notifications, send now
                        console.log('📧 Sending first low stock notifications...');
                        await this.checkAndSendLowStockNotifications();
                    }
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
            criticalSchedule: '0 8 * * * (Daily at 8:00 AM)',
            lowStockSchedule: '0 8 */3 * * (Every 3 days at 8:00 AM)',
            fallbackSchedule: '0 * * * * (Hourly fallback check)'
        };
    }
}

module.exports = new ScheduledNotificationService();