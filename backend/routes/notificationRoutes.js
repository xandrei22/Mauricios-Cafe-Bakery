const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');
// Note: ensureAdminAuthenticated, ensureStaffAuthenticated, and ensureAuthenticated removed - all routes now use authenticateJWT (JWT-only)
const { authenticateJWT } = require('../middleware/jwtAuth');

// Get notifications for admin - requires authentication
router.get('/admin', authenticateJWT, async(req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        // Get admin ID from JWT user (authenticateJWT middleware)
        const adminId = (req.user && req.user.role === 'admin' && req.user.id) || null;
        if (!adminId) {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        const notifications = await notificationService.getNotifications(
            adminId,
            'admin',
            parseInt(limit),
            parseInt(offset)
        );

        res.json({
            success: true,
            notifications: notifications
        });
    } catch (error) {
        console.error('Error getting admin notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get notifications'
        });
    }
});

// Get notifications for staff - requires authentication
router.get('/staff', authenticateJWT, async(req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        // Get staff ID from JWT user (authenticateJWT middleware)
        const staffId = (req.user && (req.user.role === 'staff' || req.user.role === 'admin') && req.user.id) || null;
        if (!staffId) {
            return res.status(403).json({ success: false, message: 'Staff access required' });
        }
        const notifications = await notificationService.getNotifications(
            staffId,
            'staff',
            parseInt(limit),
            parseInt(offset)
        );

        res.json({
            success: true,
            notifications: notifications
        });
    } catch (error) {
        console.error('Error getting staff notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get notifications'
        });
    }
});

// Get notifications for customer - requires authentication
router.get('/customer', authenticateJWT, async(req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        // Get customer ID from JWT user (authenticateJWT middleware)
        const customerId = (req.user && req.user.role === 'customer' && req.user.id) || null;
        if (!customerId) {
            return res.status(403).json({ success: false, message: 'Customer access required' });
        }
        const notifications = await notificationService.getNotifications(
            customerId,
            'customer',
            parseInt(limit),
            parseInt(offset)
        );

        res.json({
            success: true,
            notifications: notifications
        });
    } catch (error) {
        console.error('Error getting customer notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get notifications'
        });
    }
});

// Get unread count for admin - requires authentication
router.get('/admin/unread-count', authenticateJWT, async(req, res) => {
    try {
        // Get admin ID from JWT user (authenticateJWT middleware)
        const adminId = (req.user && req.user.role === 'admin' && req.user.id) || null;
        if (!adminId) {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        const count = await notificationService.getUnreadCount(
            adminId,
            'admin'
        );

        res.json({
            success: true,
            count: count
        });
    } catch (error) {
        console.error('Error getting admin unread count:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get unread count'
        });
    }
});

// Get unread count for staff - requires authentication
router.get('/staff/unread-count', authenticateJWT, async(req, res) => {
    try {
        // Get staff ID from JWT user (authenticateJWT middleware)
        const staffId = (req.user && (req.user.role === 'staff' || req.user.role === 'admin') && req.user.id) || null;
        if (!staffId) {
            return res.status(403).json({ success: false, message: 'Staff access required' });
        }
        const count = await notificationService.getUnreadCount(
            staffId,
            'staff'
        );

        res.json({
            success: true,
            count: count
        });
    } catch (error) {
        console.error('Error getting staff unread count:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get unread count'
        });
    }
});

// Get unread count for customer - requires authentication
router.get('/customer/unread-count', authenticateJWT, async(req, res) => {
    try {
        // Get customer ID from JWT user (authenticateJWT middleware)
        const customerId = (req.user && req.user.role === 'customer' && req.user.id) || null;
        if (!customerId) {
            return res.status(403).json({ success: false, message: 'Customer access required' });
        }
        const count = await notificationService.getUnreadCount(
            customerId,
            'customer'
        );

        res.json({
            success: true,
            count: count
        });
    } catch (error) {
        console.error('Error getting customer unread count:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get unread count'
        });
    }
});

// Mark notification as read - requires authentication
router.patch('/:id/read', authenticateJWT, async(req, res) => {
    try {
        const { id } = req.params;
        // Get user ID and type from JWT user (authenticateJWT middleware)
        const userId = req.user && req.user.id;
        const userType = req.user && req.user.role;

        if (!userId || !userType) {
            return res.status(403).json({ success: false, message: 'Authentication required' });
        }

        const result = await notificationService.markAsRead(id, userId, userType);

        res.json({
            success: true,
            message: 'Notification marked as read'
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read'
        });
    }
});

// Mark all notifications as read for admin - requires authentication
router.patch('/admin/mark-all-read', authenticateJWT, async(req, res) => {
    try {
        // Get admin ID from JWT user (authenticateJWT middleware)
        const adminId = (req.user && req.user.role === 'admin' && req.user.id) || null;
        if (!adminId) {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        const result = await notificationService.markAllAsRead(
            adminId,
            'admin'
        );

        res.json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (error) {
        console.error('Error marking all admin notifications as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark all notifications as read'
        });
    }
});

// Mark all notifications as read for staff - requires authentication
router.patch('/staff/mark-all-read', authenticateJWT, async(req, res) => {
    try {
        // Get staff ID from JWT user (authenticateJWT middleware)
        const staffId = (req.user && (req.user.role === 'staff' || req.user.role === 'admin') && req.user.id) || null;
        if (!staffId) {
            return res.status(403).json({ success: false, message: 'Staff access required' });
        }
        const result = await notificationService.markAllAsRead(
            staffId,
            'staff'
        );

        res.json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (error) {
        console.error('Error marking all staff notifications as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark all notifications as read'
        });
    }
});

// Mark all notifications as read for customer - requires authentication
router.patch('/customer/mark-all-read', authenticateJWT, async(req, res) => {
    try {
        // Get customer ID from JWT user (authenticateJWT middleware)
        const customerId = (req.user && req.user.role === 'customer' && req.user.id) || null;
        if (!customerId) {
            return res.status(403).json({ success: false, message: 'Customer access required' });
        }
        const result = await notificationService.markAllAsRead(
            customerId,
            'customer'
        );

        res.json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (error) {
        console.error('Error marking all customer notifications as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark all notifications as read'
        });
    }
});

// Get notification preferences for admin - requires authentication
router.get('/admin/preferences', authenticateJWT, async(req, res) => {
    try {
        // Get admin ID from JWT user (authenticateJWT middleware)
        const adminId = (req.user && req.user.role === 'admin' && req.user.id) || null;
        if (!adminId) {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        const db = require('../config/db');
        const [preferences] = await db.query(`
            SELECT notification_type, email_enabled, in_app_enabled 
            FROM notification_preferences 
            WHERE user_id = ? AND user_type = 'admin'
        `, [adminId]);

        res.json({
            success: true,
            preferences: preferences
        });
    } catch (error) {
        console.error('Error getting admin notification preferences:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get notification preferences'
        });
    }
});

// Update notification preferences for admin - requires authentication
router.put('/admin/preferences', authenticateJWT, async(req, res) => {
    try {
        // Get admin ID from JWT user (authenticateJWT middleware)
        const adminId = (req.user && req.user.role === 'admin' && req.user.id) || null;
        if (!adminId) {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        const { preferences } = req.body;
        const db = require('../config/db');

        for (const pref of preferences) {
            await db.query(`
                INSERT INTO notification_preferences 
                (user_id, user_type, notification_type, email_enabled, in_app_enabled)
                VALUES (?, 'admin', ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                email_enabled = VALUES(email_enabled),
                in_app_enabled = VALUES(in_app_enabled)
            `, [adminId, pref.notification_type, pref.email_enabled, pref.in_app_enabled]);
        }

        res.json({
            success: true,
            message: 'Notification preferences updated'
        });
    } catch (error) {
        console.error('Error updating admin notification preferences:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update notification preferences'
        });
    }
});

// Clean up expired notifications (admin only) - requires authentication
router.delete('/cleanup', authenticateJWT, async(req, res) => {
    try {
        const cleanedCount = await notificationService.cleanupExpiredNotifications();

        res.json({
            success: true,
            message: `Cleaned up ${cleanedCount} expired notifications`
        });
    } catch (error) {
        console.error('Error cleaning up notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clean up notifications'
        });
    }
});

module.exports = router;