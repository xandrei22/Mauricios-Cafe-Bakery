const db = require('../config/db');
const notificationService = require('./notificationService');
const notificationThrottlingService = require('./notificationThrottlingService');

class LowStockMonitorService {
    constructor() {
        this.isRunning = false;
        this.checkInterval = null;
    }

    /**
     * Start monitoring for low stock items
     */
    start(intervalMinutes = 5) {
        if (this.isRunning) {
            console.log('Low stock monitor is already running');
            return;
        }

        this.isRunning = true;
        console.log(`🔍 Starting low stock monitor (checking every ${intervalMinutes} minutes)`);
        
        // Check immediately
        this.checkLowStockItems();
        
        // Set up interval
        this.checkInterval = setInterval(() => {
            this.checkLowStockItems();
        }, intervalMinutes * 60 * 1000);
    }

    /**
     * Stop monitoring
     */
    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.isRunning = false;
        console.log('🛑 Low stock monitor stopped');
    }

    /**
     * Check for low stock items and create notifications
     */
    async checkLowStockItems() {
        try {
            console.log('🔍 Checking for low stock items...');
            
            // Get all ingredients that are low in stock
            const [lowStockItems] = await db.query(`
                SELECT 
                    id,
                    name,
                    actual_quantity,
                    reorder_level,
                    actual_unit,
                    display_unit,
                    category
                FROM ingredients 
                WHERE is_available = TRUE 
                AND actual_quantity <= reorder_level
                ORDER BY (actual_quantity / reorder_level) ASC
            `);

            if (lowStockItems.length > 0) {
                console.log(`⚠️  Found ${lowStockItems.length} low stock items`);
                
                // Group items by severity
                const criticalItems = lowStockItems.filter(item => item.actual_quantity <= 0);
                const lowStockItems_filtered = lowStockItems.filter(item => item.actual_quantity > 0);

                // Create a single comprehensive notification for admin
                const allItems = lowStockItems.map(item => ({
                    name: item.name,
                    quantity: item.actual_quantity,
                    unit: item.actual_unit,
                    reorderLevel: item.reorder_level,
                    category: item.category,
                    status: item.actual_quantity <= 0 ? 'out_of_stock' : 'low_stock'
                }));

                // Check throttling for critical items
                if (criticalItems.length > 0) {
                    const canSendCritical = await notificationThrottlingService.shouldSendNotification('low_stock_critical');
                    
                    if (canSendCritical) {
                        console.log('📧 Sending critical stock notification...');
                        
                        const title = 'Critical Stock Alert';
                        const message = `${criticalItems.length} item(s) are out of stock`;
                        
                        // Single notification for admin with critical items
                        await notificationService.createNotification({
                            type: 'low_stock',
                            title: title,
                            message: message,
                            data: {
                                items: allItems,
                                criticalCount: criticalItems.length,
                                lowStockCount: lowStockItems_filtered.length,
                                totalCount: lowStockItems.length
                            },
                            userType: 'admin',
                            priority: 'urgent'
                        });

                        // Single notification for staff (simplified)
                        await notificationService.createNotification({
                            type: 'low_stock',
                            title: 'Critical Inventory Alert',
                            message: `${criticalItems.length} item(s) are out of stock`,
                            data: {
                                items: allItems,
                                totalCount: lowStockItems.length
                            },
                            userType: 'staff',
                            priority: 'high'
                        });

                        // Update throttling timestamp
                        await notificationThrottlingService.updateLastSentTime('low_stock_critical');
                    } else {
                        console.log('⏰ Critical stock notification throttled - not at 8:00 AM or too recent');
                    }
                }

                // Check throttling for low stock items (only if no critical items or critical notification was sent)
                if (lowStockItems_filtered.length > 0 && (criticalItems.length === 0 || await notificationThrottlingService.canSendNotification('low_stock_critical'))) {
                    const canSendLowStock = await notificationThrottlingService.shouldSendNotification('low_stock_low');
                    
                    if (canSendLowStock) {
                        console.log('📧 Sending low stock notification...');
                        
                        const title = 'Low Stock Alert';
                        const message = `${lowStockItems_filtered.length} item(s) are running low on stock`;
                        
                        // Single notification for admin with low stock items
                        await notificationService.createNotification({
                            type: 'low_stock',
                            title: title,
                            message: message,
                            data: {
                                items: allItems,
                                criticalCount: criticalItems.length,
                                lowStockCount: lowStockItems_filtered.length,
                                totalCount: lowStockItems.length
                            },
                            userType: 'admin',
                            priority: 'high'
                        });

                        // Single notification for staff (simplified)
                        await notificationService.createNotification({
                            type: 'low_stock',
                            title: 'Low Stock Alert',
                            message: `${lowStockItems_filtered.length} item(s) need restocking`,
                            data: {
                                items: allItems,
                                totalCount: lowStockItems.length
                            },
                            userType: 'staff',
                            priority: 'medium'
                        });

                        // Update throttling timestamp
                        await notificationThrottlingService.updateLastSentTime('low_stock_low');
                    } else {
                        console.log('⏰ Low stock notification throttled - not at 8:00 AM or too recent');
                    }
                }

            } else {
                console.log('✅ All items are well stocked');
            }

        } catch (error) {
            console.error('❌ Error checking low stock items:', error);
        }
    }

    /**
     * Manually trigger a low stock check
     */
    async triggerCheck() {
        console.log('🔍 Manual low stock check triggered');
        await this.checkLowStockItems();
    }

    /**
     * Force check low stock items (bypasses time restriction)
     */
    async forceCheck() {
        console.log('🔍 Force low stock check triggered');
        
        try {
            // Get all ingredients that are low in stock
            const [lowStockItems] = await db.query(`
                SELECT 
                    id,
                    name,
                    actual_quantity,
                    reorder_level,
                    actual_unit,
                    display_unit,
                    category
                FROM ingredients 
                WHERE is_available = TRUE 
                AND actual_quantity <= reorder_level
                ORDER BY (actual_quantity / reorder_level) ASC
            `);

            if (lowStockItems.length > 0) {
                console.log(`⚠️  Found ${lowStockItems.length} low stock items`);
                
                // Group items by severity
                const criticalItems = lowStockItems.filter(item => item.actual_quantity <= 0);
                const lowStockItems_filtered = lowStockItems.filter(item => item.actual_quantity > 0);

                // Create a single comprehensive notification for admin
                const allItems = lowStockItems.map(item => ({
                    name: item.name,
                    quantity: item.actual_quantity,
                    unit: item.actual_unit,
                    reorderLevel: item.reorder_level,
                    category: item.category,
                    status: item.actual_quantity <= 0 ? 'out_of_stock' : 'low_stock'
                }));

                let title = 'Inventory Alert';
                let message = '';
                let priority = 'medium';

                if (criticalItems.length > 0 && lowStockItems_filtered.length > 0) {
                    title = 'Critical & Low Stock Alert';
                    message = `${criticalItems.length} item(s) are out of stock and ${lowStockItems_filtered.length} item(s) are running low`;
                    priority = 'urgent';
                } else if (criticalItems.length > 0) {
                    title = 'Critical Stock Alert';
                    message = `${criticalItems.length} item(s) are out of stock`;
                    priority = 'urgent';
                } else {
                    title = 'Low Stock Alert';
                    message = `${lowStockItems_filtered.length} item(s) are running low on stock`;
                    priority = 'high';
                }

                // Single notification for admin with all items
                await notificationService.createNotification({
                    type: 'low_stock',
                    title: title,
                    message: message,
                    data: {
                        items: allItems,
                        criticalCount: criticalItems.length,
                        lowStockCount: lowStockItems_filtered.length,
                        totalCount: lowStockItems.length
                    },
                    userType: 'admin',
                    priority: priority
                });

                // Single notification for staff (simplified)
                await notificationService.createNotification({
                    type: 'low_stock',
                    title: 'Inventory Alert',
                    message: `${lowStockItems.length} item(s) need restocking`,
                    data: {
                        items: allItems,
                        totalCount: lowStockItems.length
                    },
                    userType: 'staff',
                    priority: 'medium'
                });

            } else {
                console.log('✅ All items are well stocked');
            }

        } catch (error) {
            console.error('❌ Error in force check:', error);
        }
    }

    /**
     * Get current low stock items
     */
    async getLowStockItems() {
        try {
            const [items] = await db.query(`
                SELECT 
                    id,
                    name,
                    actual_quantity,
                    reorder_level,
                    actual_unit,
                    display_unit,
                    category,
                    CASE 
                        WHEN actual_quantity <= 0 THEN 'out_of_stock'
                        WHEN actual_quantity <= reorder_level THEN 'low_stock'
                        ELSE 'in_stock'
                    END as stock_status
                FROM ingredients 
                WHERE is_available = TRUE 
                AND actual_quantity <= reorder_level
                ORDER BY (actual_quantity / reorder_level) ASC
            `);

            return items;
        } catch (error) {
            console.error('Error getting low stock items:', error);
            throw error;
        }
    }

    /**
     * Get throttling status for debugging
     */
    async getThrottlingStatus() {
        return await notificationThrottlingService.getThrottlingStatus();
    }
}

module.exports = new LowStockMonitorService();