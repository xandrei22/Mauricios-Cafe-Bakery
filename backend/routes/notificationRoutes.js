const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');
const { ensureAdminAuthenticated } = require('../middleware/adminAuthMiddleware');
const { ensureStaffAuthenticated } = require('../middleware/staffAuthMiddleware');
const { ensureAuthenticated } = require('../middleware/authMiddleware');

// Get notifications for admin
router.get('/admin', ensureAdminAuthenticated, async(req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        const notifications = await notificationService.getNotifications(
            req.session.adminUser.id,
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

// Get notifications for staff
router.get('/staff', ensureStaffAuthenticated, async(req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        const notifications = await notificationService.getNotifications(
            req.session.staffUser.id,
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

// Get notifications for customer
router.get('/customer', ensureAuthenticated, async(req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        const notifications = await notificationService.getNotifications(
            req.session.customerUser.id,
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

// Get unread count for admin
router.get('/admin/unread-count', ensureAdminAuthenticated, async(req, res) => {
    try {
        const count = await notificationService.getUnreadCount(
            req.session.adminUser.id,
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

// Get unread count for staff
router.get('/staff/unread-count', ensureStaffAuthenticated, async(req, res) => {
    try {
        const count = await notificationService.getUnreadCount(
            req.session.staffUser.id,
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

// Get unread count for customer
router.get('/customer/unread-count', ensureAuthenticated, async(req, res) => {
    try {
        const count = await notificationService.getUnreadCount(
            req.session.customerUser.id,
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

// Mark notification as read
router.patch('/:id/read', ensureAuthenticated, async(req, res) => {
    try {
        const { id } = req.params;
        const userId = (req.session.adminUser && req.session.adminUser.id) || (req.session.staffUser && req.session.staffUser.id) || (req.session.customerUser && req.session.customerUser.id);
        const userType = (req.session.adminUser && 'admin') || (req.session.staffUser && 'staff') || (req.session.customerUser && 'customer');

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

// Mark all notifications as read for admin
router.patch('/admin/mark-all-read', ensureAdminAuthenticated, async(req, res) => {
    try {
        const result = await notificationService.markAllAsRead(
            req.session.adminUser.id,
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

// Mark all notifications as read for staff
router.patch('/staff/mark-all-read', ensureStaffAuthenticated, async(req, res) => {
    try {
        const result = await notificationService.markAllAsRead(
            req.session.staffUser.id,
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

// Mark all notifications as read for customer
router.patch('/customer/mark-all-read', ensureAuthenticated, async(req, res) => {
    try {
        const result = await notificationService.markAllAsRead(
            req.session.customerUser.id,
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

// Get notification preferences for admin
router.get('/admin/preferences', ensureAdminAuthenticated, async(req, res) => {
    try {
        const db = require('../config/db');
        const [preferences] = await db.query(`
            SELECT notification_type, email_enabled, in_app_enabled 
            FROM notification_preferences 
            WHERE user_id = ? AND user_type = 'admin'
        `, [req.session.adminUser.id]);

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

// Update notification preferences for admin
router.put('/admin/preferences', ensureAdminAuthenticated, async(req, res) => {
    try {
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
            `, [req.session.adminUser.id, pref.notification_type, pref.email_enabled, pref.in_app_enabled]);
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

// Clean up expired notifications (admin only)
router.delete('/cleanup', ensureAdminAuthenticated, async(req, res) => {
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