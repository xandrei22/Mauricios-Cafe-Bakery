const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const orderProcessingService = require('../services/orderProcessingService');
const ingredientDeductionService = require('../services/ingredientDeductionService');
const db = require('../config/db');

// Configure multer for receipt uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/receipts/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only image files and PDFs are allowed'), false);
        }
    }
});

// Get customer-visible menu with availability status (PUBLIC - no auth required)
router.get('/menu', async(req, res) => {
    try {
        // Get all menu items first
        const [items] = await db.query(`
            SELECT * FROM menu_items 
            ORDER BY category, name, id DESC
        `);

        // Use consistent deduplication for customer menu
        const { getCustomerMenuItems } = require('../utils/menuDeduplication');
        const uniqueItems = getCustomerMenuItems(items);

        res.json({ success: true, menu_items: uniqueItems });

    } catch (error) {
        console.error('Get guest menu error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get menu'
        });
    }
});

// Check if order can be fulfilled (GUEST - no auth required)
router.post('/check-fulfillment', async(req, res) => {
    try {
        const { items } = req.body;

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({
                success: false,
                message: 'Items array is required'
            });
        }

        const fulfillmentCheck = await orderProcessingService.checkOrderFulfillment(items);
        res.json({ success: true, ...fulfillmentCheck });

    } catch (error) {
        console.error('Check fulfillment error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to check order fulfillment'
        });
    }
});

// Get customization options for a menu item (GUEST - no auth required)
router.get('/menu/:menuItemId/customizations', async(req, res) => {
    try {
        const { menuItemId } = req.params;

        const customizationOptions = await orderProcessingService.getCustomizationOptions(
            parseInt(menuItemId)
        );

        res.json({ success: true, ...customizationOptions });

    } catch (error) {
        console.error('Get customization options error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get customization options'
        });
    }
});

// Guest checkout endpoint for processing orders without authentication
router.post('/checkout', upload.single('receipt'), async(req, res) => {
    try {
        // Handle FormData vs JSON
        let orderData;
        if (req.body.orderData) {
            // FormData - parse the JSON string
            orderData = JSON.parse(req.body.orderData);
        } else {
            // Direct JSON
            orderData = req.body;
        }

        const {
            customerName,
            customerEmail, // optional for true guest checkout
            customerPhone, // optional
            items,
            totalAmount,
            paymentMethod,
            notes,
            tableNumber,
            orderType = 'dine_in'
        } = orderData;

        // Validate required fields (for guests: only name and items are required)
        if (!customerName || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: customerName, items'
            });
        }

        // Check if order can be fulfilled
        const fulfillmentCheck = await ingredientDeductionService.validateOrderFulfillment(items);
        if (!fulfillmentCheck.canFulfillOrder) {
            return res.status(400).json({
                success: false,
                message: 'Order cannot be fulfilled due to insufficient inventory',
                fulfillment_details: fulfillmentCheck
            });
        }

        // Create the order
        const orderStatusInitial = 'pending';
        const paymentStatusInitial = 'pending';
        const orderIdStr = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const orderNumberStr = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

        // Get next queue position for today
        const [queueResult] = await db.query(`
            SELECT COALESCE(MAX(queue_position), 0) + 1 as next_position 
            FROM orders 
            WHERE DATE(order_time) = CURDATE() AND status IN ('pending', 'preparing', 'ready')
        `);
        const queuePosition = queueResult[0].next_position;

        // Validate and clamp table number to 1-6 if provided (only for dine_in)
        const safeTableNumber = orderType === 'dine_in' ?
            ((typeof tableNumber === 'number' && tableNumber >= 1 && tableNumber <= 6) ?
                tableNumber :
                (tableNumber ? Math.min(6, Math.max(1, Number(tableNumber))) : null)) :
            null;

        // Create guest customer record (temporary customer for guest orders)
        let guestCustomerId = null;
        if (customerEmail) {
            // Check if customer exists by email
            const [existingCustomer] = await db.query(
                'SELECT id FROM customers WHERE email = ?', [customerEmail]
            );

            if (existingCustomer.length > 0) {
                guestCustomerId = existingCustomer[0].id;
            } else {
                // Create a new guest customer record
                const [newCustomer] = await db.query(
                    'INSERT INTO customers (email, full_name, username, password, created_at) VALUES (?, ?, ?, ?, NOW())', [customerEmail, customerName, `guest_${Date.now()}`, 'GUEST_ACCOUNT']
                );
                guestCustomerId = newCustomer.insertId;
            }
        }

        // Calculate estimated ready time based on order type
        const estimatedMinutes = orderType === 'take_out' ? 10 : 15;

        const [orderResult] = await db.query(`
            INSERT INTO orders (
                order_id, order_number, customer_id, customer_name, table_number, items, total_price,
                status, payment_status, payment_method, notes, order_type, queue_position, estimated_ready_time, order_time, staff_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), NOW(), ?)
        `, [
            orderIdStr,
            orderNumberStr,
            guestCustomerId, // Use the found/created customer ID
            customerName,
            safeTableNumber,
            JSON.stringify(items),
            totalAmount,
            orderStatusInitial,
            paymentStatusInitial,
            paymentMethod || 'cash',
            notes || null, // notes
            orderType,
            queuePosition,
            estimatedMinutes,
            null // staff_id is null for guest orders
        ]);

        const orderId = orderIdStr;
        const orderDbId = orderResult.insertId; // Get the actual database ID

        // Handle receipt upload if provided
        if (req.file && (paymentMethod === 'gcash' || paymentMethod === 'paymaya')) {
            const receiptPath = `/uploads/receipts/${req.file.filename}`;
            await db.query('UPDATE orders SET receipt_path = ? WHERE order_id = ?', [receiptPath, orderId]);
            console.log('🔍 Guest order receipt uploaded:', { orderId, receiptPath });
        }

        // Update order status based on payment method
        // For digital payments, set to pending_verification until receipt is uploaded
        const orderStatus = paymentMethod === 'cash' ? 'pending_verification' : 'pending_verification';
        const paymentStatus = paymentMethod === 'cash' ? 'pending' : 'pending';
        console.log('🔍 Guest order status update:', { orderId, paymentMethod, orderStatus, paymentStatus });
        await db.query('UPDATE orders SET status = ?, payment_status = ? WHERE order_id = ?', [orderStatus, paymentStatus, orderId]);

        // Verify the status was actually updated
        const [verifyResult] = await db.query('SELECT status FROM orders WHERE order_id = ?', [orderId]);
        console.log('🔍 Guest order status verification:', { orderId, actualStatus: verifyResult[0] && verifyResult[0].status, expectedStatus: orderStatus });

        // Add a small delay to ensure status update is committed
        await new Promise(resolve => setTimeout(resolve, 100));

        // Don't deduct ingredients yet - wait for payment verification
        // Ingredients will be deducted after admin verifies the payment

        // Emit real-time update for new order
        const io = req.app.get('io');
        if (io) {
            console.log('Emitting new-order-received to admin, staff, and customer rooms for guest order:', orderId);
            // Broadcast to all admin and staff rooms
            io.to('admin-room').emit('new-order-received', {
                orderId,
                status: orderStatus,
                customerName,
                totalPrice: totalAmount,
                orderType,
                tableNumber: safeTableNumber,
                items: items,
                timestamp: new Date(),
                isGuest: true
            });
            io.to('staff-room').emit('new-order-received', {
                orderId,
                status: orderStatus,
                customerName,
                totalPrice: totalAmount,
                orderType,
                tableNumber: safeTableNumber,
                items: items,
                timestamp: new Date(),
                isGuest: true
            });
            // Emit to customer room for real-time updates (only if email provided)
            if (customerEmail) {
                io.to(`customer-${customerEmail}`).emit('order-updated', {
                    orderId,
                    status: orderStatus,
                    customerName,
                    totalPrice: totalAmount,
                    orderType,
                    tableNumber: safeTableNumber,
                    items: items,
                    timestamp: new Date(),
                    isGuest: true
                });
            }
        } else {
            console.log('No Socket.IO instance available');
        }

        // Respond success
        res.json({
            success: true,
            message: 'Guest order placed successfully',
            orderId: orderId,
            status: orderStatus
        });

    } catch (error) {
        console.error('Guest checkout error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to process guest checkout'
        });
    }
});

// Get guest order status by order ID only (GUEST - no auth required)
router.get('/order-status/:orderId', async(req, res) => {
    try {
        const { orderId } = req.params;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: 'Order ID is required'
            });
        }

        const [orders] = await db.query(`
            SELECT 
                o.order_id,
                o.customer_name,
                o.status,
                o.payment_status,
                o.payment_method,
                o.order_time,
                o.estimated_ready_time,
                o.items,
                o.total_price,
                o.table_number,
                c.email as customer_email
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            WHERE o.order_id = ?
        `, [orderId]);

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const order = orders[0];
        res.json({
            success: true,
            order: {
                orderId: order.order_id,
                customerName: order.customer_name,
                status: order.status,
                paymentStatus: order.payment_status,
                paymentMethod: order.payment_method,
                orderTime: order.order_time,
                estimatedReadyTime: order.estimated_ready_time,
                items: JSON.parse(order.items || '[]'),
                totalPrice: parseFloat(order.total_price),
                tableNumber: order.table_number,
                customerEmail: order.customer_email
            }
        });

    } catch (error) {
        console.error('Get guest order status error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get order status'
        });
    }
});
