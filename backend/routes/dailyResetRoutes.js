const express = require('express');
const router = express.Router();
const { cleanupOldCancelledOrders } = require('../scripts/cleanup-old-orders');
const db = require('../config/db');

// Manual trigger for daily reset (for testing)
router.post('/trigger-reset', async(req, res) => {
    try {
        console.log('🔧 Manual daily reset triggered');

        const result = await cleanupOldCancelledOrders();

        res.json({
            success: true,
            message: 'Daily reset completed successfully',
            result: result
        });
    } catch (error) {
        console.error('❌ Manual reset failed:', error);
        res.status(500).json({
            success: false,
            message: 'Daily reset failed',
            error: error.message
        });
    }
});

// Get current cancelled orders count
router.get('/status', async(req, res) => {
    try {
        const [cancelledCount] = await db.query(`
            SELECT COUNT(*) as count FROM orders WHERE status = 'cancelled'
        `);

        const [pendingVerificationCount] = await db.query(`
            SELECT COUNT(*) as count FROM orders WHERE status = 'pending_verification'
        `);

        const [completedTodayCount] = await db.query(`
            SELECT COUNT(*) as count FROM orders 
            WHERE status = 'completed' 
            AND DATE(order_time) = CURDATE()
        `);

        res.json({
            success: true,
            status: {
                cancelledOrders: cancelledCount[0].count,
                pendingVerificationOrders: pendingVerificationCount[0].count,
                completedOrdersToday: completedTodayCount[0].count,
                nextReset: '11:59 PM today',
                timezone: 'Asia/Manila'
            }
        });
    } catch (error) {
        console.error('❌ Failed to get reset status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get reset status',
            error: error.message
        });
    }
});

module.exports = router;