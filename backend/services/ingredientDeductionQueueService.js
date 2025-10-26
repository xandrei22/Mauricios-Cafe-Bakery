const db = require('../config/db');
const ingredientDeductionService = require('./ingredientDeductionService');

class IngredientDeductionQueueService {
    constructor() {
        this.isProcessing = false;
        this.processingInterval = null;
        this.retryDelay = 5000; // 5 seconds
        this.maxRetries = 3;
    }

    /**
     * Start the queue processing service
     */
    start() {
        if (this.isProcessing) {
            console.log('Ingredient deduction queue service is already running');
            return;
        }

        console.log('Starting ingredient deduction queue service...');
        this.isProcessing = true;

        // Process queue immediately
        this.processQueue();

        // Set up periodic processing
        this.processingInterval = setInterval(() => {
            this.processQueue();
        }, 10000); // Check every 10 seconds
    }

    /**
     * Stop the queue processing service
     */
    stop() {
        if (!this.isProcessing) {
            console.log('Ingredient deduction queue service is not running');
            return;
        }

        console.log('Stopping ingredient deduction queue service...');
        this.isProcessing = false;

        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }
    }

    /**
     * Process pending ingredient deductions from the queue
     */
    async processQueue() {
        if (!this.isProcessing) return;

        try {
            // Check if required tables exist first
            const [tables] = await db.query(`SHOW TABLES LIKE 'ingredient_deduction_queue'`);
            if (tables.length === 0) {
                console.log('⚠️  Ingredient deduction queue tables not ready - skipping queue processing');
                return;
            }

            // Get pending deductions
            const [pendingItems] = await db.query(`
                SELECT * FROM ingredient_deduction_queue 
                WHERE status = 'pending' 
                AND attempts < max_attempts
                ORDER BY created_at ASC
                LIMIT 10
            `);

            if (pendingItems.length === 0) {
                return; // No pending items
            }

            console.log(`Processing ${pendingItems.length} pending ingredient deductions...`);

            for (const item of pendingItems) {
                await this.processQueueItem(item);
            }

        } catch (error) {
            // Only log errors if they're not about missing tables
            if (error.code !== 'ER_NO_SUCH_TABLE') {
                console.error('Error processing ingredient deduction queue:', error);
            }
        }
    }

    /**
     * Process a single queue item
     */
    async processQueueItem(queueItem) {
        try {
            // Mark as processing
            await db.query(`
                UPDATE ingredient_deduction_queue 
                SET status = 'processing', attempts = attempts + 1
                WHERE id = ?
            `, [queueItem.id]);

            console.log(`Processing ingredient deduction for order ${queueItem.order_id} (attempt ${queueItem.attempts + 1})`);

            // Parse order items
            const items = JSON.parse(queueItem.items || '[]');

            const itemsForDeduction = items.map(item => {
                // Handle different field names from different order sources
                let menuItemId = item.menu_item_id || item.menuItemId || item.id;

                // If we still don't have a menu item ID, try to find it by name
                if (!menuItemId && item.name) {
                    console.log(`⚠️  No menu item ID found for item "${item.name}", attempting to look up by name...`);
                }

                return {
                    menuItemId: menuItemId,
                    quantity: item.quantity || 1,
                    customizations: item.customizations || null,
                    name: item.name
                };
            });

            // Filter out items without valid menu item IDs
            const validItems = itemsForDeduction.filter(item => item.menuItemId);
            const invalidItems = itemsForDeduction.filter(item => !item.menuItemId);

            if (invalidItems.length > 0) {
                console.warn(`⚠️  ${invalidItems.length} items without valid menu item IDs:`, invalidItems.map(item => item.name));
            }

            if (validItems.length === 0) {
                console.error(`❌ No valid items found for ingredient deduction in order ${queueItem.order_id}`);
                return;
            }

            // Process ingredient deduction
            const deductionResult = await ingredientDeductionService.deductIngredientsForOrder(
                queueItem.order_id,
                validItems
            );

            // Mark as completed
            await db.query(`
                UPDATE ingredient_deduction_queue 
                SET status = 'completed', processed_at = NOW()
                WHERE id = ?
            `, [queueItem.id]);

            console.log(`✅ Ingredient deduction completed for order ${queueItem.order_id}:`, deductionResult);

            // Log success
            await db.query(`
                INSERT INTO system_logs (action, table_name, record_id, details, created_at)
                VALUES (?, 'ingredient_deduction_queue', ?, ?, NOW())
            `, [
                'ingredient_deduction_success',
                queueItem.id,
                `Successfully processed ingredient deduction for order ${queueItem.order_id}`
            ]);

        } catch (error) {
            console.error(`❌ Failed to process ingredient deduction for order ${queueItem.order_id}:`, error);

            // Check if we should retry
            const shouldRetry = queueItem.attempts < this.maxRetries;
            const newStatus = shouldRetry ? 'pending' : 'failed';

            await db.query(`
                UPDATE ingredient_deduction_queue 
                SET status = ?, error_message = ?, processed_at = NOW()
                WHERE id = ?
            `, [newStatus, error.message, queueItem.id]);

            // Log failure
            await db.query(`
                INSERT INTO system_logs (action, table_name, record_id, details, created_at)
                VALUES (?, 'ingredient_deduction_queue', ?, ?, NOW())
            `, [
                'ingredient_deduction_failure',
                queueItem.id,
                `Failed to process ingredient deduction for order ${queueItem.order_id}: ${error.message}`
            ]);

            if (shouldRetry) {
                console.log(`Will retry ingredient deduction for order ${queueItem.order_id} (attempt ${queueItem.attempts + 1}/${this.maxRetries})`);
            } else {
                console.error(`Max retries reached for order ${queueItem.order_id}. Marking as failed.`);
            }
        }
    }

    /**
     * Manually add an item to the queue
     */
    async addToQueue(orderId, items) {
        try {
            await db.query(`
                INSERT INTO ingredient_deduction_queue (order_id, items, status, created_at)
                VALUES (?, ?, 'pending', NOW())
            `, [orderId, JSON.stringify(items)]);

            console.log(`Added ingredient deduction to queue for order ${orderId}`);
            return true;

        } catch (error) {
            console.error(`Failed to add ingredient deduction to queue for order ${orderId}:`, error);
            return false;
        }
    }

    /**
     * Get queue status
     */
    async getQueueStatus() {
        try {
            const [status] = await db.query(`
                SELECT 
                    status,
                    COUNT(*) as count
                FROM ingredient_deduction_queue 
                GROUP BY status
            `);

            const [recentItems] = await db.query(`
                SELECT * FROM ingredient_deduction_queue 
                ORDER BY created_at DESC 
                LIMIT 10
            `);

            return {
                status,
                recentItems,
                isProcessing: this.isProcessing
            };

        } catch (error) {
            console.error('Error getting queue status:', error);
            return { error: error.message };
        }
    }

    /**
     * Retry failed items
     */
    async retryFailedItems() {
        try {
            const [failedItems] = await db.query(`
                SELECT * FROM ingredient_deduction_queue 
                WHERE status = 'failed'
            `);

            if (failedItems.length === 0) {
                console.log('No failed items to retry');
                return { retried: 0 };
            }

            console.log(`Retrying ${failedItems.length} failed ingredient deductions...`);

            for (const item of failedItems) {
                // Reset status and attempts
                await db.query(`
                    UPDATE ingredient_deduction_queue 
                    SET status = 'pending', attempts = 0, error_message = NULL
                    WHERE id = ?
                `, [item.id]);
            }

            console.log(`Reset ${failedItems.length} failed items for retry`);
            return { retried: failedItems.length };

        } catch (error) {
            console.error('Error retrying failed items:', error);
            return { error: error.message };
        }
    }

    /**
     * Clean up old completed items
     */
    async cleanupOldItems(daysToKeep = 7) {
        try {
            const [result] = await db.query(`
                DELETE FROM ingredient_deduction_queue 
                WHERE status = 'completed' 
                AND processed_at < DATE_SUB(NOW(), INTERVAL ? DAY)
            `, [daysToKeep]);

            console.log(`Cleaned up ${result.affectedRows} old completed items from queue`);
            return { cleaned: result.affectedRows };

        } catch (error) {
            console.error('Error cleaning up old items:', error);
            return { error: error.message };
        }
    }
}

// Export an instance of the service
module.exports = new IngredientDeductionQueueService();