const db = require('../config/db');
const adminInventoryService = require('./adminInventoryService');
const ingredientDeductionService = require('./ingredientDeductionService');
const notificationService = require('./notificationService');
const { v4: uuidv4 } = require('uuid');

class OrderProcessingService {
    constructor() {
        this.io = null;
    }

    setupSocketConnection(io) {
        this.io = io;
    }

    // Process customer order with automatic inventory deduction
    async processCustomerOrder(orderData, staffId = null) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            // Extract data with fallback field names
            const customerEmail = orderData.customerId || orderData.customer_id || orderData.customerEmail;
            const customerName = orderData.customerName || orderData.customer_name;
            const items = orderData.items || [];
            const paymentMethod = orderData.paymentMethod || orderData.payment_method || 'cash';
            const totalPrice = orderData.totalPrice || orderData.total_amount;
            const orderType = orderData.orderType || orderData.order_type || 'dine_in';
            const tableNumber = orderData.tableNumber || orderData.table_number;
            const notes = orderData.notes || '';

            // Validate order data
            if (!items || !Array.isArray(items) || items.length === 0) {
                throw new Error('Order must contain at least one item');
            }

            if (!customerEmail || !customerName) {
                throw new Error('Customer information is required');
            }

            // Check if customer exists, create if not
            let customerId = null;
            if (customerEmail) {
                const [existingCustomer] = await connection.query(
                    'SELECT id FROM customers WHERE email = ?', [customerEmail]
                );

                if (existingCustomer.length > 0) {
                    customerId = existingCustomer[0].id;
                } else {
                    // Create a new customer record
                    const [newCustomer] = await connection.query(
                        'INSERT INTO customers (email, full_name, username, password, created_at) VALUES (?, ?, ?, ?, NOW())', [customerEmail, customerName, customerEmail.split('@')[0], 'GUEST_ACCOUNT']
                    );
                    customerId = newCustomer.insertId;
                }
            }

            const processedItems = [];
            let orderTotal = 0;

            // Process each item in the order
            for (const item of items) {
                const { menu_item_id, quantity = 1, customizations = null, notes: itemNotes = null } = item;

                // Get menu item details
                const [menuItem] = await connection.query(`
                    SELECT * FROM menu_items 
                    WHERE id = ? AND is_available = TRUE
                `, [menu_item_id]);

                if (menuItem.length === 0) {
                    throw new Error(`Menu item ${menu_item_id} is not available`);
                }

                const menuItemData = menuItem[0];

                // Calculate item price (including customization costs)
                let itemPrice = menuItemData.base_price || menuItemData.display_price || 0;
                let customizationCost = 0;

                if (customizations) {
                    // Calculate additional costs for customizations
                    for (const [ingredientId, customization] of Object.entries(customizations)) {
                        if (customization.multiplier && customization.multiplier > 1) {
                            // Extra shots, pumps, etc. - add cost
                            const extraAmount = customization.multiplier - 1;
                            customizationCost += extraAmount * 25; // 25 pesos per extra unit
                        }
                    }
                }

                const totalItemPrice = (itemPrice + customizationCost) * quantity;
                orderTotal += totalItemPrice;

                processedItems.push({
                    menu_item_id,
                    quantity,
                    customizations,
                    notes: itemNotes,
                    custom_price: itemPrice + customizationCost
                });
            }

            // Generate order number
            const [orderNumberResult] = await connection.query('SELECT MAX(CAST(order_number AS UNSIGNED)) as max_num FROM orders');
            const nextOrderNumber = (orderNumberResult[0] && orderNumberResult[0].max_num ? parseInt(orderNumberResult[0].max_num) : 0) + 1;

            // Create order record with proper initial status
            const initialStatus = paymentMethod === 'cash' ? 'pending_verification' : 'pending';
            const initialPaymentStatus = paymentMethod === 'cash' ? 'pending' : 'pending';

            await connection.query(`
                INSERT INTO orders 
                (order_id, order_number, customer_id, customer_name, table_number, items, total_price, 
                 payment_method, order_type, status, payment_status, notes, order_time, queue_position, estimated_ready_time, staff_id)
                VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 0, DATE_ADD(NOW(), INTERVAL 15 MINUTE), ?)
            `, [
                nextOrderNumber,
                customerId,
                customerName,
                tableNumber,
                JSON.stringify(processedItems),
                orderTotal,
                paymentMethod,
                orderType,
                initialStatus,
                initialPaymentStatus,
                notes,
                staffId
            ]);

            // Get the created order ID
            const [orderResult] = await connection.query('SELECT LAST_INSERT_ID() as id, order_id FROM orders WHERE order_number = ?', [nextOrderNumber]);
            const orderId = orderResult[0].id;
            const orderUuid = orderResult[0].order_id;

            // Automatically deduct ingredients for the order
            try {
                const orderItems = processedItems.map(item => ({
                    menuItemId: item.menu_item_id,
                    quantity: item.quantity,
                    customizations: item.customizations,
                    name: item.name
                }));

                // Note: Ingredient deduction now happens when order is marked as 'ready', not during order creation
            } catch (deductionError) {
                console.error(`Failed to deduct ingredients for order ${orderUuid}:`, deductionError);
                // Don't fail the entire order if ingredient deduction fails
                // The order is still created, but inventory won't be updated
            }

            await connection.commit();

            // Notify admin of new order
            if (this.io) {
                this.io.to('admin-room').emit('new-order-received', {
                    orderId: orderUuid,
                    items: processedItems,
                    totalAmount: orderTotal,
                    customerInfo: {
                        id: customerId,
                        email: customerEmail,
                        name: customerName,
                        paymentMethod: paymentMethod
                    },
                    timestamp: new Date(),
                    status: 'pending'
                });
                this.io.to('staff-room').emit('new-order-received', {
                    orderId: orderUuid,
                    items: processedItems,
                    totalAmount: orderTotal,
                    customerInfo: {
                        id: customerId,
                        email: customerEmail,
                        name: customerName,
                        paymentMethod: paymentMethod
                    },
                    timestamp: new Date(),
                    status: 'pending'
                });
            }

            // Create notification for new order
            try {
                await notificationService.notifyNewOrder({
                    orderId: orderUuid,
                    customerName: customerName,
                    totalAmount: orderTotal,
                    paymentMethod: paymentMethod,
                    items: processedItems
                });
            } catch (notificationError) {
                console.error('Failed to create new order notification:', notificationError);
            }

            return {
                success: true,
                order: {
                    orderId: orderUuid,
                    id: orderId,
                    totalAmount: orderTotal,
                    items: processedItems
                }
            };

        } catch (error) {
            await connection.rollback();
            console.error('Order processing error:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // Check if order can be fulfilled based on current inventory
    async checkOrderFulfillment(items) {
        try {
            const fulfillmentCheck = [];

            for (const item of items) {
                const { menu_item_id, quantity = 1, customizations = null } = item;

                // Get recipe ingredients
                const [recipeIngredients] = await db.query(`
                    SELECT 
                        mii.ingredient_id,
                        mii.required_actual_amount,
                        i.name as ingredient_name,
                        i.actual_quantity,
                        i.actual_unit
                    FROM menu_item_ingredients mii
                    JOIN ingredients i ON mii.ingredient_id = i.id
                    WHERE mii.menu_item_id = ? AND i.is_available = TRUE
                `, [menu_item_id]);

                const itemFulfillment = {
                    menu_item_id,
                    quantity,
                    can_fulfill: true,
                    missing_ingredients: [],
                    partial_fulfillment_possible: false
                };

                for (const ingredient of recipeIngredients) {
                    let requiredAmount = ingredient.required_actual_amount * quantity;

                    // Apply customizations
                    if (customizations && customizations[ingredient.ingredient_id]) {
                        const customization = customizations[ingredient.ingredient_id];
                        if (customization.multiplier) {
                            requiredAmount *= customization.multiplier;
                        }
                    }

                    if (ingredient.actual_quantity < requiredAmount) {
                        itemFulfillment.can_fulfill = false;
                        itemFulfillment.missing_ingredients.push({
                            ingredient_name: ingredient.ingredient_name,
                            required: requiredAmount,
                            available: ingredient.actual_quantity,
                            unit: ingredient.actual_unit
                        });

                        // Check if partial fulfillment is possible
                        if (ingredient.actual_quantity > 0) {
                            itemFulfillment.partial_fulfillment_possible = true;
                        }
                    }
                }

                fulfillmentCheck.push(itemFulfillment);
            }

            const canFulfillAll = fulfillmentCheck.every(item => item.can_fulfill);
            const hasPartialOptions = fulfillmentCheck.some(item => item.partial_fulfillment_possible);

            return {
                can_fulfill_order: canFulfillAll,
                has_partial_options: hasPartialOptions,
                item_details: fulfillmentCheck
            };

        } catch (error) {
            console.error('Order fulfillment check error:', error);
            throw error;
        }
    }

    // Get available customization options for a menu item
    async getCustomizationOptions(menuItemId) {
        try {
            // Get base recipe ingredients
            const [recipeIngredients] = await db.query(`
                SELECT 
                    mii.ingredient_id,
                    mii.required_actual_amount,
                    mii.required_display_amount,
                    mii.is_optional,
                    i.name,
                    i.category,
                    i.display_unit,
                    i.actual_quantity,
                    i.conversion_rate
                FROM menu_item_ingredients mii
                JOIN ingredients i ON mii.ingredient_id = i.id
                WHERE mii.menu_item_id = ? AND i.is_available = TRUE
                ORDER BY i.category, i.name
            `, [menuItemId]);

            // Get alternative ingredients by category
            const [alternativeIngredients] = await db.query(`
                SELECT DISTINCT
                    i.id,
                    i.name,
                    i.category,
                    i.display_unit,
                    i.actual_quantity,
                    i.conversion_rate,
                    CASE WHEN i.actual_quantity > 0 THEN TRUE ELSE FALSE END as available
                FROM ingredients i
                WHERE i.category IN (
                    SELECT DISTINCT i2.category 
                    FROM menu_item_ingredients mii2
                    JOIN ingredients i2 ON mii2.ingredient_id = i2.id
                    WHERE mii2.menu_item_id = ?
                ) AND i.is_available = TRUE
                ORDER BY i.category, i.name
            `, [menuItemId]);

            // Check if menu item allows customization
            const [menuItem] = await db.query(`
                SELECT allow_customization FROM menu_items WHERE id = ?
            `, [menuItemId]);

            if (menuItem.length === 0 || !menuItem[0].allow_customization) {
                return {
                    allows_customization: false,
                    recipe_ingredients: recipeIngredients,
                    customization_options: []
                };
            }

            // Group alternatives by category
            const customizationOptions = {};
            alternativeIngredients.forEach(ingredient => {
                if (!customizationOptions[ingredient.category]) {
                    customizationOptions[ingredient.category] = [];
                }
                customizationOptions[ingredient.category].push(ingredient);
            });

            return {
                allows_customization: true,
                recipe_ingredients: recipeIngredients,
                customization_options: customizationOptions
            };

        } catch (error) {
            console.error('Get customization options error:', error);
            throw error;
        }
    }

    // Get customer dashboard data
    async getCustomerDashboard(customerEmail) {
        const connection = await db.getConnection();

        try {
            // Get basic customer info
            const [customers] = await connection.query(`
                SELECT loyalty_points FROM customers WHERE email = ?
            `, [customerEmail]);

            const loyaltyPoints = customers.length > 0 ? customers[0].loyalty_points : 0;

            // Get order statistics
            const [orderStats] = await connection.query(`
                SELECT 
                    COUNT(*) as total_orders,
                    COUNT(CASE WHEN MONTH(order_time) = MONTH(CURRENT_DATE()) AND YEAR(order_time) = YEAR(CURRENT_DATE()) THEN 1 END) as orders_this_month,
                    SUM(CASE WHEN status = 'completed' THEN total_price ELSE 0 END) as total_spent
                FROM orders 
                WHERE customer_name = ? OR customer_id = ?
            `, [customerEmail, customerEmail]);

            // Get current active order
            const [currentOrder] = await connection.query(`
                SELECT 
                    id, status, items, total_price, order_time
                FROM orders 
                WHERE (customer_name = ? OR customer_id = ?) 
                AND status IN ('pending', 'preparing', 'ready')
                ORDER BY order_time DESC
                LIMIT 1
            `, [customerEmail, customerEmail]);

            // Get recent completed orders
            const [recentOrders] = await connection.query(`
                SELECT 
                    id, items, total_price, status, order_time, completed_time
                FROM orders 
                WHERE (customer_name = ? OR customer_id = ?) 
                AND status = 'completed'
                ORDER BY completed_time DESC
                LIMIT 5
            `, [customerEmail, customerEmail]);

            // Parse JSON items for orders
            if (currentOrder.length > 0) {
                try {
                    currentOrder[0].items = JSON.parse(currentOrder[0].items);
                } catch (e) {
                    currentOrder[0].items = [];
                }
            }

            recentOrders.forEach(order => {
                try {
                    order.items = JSON.parse(order.items);
                } catch (e) {
                    order.items = [];
                }
            });

            // Calculate points from last order
            const pointsFromLastOrder = orderStats[0].total_spent ? Math.floor(orderStats[0].total_spent) : 0;

            return {
                success: true,
                dashboard: {
                    loyaltyPoints,
                    pointsFromLastOrder,
                    totalOrders: orderStats[0].total_orders || 0,
                    ordersThisMonth: orderStats[0].orders_this_month || 0,
                    currentOrder: currentOrder.length > 0 ? {
                        id: currentOrder[0].id,
                        status: currentOrder[0].status,
                        items: currentOrder[0].items,
                        total: currentOrder[0].total_price,
                        orderTime: currentOrder[0].order_time
                    } : null,
                    recentOrders: recentOrders.map(order => ({
                        id: order.id,
                        items: order.items,
                        total: order.total_price,
                        status: order.status,
                        orderTime: order.order_time,
                        completedTime: order.completed_time
                    })),
                    popularItems: [] // Could be implemented later
                }
            };

        } catch (error) {
            console.error('Get customer dashboard error:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // Get customer orders
    async getCustomerOrders(customerEmail) {
        const connection = await db.getConnection();

        try {
            // Build inclusive matching using email, exact display name, and name-like email local part
            const emailLocal = (customerEmail || '').split('@')[0] || '';
            const nameLikeFromLocal = emailLocal.replace(/[._-]+/g, ' ').trim();

            // Get orders for the customer by multiple heuristics (case-insensitive)
            const [orders] = await connection.query(`
                SELECT 
                    o.id,
                    o.order_id,
                    o.customer_name,
                    o.items,
                    o.total_price,
                    o.status,
                    o.payment_status,
                    o.payment_method,
                    o.order_type,
                    o.table_number,
                    o.queue_position,
                    o.estimated_ready_time,
                    o.order_time,
                    o.completed_time,
                    o.notes
                FROM orders o
                LEFT JOIN customers c ON o.customer_id = c.id
                WHERE LOWER(c.email) = LOWER(?)
                   OR LOWER(o.customer_name) = LOWER(?)
                   OR LOWER(o.customer_name) LIKE LOWER(?)
                   OR (LENGTH(?) > 0 AND LOWER(o.customer_name) LIKE LOWER(?))
                ORDER BY o.order_time DESC
            `, [
                customerEmail,
                customerEmail,
                `%${customerEmail}%`,
                nameLikeFromLocal,
                `%${nameLikeFromLocal}%`
            ]);

            // Parse JSON items for each order
            orders.forEach(order => {
                try {
                    order.items = JSON.parse(order.items);
                } catch (e) {
                    order.items = [];
                }
            });

            // Debug logging for order statuses
            console.log('🔍 Customer orders API - searching for customerEmail:', customerEmail);
            console.log('🔍 Customer orders API - returning orders with statuses:');
            orders.forEach((order, index) => {
                console.log(`  Order ${index + 1}:`, {
                    orderId: order.order_id,
                    customerName: order.customer_name,
                    status: order.status,
                    statusType: typeof order.status,
                    paymentStatus: order.payment_status,
                    paymentMethod: order.payment_method,
                    fullOrder: order
                });
            });

            if (orders.length === 0) {
                console.log('❌ No orders found for customer email:', customerEmail);
                // Let's also check what orders exist in the database
                const [allOrders] = await connection.query(`
                    SELECT order_id, customer_name, customer_id, status, payment_status 
                    FROM orders 
                    ORDER BY order_time DESC 
                    LIMIT 10
                `);
                console.log('🔍 Recent orders in database:', allOrders);
            }

            return {
                success: true,
                orders: orders
            };

        } catch (error) {
            console.error('Get customer orders error:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // Get all customer orders (for admin)
    async getAllCustomerOrders() {
        const connection = await db.getConnection();

        try {
            // Get all customer orders
            const [orders] = await connection.query(`
                SELECT 
                    o.*,
                    c.email as customer_email,
                    c.full_name as customer_name
                FROM orders o
                LEFT JOIN customers c ON o.customer_id = c.id
                WHERE o.customer_id IS NOT NULL
                ORDER BY o.order_time DESC
            `);

            // Parse JSON items for each order
            orders.forEach(order => {
                try {
                    order.items = JSON.parse(order.items);
                } catch (e) {
                    order.items = [];
                }
            });

            return {
                success: true,
                orders: orders
            };

        } catch (error) {
            console.error('Get all customer orders error:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // Cancel order and restore inventory
    async cancelOrder(orderId, reason = 'Customer cancellation') {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            // Get order details
            const [order] = await connection.query(`
                SELECT * FROM orders WHERE id = ? AND status != 'cancelled'
            `, [orderId]);

            if (order.length === 0) {
                throw new Error('Order not found or already cancelled');
            }

            // Get all inventory deductions for this order
            const [deductions] = await connection.query(`
                SELECT * FROM inventory_deductions WHERE order_id = ?
            `, [orderId]);

            // Restore inventory for each deduction
            for (const deduction of deductions) {
                await connection.query(`
                    UPDATE ingredients 
                    SET actual_quantity = actual_quantity + ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [deduction.deducted_actual_amount, deduction.ingredient_id]);

                // Log the restoration
                await connection.query(`
                    INSERT INTO inventory_transactions 
                    (ingredient_id, transaction_type, actual_amount, display_amount, 
                     previous_actual_quantity, new_actual_quantity, order_id, notes)
                    VALUES (?, 'return', ?, ?, ?, ?, ?, ?)
                `, [
                    deduction.ingredient_id,
                    deduction.deducted_actual_amount,
                    deduction.deducted_display_amount,
                    deduction.new_stock,
                    deduction.previous_stock,
                    orderId,
                    `Inventory restored due to order cancellation: ${reason}`
                ]);
            }

            // Update order status
            await connection.query(`
                UPDATE orders 
                SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP,
                    cancellation_reason = ?
                WHERE id = ?
            `, [reason, orderId]);

            await connection.commit();

            // Emit real-time update
            if (this.io) {
                // Emit to specific order room
                this.io.to(`order-${orderId}`).emit('order-updated', {
                    orderId,
                    status: 'cancelled',
                    timestamp: new Date()
                });
                // Emit to staff and admin rooms
                this.io.to('staff-room').emit('order-updated', {
                    orderId,
                    status: 'cancelled',
                    timestamp: new Date()
                });
                this.io.to('admin-room').emit('order-updated', {
                    orderId,
                    status: 'cancelled',
                    timestamp: new Date()
                });
                // Broadcast to all customers
                this.io.emit('order-updated', {
                    orderId,
                    status: 'cancelled',
                    timestamp: new Date()
                });
            }

            return {
                success: true,
                order_id: orderId,
                restored_items: deductions.length,
                message: 'Order cancelled and inventory restored successfully'
            };

        } catch (error) {
            await connection.rollback();
            console.error('Cancel order error:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // Verify payment for cash orders
    async verifyCashPayment(orderId, verifiedBy = 'staff', req = null) {
        try {
            const connection = await db.getConnection();

            try {
                await connection.beginTransaction();

                // Update order status and payment status
                await connection.query(`
                    UPDATE orders 
                    SET status = 'pending', 
                        payment_status = 'paid',
                        updated_at = NOW()
                    WHERE order_id = ?
                `, [orderId]);

                // Get order details for notification
                const [orderResult] = await connection.query(`
                    SELECT * FROM orders WHERE order_id = ?
                `, [orderId]);

                if (orderResult.length === 0) {
                    throw new Error('Order not found');
                }

                const order = orderResult[0];

                // Log payment verification
                await connection.query(`
                    INSERT INTO payment_transactions 
                    (order_id, payment_method, amount, transaction_id, reference, status, created_at) 
                    VALUES (?, ?, ?, ?, ?, 'completed', NOW())
                `, [
                    orderId,
                    order.payment_method,
                    order.total_price,
                    `CASH_${Date.now()}`,
                    `Verified by ${verifiedBy}`,
                    'completed'
                ]);

                // Note: Ingredient deduction now happens when order is marked as 'ready', not during payment verification

                await connection.commit();

                // Emit real-time update
                if (this.io) {
                    this.io.emit('payment-updated', {
                        orderId,
                        verifiedBy,
                        paymentMethod: order.payment_method,
                        timestamp: new Date(),
                        order: order
                    });

                    this.io.emit('order-updated', {
                        orderId,
                        status: 'pending',
                        paymentStatus: 'paid',
                        timestamp: new Date()
                    });
                }

                // Create notification for payment update
                try {
                    await notificationService.notifyPaymentUpdate(orderId, 'paid', order.customer_id);
                } catch (notificationError) {
                    console.error('Failed to create payment notification:', notificationError);
                }

                return {
                    success: true,
                    message: 'Payment verified successfully',
                    order: order
                };

            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }

        } catch (error) {
            console.error('Payment verification error:', error);
            throw error;
        }
    }

    // Update order status
    async updateOrderStatus(orderId, newStatus, updatedBy = 'staff') {
        try {
            const connection = await db.getConnection();

            try {
                await connection.beginTransaction();

                // Update order status
                await connection.query(`
                    UPDATE orders 
                    SET status = ?, updated_at = NOW()
                    WHERE id = ?
                `, [newStatus, orderId]);

                // Get updated order
                const [orderResult] = await connection.query(`
                    SELECT * FROM orders WHERE id = ?
                `, [orderId]);

                if (orderResult.length === 0) {
                    throw new Error('Order not found');
                }

                const order = orderResult[0];

                // If order is being prepared, deduct inventory (when ingredients are actually used)
                if (newStatus === 'preparing') {
                    try {
                        const items = JSON.parse(order.items);

                        for (const item of items) {
                            const { menu_item_id, quantity = 1, customizations = null } = item;

                            // Import the admin inventory service to use deductInventoryForOrder
                            const adminInventoryService = require('./adminInventoryService');

                            // Deduct inventory for each item in the order
                            await adminInventoryService.deductInventoryForOrder(
                                orderId,
                                menu_item_id,
                                customizations
                            );
                        }

                        console.log(`Inventory deducted for preparing order ${orderId}`);

                    } catch (deductionError) {
                        console.error(`Failed to deduct inventory for preparing order ${orderId}:`, deductionError);
                        // Don't fail the entire status update if inventory deduction fails
                    }
                }

                // If order is being completed, deduct inventory (if not already deducted during preparing)
                if (newStatus === 'completed') {
                    try {
                        // Check if inventory was already deducted during 'preparing' status
                        const [previousStatus] = await connection.query(`
                            SELECT status FROM orders WHERE id = ?
                        `, [orderId]);

                        // Only deduct if it wasn't already deducted during 'preparing'
                        if (previousStatus.length > 0 && previousStatus[0].status !== 'preparing') {
                            const items = JSON.parse(order.items);

                            for (const item of items) {
                                const { menu_item_id, quantity = 1, customizations = null } = item;

                                // Import the admin inventory service to use deductInventoryForOrder
                                const adminInventoryService = require('./adminInventoryService');

                                // Deduct inventory for each item in the order
                                await adminInventoryService.deductInventoryForOrder(
                                    orderId,
                                    menu_item_id,
                                    customizations
                                );
                            }

                            console.log(`Inventory deducted for completed order ${orderId}`);
                        } else {
                            console.log(`Inventory already deducted for order ${orderId} during preparing status`);
                        }

                        // Award loyalty points for completed order
                        try {
                            // Check if loyalty system is enabled
                            const [loyaltySettings] = await connection.query(`
                                SELECT setting_key, setting_value FROM loyalty_settings 
                                WHERE setting_key IN ('loyalty_enabled', 'points_per_peso')
                            `);

                            const settingsObj = {};
                            loyaltySettings.forEach(setting => {
                                settingsObj[setting.setting_key] = setting.setting_value;
                            });

                            // Only award points if loyalty is enabled
                            if (settingsObj.loyalty_enabled === 'true' && order.customer_id) {
                                const pointsPerPeso = parseFloat(settingsObj.points_per_peso || '1');
                                const pointsEarned = Math.floor(order.total_price * pointsPerPeso);

                                if (pointsEarned > 0) {
                                    // Update customer points
                                    await db.query(`
                                        UPDATE customers 
                                        SET loyalty_points = loyalty_points + ? 
                                        WHERE id = ?
                                    `, [pointsEarned, order.customer_id]);

                                    // Record transaction
                                    await db.query(`
                                        INSERT INTO loyalty_transactions 
                                        (customer_id, order_id, points_earned, transaction_type, description) 
                                        VALUES (?, ?, ?, 'earn', ?)
                                    `, [order.customer_id, orderId, pointsEarned, `Earned ${pointsEarned} points from order #${orderId} (₱${order.total_price})`]);

                                    console.log(`Awarded ${pointsEarned} loyalty points to customer ${order.customer_id} for order ${orderId}`);

                                    // Log staff activity (earning points is usually triggered by staff verifying payment or completing order)
                                    try {
                                        const ActivityLogger = require('../utils/activityLogger');
                                        // If this service was called from a staff context and req is available, pass it for realtime emit
                                        const staffId = staffId || (req && req.session && req.session.staffUser && req.session.staffUser.id);
                                        if (staffId) {
                                            await ActivityLogger.logStaffActivity(
                                                staffId,
                                                'loyalty_points_earn',
                                                'customer',
                                                order.customer_id,
                                                null, { points_added: pointsEarned, order_id: orderId },
                                                `Credited ${pointsEarned} loyalty points to customer ${order.customer_id} from order ${orderId}`,
                                                req || null
                                            );
                                        }
                                    } catch (logErr) {
                                        console.error('Failed to log loyalty points earn activity:', logErr);
                                    }
                                }
                            }
                        } catch (pointsError) {
                            console.error(`Failed to award loyalty points for order ${orderId}:`, pointsError);
                            // Don't fail the entire status update if points awarding fails
                        }

                    } catch (deductionError) {
                        console.error(`Failed to deduct inventory for completed order ${orderId}:`, deductionError);
                        // Don't fail the entire status update if inventory deduction fails
                        // The order can still be marked as completed
                    }
                }

                // If order is being cancelled, restore inventory (if it was previously deducted)
                if (newStatus === 'cancelled') {
                    try {
                        // Check if inventory was already deducted (e.g., if order was previously 'completed' or 'preparing')
                        const [previousStatus] = await connection.query(`
                            SELECT status FROM orders WHERE id = ?
                        `, [orderId]);

                        // Only restore inventory if it was previously deducted
                        if (previousStatus.length > 0 && ['completed', 'preparing', 'ready'].includes(previousStatus[0].status)) {

                            const items = JSON.parse(order.items);

                            for (const item of items) {
                                const { menu_item_id, quantity = 1, customizations = null } = item;

                                // Import the admin inventory service to restore inventory
                                const adminInventoryService = require('./adminInventoryService');

                                // Restore inventory for each item in the order
                                await adminInventoryService.restoreInventoryForOrder(
                                    orderId,
                                    menu_item_id,
                                    customizations
                                );
                            }

                            console.log(`Inventory restored for cancelled order ${orderId}`);
                        }

                    } catch (restoreError) {
                        console.error(`Failed to restore inventory for cancelled order ${orderId}:`, restoreError);
                        // Don't fail the entire status update if inventory restoration fails
                    }
                }

                // Emit real-time update
                if (this.io) {
                    // Emit to specific order room
                    this.io.to(`order-${orderId}`).emit('order-updated', {
                        orderId,
                        status: newStatus,
                        timestamp: new Date(),
                        order: order
                    });
                    // Emit to staff and admin rooms
                    this.io.to('staff-room').emit('order-updated', {
                        orderId,
                        status: newStatus,
                        timestamp: new Date(),
                        order: order
                    });
                    this.io.to('admin-room').emit('order-updated', {
                        orderId,
                        status: newStatus,
                        timestamp: new Date(),
                        order: order
                    });
                    // Broadcast to all customers
                    this.io.emit('order-updated', {
                        orderId,
                        status: newStatus,
                        timestamp: new Date(),
                        order: order
                    });
                }

                // Create notification for order status update
                try {
                    await notificationService.notifyOrderUpdate(orderId, newStatus, order.customer_id);
                } catch (notificationError) {
                    console.error('Failed to create order status notification:', notificationError);
                }

                await connection.commit();

                return {
                    success: true,
                    message: `Order status updated to ${newStatus}`,
                    order: order
                };

            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }

        } catch (error) {
            console.error('Order status update error:', error);
            throw error;
        }
    }
}

module.exports = new OrderProcessingService();