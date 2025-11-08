const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const orderProcessingService = require('../services/orderProcessingService');
const ingredientDeductionService = require('../services/ingredientDeductionService');
const adminInventoryService = require('../services/adminInventoryService');
const db = require('../config/db');
// Note: ensureAuthenticated removed - all routes now use authenticateJWT (JWT-only)
const { authenticateJWT } = require('../middleware/jwtAuth');

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
        // Allow images and PDFs
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only image and PDF files are allowed'), false);
        }
    }
});

// Get customer-visible menu with availability status (PUBLIC - no auth required)
router.get('/menu', async(req, res) => {
    try {
        const menuItems = await adminInventoryService.getSynchronizedPOSMenu();
        // Items returned by getSynchronizedPOSMenu already check both visibility flags; 
        // additionally ensure visible_in_customer_menu for safety
        const customerMenu = menuItems.filter(item => item.visible_in_customer_menu && item.is_available);
        res.json({ success: true, menu_items: customerMenu });

    } catch (error) {
        console.error('Get customer menu error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get menu'
        });
    }
});

// Test endpoint to check orders for a specific customer (NO AUTH REQUIRED)
router.get('/test-orders/:customerEmail', async(req, res) => {
    try {
        const { customerEmail } = req.params;

        // Direct query to find orders
        const [orders] = await db.query(`
            SELECT 
                o.order_id,
                o.customer_name,
                o.customer_id,
                o.status,
                o.payment_status,
                o.payment_method,
                o.order_time,
                c.email as customer_email
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            WHERE c.email = ? OR o.customer_name = ? OR o.customer_name LIKE ?
            ORDER BY o.order_time DESC
        `, [customerEmail, customerEmail, `%${customerEmail}%`]);

        res.json({
            success: true,
            customerEmail: customerEmail,
            orders: orders,
            count: orders.length
        });
    } catch (error) {
        console.error('Test orders error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get test orders'
        });
    }
});

// Get customer orders (TEMPORARILY NO AUTH REQUIRED FOR TESTING)
router.get('/orders/:customerEmail', async(req, res) => {
    try {
        const { customerEmail } = req.params;

        if (!customerEmail) {
            return res.status(400).json({
                success: false,
                message: 'Customer email is required'
            });
        }

        console.log('🔍 Customer orders API called with email:', customerEmail);

        const result = await orderProcessingService.getCustomerOrders(customerEmail);
        console.log('🔍 Customer orders API result:', result);
        res.json(result);

    } catch (error) {
        console.error('Get customer orders error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get customer orders'
        });
    }
});

// Customer dashboard data endpoint - requires authentication
router.get('/dashboard', authenticateJWT, async(req, res) => {
    try {
        // Get customer ID from JWT user (authenticateJWT middleware) or query parameter
        const customerId = req.query.customerId || (req.user && req.user.id);

        if (!customerId) {
            return res.status(400).json({
                success: false,
                error: 'Customer ID is required'
            });
        }

        // Verify customer ID matches authenticated user (security check)
        if (req.user && req.user.id && req.user.id.toString() !== customerId.toString()) {
            return res.status(403).json({
                success: false,
                error: 'Access denied: Customer ID mismatch'
            });
        }

        // Get loyalty data
        const [loyaltyResult] = await db.query(`
            SELECT 
                COALESCE(loyalty_points, 0) as points,
                created_at
            FROM customers 
            WHERE id = ?
        `, [customerId]);

        // Compute fallback points from transactions if needed
        let points = (loyaltyResult[0] && loyaltyResult[0].points) || 0;
        if (!points) {
            const [txnAgg] = await db.query(`
                SELECT 
                    COALESCE(SUM(points_earned), 0) AS earned,
                    COALESCE(SUM(points_redeemed), 0) AS redeemed
                FROM loyalty_transactions 
                WHERE customer_id = ?
            `, [customerId]);
            points = Math.max(
                0,
                ((txnAgg[0] && txnAgg[0].earned) || 0) - ((txnAgg[0] && txnAgg[0].redeemed) || 0)
            );

            // Secondary fallback: derive from orders if no transactions
            if (!points) {
                const [orderAgg] = await db.query(`
                    SELECT 
                        COALESCE(SUM(total_price), 0) AS total_paid
                    FROM orders
                    WHERE customer_id = ? AND payment_status = 'paid'
                `, [customerId]);
                const derivedEarned = Math.floor((orderAgg[0] && orderAgg[0].total_paid) || 0);
                // Subtract redeemed from transactions if any
                const redeemed = (txnAgg[0] && txnAgg[0].redeemed) || 0;
                points = Math.max(0, derivedEarned - redeemed);
            }
        }

        // Get current orders
        const [currentOrdersResult] = await db.query(`
            SELECT 
                order_id as id,
                items,
                total_price as total,
                status,
                estimated_ready_time as estimatedTime,
                order_time as orderTime
            FROM orders 
            WHERE customer_id = ? AND status IN ('pending', 'preparing', 'ready')
            ORDER BY order_time DESC
        `, [customerId]);

        // Get recent orders
        const [recentOrdersResult] = await db.query(`
            SELECT 
                order_id as id,
                items,
                total_price as total,
                status,
                order_time as orderTime,
                completed_time as completedTime
            FROM orders 
            WHERE customer_id = ? AND status = 'completed'
            ORDER BY order_time DESC
            LIMIT 10
        `, [customerId]);

        // Get total orders count
        const [totalOrdersResult] = await db.query(`
            SELECT COUNT(*) as total
            FROM orders 
            WHERE customer_id = ?
        `, [customerId]);

        // Get favorites (most ordered items)
        const [favoritesResult] = await db.query(`
            SELECT 
                JSON_EXTRACT(items, '$[*].name') as names,
                COUNT(*) as orderCount
            FROM orders 
            WHERE customer_id = ? AND status = 'completed'
            GROUP BY items
            ORDER BY orderCount DESC
            LIMIT 5
        `, [customerId]);

        // Process loyalty data
        const loyalty = loyaltyResult[0] || {};
        let tier = 'Bronze'; // Placeholder, actual tier calculation needs points
        let nextTier = 'Silver'; // Placeholder, actual tier calculation needs points
        let pointsToNextTier = 100 - points;

        if (points >= 500) {
            tier = 'Gold';
            nextTier = 'Platinum';
            pointsToNextTier = 1000 - points;
        } else if (points >= 200) {
            tier = 'Silver';
            nextTier = 'Gold';
            pointsToNextTier = 500 - points;
        }

        const dashboardData = {
            loyalty: {
                points,
                tier,
                nextTier,
                pointsToNextTier: Math.max(0, pointsToNextTier)
            },
            orders: {
                current: currentOrdersResult.map(order => ({
                    id: order.id,
                    items: JSON.parse(order.items || '[]').map(item => item.name),
                    total: parseFloat(order.total),
                    status: order.status,
                    estimatedTime: order.estimatedTime,
                    orderTime: order.orderTime
                })),
                recent: recentOrdersResult.map(order => ({
                    id: order.id,
                    items: JSON.parse(order.items || '[]').map(item => item.name),
                    total: parseFloat(order.total),
                    status: order.status,
                    orderTime: order.orderTime,
                    completedTime: order.completedTime
                })),
                total: (totalOrdersResult[0] && totalOrdersResult[0].total) || 0
            },
            favorites: favoritesResult.map(item => {
                let itemName = 'Unknown Item';
                try {
                    // item.names might be a JSON string array or already a string
                    if (item.names) {
                        if (typeof item.names === 'string') {
                            // Try to parse as JSON first
                            try {
                                const parsed = JSON.parse(item.names);
                                itemName = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : (parsed || item.names);
                            } catch {
                                // If parsing fails, it's probably already a string
                                itemName = item.names;
                            }
                        } else {
                            itemName = item.names;
                        }
                    }
                } catch (e) {
                    console.error('Error parsing favorite item name:', e);
                    itemName = item.names || 'Unknown Item';
                }
                return {
                    id: Math.random(),
                    name: itemName,
                    category: 'Popular',
                    imageUrl: null
                };
            })
        };

        res.json({
            success: true,
            ...dashboardData
        });

    } catch (error) {
        console.error('Error fetching customer dashboard data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch dashboard data'
        });
    }
});

// ⭐ CRITICAL: Apply JWT authentication to order-related routes (require login for orders)
// Note: Individual routes below should use authenticateJWT middleware
// This global middleware is kept for backward compatibility but routes should explicitly use authenticateJWT
// router.use(authenticateJWT); // Commented out - routes should explicitly use authenticateJWT

// Check if order can be fulfilled
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

// Get customization options for a menu item
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

// Place order with automatic inventory deduction
router.post('/place-order', async(req, res) => {
    try {
        const orderData = req.body;

        // Validate required fields
        if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Order must contain at least one item'
            });
        }

        // First check if order can be fulfilled
        const fulfillmentCheck = await ingredientDeductionService.validateOrderFulfillment(orderData.items);

        if (!fulfillmentCheck.canFulfillOrder) {
            return res.status(400).json({
                success: false,
                message: 'Order cannot be fulfilled due to insufficient inventory',
                fulfillment_details: fulfillmentCheck
            });
        }

        // Process the order
        // Get staff ID from JWT user if available (for admin/staff processing customer orders)
        // req.user is set by authenticateJWT middleware if route is protected
        const staffId = (req.user && (req.user.role === 'admin' || req.user.role === 'staff') && req.user.id) ||
            null;
        const result = await orderProcessingService.processCustomerOrder(orderData, staffId);
        res.json(result);

    } catch (error) {
        console.error('Place order error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to place order'
        });
    }
});

// Checkout endpoint for processing orders with payment
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
            customerId,
            customerName,
            customerEmail,
            customerPhone,
            items,
            totalAmount,
            paymentMethod,
            notes,
            tableNumber
        } = orderData;

        // Validate required fields
        if (!customerName || !customerEmail || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: customerName, customerEmail, items'
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
        const orderType = 'dine_in';
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

        // Validate and clamp table number to 1-6 if provided
        const safeTableNumber = (typeof tableNumber === 'number' && tableNumber >= 1 && tableNumber <= 6) ?
            tableNumber :
            (tableNumber ? Math.min(6, Math.max(1, Number(tableNumber))) : null);

        // Get staff ID from JWT user if available (for admin/staff processing customer orders)
        // req.user is set by authenticateJWT middleware if route is protected
        const staffId = (req.user && (req.user.role === 'admin' || req.user.role === 'staff') && req.user.id) ||
            null;

        // Ensure customer record exists
        let finalCustomerId = customerId;
        if (!finalCustomerId && customerEmail) {
            // Check if customer exists by email
            const [existingCustomer] = await db.query(
                'SELECT id FROM customers WHERE email = ?', [customerEmail]
            );

            if (existingCustomer.length > 0) {
                finalCustomerId = existingCustomer[0].id;
            } else {
                // Create a new customer record
                const [newCustomer] = await db.query(
                    'INSERT INTO customers (email, full_name, username, password, created_at) VALUES (?, ?, ?, ?, NOW())', [customerEmail, customerName, customerEmail.split('@')[0], 'GUEST_ACCOUNT']
                );
                finalCustomerId = newCustomer.insertId;
            }
        }

        const [orderResult] = await db.query(`
            INSERT INTO orders (
                order_id, order_number, customer_id, customer_name, table_number, items, total_price,
                status, payment_status, payment_method, notes, order_type, queue_position, estimated_ready_time, order_time, staff_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE), NOW(), ?, NOW())
        `, [
            orderIdStr,
            orderNumberStr,
            finalCustomerId, // Use the found/created customer ID
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
            staffId
        ]);

        const orderId = orderIdStr;
        const orderDbId = orderResult.insertId; // Get the actual database ID

        // Update order status based on payment method
        // For digital payments, set to pending_verification until receipt is uploaded
        const orderStatus = paymentMethod === 'cash' ? 'pending_verification' : 'pending_verification';
        const paymentStatus = paymentMethod === 'cash' ? 'pending' : 'pending';
        console.log('🔍 Customer order status update:', { orderId, paymentMethod, orderStatus, paymentStatus });
        await db.query('UPDATE orders SET status = ?, payment_status = ? WHERE order_id = ?', [orderStatus, paymentStatus, orderId]);

        // Verify the status was actually updated
        const [verifyResult] = await db.query('SELECT status FROM orders WHERE order_id = ?', [orderId]);
        console.log('🔍 Customer order status verification:', { orderId, actualStatus: verifyResult[0] && verifyResult[0].status, expectedStatus: orderStatus });

        // Handle receipt upload if provided
        if (req.file && (paymentMethod === 'gcash' || paymentMethod === 'paymaya')) {
            const receiptPath = `/uploads/receipts/${req.file.filename}`;
            await db.query('UPDATE orders SET receipt_path = ? WHERE order_id = ?', [receiptPath, orderId]);
            console.log('🔍 Customer order receipt uploaded:', { orderId, receiptPath });
        }

        // Add a small delay to ensure status update is committed
        await new Promise(resolve => setTimeout(resolve, 100));

        // Don't deduct ingredients yet - wait for payment verification
        // Ingredients will be deducted after admin verifies the payment

        // Emit real-time update for new order
        const io = req.app.get('io');
        if (io) {
            console.log('Emitting new-order-received to admin, staff, and customer rooms for order:', orderId);
            // Broadcast to all admin and staff rooms
            io.to('admin-room').emit('new-order-received', {
                orderId,
                status: orderStatus,
                customerName,
                totalPrice: totalAmount,
                orderType,
                tableNumber: safeTableNumber,
                items: items,
                timestamp: new Date()
            });
            io.to('staff-room').emit('new-order-received', {
                orderId,
                status: orderStatus,
                customerName,
                totalPrice: totalAmount,
                orderType,
                tableNumber: safeTableNumber,
                items: items,
                timestamp: new Date()
            });
            // Emit to customer room for real-time updates
            io.to(`customer-${customerEmail}`).emit('order-updated', {
                orderId,
                status: orderStatus,
                customerName,
                totalPrice: totalAmount,
                orderType,
                tableNumber: safeTableNumber,
                items: items,
                timestamp: new Date()
            });
        } else {
            console.log('No Socket.IO instance available');
        }

        // Respond success
        res.json({
            success: true,
            message: 'Order placed successfully',
            orderId: orderId,
            status: orderStatus
        });

    } catch (error) {
        console.error('Checkout error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to process checkout'
        });
    }
});



// Get all customer orders (for admin)
router.get('/orders', async(req, res) => {
    try {
        const result = await orderProcessingService.getAllCustomerOrders();
        res.json(result);

    } catch (error) {
        console.error('Get all customer orders error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get customer orders'
        });
    }
});

// Get customer dashboard data
router.get('/orders/:customerEmail/dashboard', async(req, res) => {
    try {
        const { customerEmail } = req.params;

        if (!customerEmail) {
            return res.status(400).json({
                success: false,
                message: 'Customer email is required'
            });
        }

        const result = await orderProcessingService.getCustomerDashboard(customerEmail);
        res.json(result);

    } catch (error) {
        console.error('Get customer dashboard error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get customer dashboard'
        });
    }
});

// Cancel order
router.post('/cancel-order', async(req, res) => {
    try {
        const { order_id, reason } = req.body;

        if (!order_id) {
            return res.status(400).json({
                success: false,
                message: 'Order ID is required'
            });
        }

        const result = await orderProcessingService.cancelOrder(order_id, reason);
        res.json(result);

    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to cancel order'
        });
    }
});

// Verify cash payment (for admin/staff)
router.post('/verify-payment/:orderId', async(req, res) => {
    try {
        const { orderId } = req.params;
        const { verifiedBy } = req.body;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: 'Order ID is required'
            });
        }

        const result = await orderProcessingService.verifyCashPayment(orderId, verifiedBy, req);
        res.json(result);

    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to verify payment'
        });
    }
});

// Update order status
router.put('/status/:orderId', async(req, res) => {
    try {
        const { orderId } = req.params;
        const { status, updatedBy } = req.body;

        if (!orderId || !status) {
            return res.status(400).json({
                success: false,
                message: 'Order ID and status are required'
            });
        }

        const result = await orderProcessingService.updateOrderStatus(orderId, status, updatedBy);
        res.json(result);

    } catch (error) {
        console.error('Order status update error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update order status'
        });
    }
});

// Customer dashboard data endpoint - requires authentication (duplicate route, keeping for compatibility)
router.get('/dashboard', authenticateJWT, async(req, res) => {
    try {
        // Get customer ID from JWT user (authenticateJWT middleware) or query parameter
        const customerId = req.query.customerId || (req.user && req.user.id);

        if (!customerId) {
            return res.status(400).json({
                success: false,
                error: 'Customer ID is required'
            });
        }

        // Verify customer ID matches authenticated user (security check)
        if (req.user && req.user.id && req.user.id.toString() !== customerId.toString()) {
            return res.status(403).json({
                success: false,
                error: 'Access denied: Customer ID mismatch'
            });
        }

        // Get loyalty data
        const [loyaltyResult] = await db.query(`
            SELECT 
                COALESCE(loyalty_points, 0) as points,
                created_at
            FROM customers 
            WHERE id = ?
        `, [customerId]);

        // Compute fallback points from transactions if needed
        let points = (loyaltyResult[0] && loyaltyResult[0].points) || 0;
        if (!points) {
            const [txnAgg] = await db.query(`
                SELECT 
                    COALESCE(SUM(points_earned), 0) AS earned,
                    COALESCE(SUM(points_redeemed), 0) AS redeemed
                FROM loyalty_transactions 
                WHERE customer_id = ?
            `, [customerId]);
            points = Math.max(
                0,
                ((txnAgg[0] && txnAgg[0].earned) || 0) - ((txnAgg[0] && txnAgg[0].redeemed) || 0)
            );

            // Secondary fallback: derive from orders if no transactions
            if (!points) {
                const [orderAgg] = await db.query(`
                    SELECT 
                        COALESCE(SUM(total_price), 0) AS total_paid
                    FROM orders
                    WHERE customer_id = ? AND payment_status = 'paid'
                `, [customerId]);
                const derivedEarned = Math.floor((orderAgg[0] && orderAgg[0].total_paid) || 0);
                // Subtract redeemed from transactions if any
                const redeemed = (txnAgg[0] && txnAgg[0].redeemed) || 0;
                points = Math.max(0, derivedEarned - redeemed);
            }
        }

        // Get current orders
        const [currentOrdersResult] = await db.query(`
            SELECT 
                order_id as id,
                items,
                total_price as total,
                status,
                estimated_ready_time as estimatedTime,
                created_at as orderTime
            FROM orders 
            WHERE customer_id = ? AND status IN ('pending', 'processing', 'ready')
            ORDER BY created_at DESC
        `, [customerId]);

        // Get recent orders
        const [recentOrdersResult] = await db.query(`
            SELECT 
                order_id as id,
                items,
                total_price as total,
                status,
                created_at as orderTime,
                rating
            FROM orders 
            WHERE customer_id = ? AND status = 'completed'
            ORDER BY created_at DESC
            LIMIT 10
        `, [customerId]);

        // Get total orders count
        const [totalOrdersResult] = await db.query(`
            SELECT COUNT(*) as total
            FROM orders 
            WHERE customer_id = ?
        `, [customerId]);

        // Get favorites (most ordered items)
        const [favoritesResult] = await db.query(`
            SELECT 
                JSON_EXTRACT(items, '$[*].name') as names,
                COUNT(*) as orderCount
            FROM orders 
            WHERE customer_id = ? AND status = 'completed'
            GROUP BY items
            ORDER BY orderCount DESC
            LIMIT 5
        `, [customerId]);

        // Get upcoming events
        const [eventsResult] = await db.query(`
            SELECT 
                id,
                event_type as eventType,
                event_date as eventDate,
                guest_count as guestCount,
                status,
                venue
            FROM events 
            WHERE customer_id = ? AND event_date >= CURDATE()
            ORDER BY event_date ASC
        `, [customerId]);

        // Get recommendations (based on order history)
        const [recommendationsResult] = await db.query(`
            SELECT 
                id,
                name,
                category,
                description,
                image_url as imageUrl,
                base_price as price
            FROM menu_items 
            WHERE is_available = TRUE AND visible_in_customer_menu = TRUE
            ORDER BY RAND()
            LIMIT 6
        `);

        // Process loyalty data
        const loyalty = loyaltyResult[0] || {};
        let tier = 'Bronze'; // Placeholder, actual tier calculation needs points
        let nextTier = 'Silver'; // Placeholder, actual tier calculation needs points
        let pointsToNextTier = 100 - points;

        if (points >= 500) {
            tier = 'Gold';
            nextTier = 'Platinum';
            pointsToNextTier = 1000 - points;
        } else if (points >= 200) {
            tier = 'Silver';
            nextTier = 'Gold';
            pointsToNextTier = 500 - points;
        }

        const dashboardData = {
            loyalty: {
                points,
                tier,
                nextTier,
                pointsToNextTier: Math.max(0, pointsToNextTier)
            },
            orders: {
                current: currentOrdersResult.map(order => ({
                    id: order.id,
                    items: JSON.parse(order.items).map(item => item.name),
                    total: parseFloat(order.total),
                    status: order.status,
                    estimatedTime: order.estimatedTime,
                    orderTime: order.orderTime
                })),
                recent: recentOrdersResult.map(order => ({
                    id: order.id,
                    items: JSON.parse(order.items).map(item => item.name),
                    total: parseFloat(order.total),
                    status: order.status,
                    orderTime: order.orderTime,
                    rating: order.rating
                })),
                total: totalOrdersResult[0].total || 0
            },
            favorites: favoritesResult.map(item => ({
                id: Math.random(), // Generate unique ID
                name: JSON.parse(item.names)[0] || 'Unknown Item',
                category: 'Popular',
                imageUrl: null
            })),
            upcomingEvents: eventsResult.map(event => ({
                id: event.id,
                eventType: event.eventType,
                eventDate: event.eventDate,
                guestCount: event.guestCount,
                status: event.status,
                venue: event.venue
            })),
            recommendations: recommendationsResult.map(item => ({
                id: item.id,
                name: item.name,
                category: item.category,
                description: item.description || '',
                imageUrl: item.imageUrl,
                price: parseFloat(item.price)
            }))
        };

        res.json({
            success: true,
            ...dashboardData
        });

    } catch (error) {
        console.error('Error fetching customer dashboard data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch dashboard data'
        });
    }
});

// Rate order endpoint
router.post('/orders/:orderId/rate', async(req, res) => {
    try {
        const { orderId } = req.params;
        const { rating } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                error: 'Rating must be between 1 and 5'
            });
        }

        await db.query(`
            UPDATE orders 
            SET rating = ?, updated_at = NOW()
            WHERE order_id = ?
        `, [rating, orderId]);

        res.json({
            success: true,
            message: 'Order rated successfully'
        });

    } catch (error) {
        console.error('Error rating order:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to rate order'
        });
    }
});
module.exports = router;