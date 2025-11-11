const express = require('express');
const router = express.Router();
const db = require('../config/db');
const qrService = require('../services/qrService');
const ingredientDeductionService = require('../services/ingredientDeductionService');
const { v4: uuidv4 } = require('uuid');

// Generate random 5-character order code (letters and numbers)
function generateShortOrderCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 5; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Create a new order
router.post('/', async(req, res) => {
    try {
        const { customer_info, items, total_amount, payment_method, notes, orderType = 'dine_in' } = req.body;

        // Extract customer info from the frontend structure
        const customerId = customer_info.id || null;
        const customerName = customer_info.name || 'Unknown Customer';
        const tableNumber = customer_info.tableNumber;
        const totalPrice = total_amount;
        const paymentMethod = payment_method;

        // Get staff ID from session (for admin/staff orders)
        const staffId = (req.session.adminUser && req.session.adminUser.id) ||
            (req.session.staffUser && req.session.staffUser.id) ||
            null;

        const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Generate random 5-character display code
        let shortOrderCode;
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 10;
        
        // Ensure uniqueness (check against existing order_number values)
        while (!isUnique && attempts < maxAttempts) {
            shortOrderCode = generateShortOrderCode();
            const [existing] = await db.query(
                'SELECT id FROM orders WHERE order_number = ?',
                [shortOrderCode]
            );
            if (existing.length === 0) {
                isUnique = true;
            }
            attempts++;
        }
        
        // Fallback: if we couldn't generate a unique code, use a timestamp-based one
        if (!isUnique) {
            shortOrderCode = generateShortOrderCode() + Date.now().toString().slice(-2);
        }

        // Get next queue position
        const [queueResult] = await db.query(`
            SELECT COALESCE(MAX(queue_position), 0) + 1 as next_position 
            FROM orders 
            WHERE DATE(order_time) = CURDATE() AND status IN ('pending', 'preparing', 'ready')
        `);
        const queuePosition = queueResult[0].next_position;

        // Calculate estimated ready time (15 minutes from now for dine-in, 10 minutes for takeout)
        const estimatedReadyTime = new Date();
        estimatedReadyTime.setMinutes(estimatedReadyTime.getMinutes() + (orderType === 'takeout' ? 10 : 15));

        // Start transaction
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Create order - Admin POS orders should go to payment verification
            const isImmediatePay = paymentMethod === 'cash' || paymentMethod === 'gcash' || paymentMethod === 'paymaya';
            const orderStatus = isImmediatePay ? 'pending_verification' : 'pending';
            const paymentStatus = isImmediatePay ? 'pending' : 'pending';

            // Insert order with short order code
            await connection.query(`
                INSERT INTO orders 
                (order_id, order_number, customer_id, customer_name, table_number, items, total_price, status, payment_status, payment_method, notes, order_type, queue_position, estimated_ready_time, staff_id, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `, [orderId, shortOrderCode, customerId, customerName, tableNumber, JSON.stringify(items), totalPrice, orderStatus, paymentStatus, paymentMethod, notes, orderType, queuePosition, estimatedReadyTime, staffId]);

            // Generate QR code for payment if needed
            let qrCode = null;
            if (paymentMethod === 'gcash' || paymentMethod === 'paymaya') {
                qrCode = await qrService.generatePaymentQR(orderId, totalPrice, paymentMethod, tableNumber);

                // Update order with QR code
                await connection.query(`
                    UPDATE orders SET qr_code = ? WHERE order_id = ?
                `, [qrCode.qrCode, orderId]);
            }

            // Do NOT deduct inventory here. Deduction now happens only after payment verification
            const orderItems = items.map(item => ({
                menuItemId: item.menu_item_id || item.menuItemId || item.id,
                name: item.name,
                quantity: item.quantity
            }));

            await connection.commit();

            // Emit real-time update
            const io = req.app.get('io');
            if (io) {
                const orderData = {
                    orderId,
                    customerName,
                    items,
                    totalPrice,
                    paymentMethod,
                    orderType,
                    queuePosition,
                    estimatedReadyTime,
                    status: orderStatus,
                    paymentStatus: paymentStatus,
                    timestamp: new Date()
                };

                // Emit to both staff and admin rooms
                io.to('staff-room').emit('new-order-received', orderData);
                io.to('admin-room').emit('new-order-received', orderData);

                // Also emit to specific order room for customer tracking
                io.to(`order-${orderId}`).emit('new-order-received', orderData);
            } else {
                console.log('❌ Socket.IO not available for order creation');
            }

            res.json({
                success: true,
                order: {
                    orderId,
                    shortOrderCode,
                    customerId,
                    customerName,
                    tableNumber,
                    items,
                    totalPrice,
                    paymentMethod,
                    orderType,
                    queuePosition,
                    estimatedReadyTime,
                    status: orderStatus,
                    paymentStatus: paymentStatus,
                    qrCode: qrCode ? qrCode.qrCode : null,
                    paymentUrl: qrCode ? qrCode.url : null
                }
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error creating order:', error);
        console.error('Error stack:', error.stack);
        console.error('Request body:', req.body);
        res.status(500).json({ success: false, error: 'Failed to create order', details: error.message });
    }
});

// Get all orders
router.get('/', async(req, res) => {
    try {
        const { status, customerId, tableNumber, page = 1, limit = 20 } = req.query;

        let sql = 'SELECT * FROM orders WHERE 1=1';
        const params = [];

        // For POS dashboard, only show relevant orders by default
        if (!status) {
            sql += ' AND status IN (?, ?, ?, ?, ?, ?, ?)';
            params.push('pending', 'preparing', 'ready', 'pending_verification', 'confirmed', 'processing', 'cancelled');
        } else if (status) {
            sql += ' AND status = ?';
            params.push(status);
        }

        if (customerId) {
            sql += ' AND customer_id = ?';
            params.push(customerId);
        }

        if (tableNumber) {
            sql += ' AND table_number = ?';
            params.push(tableNumber);
        }

        sql += ' ORDER BY queue_position ASC, order_time ASC';

        // Add pagination
        const offset = (page - 1) * limit;
        sql += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const [orders] = await db.query(sql, params);

        // Process orders and enrich items with menu item names
        const mappedOrders = await Promise.all(orders.map(async(order) => {
            const items = JSON.parse(order.items || '[]');

            // Enrich items with menu item names and prices
            const enrichedItems = await Promise.all(items.map(async(item) => {
                // Check if item already has name and price (customer orders)
                if (item.name && item.price !== undefined) {
                    return item; // Already enriched, return as-is
                }

                // For admin/staff orders, enrich with menu item data
                try {
                    const menuItemId = item.menu_item_id || item.menuItemId;
                    if (!menuItemId) {
                        return {
                            ...item,
                            name: 'Unknown Item',
                            price: item.custom_price || 0,
                            base_price: 0
                        };
                    }

                    const [menuItems] = await db.query('SELECT name, base_price FROM menu_items WHERE id = ?', [menuItemId]);
                    const menuItem = menuItems[0];

                    return {
                        ...item,
                        name: menuItem ? menuItem.name : `Item ${menuItemId}`,
                        price: item.custom_price || (menuItem ? parseFloat(menuItem.base_price) : 0),
                        base_price: menuItem ? parseFloat(menuItem.base_price) : 0
                    };
                } catch (error) {
                    console.error('Error fetching menu item:', error);
                    return {
                        ...item,
                        name: `Item ${item.menu_item_id || item.menuItemId || 'unknown'}`,
                        price: item.custom_price || 0,
                        base_price: 0
                    };
                }
            }));

            return {
                ...order,
                id: order.id || order.order_id,
                orderId: order.order_id,
                shortOrderCode: order.order_number,
                customerName: order.customer_name,
                tableNumber: order.table_number,
                totalPrice: order.total_amount,
                orderTime: order.created_at,
                paymentStatus: order.payment_status,
                paymentMethod: order.payment_method,
                items: enrichedItems,
                placedBy: order.staff_id ? 'staff' : 'customer',
                receiptPath: order.receipt_path
            };
        }));

        // Get total count
        let countSql = 'SELECT COUNT(*) as total FROM orders WHERE 1=1';
        const countParams = [];

        if (status) {
            countSql += ' AND status = ?';
            countParams.push(status);
        }

        if (customerId) {
            countSql += ' AND customer_id = ?';
            countParams.push(customerId);
        }

        if (tableNumber) {
            countSql += ' AND table_number = ?';
            countParams.push(tableNumber);
        }

        const [countResult] = await db.query(countSql, countParams);

        res.json({
            success: true,
            orders: mappedOrders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total,
                totalPages: Math.ceil(countResult[0].total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch orders' });
    }
});

// Get orders by table number
router.get('/table/:tableNumber', async(req, res) => {
    try {
        const { tableNumber } = req.params;
        const { status } = req.query;

        let sql = 'SELECT * FROM orders WHERE table_number = ?';
        const params = [tableNumber];

        if (status) {
            sql += ' AND status = ?';
            params.push(status);
        }

        sql += ' ORDER BY created_at DESC';

        const [orders] = await db.query(sql, params);

        // Parse JSON items and map fields for each order
        orders.forEach(order => {
            order.items = JSON.parse(order.items);
            // Map fields to match frontend interface
            order.id = order.id || order.order_id;
            order.orderId = order.order_id;
            order.customerName = order.customer_name;
            order.tableNumber = order.table_number;
            order.totalPrice = order.total_price;
            order.orderTime = order.order_time;
            order.paymentStatus = order.payment_status;
            order.paymentMethod = order.payment_method;
        });

        res.json({
            success: true,
            orders,
            tableNumber: parseInt(tableNumber)
        });
    } catch (error) {
        console.error('Error fetching orders by table:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch orders' });
    }
});

// Statistics routes must be defined BEFORE param routes like '/:orderId'
// Get order statistics
router.get('/stats', async(req, res) => {
    try {
        const { startDate, endDate } = req.query;

        let dateFilter = '';
        const params = [];

        if (startDate && endDate) {
            dateFilter = 'WHERE order_time BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }

        // Get order statistics (revenue only counts paid orders)
        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as totalOrders,
                SUM(CASE WHEN payment_status = 'paid' THEN total_price ELSE 0 END) as totalRevenue,
                AVG(CASE WHEN payment_status = 'paid' THEN total_price ELSE NULL END) as averageOrderValue,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completedOrders,
                COUNT(CASE WHEN status = 'pending' OR status = 'pending_verification' THEN 1 END) as pendingOrders,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelledOrders
            FROM orders 
            ${dateFilter}
        `, params);

        // Get daily breakdown
        const [dailyStats] = await db.query(`
            SELECT 
                DATE(order_time) as date,
                COUNT(*) as orders,
                SUM(CASE WHEN payment_status = 'paid' THEN total_price ELSE 0 END) as revenue
            FROM orders 
            ${dateFilter}
            GROUP BY DATE(order_time)
            ORDER BY date DESC
            LIMIT 30
        `, params);

        const s = stats[0] || {};
        const parsedStats = {
            totalOrders: Number(s.totalOrders || 0),
            pendingOrders: Number(s.pendingOrders || 0),
            completedOrders: Number(s.completedOrders || 0),
            cancelledOrders: Number(s.cancelledOrders || 0),
            totalRevenue: parseFloat(s.totalRevenue || 0),
            averageOrderValue: parseFloat(s.averageOrderValue || 0)
        };
        const parsedDaily = dailyStats.map(r => ({
            date: r.date,
            orders: Number(r.orders || 0),
            revenue: parseFloat(r.revenue || 0)
        }));

        res.json({
            success: true,
            stats: parsedStats,
            dailyBreakdown: parsedDaily
        });
    } catch (error) {
        console.error('Error fetching order statistics:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
    }
});

// Payments by method (last 30 days or provided range)
router.get('/stats/payments', async(req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let dateFilter = 'WHERE order_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        const params = [];
        if (startDate && endDate) {
            dateFilter = 'WHERE order_time BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }
        const [rows] = await db.query(`
            SELECT payment_method as method, COUNT(*) as count
            FROM orders
            ${dateFilter}
            GROUP BY payment_method
        `, params);
        res.json({ success: true, byMethod: rows });
    } catch (error) {
        console.error('Error fetching payments stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch payments stats' });
    }
});

// Best-selling drinks (exclude customized)
router.get('/stats/best-selling', async(req, res) => {
    try {
        const { startDate, endDate, limit = 10 } = req.query;
        let dateFilter = '';
        const params = [];
        if (startDate && endDate) {
            dateFilter = 'AND order_time BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }
        // Items are stored as JSON; count by item name where custom flag is false or missing
        const [rows] = await db.query(`
            SELECT JSON_UNQUOTE(JSON_EXTRACT(item, '$.name')) AS name,
                   COUNT(*) AS count,
                   SUM(JSON_EXTRACT(item, '$.price')) AS revenue
            FROM (
                SELECT JSON_EXTRACT(items, CONCAT('$[', numbers.n, ']')) AS item, order_time
                FROM orders
                JOIN (
                    SELECT ones.n + tens.n * 10 AS n FROM 
                        (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) ones,
                        (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) tens
                ) numbers
                WHERE numbers.n < JSON_LENGTH(items) ${dateFilter}
            ) expanded
            WHERE JSON_EXTRACT(item, '$.custom') IS NULL OR JSON_EXTRACT(item, '$.custom') = false
            GROUP BY name
            ORDER BY count DESC
            LIMIT ?
        `, [...params, Number(limit)]);
        res.json({ success: true, items: rows });
    } catch (error) {
        console.error('Error fetching best-selling items:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch best-selling items' });
    }
});

// Inventory snapshot for tracking
router.get('/stats/inventory', async(req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT category, SUM(actual_quantity) AS total_quantity
            FROM ingredients
            GROUP BY category
            ORDER BY category
        `);
        res.json({ success: true, inventoryByCategory: rows });
    } catch (error) {
        console.error('Error fetching inventory stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch inventory stats' });
    }
});

// Upcoming events count
router.get('/stats/events', async(req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT COUNT(*) AS upcoming
            FROM events
            WHERE event_date >= CURDATE() AND status IN ('pending','accepted')
        `);
        res.json({ success: true, upcoming: (rows[0] && rows[0].upcoming) || 0 });
    } catch (error) {
        console.error('Error fetching events stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch events stats' });
    }
});

// Repeat customers (last 30 days or provided range)
router.get('/stats/repeat-customers', async(req, res) => {
    try {
        const { startDate, endDate, minOrders = 2, limit = 10 } = req.query;
        let dateFilter = 'WHERE order_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        const params = [];
        if (startDate && endDate) {
            dateFilter = 'WHERE order_time BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }
        const [rows] = await db.query(`
            SELECT customer_id, customer_name, COUNT(*) AS orders
            FROM orders
            ${dateFilter}
            AND customer_id IS NOT NULL
            GROUP BY customer_id, customer_name
            HAVING orders >= ?
            ORDER BY orders DESC
            LIMIT ?
        `, [...params, Number(minOrders), Number(limit)]);
        res.json({ success: true, repeatCustomers: rows, totalRepeat: rows.length });
    } catch (error) {
        console.error('Error fetching repeat customers:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch repeat customers' });
    }
});

// Recent staff activities (cash verification and others)
router.get('/stats/staff-activities', async(req, res) => {
    try {
        const { limit = 20 } = req.query;
        const [rows] = await db.query(`
            SELECT staff_id, action, order_id, details, created_at
            FROM staff_activities
            ORDER BY created_at DESC
            LIMIT ?
        `, [Number(limit)]);
        res.json({ success: true, activities: rows });
    } catch (error) {
        console.error('Error fetching staff activities:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch staff activities' });
    }
});

// Get order by ID
router.get('/:orderId', async(req, res) => {
    try {
        const { orderId } = req.params;

        const [orders] = await db.query(`
            SELECT * FROM orders WHERE order_id = ?
        `, [orderId]);

        if (orders.length === 0) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }

        const order = orders[0];
        order.items = JSON.parse(order.items);

        // Map fields to match frontend interface
        order.id = order.id || order.order_id;
        order.orderId = order.order_id;
        order.customerName = order.customer_name;
        order.tableNumber = order.table_number;
        order.totalPrice = order.total_price;
        order.orderTime = order.order_time;
        order.paymentStatus = order.payment_status;
        order.paymentMethod = order.payment_method;

        res.json({ success: true, order });
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch order' });
    }
});

// Update order status
router.put('/:orderId/status', async(req, res) => {
    try {
        const { orderId } = req.params;
        const { status, paymentStatus } = req.body;

        let updateFields = [];
        let params = [];

        if (status) {
            updateFields.push('status = ?');
            params.push(status);
        }

        if (paymentStatus) {
            updateFields.push('payment_status = ?');
            params.push(paymentStatus);
        }

        if (status === 'completed') {
            updateFields.push('completed_time = NOW()');
            // Automatically set payment status to 'paid' when order is completed
            updateFields.push('payment_status = ?');
            params.push('paid');
        }

        // Update staff_id if admin/staff member is processing this order
        const currentStaffId = (req.session.adminUser && req.session.adminUser.id) ||
            (req.session.staffUser && req.session.staffUser.id) ||
            null;

        if (currentStaffId) {
            updateFields.push('staff_id = ?');
            params.push(currentStaffId);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ success: false, error: 'No fields to update' });
        }

        // Get order details for ingredient deduction
        const [orderResult] = await db.query(`
            SELECT * FROM orders WHERE order_id = ?
        `, [orderId]);

        if (orderResult.length === 0) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }

        const order = orderResult[0];

        params.push(orderId);

        await db.query(`
            UPDATE orders SET ${updateFields.join(', ')} WHERE order_id = ?
        `, params);

        // If status is changing to 'ready', deduct ingredients
        if (status === 'ready') {
            try {
                const items = JSON.parse(order.items || '[]');
                const itemsForDeduction = items.map(item => ({
                    menuItemId: item.menu_item_id || item.id,
                    quantity: item.quantity || 1,
                    customizations: item.customizations || null,
                    name: item.name
                }));

                console.log('🔔 OrderRoutes status update: Deducting ingredients for order', orderId);
                await ingredientDeductionService.deductIngredientsForOrder(order.id, itemsForDeduction, req);
            } catch (deductionError) {
                console.error('Failed to deduct ingredients during status update:', deductionError);
                // Don't fail the status update if ingredient deduction fails
            }
        }

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            // Emit to specific order room
            io.to(`order-${orderId}`).emit('order-updated', {
                orderId,
                status,
                paymentStatus,
                timestamp: new Date()
            });
            // Emit to staff and admin rooms
            io.to('staff-room').emit('order-updated', {
                orderId,
                status,
                paymentStatus,
                timestamp: new Date()
            });
            io.to('admin-room').emit('order-updated', {
                orderId,
                status,
                paymentStatus,
                timestamp: new Date()
            });
            // Broadcast to all customers
            io.emit('order-updated', {
                orderId,
                status,
                paymentStatus,
                timestamp: new Date()
            });
        }

        res.json({ success: true, message: 'Order status updated successfully' });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ success: false, error: 'Failed to update order status' });
    }
});

// Verify payment and process order
router.post('/:orderId/verify-payment', async(req, res) => {
    try {
        const { orderId } = req.params;
        const { verifiedBy, paymentMethod } = req.body;

        // Update payment status and move to preparing status
        await db.query(`
            UPDATE orders 
            SET payment_status = 'paid', status = 'preparing' 
            WHERE order_id = ?
        `, [orderId]);

        // Note: Ingredient deduction now happens when order is marked as 'ready', not during payment verification

        // Insert payment transaction to trigger status change
        await db.query(`
            INSERT INTO payment_transactions 
            (order_id, payment_method, amount, status, verified_by, created_at) 
            VALUES (?, ?, (SELECT total_price FROM orders WHERE order_id = ?), 'completed', ?, NOW())
        `, [orderId, paymentMethod || 'cash', orderId, verifiedBy || 'admin']);

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            // Emit order status update
            io.to(`order-${orderId}`).emit('order-updated', {
                orderId,
                status: 'preparing',
                paymentStatus: 'paid',
                timestamp: new Date()
            });
            io.to('staff-room').emit('order-updated', {
                orderId,
                status: 'preparing',
                paymentStatus: 'paid',
                timestamp: new Date()
            });
            io.to('admin-room').emit('order-updated', {
                orderId,
                status: 'preparing',
                paymentStatus: 'paid',
                timestamp: new Date()
            });
            io.emit('order-updated', {
                orderId,
                status: 'preparing',
                paymentStatus: 'paid',
                timestamp: new Date()
            });
            // Emit payment update
            io.to('staff-room').emit('payment-updated', {
                orderId,
                verifiedBy,
                paymentMethod,
                timestamp: new Date()
            });
        }

        res.json({ success: true, message: 'Payment verified and order processed' });
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ success: false, error: 'Failed to verify payment' });
    }
});

// Process payment
router.post('/:orderId/payment', async(req, res) => {
    try {
        const { orderId } = req.params;
        const { paymentMethod, amount, transactionId } = req.body;

        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Update payment status and move to pending
            await connection.query(`
                UPDATE orders 
                SET payment_status = 'paid', payment_method = ?, status = 'pending' 
                WHERE order_id = ?
            `, [paymentMethod, orderId]);

            // Log payment transaction
            await connection.query(`
                INSERT INTO payment_transactions 
                (order_id, payment_method, amount, transaction_id, status) 
                VALUES (?, ?, ?, ?, 'completed')
            `, [orderId, paymentMethod, amount, transactionId]);

            await connection.commit();

            // Deduct ingredients after successful payment (outside transaction to avoid rollback)
            // Note: Ingredient deduction now happens when order is marked as 'ready', not during payment verification

            // Emit real-time updates
            const io = req.app.get('io');
            if (io) {
                // Emit order status update
                io.to(`order-${orderId}`).emit('order-updated', {
                    orderId,
                    status: 'pending',
                    paymentStatus: 'paid',
                    timestamp: new Date()
                });
                io.to('staff-room').emit('order-updated', {
                    orderId,
                    status: 'pending',
                    paymentStatus: 'paid',
                    timestamp: new Date()
                });
                io.to('admin-room').emit('order-updated', {
                    orderId,
                    status: 'pending',
                    paymentStatus: 'paid',
                    timestamp: new Date()
                });
                io.emit('order-updated', {
                    orderId,
                    status: 'pending',
                    paymentStatus: 'paid',
                    timestamp: new Date()
                });
                // Emit payment update
                io.to(`order-${orderId}`).emit('payment-updated', {
                    orderId,
                    status: 'paid',
                    method: paymentMethod,
                    timestamp: new Date()
                });
                io.to('staff-room').emit('payment-updated', {
                    orderId,
                    status: 'paid',
                    method: paymentMethod,
                    timestamp: new Date()
                });
            }

            res.json({
                success: true,
                message: 'Payment processed successfully',
                orderId,
                paymentStatus: 'paid'
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error processing payment:', error);
        res.status(500).json({ success: false, error: 'Failed to process payment' });
    }
});

// Generate payment QR code
router.post('/:orderId/qr-payment', async(req, res) => {
    try {
        const { orderId } = req.params;
        const { paymentMethod } = req.body;

        // Get order details
        const [orders] = await db.query(`
            SELECT total_price FROM orders WHERE order_id = ?
        `, [orderId]);

        if (orders.length === 0) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }

        const qrCode = await qrService.generatePaymentQR(orderId, orders[0].total_price, paymentMethod);

        // Update order with QR code
        await db.query(`
            UPDATE orders SET qr_code = ? WHERE order_id = ?
        `, [qrCode.qrCode, orderId]);

        res.json({
            success: true,
            qrCode: qrCode.qrCode,
            paymentUrl: qrCode.url,
            orderId
        });
    } catch (error) {
        console.error('Error generating payment QR code:', error);
        res.status(500).json({ success: false, error: 'Failed to generate QR code' });
    }
});

// Get order tracking QR code
router.get('/:orderId/tracking-qr', async(req, res) => {
    try {
        const { orderId } = req.params;

        const qrCode = await qrService.generateOrderTrackingQR(orderId);

        res.json({
            success: true,
            qrCode: qrCode.qrCode,
            trackingUrl: qrCode.url
        });
    } catch (error) {
        console.error('Error generating tracking QR code:', error);
        res.status(500).json({ success: false, error: 'Failed to generate tracking QR code' });
    }
});

// Cancel order
router.post('/:orderId/cancel', async(req, res) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;

        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Update order status
            await connection.query(`
                UPDATE orders 
                SET status = 'cancelled', notes = ? 
                WHERE order_id = ?
            `, [reason, orderId]);

            // Restore inventory
            const [orders] = await connection.query(`
                SELECT items FROM orders WHERE order_id = ?
            `, [orderId]);

            if (orders.length > 0) {
                const items = JSON.parse(orders[0].items);

                for (const item of items) {
                    if (item.ingredients) {
                        for (const ingredient of item.ingredients) {
                            await connection.query(`
                                UPDATE ingredients 
                                SET stock_quantity = stock_quantity + ? 
                                WHERE id = ?
                            `, [ingredient.quantity || 1, ingredient.id]);

                            // Log inventory restoration
                            await connection.query(`
                                INSERT INTO inventory_logs 
                                (ingredient_id, action, quantity_change, previous_quantity, new_quantity, reason, order_id) 
                                SELECT id, 'add', ?, stock_quantity - ?, stock_quantity, 'Order cancellation', ? 
                                FROM ingredients WHERE id = ?
                            `, [ingredient.quantity || 1, ingredient.quantity || 1, orderId, ingredient.id]);
                        }
                    }
                }
            }

            await connection.commit();

            // Emit cancellation update
            const io = req.app.get('io');
            if (io) {
                io.to(`order-${orderId}`).emit('order-updated', {
                    orderId,
                    status: 'cancelled',
                    timestamp: new Date()
                });
                io.to('staff-room').emit('order-updated', {
                    orderId,
                    status: 'cancelled',
                    timestamp: new Date()
                });
            }

            res.json({
                success: true,
                message: 'Order cancelled successfully',
                orderId
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ success: false, error: 'Failed to cancel order' });
    }
});

// Update payment status for an order
router.put('/:orderId/payment-status', async(req, res) => {
    try {
        const { orderId } = req.params;
        const { payment_status, payment_method, qr_code } = req.body;

        // Validate payment status
        const validStatuses = ['pending', 'paid', 'failed'];
        if (!validStatuses.includes(payment_status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid payment status'
            });
        }

        // Get order details
        const [orders] = await db.query(`
            SELECT * FROM orders WHERE order_id = ?
        `, [orderId]);

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        const order = orders[0];

        // Update payment status
        const updateFields = ['payment_status = ?'];
        const updateValues = [payment_status];

        if (payment_method) {
            updateFields.push('payment_method = ?');
            updateValues.push(payment_method);
        }

        if (qr_code) {
            updateFields.push('qr_code = ?');
            updateValues.push(qr_code);
        }

        // If payment is successful, update order status to 'pending'
        if (payment_status === 'paid') {
            updateFields.push('status = ?');
            updateValues.push('pending');
        }

        // Update staff_id if admin/staff member is processing this payment
        const currentStaffId = (req.session.adminUser && req.session.adminUser.id) ||
            (req.session.staffUser && req.session.staffUser.id) ||
            null;

        if (currentStaffId) {
            updateFields.push('staff_id = ?');
            updateValues.push(currentStaffId);
        }

        updateValues.push(orderId);

        await db.query(`
            UPDATE orders SET ${updateFields.join(', ')} WHERE order_id = ?
        `, updateValues);

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            // Emit to specific order room
            io.to(`order-${orderId}`).emit('payment-updated', {
                orderId,
                paymentStatus: payment_status,
                paymentMethod: payment_method,
                timestamp: new Date()
            });
            // Emit to staff and admin rooms
            io.to('staff-room').emit('payment-updated', {
                orderId,
                paymentStatus: payment_status,
                paymentMethod: payment_method,
                timestamp: new Date()
            });
            io.to('admin-room').emit('payment-updated', {
                orderId,
                paymentStatus: payment_status,
                paymentMethod: payment_method,
                timestamp: new Date()
            });
            // Broadcast to all customers
            io.emit('payment-updated', {
                orderId,
                paymentStatus: payment_status,
                paymentMethod: payment_method,
                timestamp: new Date()
            });
        }

        res.json({
            success: true,
            message: `Payment status updated to ${payment_status}`,
            orderId: orderId,
            paymentStatus: payment_status,
            paymentMethod: payment_method
        });

    } catch (error) {
        console.error('Error updating payment status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update payment status'
        });
    }
});

// Get order statistics
router.get('/stats', async(req, res) => {
    try {
        const { startDate, endDate } = req.query;

        let dateFilter = '';
        const params = [];

        if (startDate && endDate) {
            dateFilter = 'WHERE order_time BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }

        // Get order statistics
        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as totalOrders,
                SUM(total_price) as totalRevenue,
                AVG(total_price) as averageOrderValue,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completedOrders,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingOrders,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelledOrders
            FROM orders 
            ${dateFilter}
        `, params);

        // Get daily breakdown
        const [dailyStats] = await db.query(`
            SELECT 
                DATE(order_time) as date,
                COUNT(*) as orders,
                SUM(total_price) as revenue
            FROM orders 
            ${dateFilter}
            GROUP BY DATE(order_time)
            ORDER BY date DESC
            LIMIT 30
        `, params);

        res.json({
            success: true,
            stats: stats[0],
            dailyBreakdown: dailyStats
        });
    } catch (error) {
        console.error('Error fetching order statistics:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
    }
});

// Payments by method (last 30 days or provided range)
router.get('/stats/payments', async(req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let dateFilter = 'WHERE order_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        const params = [];
        if (startDate && endDate) {
            dateFilter = 'WHERE order_time BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }
        const [rows] = await db.query(`
            SELECT payment_method as method, COUNT(*) as count
            FROM orders
            ${dateFilter}
            GROUP BY payment_method
        `, params);
        res.json({ success: true, byMethod: rows });
    } catch (error) {
        console.error('Error fetching payments stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch payments stats' });
    }
});

// Best-selling drinks (exclude customized)
router.get('/stats/best-selling', async(req, res) => {
    try {
        const { startDate, endDate, limit = 10 } = req.query;
        let dateFilter = '';
        const params = [];
        if (startDate && endDate) {
            dateFilter = 'AND order_time BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }
        // Items are stored as JSON; count by item name where custom flag is false or missing
        const [rows] = await db.query(`
            SELECT JSON_UNQUOTE(JSON_EXTRACT(item, '$.name')) AS name,
                   COUNT(*) AS count,
                   SUM(JSON_EXTRACT(item, '$.price')) AS revenue
            FROM (
                SELECT JSON_EXTRACT(items, CONCAT('$[', numbers.n, ']')) AS item, order_time
                FROM orders
                JOIN (
                    SELECT ones.n + tens.n * 10 AS n FROM 
                        (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) ones,
                        (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) tens
                ) numbers
                WHERE numbers.n < JSON_LENGTH(items) ${dateFilter}
            ) expanded
            WHERE JSON_EXTRACT(item, '$.custom') IS NULL OR JSON_EXTRACT(item, '$.custom') = false
            GROUP BY name
            ORDER BY count DESC
            LIMIT ?
        `, [...params, Number(limit)]);
        res.json({ success: true, items: rows });
    } catch (error) {
        console.error('Error fetching best-selling items:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch best-selling items' });
    }
});

// Inventory snapshot for tracking
router.get('/stats/inventory', async(req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT category, SUM(actual_quantity) AS total_quantity
            FROM ingredients
            GROUP BY category
            ORDER BY category
        `);
        res.json({ success: true, inventoryByCategory: rows });
    } catch (error) {
        console.error('Error fetching inventory stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch inventory stats' });
    }
});

// Upcoming events count
router.get('/stats/events', async(req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT COUNT(*) AS upcoming
            FROM events
            WHERE event_date >= CURDATE() AND status IN ('pending','accepted')
        `);
        res.json({ success: true, upcoming: (rows[0] && rows[0].upcoming) || 0 });
    } catch (error) {
        console.error('Error fetching events stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch events stats' });
    }
});

// Repeat customers (last 30 days or provided range)
router.get('/stats/repeat-customers', async(req, res) => {
    try {
        const { startDate, endDate, minOrders = 2, limit = 10 } = req.query;
        let dateFilter = 'WHERE order_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        const params = [];
        if (startDate && endDate) {
            dateFilter = 'WHERE order_time BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }
        const [rows] = await db.query(`
            SELECT customer_id, customer_name, COUNT(*) AS orders
            FROM orders
            ${dateFilter}
            AND customer_id IS NOT NULL
            GROUP BY customer_id, customer_name
            HAVING orders >= ?
            ORDER BY orders DESC
            LIMIT ?
        `, [...params, Number(minOrders), Number(limit)]);
        res.json({ success: true, repeatCustomers: rows, totalRepeat: rows.length });
    } catch (error) {
        console.error('Error fetching repeat customers:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch repeat customers' });
    }
});

// Recent staff activities (cash verification and others)
router.get('/stats/staff-activities', async(req, res) => {
    try {
        const { limit = 20 } = req.query;
        const [rows] = await db.query(`
            SELECT staff_id, action, order_id, details, created_at
            FROM staff_activities
            ORDER BY created_at DESC
            LIMIT ?
        `, [Number(limit)]);
        res.json({ success: true, activities: rows });
    } catch (error) {
        console.error('Error fetching staff activities:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch staff activities' });
    }
});

// Get order queue
router.get('/queue', async(req, res) => {
    try {
        const [orders] = await db.query(`
            SELECT * FROM orders 
            WHERE DATE(order_time) = CURDATE() 
            AND status IN ('pending', 'preparing', 'ready')
            ORDER BY queue_position ASC
        `);

        res.json({ success: true, queue: orders });
    } catch (error) {
        console.error('Error fetching order queue:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch order queue' });
    }
});

// Get customer dashboard data
router.get('/customer/:customerId/dashboard', async(req, res) => {
    try {
        const { customerId } = req.params;

        // Get customer loyalty points
        const [loyaltyResult] = await db.query(`
            SELECT loyalty_points FROM customers WHERE id = ?
        `, [customerId]);
        const loyaltyPoints = loyaltyResult[0] ? loyaltyResult[0].loyalty_points : 0;

        // Get total orders count
        const [totalOrdersResult] = await db.query(`
            SELECT COUNT(*) as total FROM orders WHERE customer_id = ?
        `, [customerId]);
        const totalOrders = totalOrdersResult[0].total;

        // Get current active order (pending, preparing, ready)
        const [currentOrderResult] = await db.query(`
            SELECT order_id, status, items, total_price, order_time 
            FROM orders 
            WHERE customer_id = ? AND status IN ('pending', 'preparing', 'ready')
            ORDER BY order_time DESC 
            LIMIT 1
        `, [customerId]);
        const currentOrder = currentOrderResult[0] ? {
            id: currentOrderResult[0].order_id,
            status: currentOrderResult[0].status,
            items: JSON.parse(currentOrderResult[0].items),
            total: currentOrderResult[0].total_price,
            orderTime: currentOrderResult[0].order_time
        } : null;

        // Get recent orders (last 10)
        const [recentOrdersResult] = await db.query(`
            SELECT order_id, items, total_price, status, order_time, completed_time
            FROM orders 
            WHERE customer_id = ? 
            ORDER BY order_time DESC 
            LIMIT 10
        `, [customerId]);
        const recentOrders = recentOrdersResult.map(order => ({
            id: order.order_id,
            items: JSON.parse(order.items),
            total: order.total_price,
            status: order.status,
            orderTime: order.order_time,
            completedTime: order.completed_time
        }));

        // Get popular items (most ordered items this week)
        const [popularItemsResult] = await db.query(`
            SELECT 
                JSON_EXTRACT(items, '$[*].name') as item_names,
                COUNT(*) as order_count
            FROM orders 
            WHERE customer_id = ? 
            AND order_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            AND status = 'completed'
            GROUP BY items
            ORDER BY order_count DESC
            LIMIT 5
        `, [customerId]);

        const popularItems = popularItemsResult.map(item => {
            const names = JSON.parse(item.item_names);
            return {
                name: names[0] || 'Unknown Item',
                orderCount: item.order_count
            };
        });

        // Get points earned from last order
        const [lastOrderResult] = await db.query(`
            SELECT total_price FROM orders 
            WHERE customer_id = ? AND status = 'completed'
            ORDER BY completed_time DESC 
            LIMIT 1
        `, [customerId]);
        const pointsFromLastOrder = lastOrderResult[0] ? Math.floor(lastOrderResult[0].total_price / 10) : 0;

        // Get orders this month
        const [monthlyOrdersResult] = await db.query(`
            SELECT COUNT(*) as count FROM orders 
            WHERE customer_id = ? 
            AND order_time >= DATE_FORMAT(NOW(), '%Y-%m-01')
        `, [customerId]);
        const ordersThisMonth = monthlyOrdersResult[0].count;

        res.json({
            success: true,
            dashboard: {
                loyaltyPoints,
                pointsFromLastOrder,
                totalOrders,
                ordersThisMonth,
                currentOrder,
                recentOrders,
                popularItems
            }
        });
    } catch (error) {
        console.error('Error fetching customer dashboard data:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch dashboard data' });
    }
});

module.exports = router;