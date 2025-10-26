const express = require('express');
const router = express.Router();
const lowStockMonitorService = require('../services/lowStockMonitorService');
const { ensureAdminAuthenticated } = require('../middleware/adminAuthMiddleware');
const { ensureStaffAuthenticated } = require('../middleware/staffAuthMiddleware');

// Get low stock items
router.get('/items', ensureAdminAuthenticated, async (req, res) => {
    try {
        const items = await lowStockMonitorService.getLowStockItems();
        
        res.json({
            success: true,
            items: items,
            count: items.length
        });
    } catch (error) {
        console.error('Error getting low stock items:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get low stock items'
        });
    }
});

// Get low stock items for staff
router.get('/staff/items', ensureStaffAuthenticated, async (req, res) => {
    try {
        const items = await lowStockMonitorService.getLowStockItems();
        
        res.json({
            success: true,
            items: items,
            count: items.length
        });
    } catch (error) {
        console.error('Error getting low stock items for staff:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get low stock items'
        });
    }
});

// Manually trigger low stock check (admin only)
router.post('/check', ensureAdminAuthenticated, async (req, res) => {
    try {
        await lowStockMonitorService.triggerCheck();
        
        res.json({
            success: true,
            message: 'Low stock check triggered successfully'
        });
    } catch (error) {
        console.error('Error triggering low stock check:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to trigger low stock check'
        });
    }
});

// Force low stock check (bypasses time restriction) (admin only)
router.post('/force-check', ensureAdminAuthenticated, async (req, res) => {
    try {
        await lowStockMonitorService.forceCheck();
        
        res.json({
            success: true,
            message: 'Force low stock check completed successfully'
        });
    } catch (error) {
        console.error('Error in force low stock check:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to force low stock check'
        });
    }
});

// Get monitor status (admin only)
router.get('/status', ensureAdminAuthenticated, async (req, res) => {
    try {
        res.json({
            success: true,
            isRunning: lowStockMonitorService.isRunning,
            message: lowStockMonitorService.isRunning ? 'Monitor is running' : 'Monitor is stopped'
        });
    } catch (error) {
        console.error('Error getting monitor status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get monitor status'
        });
    }
});

// Check for low stock alerts (for popup after login)
router.get('/alert-status', ensureAdminAuthenticated, async (req, res) => {
    try {
        const db = require('../config/db');
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
            // Group items by severity
            const criticalItems = lowStockItems.filter(item => item.actual_quantity <= 0);
            const lowStockItems_filtered = lowStockItems.filter(item => item.actual_quantity > 0);

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

            res.json({
                success: true,
                hasAlert: true,
                alert: {
                    title,
                    message,
                    priority,
                    data: {
                        items: allItems,
                        criticalCount: criticalItems.length,
                        lowStockCount: lowStockItems_filtered.length,
                        totalCount: lowStockItems.length
                    }
                }
            });
        } else {
            res.json({
                success: true,
                hasAlert: false,
                alert: null
            });
        }
    } catch (error) {
        console.error('Error checking low stock alert status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check low stock alert status'
        });
    }
});

module.exports = router;
