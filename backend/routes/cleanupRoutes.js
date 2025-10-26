const express = require('express');
const router = express.Router();
const { cleanupOldCancelledOrders, getCleanupStats } = require('../scripts/cleanup-old-orders');

/**
 * GET /api/cleanup/stats
 * Get statistics about orders that would be cleaned up
 */
router.get('/stats', async(req, res) => {
    try {
        const stats = await getCleanupStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error getting cleanup stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get cleanup statistics'
        });
    }
});

/**
 * POST /api/cleanup/run
 * Manually run the cleanup process
 */
router.post('/run', async(req, res) => {
    try {
        const result = await cleanupOldCancelledOrders();
        res.json({
            success: true,
            message: 'Cleanup completed successfully',
            data: result
        });
    } catch (error) {
        console.error('Error running cleanup:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to run cleanup'
        });
    }
});

module.exports = router;
