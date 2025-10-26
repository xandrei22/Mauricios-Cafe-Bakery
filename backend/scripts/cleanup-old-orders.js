const db = require('../config/db');

/**
 * Daily reset script to clear all cancelled orders at end of day
 * Removes ALL cancelled orders at 11:59 PM daily
 */
async function cleanupOldCancelledOrders() {
    let connection;

    try {
        console.log('🌙 Starting daily reset - clearing all cancelled orders...');

        connection = await db.getConnection();

        // Get count of cancelled orders before deletion
        const [countResult] = await connection.execute(`
            SELECT COUNT(*) as count FROM orders WHERE status = 'cancelled'
        `);
        const cancelledCount = countResult[0].count;

        // Delete ALL cancelled orders (daily reset)
        const [result] = await connection.execute(`
            DELETE FROM orders 
            WHERE status = 'cancelled'
        `);

        console.log(`✅ Daily reset completed. Removed ${result.affectedRows} cancelled orders.`);

        // Also clean up any orders with 'pending_verification' status older than 2 days
        const [pendingResult] = await connection.execute(`
            DELETE FROM orders 
            WHERE status = 'pending_verification' 
            AND order_time < DATE_SUB(NOW(), INTERVAL 2 DAY)
        `);

        console.log(`✅ Also removed ${pendingResult.affectedRows} old pending verification orders.`);

        return {
            cancelledOrdersRemoved: result.affectedRows,
            pendingVerificationOrdersRemoved: pendingResult.affectedRows,
            totalCancelledBeforeReset: cancelledCount
        };

    } catch (error) {
        console.error('❌ Cleanup failed:', error.message);
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

/**
 * Get statistics about orders that would be cleaned up
 */
async function getCleanupStats() {
    let connection;

    try {
        connection = await db.getConnection();

        const [cancelledStats] = await connection.execute(`
            SELECT COUNT(*) as count, 
                   MIN(order_time) as oldest_order,
                   MAX(order_time) as newest_order
            FROM orders 
            WHERE status = 'cancelled' 
            AND order_time < DATE_SUB(NOW(), INTERVAL 1 DAY)
        `);

        const [pendingStats] = await connection.execute(`
            SELECT COUNT(*) as count,
                   MIN(order_time) as oldest_order,
                   MAX(order_time) as newest_order
            FROM orders 
            WHERE status = 'pending_verification' 
            AND order_time < DATE_SUB(NOW(), INTERVAL 2 DAY)
        `);

        return {
            cancelledOrders: cancelledStats[0],
            pendingVerificationOrders: pendingStats[0]
        };

    } catch (error) {
        console.error('❌ Failed to get cleanup stats:', error.message);
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

// If running directly, execute cleanup
if (require.main === module) {
    cleanupOldCancelledOrders()
        .then((result) => {
            console.log('🎉 Cleanup completed successfully!');
            console.log('Summary:', result);
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Cleanup failed:', error);
            process.exit(1);
        });
}

module.exports = {
    cleanupOldCancelledOrders,
    getCleanupStats
};