const db = require('../config/db');
const emailService = require('../utils/emailService');

class NotificationService {
    constructor() {
        this.io = null;
    }

    setupSocketConnection(io) {
        this.io = io;
    }

    /**
     * Create a new notification
     * @param {Object} notificationData - Notification data
     * @param {string} notificationData.type - Type of notification
     * @param {string} notificationData.title - Notification title
     * @param {string} notificationData.message - Notification message
     * @param {Object} notificationData.data - Additional data
     * @param {number} notificationData.userId - Target user ID (optional)
     * @param {string} notificationData.userType - Target user type (optional)
     * @param {string} notificationData.priority - Priority level
     * @param {Date} notificationData.expiresAt - Expiration date (optional)
     */
    async createNotification(notificationData) {
        const connection = await db.getConnection();

        try {
            const {
                type,
                title,
                message,
                data = null,
                userId = null,
                userType = null,
                priority = 'medium',
                expiresAt = null
            } = notificationData;

            // Insert notification
            const [result] = await connection.query(`
                INSERT INTO notifications 
                (user_id, user_type, notification_type, title, message, data, priority, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [userId, userType, type, title, message, JSON.stringify(data), priority, expiresAt]);

            const notificationId = result.insertId;

            // Get the created notification
            const [notification] = await connection.query(`
                SELECT * FROM notifications WHERE id = ?
            `, [notificationId]);

            // Send real-time notification if Socket.IO is available
            if (this.io) {
                this.io.emit('new-notification', notification[0]);
            }

            // Send email notification if enabled
            await this.sendEmailNotification(notification[0]);

            return notification[0];

        } catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Send email notification if user has email enabled for this notification type
     */
    async sendEmailNotification(notification) {
        try {
            // If notification is for a specific user, check their email preferences
            if (notification.user_id && notification.user_type) {
                const [preferences] = await db.query(`
                    SELECT email_enabled FROM notification_preferences 
                    WHERE user_id = ? AND user_type = ? AND notification_type = ?
                `, [notification.user_id, notification.user_type, notification.notification_type]);

                if (preferences.length === 0 || !preferences[0].email_enabled) {
                    return; // User has disabled email for this notification type
                }

                // Get user email
                let userEmail = null;
                if (notification.user_type === 'admin' || notification.user_type === 'staff') {
                    const [users] = await db.query('SELECT email FROM users WHERE id = ?', [notification.user_id]);
                    userEmail = users.length > 0 ? users[0].email : null;
                } else if (notification.user_type === 'customer') {
                    const [customers] = await db.query('SELECT email FROM customers WHERE id = ?', [notification.user_id]);
                    userEmail = customers.length > 0 ? customers[0].email : null;
                }

                if (userEmail) {
                    await this.sendNotificationEmail(userEmail, notification);
                }
            } else {
                // System-wide notification - send to all admins
                const [admins] = await db.query(`
                    SELECT u.email FROM users u
                    JOIN notification_preferences np ON u.id = np.user_id
                    WHERE u.role = 'admin' 
                    AND np.notification_type = ? 
                    AND np.email_enabled = TRUE
                `, [notification.notification_type]);

                for (const admin of admins) {
                    await this.sendNotificationEmail(admin.email, notification);
                }
            }

        } catch (error) {
            console.error('Error sending email notification:', error);
        }
    }

    /**
     * Send notification email
     */
    async sendNotificationEmail(email, notification) {
        try {
            const subject = `[${notification.priority.toUpperCase()}] ${notification.title}`;

            let htmlContent = `
                <div style="font-family: 'Poppins', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #8B4513; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                        <h2 style="margin: 0;">${notification.title}</h2>
                    </div>
                    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px;">
                        <p style="color: #333; font-size: 16px; line-height: 1.6;">${notification.message}</p>
            `;

            // Add specific content based on notification type
            if (notification.data) {
                const data = JSON.parse(notification.data);

                if (notification.notification_type === 'new_order' && data.orderId) {
                    htmlContent += `
                        <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
                            <h3 style="color: #8B4513; margin-top: 0;">Order Details</h3>
                            <p><strong>Order ID:</strong> ${data.orderId}</p>
                            <p><strong>Customer:</strong> ${data.customerName || 'N/A'}</p>
                            <p><strong>Total Amount:</strong> ₱${data.totalAmount || '0'}</p>
                            <p><strong>Payment Method:</strong> ${data.paymentMethod || 'N/A'}</p>
                        </div>
                    `;
                } else if (notification.notification_type === 'low_stock' && data.items) {
                    // Group items by status
                    const criticalItems = data.items.filter(item => item.status === 'out_of_stock');
                    const lowStockItems = data.items.filter(item => item.status === 'low_stock');

                    htmlContent += `
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 15px 0; border: 1px solid #dee2e6;">
                            <h3 style="color: #495057; margin-top: 0; margin-bottom: 15px;">📦 Inventory Alert Summary</h3>
                            <div style="display: flex; gap: 20px; margin-bottom: 15px;">
                                <div style="flex: 1;">
                                    <div style="background-color: #dc3545; color: white; padding: 8px 12px; border-radius: 4px; text-align: center; font-weight: bold;">
                                        ${data.criticalCount || criticalItems.length} Critical
                                    </div>
                                </div>
                                <div style="flex: 1;">
                                    <div style="background-color: #ffc107; color: #212529; padding: 8px 12px; border-radius: 4px; text-align: center; font-weight: bold;">
                                        ${data.lowStockCount || lowStockItems.length} Low Stock
                                    </div>
                                </div>
                                <div style="flex: 1;">
                                    <div style="background-color: #6c757d; color: white; padding: 8px 12px; border-radius: 4px; text-align: center; font-weight: bold;">
                                        ${data.totalCount || data.items.length} Total
                                    </div>
                                </div>
                            </div>
                    `;

                    if (criticalItems.length > 0) {
                        htmlContent += `
                            <div style="margin-bottom: 15px;">
                                <h4 style="color: #dc3545; margin-bottom: 10px;">🚨 Critical Items (Out of Stock)</h4>
                                <div style="background-color: #f8d7da; padding: 10px; border-radius: 4px; border-left: 4px solid #dc3545;">
                        `;
                        criticalItems.forEach(item => {
                            htmlContent += `
                                <div style="margin-bottom: 5px; padding: 5px 0; border-bottom: 1px solid #f5c6cb;">
                                    <strong>${item.name}</strong> - Current: <span style="color: #dc3545; font-weight: bold;">${item.quantity} ${item.unit || 'units'}</span> 
                                    (Reorder Level: ${item.reorderLevel} ${item.unit || 'units'})
                                </div>
                            `;
                        });
                        htmlContent += `</div></div>`;
                    }

                    if (lowStockItems.length > 0) {
                        htmlContent += `
                            <div>
                                <h4 style="color: #856404; margin-bottom: 10px;">⚠️ Low Stock Items</h4>
                                <div style="background-color: #fff3cd; padding: 10px; border-radius: 4px; border-left: 4px solid #ffc107;">
                        `;
                        lowStockItems.forEach(item => {
                            htmlContent += `
                                <div style="margin-bottom: 5px; padding: 5px 0; border-bottom: 1px solid #ffeaa7;">
                                    <strong>${item.name}</strong> - Current: <span style="color: #856404; font-weight: bold;">${item.quantity} ${item.unit || 'units'}</span> 
                                    (Reorder Level: ${item.reorderLevel} ${item.unit || 'units'})
                                </div>
                            `;
                        });
                        htmlContent += `</div></div>`;
                    }

                    htmlContent += `</div>`;
                }
            }

            htmlContent += `
                    </div>
                    <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
                        <p>This is an automated notification from the Coffee Shop Management System.</p>
                    </div>
                </div>
            `;

            await emailService.sendEmail({
                to: email,
                subject: subject,
                html: htmlContent
            });

            // Update notification as email sent
            await db.query(`
                UPDATE notifications 
                SET is_email_sent = TRUE, email_sent_at = NOW() 
                WHERE id = ?
            `, [notification.id]);

            // Log delivery
            await db.query(`
                INSERT INTO notification_delivery_log 
                (notification_id, delivery_method, status, delivered_at)
                VALUES (?, 'email', 'sent', NOW())
            `, [notification.id]);

        } catch (error) {
            console.error('Error sending notification email:', error);

            // Log failed delivery
            await db.query(`
                INSERT INTO notification_delivery_log 
                (notification_id, delivery_method, status, error_message)
                VALUES (?, 'email', 'failed', ?)
            `, [notification.id, error.message]);
        }
    }

    /**
     * Get notifications for a user
     */
    async getNotifications(userId, userType, limit = 50, offset = 0) {
        try {
            const [notifications] = await db.query(`
                SELECT * FROM notifications 
                WHERE (
                    (user_id = ? AND user_type = ?) 
                    OR (user_id IS NULL AND user_type = ?)
                    OR (user_id IS NULL AND user_type IS NULL)
                )
                AND (expires_at IS NULL OR expires_at > NOW())
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            `, [userId, userType, userType, limit, offset]);

            return notifications;

        } catch (error) {
            console.error('Error getting notifications:', error);
            throw error;
        }
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId, userId, userType) {
        try {
            await db.query(`
                UPDATE notifications 
                SET is_read = TRUE 
                WHERE id = ? AND (
                    (user_id = ? AND user_type = ?) 
                    OR (user_id IS NULL AND user_type = ?)
                    OR (user_id IS NULL AND user_type IS NULL)
                )
            `, [notificationId, userId, userType, userType]);

            return { success: true };

        } catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    }

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId, userType) {
        try {
            await db.query(`
                UPDATE notifications 
                SET is_read = TRUE 
                WHERE (
                    (user_id = ? AND user_type = ?) 
                    OR (user_id IS NULL AND user_type = ?)
                    OR (user_id IS NULL AND user_type IS NULL)
                )
            `, [userId, userType, userType]);

            return { success: true };

        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            throw error;
        }
    }

    /**
     * Get unread notification count for a user
     */
    async getUnreadCount(userId, userType) {
        try {
            const [result] = await db.query(`
                SELECT COUNT(*) as count FROM notifications 
                WHERE (
                    (user_id = ? AND user_type = ?) 
                    OR (user_id IS NULL AND user_type = ?)
                    OR (user_id IS NULL AND user_type IS NULL)
                )
                AND is_read = FALSE
                AND (expires_at IS NULL OR expires_at > NOW())
            `, [userId, userType, userType]);

            return result[0].count;

        } catch (error) {
            console.error('Error getting unread count:', error);
            throw error;
        }
    }

    /**
     * Create notification for new order
     */
    async notifyNewOrder(orderData) {
        const notification = await this.createNotification({
            type: 'new_order',
            title: 'New Order Received',
            message: `New order #${orderData.orderId} from ${orderData.customerName} - ₱${orderData.totalAmount}`,
            data: {
                orderId: orderData.orderId,
                customerName: orderData.customerName,
                totalAmount: orderData.totalAmount,
                paymentMethod: orderData.paymentMethod,
                items: orderData.items
            },
            userType: 'admin',
            priority: 'high'
        });

        return notification;
    }

    /**
     * Create notification for low stock
     */
    async notifyLowStock(items) {
        const notification = await this.createNotification({
            type: 'low_stock',
            title: 'Low Stock Alert',
            message: `${items.length} item(s) are running low on stock`,
            data: {
                items: items
            },
            userType: 'admin',
            priority: 'medium'
        });

        return notification;
    }

    /**
     * Create notification for order status update
     */
    async notifyOrderUpdate(orderId, status, customerId = null) {
        const statusMessages = {
            'preparing': 'Your order is being prepared',
            'ready': 'Your order is ready for pickup',
            'completed': 'Your order has been completed',
            'cancelled': 'Your order has been cancelled'
        };

        const notification = await this.createNotification({
            type: 'order_update',
            title: 'Order Status Update',
            message: statusMessages[status] || `Your order status has been updated to ${status}`,
            data: {
                orderId: orderId,
                status: status
            },
            userId: customerId,
            userType: 'customer',
            priority: 'medium'
        });

        return notification;
    }

    /**
     * Create notification for payment update
     */
    async notifyPaymentUpdate(orderId, paymentStatus, customerId = null) {
        const statusMessages = {
            'paid': 'Your payment has been confirmed',
            'failed': 'Your payment failed',
            'refunded': 'Your payment has been refunded'
        };

        const notification = await this.createNotification({
            type: 'payment_update',
            title: 'Payment Status Update',
            message: statusMessages[paymentStatus] || `Your payment status has been updated to ${paymentStatus}`,
            data: {
                orderId: orderId,
                paymentStatus: paymentStatus
            },
            userId: customerId,
            userType: 'customer',
            priority: 'high'
        });

        return notification;
    }

    /**
     * Create notification for event request
     */
    async notifyEventRequest(eventData) {
        const notification = await this.createNotification({
            type: 'event_request',
            title: 'New Event Request',
            message: `New event request for ${eventData.event_date} - ${eventData.cups} cups`,
            data: {
                eventId: eventData.id,
                eventDate: eventData.event_date,
                cups: eventData.cups,
                customerName: eventData.customer_name,
                contactNumber: eventData.contact_number
            },
            userType: 'admin',
            priority: 'medium'
        });

        return notification;
    }

    /**
     * Clean up expired notifications
     */
    async cleanupExpiredNotifications() {
        try {
            const [result] = await db.query(`
                DELETE FROM notifications 
                WHERE expires_at IS NOT NULL AND expires_at < NOW()
            `);

            console.log(`Cleaned up ${result.affectedRows} expired notifications`);
            return result.affectedRows;

        } catch (error) {
            console.error('Error cleaning up expired notifications:', error);
            throw error;
        }
    }
}

module.exports = new NotificationService();