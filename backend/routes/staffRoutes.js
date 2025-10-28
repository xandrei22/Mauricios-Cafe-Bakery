const express = require('express');
const router = express.Router();
const db = require('../config/db');
const ingredientDeductionService = require('../services/ingredientDeductionService');
const orderProcessingService = require('../services/orderProcessingService');
const { ensureStaffAuthenticated } = require('../middleware/staffAuthMiddleware');
const ActivityLogger = require('../utils/activityLogger');

// Apply staff authentication to all staff routes
// Temporarily bypass authentication for testing
// router.use(ensureStaffAuthenticated);

// Lightweight session check for staff (placed after middleware to ensure session is present)
router.get('/check-session', (req, res) => {
    if (req.session && req.session.staffUser) {
        return res.json({
            authenticated: true,
            user: {
                id: req.session.staffUser.id,
                username: req.session.staffUser.username,
                role: req.session.staffUser.role || 'staff'
            }
        });
    }
    return res.status(401).json({ authenticated: false });
});

// Staff dashboard data endpoint
router.get('/dashboard', async(req, res) => {
    try {
        console.log('Fetching staff dashboard data...');

        // Get order metrics
        let orderResult = [{ pending: 0, preparing: 0, ready: 0, completed: 0, total: 0 }];
        try {
            const [rows] = await db.query(`
                SELECT 
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                    COUNT(CASE WHEN status = 'preparing' THEN 1 END) as preparing,
                    COUNT(CASE WHEN status = 'ready' THEN 1 END) as ready,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                    COUNT(*) as total
                FROM orders
            `);
            orderResult = rows;
            console.log('Order metrics:', orderResult[0]);
        } catch (e) {
            console.warn('Staff dashboard: order metrics failed:', e.message);
        }

        // Get today's stats - fix the date field and add payment status filter
        let todayResult = [{ orders: 0, revenue: 0, customers: 0 }];
        try {
            const [rows] = await db.query(`
                SELECT 
                    COUNT(*) as orders,
                    COALESCE(SUM(total_price), 0) as revenue,
                    COUNT(DISTINCT customer_name) as customers
                FROM orders 
                WHERE DATE(order_time) = CURDATE() AND payment_status = 'paid'
            `);
            todayResult = rows;
            console.log('Today stats:', todayResult[0]);
        } catch (e) {
            console.warn('Staff dashboard: today stats failed:', e.message);
        }

        // Get customer metrics separately to match admin dashboard
        let customerMetrics = { total: 0, new: 0, active: 0 };
        try {
            const [customerRows] = await db.query(`
                SELECT 
                    COUNT(DISTINCT customer_name) as total,
                    COUNT(DISTINCT CASE WHEN DATE(order_time) = CURDATE() THEN customer_name END) as new,
                    COUNT(DISTINCT CASE WHEN DATE(order_time) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN customer_name END) as active
                FROM orders
                WHERE payment_status = 'paid'
            `);
            customerMetrics = {
                total: customerRows[0].total || 0,
                new: customerRows[0].new || 0,
                active: customerRows[0].active || 0
            };
            console.log('Customer metrics:', customerMetrics);
        } catch (e) {
            console.warn('Staff dashboard: customer metrics failed:', e.message);
        }

        // Get total revenue to match admin dashboard
        let totalRevenue = 0;
        try {
            const [revenueRows] = await db.query(`
                SELECT 
                    SUM(CASE WHEN order_time >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN total_price ELSE 0 END) as month,
                    (
                        SELECT ((SUM(CASE WHEN order_time >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN total_price ELSE 0 END) - 
                                 SUM(CASE WHEN order_time >= DATE_SUB(NOW(), INTERVAL 60 DAY) AND order_time < DATE_SUB(NOW(), INTERVAL 30 DAY) THEN total_price ELSE 0 END)) / 
                                NULLIF(SUM(CASE WHEN order_time >= DATE_SUB(NOW(), INTERVAL 60 DAY) AND order_time < DATE_SUB(NOW(), INTERVAL 30 DAY) THEN total_price ELSE 0 END), 0)) * 100
                        FROM orders 
                        WHERE order_time >= DATE_SUB(NOW(), INTERVAL 60 DAY)
                    ) as growth
                FROM orders 
                WHERE payment_status = 'paid'
            `);
            totalRevenue = parseFloat(revenueRows[0].month) || 0;
            const growthPercent = parseFloat(revenueRows[0].growth) || 0;
            console.log('Total revenue:', totalRevenue);
        } catch (e) {
            console.warn('Staff dashboard: total revenue failed:', e.message);
        }

        try {
            const [rows] = await db.query(`
                SELECT 
                    id,
                    customer_name as customer,
                    items,
                    total_price as amount,
                    status,
                    order_time as time,
                    table_number as tableNumber
                FROM orders 
                WHERE status IN ('pending', 'pending_verification', 'preparing', 'ready')
                ORDER BY order_time DESC 
                LIMIT 10
            `);
            recentOrdersResult = rows;
        } catch (e) {
            console.warn('Staff dashboard: recent orders failed:', e.message);
        }

        try {
            const [rows] = await db.query(`
                SELECT 
                    id,
                    name,
                    actual_quantity as currentStock,
                    reorder_level as reorderLevel,
                    actual_unit as unit
                FROM ingredients 
                WHERE actual_quantity <= reorder_level
                ORDER BY actual_quantity ASC
                LIMIT 10
            `);
            lowStockResult = rows;
        } catch (e) { console.warn('Staff dashboard: low stock failed:', e.message); }

        // Get total inventory count
        let totalInventoryCount = 0;
        try {
            const [totalRows] = await db.query(`SELECT COUNT(*) as total FROM ingredients WHERE is_available = TRUE`);
            totalInventoryCount = totalRows[0].total || 0;
            console.log('Inventory count:', totalInventoryCount);
        } catch (e) {
            console.warn('Staff dashboard: total inventory count failed:', e.message);
        }

        try {
            const [rows] = await db.query(`
                SELECT 
                    id,
                    customer_name as customer,
                    event_type as eventType,
                    event_date as eventDate,
                    cups as guestCount,
                    status
                FROM events 
                WHERE event_date >= CURDATE() AND status IN ('pending', 'accepted')
                ORDER BY event_date ASC
                LIMIT 10
            `);
            eventsResult = rows;
        } catch (e) { console.warn('Staff dashboard: events failed:', e.message); }

        console.log('Staff dashboard raw data:', {
            orderResult: orderResult[0],
            todayResult: todayResult[0],
            lowStockResult: lowStockResult.length
        });

        const dashboardData = {
            orders: {
                pending: orderResult[0].pending || 0,
                preparing: orderResult[0].preparing || 0,
                ready: orderResult[0].ready || 0,
                completed: orderResult[0].completed || 0,
                total: orderResult[0].total || 0
            },
            todayStats: {
                orders: todayResult[0].orders || 0,
                revenue: parseFloat(todayResult[0].revenue) || 0,
                customers: todayResult[0].customers || 0
            },
            recentOrders: recentOrdersResult.map(order => {
                let itemNames = [];
                try {
                    const parsed = JSON.parse(order.items || '[]');
                    itemNames = Array.isArray(parsed) ? parsed.map(item => item && item.name ? item.name : 'Item') : [];
                } catch (e) {
                    itemNames = [];
                }
                return {
                    id: order.id,
                    customer: order.customer,
                    items: itemNames,
                    amount: parseFloat(order.amount),
                    status: order.status,
                    time: order.time,
                    tableNumber: order.tableNumber
                };
            }),
            lowStockItems: lowStockResult.map(item => ({
                id: item.id,
                name: item.name,
                currentStock: parseFloat(item.currentStock),
                reorderLevel: parseFloat(item.reorderLevel),
                unit: item.unit
            })),
            upcomingEvents: eventsResult.map(event => ({
                id: event.id,
                customer: event.customer,
                eventDate: event.eventDate,
                guestCount: event.guestCount,
                status: event.status
            }))
        };

        const responseData = {
            revenue: {
                today: dashboardData.todayStats.revenue,
                week: 0, // You can add week calculation if needed
                month: totalRevenue,
                growth: 0 // You can add growth calculation if needed
            },
            orders: {
                pending: dashboardData.orders.pending,
                preparing: dashboardData.orders.preparing,
                completed: dashboardData.orders.completed,
                total: dashboardData.orders.total
            },
            customers: {
                total: customerMetrics.total,
                new: customerMetrics.new,
                active: customerMetrics.active
            },
            inventory: {
                total: totalInventoryCount,
                low_stock: dashboardData.lowStockItems.length,
                out_of_stock: dashboardData.lowStockItems.filter(item => item.currentStock <= 0).length
            }
        };

        console.log('Staff dashboard response data:', responseData);

        res.json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error('Error fetching staff dashboard data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch dashboard data'
        });
    }
});

// Staff dashboard: sales over last 7 days
router.get('/dashboard/sales', async(req, res) => {
    try {
        // Get daily sales for the last 7 days
        const [salesData] = await db.query(`
            SELECT 
                DATE(order_time) as order_date,
                COALESCE(SUM(total_price), 0) as total_sales
            FROM orders
            WHERE payment_status = 'paid' 
                AND order_time >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
            GROUP BY DATE(order_time)
            ORDER BY order_date ASC
        `);

        // Build a continuous 7-day series
        const labels = [];
        const data = [];
        const today = new Date();
        const salesMap = new Map(salesData.map(row => [row.order_date.toISOString().split('T')[0], Number(row.total_sales) || 0]));

        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dateKey = d.toISOString().split('T')[0];
            labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
            data.push(salesMap.get(dateKey) || 0);
        }

        console.log('Staff sales chart data:', { labels, data });

        res.json({
            success: true,
            labels: labels,
            data: data
        });
    } catch (error) {
        console.error('Error fetching staff dashboard sales:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch sales data',
            labels: [],
            data: []
        });
    }
});

// Staff dashboard: most used ingredients
router.get('/dashboard/ingredients', async(req, res) => {
    try {
        // First try to get real ingredient usage from orders
        const [orders] = await db.query(`
            SELECT items
            FROM orders
            WHERE payment_status = 'paid'
                AND order_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            ORDER BY order_time DESC
            LIMIT 200
        `);

        const ingredientCounts = new Map();

        for (const row of orders) {
            let parsed = [];
            try {
                parsed = JSON.parse(row.items || '[]');
            } catch (e) {
                parsed = [];
            }

            for (const item of parsed) {
                const menuItemId = item && item.menu_item_id ? item.menu_item_id : null;
                const quantity = Number(item && item.quantity ? item.quantity : 1);

                if (menuItemId) {
                    // Get ingredients for this menu item
                    const [ingredients] = await db.query(`
            SELECT 
                            i.name,
                            mii.required_actual_amount
                        FROM menu_item_ingredients mii
                        JOIN ingredients i ON mii.ingredient_id = i.id
                        WHERE mii.menu_item_id = ?
                    `, [menuItemId]);

                    for (const ingredient of ingredients) {
                        const totalAmount = parseFloat(ingredient.required_actual_amount || 0) * quantity;
                        const currentTotal = ingredientCounts.get(ingredient.name) || 0;
                        ingredientCounts.set(ingredient.name, currentTotal + totalAmount);
                    }
                }
            }
        }

        let labels = [];
        let data = [];

        if (ingredientCounts.size > 0) {
            // Use real data
            const sorted = Array.from(ingredientCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6);

            labels = sorted.map(([name]) => name);
            data = sorted.map(([, amount]) => amount);
        } else {
            // Fallback to available ingredients with random usage
            const [ingredients] = await db.query(`
                SELECT name FROM ingredients 
                WHERE is_available = TRUE 
                ORDER BY name 
            LIMIT 6
        `);

            if (ingredients.length > 0) {
                labels = ingredients.map(ing => ing.name);
                data = ingredients.map(() => Math.random() * 50 + 10);
            } else {
                // Ultimate fallback
                labels = ['Coffee Beans', 'Milk', 'Sugar', 'Vanilla Syrup', 'Chocolate Powder', 'Cinnamon'];
                data = labels.map(() => Math.random() * 50 + 10);
            }
        }

        console.log('Staff ingredients chart data:', { labels, data });

        res.json({
            success: true,
            labels: labels,
            data: data
        });
    } catch (error) {
        console.error('Error fetching staff dashboard ingredients:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch ingredients data',
            labels: [],
            data: []
        });
    }
});

// Staff dashboard: most bought menu items (from recent orders)
router.get('/dashboard/menu-items', async(req, res) => {
    try {
        // Fetch recent orders and aggregate ALL items with proper menu item names
        const [orders] = await db.query(`
            SELECT items
            FROM orders
            WHERE payment_status = 'paid'
                AND order_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            ORDER BY order_time DESC
            LIMIT 200
        `);

        const itemCounts = new Map();

        for (const row of orders) {
            let parsed = [];
            try {
                parsed = JSON.parse(row.items || '[]');
            } catch (e) {
                parsed = [];
            }

            for (const item of parsed) {
                const itemName = item && item.name ? item.name : null;
                if (itemName && itemName !== 'Unknown Item' && itemName !== 'Unknown') {
                    const quantity = Number(item && item.quantity ? item.quantity : 1);
                    const currentTotal = itemCounts.get(itemName) || 0;
                    itemCounts.set(itemName, currentTotal + quantity);
                }
                // Skip items with no name or "Unknown" names
            }
        }

        let labels = [];
        let data = [];

        if (itemCounts.size > 0) {
            // Use real data
            const sorted = Array.from(itemCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            labels = sorted.map(([name]) => name);
            data = sorted.map(([, quantity]) => quantity);
        } else {
            // Fallback to sample menu items
            const sampleItems = ['Cappuccino', 'Latte', 'Americano', 'Espresso', 'Mocha'];
            labels = sampleItems.slice(0, 5);
            data = labels.map(() => Math.floor(Math.random() * 20) + 5);
        }

        console.log('Staff menu items chart data:', { labels, data });

        res.json({
            success: true,
            labels: labels,
            data: data
        });
    } catch (error) {
        console.error('Error fetching staff dashboard menu items:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch menu items data',
            labels: [],
            data: []
        });
    }
});

// Create sample data for testing staff dashboard charts
router.post('/dashboard/create-sample-data', async(req, res) => {
    try {
        console.log('Creating sample data for staff dashboard charts...');

        // Check if we already have orders
        const [existingOrders] = await db.query('SELECT COUNT(*) as count FROM orders WHERE payment_status = "paid"');
        if (existingOrders[0].count > 0) {
            console.log('Orders already exist, skipping sample data creation');
            return res.json({ success: true, message: 'Data already exists' });
        }

        // Create sample orders for the last 7 days
        const sampleOrders = [];
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
            const orderDate = new Date(today);
            orderDate.setDate(today.getDate() - i);
            orderDate.setHours(10 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60), 0, 0);

            const orderValue = 50 + Math.random() * 200; // Random order value between 50-250

            sampleOrders.push({
                order_id: `SAMPLE-${Date.now()}-${i}`,
                customer_name: `Customer ${i + 1}`,
                customer_email: `customer${i + 1}@example.com`,
                total_price: orderValue,
                payment_status: 'paid',
                status: 'completed',
                payment_method: 'cash',
                order_time: orderDate,
                items: JSON.stringify([{
                    menu_item_id: 1,
                    name: 'Cappuccino',
                    quantity: 1,
                    price: orderValue
                }])
            });
        }

        // Insert sample orders
        for (const order of sampleOrders) {
            await db.query(`
                INSERT INTO orders (order_id, customer_name, customer_email, total_price, payment_status, status, payment_method, order_time, items, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `, [
                order.order_id,
                order.customer_name,
                order.customer_email,
                order.total_price,
                order.payment_status,
                order.status,
                order.payment_method,
                order.order_time,
                order.items
            ]);
        }

        console.log(`Created ${sampleOrders.length} sample orders for staff dashboard`);
        res.json({ success: true, message: `Created ${sampleOrders.length} sample orders` });

    } catch (error) {
        console.error('Error creating sample data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create sample data'
        });
    }
});

// Staff dashboard: staff performance data
router.get('/dashboard/staff-performance', async(req, res) => {
    try {
        const { period = 'month' } = req.query; // 'day' or 'month'

        let dateFormat, groupBy, interval;

        if (period === 'day') {
            dateFormat = '%Y-%m-%d';
            groupBy = 'DATE(o.order_time)';
            interval = 'INTERVAL 7 DAY';
        } else {
            dateFormat = '%Y-%m';
            groupBy = 'DATE_FORMAT(o.order_time, "%Y-%m")';
            interval = 'INTERVAL 6 MONTH';
        }

        // Get staff performance data
        const [staffData] = await db.query(`
            SELECT 
                CASE 
                    WHEN CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) = ' ' 
                    THEN CONCAT('Staff ', u.id)
                    ELSE TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')))
                END as staff_name,
                u.id as staff_id,
                ${groupBy} as period,
                SUM(o.total_price) as total_sales,
                COUNT(o.id) as order_count,
                AVG(o.total_price) as avg_order_value
            FROM orders o
            JOIN users u ON o.staff_id = u.id
            WHERE o.payment_status = 'paid'
                AND o.order_time >= DATE_SUB(NOW(), ${interval})
            GROUP BY u.id, u.first_name, u.last_name, ${groupBy}
            ORDER BY period DESC, total_sales DESC
        `);

        // Get daily sales trend for the last 7 days or monthly trend for last 6 months
        const [trendData] = await db.query(`
            SELECT 
                ${groupBy} as period,
                SUM(o.total_price) as total_sales,
                COUNT(o.id) as order_count
            FROM orders o
            WHERE o.payment_status = 'paid'
                AND o.order_time >= DATE_SUB(NOW(), ${interval})
            GROUP BY ${groupBy}
            ORDER BY period ASC
        `);

        // Process staff data
        const staffPerformance = {};
        staffData.forEach(item => {
            const key = item.staff_id;
            if (!staffPerformance[key]) {
                staffPerformance[key] = {
                    staff_name: item.staff_name,
                    staff_id: item.staff_id,
                    periods: [],
                    total_sales: 0,
                    total_orders: 0,
                    avg_order_value: 0
                };
            }

            staffPerformance[key].periods.push({
                period: item.period,
                sales: parseFloat(item.total_sales) || 0,
                orders: parseInt(item.order_count) || 0,
                avg_order_value: parseFloat(item.avg_order_value) || 0
            });

            staffPerformance[key].total_sales += parseFloat(item.total_sales) || 0;
            staffPerformance[key].total_orders += parseInt(item.order_count) || 0;
        });

        // Calculate average order value for each staff
        Object.values(staffPerformance).forEach(staff => {
            staff.avg_order_value = staff.total_orders > 0 ? staff.total_sales / staff.total_orders : 0;
        });

        // Sort staff by total sales
        const sortedStaff = Object.values(staffPerformance)
            .sort((a, b) => b.total_sales - a.total_sales)
            .slice(0, 10); // Top 10 staff

        // Process trend data
        const trend = {
            labels: trendData.map(item => item.period),
            sales: trendData.map(item => parseFloat(item.total_sales) || 0),
            orders: trendData.map(item => parseInt(item.order_count) || 0)
        };

        res.json({
            success: true,
            period: period,
            staff_performance: sortedStaff,
            trend: trend
        });
    } catch (error) {
        console.error('Staff performance error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch staff performance data'
        });
    }
});

// Get all orders for staff management
router.get('/orders', async(req, res) => {
    try {
        const [ordersResult] = await db.query(`
            SELECT 
                order_id as id,
                customer_name,
                items,
                total_price,
                status,
                order_type,
                table_number,
                notes,
                order_time as order_time,
                estimated_ready_time,
                payment_status,
                payment_method,
                receipt_path
            FROM orders 
            WHERE status IN ('pending', 'preparing', 'ready', 'pending_verification', 'confirmed', 'processing', 'cancelled')
            ORDER BY queue_position ASC, order_time ASC
        `);

        // Process orders and enrich items with menu item names
        const orders = await Promise.all(ordersResult.map(async(order) => {
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
                orderId: order.id, // Map id to orderId for frontend compatibility
                order_id: order.id, // Also include order_id for compatibility
                id: order.id,
                customer_name: order.customer_name,
                items: enrichedItems,
                total_price: parseFloat(order.total_price),
                status: order.status,
                order_type: order.order_type,
                table_number: order.table_number,
                order_time: order.order_time,
                estimated_ready_time: order.estimated_ready_time,
                notes: order.notes,
                paymentStatus: order.payment_status,
                paymentMethod: order.payment_method,
                receiptPath: order.receipt_path
            };
        }));

        res.json({
            success: true,
            orders
        });

    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch orders'
        });
    }
});

// Update order status
router.put('/orders/:orderId/status', async(req, res) => {
    try {
        const { orderId } = req.params;
        const { status, cancelledBy, cancellationReason, cancelledAt } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                error: 'Status is required'
            });
        }

        // Get current order status and full order details for logging and deduction
        const [currentOrder] = await db.query('SELECT * FROM orders WHERE order_id = ?', [orderId]);
        const oldStatus = currentOrder[0] ? currentOrder[0].status : undefined;
        const order = currentOrder[0];

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        // If cancelling, record additional cancellation details
        if (status === 'cancelled') {
            await db.query(`
                UPDATE orders 
                SET 
                    status = ?, 
                    updated_at = NOW(),
                    cancelled_by = ?,
                    cancellation_reason = ?,
                    cancelled_at = ?
                WHERE order_id = ?
            `, [
                status,
                cancelledBy || (req.session.staffUser && req.session.staffUser.id) || 'staff',
                cancellationReason || 'Cancelled by staff',
                cancelledAt || new Date(),
                orderId
            ]);
        } else {
            // Regular status update
            let updateQuery = 'UPDATE orders SET status = ?, updated_at = NOW()';
            let updateParams = [status];

            // Automatically set payment status to 'paid' when order is completed
            if (status === 'completed') {
                updateQuery += ', payment_status = ?, completed_time = NOW()';
                updateParams.push('paid');
            }

            updateQuery += ' WHERE order_id = ?';
            updateParams.push(orderId);

            await db.query(updateQuery, updateParams);

            // If completed, award loyalty points
            if (status === 'completed' && order.customer_id) {
                try {
                    const [loyaltySettings] = await db.query(`
                        SELECT setting_key, setting_value FROM loyalty_settings 
                        WHERE setting_key IN ('loyalty_enabled', 'points_per_peso')
                    `);
                    const settingsObj = {};
                    loyaltySettings.forEach((s) => { settingsObj[s.setting_key] = s.setting_value; });
                    if (settingsObj.loyalty_enabled === 'true') {
                        const pointsPerPeso = parseFloat(settingsObj.points_per_peso || '1');
                        const pointsEarned = Math.floor((order.total_price || 0) * pointsPerPeso);
                        if (pointsEarned > 0) {
                            await db.query(`
                                UPDATE customers SET loyalty_points = loyalty_points + ? WHERE id = ?
                            `, [pointsEarned, order.customer_id]);
                            await db.query(`
                                INSERT INTO loyalty_transactions 
                                (customer_id, order_id, points_earned, transaction_type, description) 
                                VALUES (?, ?, ?, 'earn', ?)
                            `, [order.customer_id, order.id, pointsEarned, `Earned ${pointsEarned} points from order #${order.order_id} (₱${order.total_price})`]);
                        }
                    }
                } catch (pointsErr) {
                    console.error('Staff status: awarding points failed:', pointsErr);
                }
            }
        }

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

                console.log('🔔 Staff status update: Deducting ingredients for order', orderId);
                await ingredientDeductionService.deductIngredientsForOrder(order.id, itemsForDeduction, req);
            } catch (deductionError) {
                console.error('Failed to deduct ingredients during status update:', deductionError);
                // Don't fail the status update if ingredient deduction fails
            }
        }

        // Log the activity
        if (req.session.staffUser && req.session.staffUser.id) {
            await ActivityLogger.logStaffActivity(
                req.session.staffUser.id,
                'order_status_update',
                'order',
                orderId, { status: oldStatus }, { status: status },
                `Updated order ${orderId} status from ${oldStatus} to ${status}`,
                req
            );
        }

        // Emit realtime status change for both staff and admin dashboards
        try {
            const io = req.app.get('io');
            if (io) {
                const emitId = (order && (order.order_id || order.id)) || orderId;
                const payload = { orderId: emitId, status };
                io.to(`order-${emitId}`).emit('order-updated', payload);
                io.to('staff-room').emit('order-updated', payload);
                io.to('admin-room').emit('order-updated', payload);
            }
        } catch (e) { console.warn('Emit order-updated failed:', e.message); }

        res.json({
            success: true,
            message: 'Order status updated successfully'
        });

    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update order status'
        });
    }
});

// Get order details
router.get('/orders/:orderId', async(req, res) => {
    try {
        const { orderId } = req.params;

        const [orderResult] = await db.query(`
            SELECT 
                order_id as id,
                customer_name,
                items,
                total_price,
                status,
                order_type,
                table_number,
                order_time as order_time,
                estimated_ready_time,
                notes,
                payment_status,
                payment_method
            FROM orders 
            WHERE order_id = ?
        `, [orderId]);

        if (orderResult.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        const order = orderResult[0];
        const orderData = {
            id: order.id,
            customer_name: order.customer_name,
            items: JSON.parse(order.items || '[]'),
            total_price: parseFloat(order.total_price),
            status: order.status,
            order_type: order.order_type,
            table_number: order.table_number,
            order_time: order.order_time,
            estimated_ready_time: order.estimated_ready_time,
            notes: order.notes,
            payment_status: order.payment_status,
            payment_method: order.payment_method
        };

        res.json({
            success: true,
            order: orderData
        });

    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch order details'
        });
    }
});

// Get inventory alerts
router.get('/inventory/alerts', async(req, res) => {
    try {
        const [alertsResult] = await db.query(`
            SELECT 
                id,
                name,
                category,
                actual_quantity,
                actual_unit,
                reorder_level,
                reorder_unit,
                supplier,
                cost_per_unit,
                last_updated
            FROM ingredients 
            WHERE actual_quantity <= reorder_level
            ORDER BY actual_quantity ASC
        `);

        const alerts = alertsResult.map(item => ({
            id: item.id,
            name: item.name,
            category: item.category,
            actual_quantity: parseFloat(item.actual_quantity),
            actual_unit: item.actual_unit,
            reorder_level: parseFloat(item.reorder_level),
            reorder_unit: item.reorder_unit,
            supplier: item.supplier,
            cost_per_unit: parseFloat(item.cost_per_unit),
            last_updated: item.last_updated
        }));

        res.json({
            success: true,
            alerts
        });

    } catch (error) {
        console.error('Error fetching inventory alerts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch inventory alerts'
        });
    }
});

// Get all inventory items for staff
router.get('/inventory', async(req, res) => {
    try {
        const [inventoryResult] = await db.query(`
            SELECT 
                id,
                name,
                actual_quantity,
                reorder_level,
                actual_unit,
                category,
                description,
                sku,
                storage_location,
                cost_per_actual_unit AS cost_per_unit,
                extra_price_per_unit,
                days_of_stock,
                created_at,
                updated_at
            FROM ingredients 
            ORDER BY name ASC
        `);

        const inventory = inventoryResult.map(item => ({
            id: item.id,
            name: item.name,
            actual_quantity: parseFloat(item.actual_quantity),
            reorder_level: parseFloat(item.reorder_level),
            actual_unit: item.actual_unit,
            category: item.category,
            description: item.description,
            sku: item.sku,
            storage_location: item.storage_location,
            cost_per_unit: item.cost_per_unit != null ? parseFloat(item.cost_per_unit) : null,
            extra_price_per_unit: item.extra_price_per_unit != null ? parseFloat(item.extra_price_per_unit) : null,
            days_of_stock: item.days_of_stock != null ? Number(item.days_of_stock) : null,
            created_at: item.created_at,
            updated_at: item.updated_at,
            status: item.actual_quantity === 0 ? 'out' : item.actual_quantity <= item.reorder_level ? 'low' : 'normal'
        }));

        // Do not log viewing inventory/ingredients

        res.json({
            success: true,
            inventory
        });

    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch inventory'
        });
    }
});

// Get upcoming events
router.get('/events/upcoming', async(req, res) => {
    try {
        const [eventsResult] = await db.query(`
            SELECT 
                id,
                customer_name,
                event_type,
                event_date,
                guest_count,
                status,
                venue,
                special_requests
            FROM events 
            WHERE event_date >= CURDATE() AND status IN ('pending', 'confirmed')
            ORDER BY event_date ASC
        `);

        const events = eventsResult.map(event => ({
            id: event.id,
            customer_name: event.customer_name,
            event_type: event.event_type,
            event_date: event.event_date,
            guest_count: event.guest_count,
            status: event.status,
            venue: event.venue,
            special_requests: event.special_requests
        }));

        res.json({
            success: true,
            events
        });

    } catch (error) {
        console.error('Error fetching upcoming events:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch upcoming events'
        });
    }
});

// Payment verification routes for staff (same as admin)
// Verify payment and process order (Staff)
router.post('/orders/:orderId/verify-payment', async(req, res) => {
    try {
        const { orderId } = req.params;
        const { paymentMethod, verifiedBy, reference, transactionId } = req.body;

        // Get order details (accept DB id or UUID)
        const [orderResult] = await db.query('SELECT * FROM orders WHERE id = ? OR order_id = ?', [orderId, orderId]);
        if (orderResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const order = orderResult[0];

        // Verify the order is pending verification
        if (order.status !== 'pending_verification') {
            return res.status(400).json({
                success: false,
                message: `Order status is ${order.status}, cannot verify payment`
            });
        }

        // Update payment status and move to preparing status
        await db.query('UPDATE orders SET payment_status = ?, payment_method = ?, status = ? WHERE id = ?', ['paid', paymentMethod || 'cash', 'preparing', order.id]);

        // Emit real-time update (canonical: confirmed + paid)
        const io = req.app.get('io');
        if (io) {
            const payload = {
                orderId: order.order_id,
                status: 'preparing',
                paymentStatus: 'paid',
                paymentMethod: paymentMethod || 'cash',
                timestamp: new Date()
            };
            io.to(`order-${order.order_id}`).emit('order-updated', payload);
            io.to('staff-room').emit('order-updated', payload);
            io.to('admin-room').emit('order-updated', payload);
            // Notify customer room
            if (order.customer_email) {
                io.to(`customer-${order.customer_email}`).emit('order-updated', payload);
            }
        }

        // Note: Ingredient deduction now happens when order is marked as 'ready', not during payment verification

        // Log payment verification
        const txId = transactionId || `${(paymentMethod || 'cash').toUpperCase()}_${Date.now()}`;
        const refVal = reference || (verifiedBy ? `Verified by ${verifiedBy}` : null);

        // Check if there's already a payment transaction for this order
        const [existingTx] = await db.query(`
            SELECT id FROM payment_transactions 
            WHERE order_id = ? AND status = 'completed'
            ORDER BY created_at DESC LIMIT 1
        `, [order.order_id]);

        if (existingTx.length > 0 && refVal) {
            // Update existing transaction with admin reference
            await db.query(`
                UPDATE payment_transactions 
                SET reference = ?, transaction_id = ?, updated_at = NOW()
                WHERE id = ?
            `, [refVal, txId, existingTx[0].id]);
        } else {
            // Insert new payment transaction
            await db.query(`
                INSERT INTO payment_transactions 
                (order_id, payment_method, amount, transaction_id, reference, status, created_at)
                VALUES (?, ?, ?, ?, ?, 'completed', NOW())
            `, [order.order_id, paymentMethod || 'cash', order.total_price, txId, refVal]);
        }

        // Log the activity
        if (req.session.staffUser && req.session.staffUser.id) {
            await ActivityLogger.logStaffActivity(
                req.session.staffUser.id,
                'payment_verification',
                'payment',
                orderId, { payment_status: 'pending' }, { payment_status: 'paid', payment_method: paymentMethod || 'cash' },
                `Verified payment for order ${orderId} using ${paymentMethod || 'cash'}`,
                req
            );
        }

        // Emit real-time update (explicit to rooms)
        if (io) {
            const finalPayload = {
                orderId: order.order_id || orderId,
                status: 'preparing',
                paymentStatus: 'paid',
                paymentMethod: paymentMethod || 'cash',
                verifiedBy: verifiedBy || 'staff',
                timestamp: new Date()
            };
            io.to(`order-${finalPayload.orderId}`).emit('order-updated', finalPayload);
            io.to('staff-room').emit('order-updated', finalPayload);
            io.to('admin-room').emit('order-updated', finalPayload);
            if (order.customer_email) {
                io.to(`customer-${order.customer_email}`).emit('order-updated', finalPayload);
            }
            io.to('staff-room').emit('payment-updated', finalPayload);
            io.to('admin-room').emit('payment-updated', finalPayload);
        }

        res.json({
            success: true,
            message: 'Payment verified successfully',
            orderId,
            status: 'preparing'
        });

    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({
            success: false,
            message: `Failed to verify payment: ${error.message}`
        });
    }
});

// Get orders that need payment verification
router.get('/orders/pending-verification', async(req, res) => {
    try {
        const [ordersResult] = await db.query(`
            SELECT 
                id,
                customer_name,
                items,
                total_price,
                payment_method,
                status,
                notes,
                table_number,
                order_time as order_time
            FROM orders 
            WHERE status = 'pending_verification'
            ORDER BY order_time ASC
        `);

        const orders = ordersResult.map(order => ({
            id: order.id,
            customer_name: order.customer_name,
            items: JSON.parse(order.items || '[]'),
            total_price: parseFloat(order.total_price),
            payment_method: order.payment_method,
            status: order.status,
            notes: order.notes,
            table_number: order.table_number,
            order_time: order.order_time
        }));

        res.json({
            success: true,
            orders
        });

    } catch (error) {
        console.error('Error fetching pending verification orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pending verification orders'
        });
    }
});

// Get staff's own activity logs
router.get('/activity-logs', async(req, res) => {
    try {
        const { page = 1, limit = 50, action_type = 'all', start_date, end_date } = req.query;
        const offset = (page - 1) * limit;
        const staffId = req.session.staffUser.id;

        let query = `
            SELECT 
                sal.id,
                sal.staff_id as user_id,
                u.username as username,
                sal.action_type,
                sal.target_type,
                sal.target_id,
                sal.old_values,
                sal.new_values,
                sal.description,
                sal.created_at
            FROM staff_activity_log sal
            JOIN users u ON sal.staff_id = u.id
            WHERE sal.staff_id = ?
        `;

        const params = [staffId];

        if (action_type !== 'all') {
            query += ' AND sal.action_type = ?';
            params.push(action_type);
        }

        if (start_date) {
            query += ' AND sal.created_at >= ?';
            params.push(start_date);
        }

        if (end_date) {
            query += ' AND sal.created_at <= ?';
            params.push(end_date + ' 23:59:59');
        }

        // Get total count
        const countQuery = query.replace('SELECT sal.id, sal.staff_id as user_id, u.username as username, sal.action_type, sal.target_type, sal.target_id, sal.old_values, sal.new_values, sal.description, sal.created_at', 'SELECT COUNT(*) as total');
        const [countResult] = await db.query(countQuery, params);
        const total = countResult[0].total;

        // Get paginated results
        query += ' ORDER BY sal.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const [activities] = await db.query(query, params);

        // Format the activities
        const formattedActivities = activities.map(activity => ({
            id: activity.id,
            user_type: 'staff',
            user_id: activity.user_id,
            username: activity.username,
            action_type: activity.action_type,
            target_type: activity.target_type,
            target_id: activity.target_id,
            old_values: activity.old_values ? JSON.parse(activity.old_values) : null,
            new_values: activity.new_values ? JSON.parse(activity.new_values) : null,
            description: activity.description,
            created_at: activity.created_at,
            formatted_date: new Date(activity.created_at).toLocaleString()
        }));

        res.json({
            success: true,
            activities: formattedActivities,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                total_pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching staff activity logs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch activity logs'
        });
    }
});

// Get staff activity log statistics
router.get('/activity-logs/stats', async(req, res) => {
    try {
        const { start_date, end_date } = req.query;
        const staffId = req.session.staffUser.id;

        // Build date filter
        let dateFilter = 'WHERE sal.staff_id = ?';
        const params = [staffId];

        if (start_date) {
            dateFilter += ' AND sal.created_at >= ?';
            params.push(start_date);
        }

        if (end_date) {
            dateFilter += ' AND sal.created_at <= ?';
            params.push(end_date + ' 23:59:59');
        }

        // Get action type stats
        const [actionTypeStats] = await db.query(`
            SELECT 
                action_type,
                COUNT(*) as count
            FROM staff_activity_log sal
            ${dateFilter}
            GROUP BY action_type
            ORDER BY count DESC
        `, params);

        // Get recent activity (last 7 days)
        const [recentActivity] = await db.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as count
            FROM staff_activity_log sal
            WHERE sal.staff_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `, [staffId]);

        res.json({
            success: true,
            stats: {
                by_action_type: actionTypeStats,
                recent_activity: recentActivity
            }
        });

    } catch (error) {
        console.error('Error fetching staff activity log stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch activity log statistics'
        });
    }
});

// Staff: Get own activity logs only
router.get('/activity-logs', async(req, res) => {
    try {
        const staffId = req.session.staffUser && req.session.staffUser.id;
        if (!staffId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const { page = 1, limit = 20, action_type = 'all', start_date, end_date } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let baseQuery = `
            SELECT 
                sal.id,
                sal.staff_id,
                u.username as username,
                sal.action_type,
                sal.target_type,
                sal.target_id,
                sal.old_values,
                sal.new_values,
                sal.description,
                sal.created_at
            FROM staff_activity_log sal
            JOIN users u ON sal.staff_id = u.id
            WHERE sal.staff_id = ?
        `;

        const params = [staffId];
        const whereExtra = [];

        if (action_type !== 'all') {
            whereExtra.push('sal.action_type = ?');
            params.push(action_type);
        }

        if (start_date) {
            whereExtra.push('sal.created_at >= ?');
            params.push(start_date);
        }

        if (end_date) {
            whereExtra.push('sal.created_at <= ?');
            params.push(`${end_date} 23:59:59`);
        }

        if (whereExtra.length > 0) {
            baseQuery += ` AND ${whereExtra.join(' AND ')}`;
        }

        const countQuery = `SELECT COUNT(*) as total FROM (${baseQuery}) as t`;
        const [countRows] = await db.query(countQuery, params);
        const total = countRows[0].total;

        const dataQuery = `${baseQuery} ORDER BY sal.created_at DESC LIMIT ? OFFSET ?`;
        const dataParams = params.concat([parseInt(limit), offset]);
        const [rows] = await db.query(dataQuery, dataParams);

        const activities = rows.map(a => ({
            id: a.id,
            user_type: 'staff',
            user_id: a.staff_id,
            username: a.username,
            action_type: a.action_type,
            target_type: a.target_type,
            target_id: a.target_id,
            old_values: a.old_values ? JSON.parse(a.old_values) : null,
            new_values: a.new_values ? JSON.parse(a.new_values) : null,
            description: a.description,
            created_at: a.created_at,
            formatted_date: new Date(a.created_at).toLocaleString()
        }));

        res.json({
            success: true,
            activities,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                total_pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching staff activity logs:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch staff activity logs' });
    }
});

// Staff dashboard SSE endpoint
router.get('/dashboard/stream', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection message
    res.write('data: {"type": "connected"}\n\n');

    // Keep connection alive with periodic heartbeat
    const heartbeat = setInterval(() => {
        res.write('data: {"type": "heartbeat"}\n\n');
    }, 30000);

    // Clean up on connection close
    req.on('close', () => {
        clearInterval(heartbeat);
    });
});

// Staff low stock alert endpoint
router.get('/low-stock/alert-status', async(req, res) => {
    try {

        // Check if ingredients table exists
        const [tables] = await db.query("SHOW TABLES LIKE 'ingredients'");
        if (tables.length === 0) {
            return res.json({
                success: true,
                hasAlert: false,
                alert: null
            });
        }

        // Get low stock items
        const [lowStockItems] = await db.query(`
            SELECT 
                id,
                name,
                actual_quantity as currentStock,
                reorder_level as reorderLevel,
                actual_unit as unit,
                category
            FROM ingredients 
            WHERE actual_quantity <= reorder_level
            ORDER BY actual_quantity ASC
        `);

        if (lowStockItems.length > 0) {
            const criticalItems = lowStockItems.filter(item => item.currentStock <= 0);
            const lowStockItems_filtered = lowStockItems.filter(item => item.currentStock > 0);

            let title, message, priority;

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
                        items: lowStockItems,
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
        console.error('Error checking low stock alert status for staff:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check low stock alert status'
        });
    }
});

// Staff sales analytics endpoint (without event sales)
router.get('/sales', async(req, res) => {
    try {
        console.log('Staff Sales API called with query:', req.query);

        const { period = 'month', startDate, endDate } = req.query;

        // Build date filter
        let dateFilter = '';
        let dateParams = [];

        if (startDate && endDate) {
            dateFilter = 'AND order_time BETWEEN ? AND ?';
            dateParams = [startDate, endDate];
        } else {
            switch (period) {
                case 'today':
                    dateFilter = 'AND DATE(order_time) = CURDATE()';
                    break;
                case 'week':
                    dateFilter = 'AND order_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
                    break;
                case 'month':
                    dateFilter = 'AND order_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
                    break;
                case 'year':
                    dateFilter = 'AND order_time >= DATE_SUB(NOW(), INTERVAL 365 DAY)';
                    break;
                default:
                    dateFilter = 'AND order_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
            }
        }

        // Get revenue metrics
        const [revenueResult] = await db.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN DATE(order_time) = CURDATE() THEN total_price ELSE 0 END), 0) as today,
                COALESCE(SUM(CASE WHEN order_time >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN total_price ELSE 0 END), 0) as week,
                COALESCE(SUM(CASE WHEN order_time >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN total_price ELSE 0 END), 0) as month,
                COALESCE(SUM(CASE WHEN order_time >= DATE_SUB(NOW(), INTERVAL 365 DAY) THEN total_price ELSE 0 END), 0) as year,
                COALESCE((
                    SELECT ((SUM(CASE WHEN order_time >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN total_price ELSE 0 END) - 
                             SUM(CASE WHEN order_time >= DATE_SUB(NOW(), INTERVAL 60 DAY) AND order_time < DATE_SUB(NOW(), INTERVAL 30 DAY) THEN total_price ELSE 0 END)) / 
                            NULLIF(SUM(CASE WHEN order_time >= DATE_SUB(NOW(), INTERVAL 60 DAY) AND order_time < DATE_SUB(NOW(), INTERVAL 30 DAY) THEN total_price ELSE 0 END), 0)) * 100
                    FROM orders 
                    WHERE order_time >= DATE_SUB(NOW(), INTERVAL 60 DAY)
                ), 0) as growth
            FROM orders 
            WHERE payment_status = 'paid' ${dateFilter}
        `, dateParams);

        // Get order metrics
        const [orderResult] = await db.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
                COUNT(CASE WHEN DATE(order_time) = CURDATE() THEN 1 END) as today
            FROM orders 
            WHERE payment_status = 'paid' ${dateFilter}
        `, dateParams);

        // Get top selling items
        const [topItemsResult] = await db.query(`
            SELECT 
                JSON_UNQUOTE(JSON_EXTRACT(items, '$[0].name')) as name,
                COUNT(*) as quantity,
                SUM(total_price) as revenue
            FROM orders 
            WHERE payment_status = 'paid' ${dateFilter}
            AND JSON_EXTRACT(items, '$[0].name') IS NOT NULL
            GROUP BY JSON_UNQUOTE(JSON_EXTRACT(items, '$[0].name'))
            ORDER BY quantity DESC
            LIMIT 10
        `, dateParams);

        // Calculate costs and profits for top items
        const topItemsWithCosts = (await Promise.all(topItemsResult.map(async(item) => {
            try {
                const itemName = (item.name || '').replace(/"/g, '') || null;
                if (itemName && itemName !== 'Unknown') {
                    const cost = 0; // Simplified - you can implement real cost calculation
                    const profit = item.revenue - cost;

                    return {
                        id: itemName.toLowerCase().replace(/\s+/g, '_'),
                        name: itemName,
                        quantity: parseInt(item.quantity) || 0,
                        revenue: parseFloat(item.revenue) || 0,
                        cost: cost,
                        profit: profit
                    };
                } else {
                    // Skip unknown items
                    return null;
                }
            } catch (error) {
                console.error('Error processing top item:', error);
                return null; // Skip error items too
            }
        }))).filter(item => item !== null);

        // Get payment methods
        const [paymentMethodsResult] = await db.query(`
            SELECT 
                payment_method as method,
                COUNT(*) as count,
                SUM(total_price) as amount
            FROM orders 
            WHERE payment_status = 'paid' ${dateFilter}
            GROUP BY payment_method
        `, dateParams);

        const totalAmount = paymentMethodsResult.reduce((sum, method) => sum + parseFloat(method.amount), 0);
        const paymentMethods = paymentMethodsResult.map(method => ({
            method: method.method || 'Unknown',
            count: parseInt(method.count) || 0,
            amount: parseFloat(method.amount) || 0,
            percentage: totalAmount > 0 ? Math.round((parseFloat(method.amount) / totalAmount) * 100) : 0
        }));

        // Get daily breakdown for the last 7 days
        const [dailyBreakdownResult] = await db.query(`
            SELECT 
                DATE(order_time) as date,
                COUNT(*) as orders,
                SUM(total_price) as revenue
            FROM orders 
            WHERE payment_status = 'paid' 
            AND order_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(order_time)
            ORDER BY date DESC
        `);

        const dailyBreakdown = dailyBreakdownResult.map(day => ({
            date: day.date,
            orders: parseInt(day.orders) || 0,
            revenue: parseFloat(day.revenue) || 0,
            profit: parseFloat(day.revenue) * 0.7 // Simplified 70% profit margin
        }));

        // Get real ingredient costs from database by calculating usage from orders
        const [ingredientCostsResult] = await db.query(`
            SELECT 
                i.name,
                i.cost_per_actual_unit,
                i.actual_unit,
                COALESCE(SUM(
                    CASE 
                        WHEN o.payment_status = 'paid' THEN 
                            JSON_UNQUOTE(JSON_EXTRACT(o.items, '$[0].quantity')) * mii.required_actual_amount
                        ELSE 0 
                    END
                ), 0) as total_quantity_used
            FROM ingredients i
            LEFT JOIN menu_item_ingredients mii ON i.id = mii.ingredient_id
            LEFT JOIN menu_items mi ON mii.menu_item_id = mi.id
            LEFT JOIN orders o ON JSON_UNQUOTE(JSON_EXTRACT(o.items, '$[0].name')) = mi.name
            WHERE o.payment_status = 'paid' ${dateFilter}
            GROUP BY i.id, i.name, i.cost_per_actual_unit, i.actual_unit
            ORDER BY total_quantity_used DESC
        `, dateParams);

        // Calculate real ingredient costs
        let totalIngredientCost = 0;
        const topIngredients = ingredientCostsResult.map(ingredient => {
            const quantity = parseFloat(ingredient.total_quantity_used) || 0;
            const costPerUnit = parseFloat(ingredient.cost_per_actual_unit) || 0;
            const totalCost = quantity * costPerUnit;
            totalIngredientCost += totalCost;

            return {
                name: ingredient.name || 'Unknown',
                quantity: quantity
            };
        });

        const averagePerOrder = orderResult[0] && orderResult[0].total > 0 ? totalIngredientCost / orderResult[0].total : 0;

        const salesData = {
            revenue: {
                today: parseFloat((revenueResult[0] && revenueResult[0].today) ? revenueResult[0].today : 0),
                week: parseFloat((revenueResult[0] && revenueResult[0].week) ? revenueResult[0].week : 0),
                month: parseFloat((revenueResult[0] && revenueResult[0].month) ? revenueResult[0].month : 0),
                year: parseFloat((revenueResult[0] && revenueResult[0].year) ? revenueResult[0].year : 0),
                growth: parseFloat((revenueResult[0] && revenueResult[0].growth) ? revenueResult[0].growth : 0)
            },
            orders: {
                total: parseInt((orderResult[0] && orderResult[0].total) ? orderResult[0].total : 0),
                completed: parseInt((orderResult[0] && orderResult[0].completed) ? orderResult[0].completed : 0),
                pending: parseInt((orderResult[0] && orderResult[0].pending) ? orderResult[0].pending : 0),
                cancelled: parseInt((orderResult[0] && orderResult[0].cancelled) ? orderResult[0].cancelled : 0),
                today: parseInt((orderResult[0] && orderResult[0].today) ? orderResult[0].today : 0)
            },
            topItems: topItemsWithCosts,
            paymentMethods: paymentMethods,
            dailyBreakdown: dailyBreakdown,
            ingredientCosts: {
                totalCost: totalIngredientCost,
                averagePerOrder: averagePerOrder,
                topIngredients: topIngredients
            }
        };

        res.json({
            success: true,
            data: salesData
        });

    } catch (error) {
        console.error('Error fetching staff sales data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch staff sales data'
        });
    }
});

// Original complex staff sales route (commented out for now)
router.get('/sales-original', async(req, res) => {
    try {
        const { period = 'month', startDate, endDate } = req.query;
        const db = require('../config/db');

        // Build date filter
        let dateFilter = '';
        let dateParams = [];

        if (startDate && endDate) {
            dateFilter = 'AND order_time BETWEEN ? AND ?';
            dateParams = [startDate, endDate];
        } else {
            switch (period) {
                case 'today':
                    dateFilter = 'AND DATE(order_time) = CURDATE()';
                    break;
                case 'week':
                    dateFilter = 'AND order_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
                    break;
                case 'month':
                    dateFilter = 'AND order_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
                    break;
                case 'year':
                    dateFilter = 'AND order_time >= DATE_SUB(NOW(), INTERVAL 365 DAY)';
                    break;
            }
        }

        // Get revenue metrics
        const [revenueResult] = await db.query(`
            SELECT 
                SUM(CASE WHEN DATE(order_time) = CURDATE() THEN total_price ELSE 0 END) as today,
                SUM(CASE WHEN order_time >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN total_price ELSE 0 END) as week,
                SUM(CASE WHEN order_time >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN total_price ELSE 0 END) as month,
                SUM(CASE WHEN order_time >= DATE_SUB(NOW(), INTERVAL 365 DAY) THEN total_price ELSE 0 END) as year,
                (
                    SELECT ((SUM(CASE WHEN order_time >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN total_price ELSE 0 END) - 
                             SUM(CASE WHEN order_time >= DATE_SUB(NOW(), INTERVAL 60 DAY) AND order_time < DATE_SUB(NOW(), INTERVAL 30 DAY) THEN total_price ELSE 0 END)) / 
                            NULLIF(SUM(CASE WHEN order_time >= DATE_SUB(NOW(), INTERVAL 60 DAY) AND order_time < DATE_SUB(NOW(), INTERVAL 30 DAY) THEN total_price ELSE 0 END), 0)) * 100
                    FROM orders 
                    WHERE order_time >= DATE_SUB(NOW(), INTERVAL 60 DAY)
                ) as growth
            FROM orders 
            WHERE payment_status = 'paid' ${dateFilter}
        `, dateParams);

        // Get order metrics
        const [orderResult] = await db.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
                COUNT(CASE WHEN DATE(order_time) = CURDATE() THEN 1 END) as today
            FROM orders 
            WHERE payment_status = 'paid' ${dateFilter}
        `, dateParams);

        // Get top selling items - process in JavaScript for better compatibility
        const [ordersWithItems] = await db.query(`
            SELECT items
            FROM orders 
            WHERE payment_status = 'paid' ${dateFilter}
            ORDER BY order_time DESC
            LIMIT 1000
        `, dateParams);

        // Process items in JavaScript
        const itemCounts = new Map();

        for (const order of ordersWithItems) {
            try {
                const items = JSON.parse(order.items || '[]');
                for (const item of items) {
                    if (item.name && item.quantity && item.price) {
                        const name = item.name;
                        const quantity = parseFloat(item.quantity) || 0;
                        const price = parseFloat(item.price) || 0;
                        const revenue = quantity * price;

                        if (itemCounts.has(name)) {
                            const existing = itemCounts.get(name);
                            existing.quantity += quantity;
                            existing.revenue += revenue;
                            existing.profit += revenue; // Assuming no cost for now
                        } else {
                            itemCounts.set(name, {
                                name: name,
                                quantity: quantity,
                                revenue: revenue,
                                cost: 0,
                                profit: revenue
                            });
                        }
                    }
                }
            } catch (e) {
                console.warn('Error parsing order items:', e.message);
            }
        }

        // Convert to array and sort by revenue
        let topItemsResult = Array.from(itemCounts.values())
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);

        // If no real items found, create some sample data
        if (topItemsResult.length === 0) {
            topItemsResult = [
                { name: 'Cappuccino', quantity: 15, revenue: 450, cost: 0, profit: 450 },
                { name: 'Latte', quantity: 12, revenue: 360, cost: 0, profit: 360 },
                { name: 'Americano', quantity: 8, revenue: 200, cost: 0, profit: 200 },
                { name: 'Espresso', quantity: 6, revenue: 120, cost: 0, profit: 120 },
                { name: 'Mocha', quantity: 4, revenue: 160, cost: 0, profit: 160 }
            ];
        }

        // Get payment methods
        const [paymentMethodsResult] = await db.query(`
            SELECT 
                payment_method as method,
                COUNT(*) as count,
                SUM(total_price) as amount
            FROM orders 
            WHERE payment_status = 'paid' ${dateFilter}
            GROUP BY payment_method
        `, dateParams);

        // Calculate payment method percentages
        const totalAmount = paymentMethodsResult.reduce((sum, method) => sum + parseFloat(method.amount), 0);
        const paymentMethods = paymentMethodsResult.map(method => ({
            method: method.method,
            count: method.count,
            amount: parseFloat(method.amount),
            percentage: totalAmount > 0 ? (parseFloat(method.amount) / totalAmount) * 100 : 0
        }));

        // Get daily breakdown
        const [dailyBreakdownResult] = await db.query(`
            SELECT 
                DATE(order_time) as date,
                COUNT(*) as orders,
                SUM(total_price) as revenue,
                SUM(total_price) as profit
            FROM orders 
            WHERE payment_status = 'paid' ${dateFilter}
            GROUP BY DATE(order_time)
            ORDER BY date DESC
            LIMIT 30
        `, dateParams);

        // Calculate total ingredient costs from actual orders
        const [ordersForCosts] = await db.query(`
            SELECT items
            FROM orders 
            WHERE payment_status = 'paid' ${dateFilter}
            ORDER BY order_time DESC
            LIMIT 1000
        `, dateParams);

        let totalIngredientCost = 0;
        const ingredientUsage = new Map();

        for (const order of ordersForCosts) {
            try {
                const items = JSON.parse(order.items || '[]');
                for (const item of items) {
                    if (item.menu_item_id && item.quantity) {
                        const menuItemId = item.menu_item_id;
                        const quantity = parseFloat(item.quantity) || 1;

                        // Get ingredients for this menu item
                        const [ingredients] = await db.query(`
            SELECT 
                                i.name,
                                i.cost_per_actual_unit,
                                mii.required_actual_amount
                            FROM menu_item_ingredients mii
                            JOIN ingredients i ON mii.ingredient_id = i.id
                            WHERE mii.menu_item_id = ?
                        `, [menuItemId]);

                        for (const ingredient of ingredients) {
                            const requiredAmount = parseFloat(ingredient.required_actual_amount || 0);
                            const costPerUnit = parseFloat(ingredient.cost_per_actual_unit || 0);
                            const totalAmount = requiredAmount * quantity;
                            const totalCost = totalAmount * costPerUnit;

                            totalIngredientCost += totalCost;

                            // Track ingredient usage
                            if (ingredientUsage.has(ingredient.name)) {
                                const existing = ingredientUsage.get(ingredient.name);
                                existing.quantity += totalAmount;
                                existing.cost += totalCost;
                            } else {
                                ingredientUsage.set(ingredient.name, {
                                    name: ingredient.name,
                                    quantity: totalAmount,
                                    cost: totalCost
                                });
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn('Error processing order for ingredient costs:', e.message);
            }
        }

        const totalOrders = orderResult[0] ? orderResult[0].total : 0;
        const averagePerOrder = totalOrders > 0 ? totalIngredientCost / totalOrders : 0;

        // Get top ingredients by cost
        let topIngredientsResult = Array.from(ingredientUsage.values())
            .sort((a, b) => b.cost - a.cost)
            .slice(0, 10);

        // If no real data, create sample data
        if (topIngredientsResult.length === 0) {
            topIngredientsResult = [
                { name: 'Coffee Beans', quantity: 2.5, cost: 125 },
                { name: 'Milk', quantity: 1.8, cost: 90 },
                { name: 'Sugar', quantity: 0.5, cost: 25 },
                { name: 'Vanilla Syrup', quantity: 0.3, cost: 45 },
                { name: 'Chocolate Powder', quantity: 0.2, cost: 30 }
            ];
            totalIngredientCost = 315; // Sum of sample costs
            averagePerOrder = totalOrders > 0 ? totalIngredientCost / totalOrders : 52.5;
        }

        res.json({
            success: true,
            data: {
                revenue: {
                    today: parseFloat(revenueResult[0].today) || 0,
                    week: parseFloat(revenueResult[0].week) || 0,
                    month: parseFloat(revenueResult[0].month) || 0,
                    year: parseFloat(revenueResult[0].year) || 0,
                    growth: parseFloat(revenueResult[0].growth) || 0
                },
                orders: {
                    total: orderResult[0].total || 0,
                    completed: orderResult[0].completed || 0,
                    pending: orderResult[0].pending || 0,
                    cancelled: orderResult[0].cancelled || 0,
                    today: orderResult[0].today || 0
                },
                topItems: topItemsResult.map((item, index) => ({
                    id: `item_${index}`,
                    name: item.name,
                    quantity: item.quantity || 0,
                    revenue: parseFloat(item.revenue) || 0,
                    cost: parseFloat(item.cost) || 0,
                    profit: parseFloat(item.profit) || 0
                })),
                paymentMethods: paymentMethods,
                dailyBreakdown: dailyBreakdownResult.map(day => ({
                    date: day.date,
                    orders: day.orders || 0,
                    revenue: parseFloat(day.revenue) || 0,
                    profit: parseFloat(day.profit) || 0
                })),
                ingredientCosts: {
                    totalCost: parseFloat(totalIngredientCost) || 0,
                    averagePerOrder: parseFloat(averagePerOrder) || 0,
                    topIngredients: topIngredientsResult.map(ingredient => ({
                        name: ingredient.name,
                        quantity: parseFloat(ingredient.quantity) || 0
                    }))
                }
            }
        });

    } catch (error) {
        console.error('Error fetching staff sales data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch sales data'
        });
    }
});

// Staff transactions endpoint
router.get('/transactions', async(req, res) => {
    try {
        const {
            page = 1,
                status = 'all',
                payment_method = 'all',
                customer = '',
                search = '',
                start_date = '',
                end_date = ''
        } = req.query;

        const db = require('../config/db');
        const limit = 20;
        const offset = (parseInt(page) - 1) * limit;

        // Build filters
        let whereConditions = ["o.payment_status = 'paid'"];
        let params = [];

        if (status !== 'all') {
            whereConditions.push('o.status = ?');
            params.push(status);
        }

        if (payment_method !== 'all') {
            whereConditions.push('o.payment_method = ?');
            params.push(payment_method);
        }

        if (customer) {
            whereConditions.push('o.customer_name LIKE ?');
            params.push(`%${customer}%`);
        }

        if (search) {
            whereConditions.push('(o.customer_name LIKE ? OR o.order_id LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }

        if (start_date && end_date) {
            whereConditions.push('DATE(o.created_at) BETWEEN ? AND ?');
            params.push(start_date, end_date);
        }

        const whereClause = whereConditions.join(' AND ');

        // Get transactions
        const [transactions] = await db.query(`
            SELECT 
                o.id,
                o.order_id,
                o.customer_name,
                o.total_price as amount,
                o.status,
                o.payment_method,
                o.created_at,
                o.items
            FROM orders o
            WHERE ${whereClause}
            ORDER BY o.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        // Get total count
        const [countResult] = await db.query(`
            SELECT COUNT(*) as total
            FROM orders o
            WHERE ${whereClause}
        `, params);

        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);

        res.json({
            success: true,
            transactions: transactions.map(transaction => ({
                id: transaction.id,
                order_id: transaction.order_id,
                customer_name: transaction.customer_name,
                amount: parseFloat(transaction.amount),
                status: transaction.status,
                payment_method: transaction.payment_method,
                created_at: transaction.created_at,
                items: transaction.items
            })),
            totalPages,
            total,
            currentPage: parseInt(page)
        });

    } catch (error) {
        console.error('Error fetching staff transactions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch transactions'
        });
    }
});

// Staff sales export endpoint
router.get('/sales/export', async(req, res) => {
    try {
        const { format = 'excel', period = 'month', startDate, endDate } = req.query;

        // For now, return a simple response indicating export is not implemented
        res.status(501).json({
            success: false,
            message: 'Export functionality not yet implemented for staff'
        });

    } catch (error) {
        console.error('Error exporting staff sales data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export sales data'
        });
    }
});

// Staff sales download endpoint (Excel export)
router.get('/sales/download', async(req, res) => {
    try {
        console.log('Staff sales download called with params:', req.query);

        const { format = 'excel', period = 'month', startDate, endDate, status, payment_method, customer } = req.query;

        // Simple test first - just get basic data
        const [salesData] = await db.query(`
            SELECT 
                order_id,
                customer_name,
                total_price,
                status,
                payment_method,
                order_time,
                items
            FROM orders 
            WHERE payment_status = 'paid'
            ORDER BY order_time DESC
            LIMIT 100
        `);

        console.log(`Found ${salesData.length} orders for export`);

        // Generate Excel file
        const XLSX = require('xlsx');

        // Create workbook
        const workbook = XLSX.utils.book_new();

        // Summary sheet
        const summaryData = {
            'Report Period': period,
            'Start Date': startDate || 'N/A',
            'End Date': endDate || 'N/A',
            'Total Orders': salesData.length,
            'Total Revenue': `₱${salesData.reduce((sum, order) => sum + parseFloat(order.total_price), 0).toFixed(2)}`,
            'Generated On': new Date().toLocaleString()
        };

        const summarySheet = XLSX.utils.json_to_sheet([summaryData]);

        // Transactions sheet
        const transactionsData = salesData.map(transaction => ({
            'Order ID': transaction.order_id,
            'Customer Name': transaction.customer_name,
            'Amount': `₱${parseFloat(transaction.total_price).toFixed(2)}`,
            'Status': transaction.status,
            'Payment Method': transaction.payment_method,
            'Order Date': new Date(transaction.order_time).toLocaleDateString(),
            'Order Time': new Date(transaction.order_time).toLocaleTimeString(),
            'Items Count': JSON.parse(transaction.items || '[]').length
        }));

        const transactionsSheet = XLSX.utils.json_to_sheet(transactionsData);

        // Add sheets to workbook
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
        XLSX.utils.book_append_sheet(workbook, transactionsSheet, 'Transactions');

        // Generate buffer
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        console.log(`Generated Excel file with ${buffer.length} bytes`);

        // Set response headers
        const filename = `staff-sales-report-${period}-${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length);

        // Send file
        res.send(buffer);

    } catch (error) {
        console.error('Error generating staff sales download:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            error: 'Failed to generate sales report: ' + error.message
        });
    }
});

// Reward processing routes (delegate to loyalty routes)
router.use('/reward-redemptions', require('./loyaltyRoutes'));

// Staff transactions endpoint
router.get('/transactions/sales', async(req, res) => {
    try {
        console.log('Staff transactions API called with query:', req.query);
        const { date, status, payment_method, customer, page = 1, limit = 50 } = req.query;

        let dateFilter = '';
        let statusFilter = '';
        let paymentMethodFilter = '';
        let customerFilter = '';
        let params = [];

        // Build date filter
        if (date && date !== 'all') {
            switch (date) {
                case 'today':
                    dateFilter = 'AND DATE(o.order_time) = CURDATE()';
                    break;
                case 'week':
                    dateFilter = 'AND o.order_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
                    break;
                case 'month':
                    dateFilter = 'AND o.order_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
                    break;
                case 'year':
                    dateFilter = 'AND o.order_time >= DATE_SUB(NOW(), INTERVAL 365 DAY)';
                    break;
            }
        }

        // Build status filter
        if (status && status !== 'all') {
            statusFilter = 'AND o.status = ?';
            params.push(status);
        }

        // Build payment method filter
        if (payment_method && payment_method !== 'all') {
            paymentMethodFilter = 'AND o.payment_method = ?';
            params.push(payment_method);
        }

        // Build customer filter
        if (customer && customer.trim() !== '') {
            customerFilter = 'AND o.customer_name LIKE ?';
            params.push(`%${customer}%`);
        }

        // Calculate offset for pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Get total count for pagination
        const [countResult] = await db.query(`
            SELECT COUNT(*) as total
            FROM orders o
            WHERE o.payment_status = 'paid'
            ${dateFilter}
            ${statusFilter}
            ${paymentMethodFilter}
            ${customerFilter}
        `, params);

        const [sales] = await db.query(`
            SELECT 
                o.id,
                o.order_id,
                o.customer_name,
                o.total_price as total_amount,
                o.payment_method,
                o.status,
                o.order_time as created_at,
                JSON_LENGTH(o.items) as items_count
            FROM orders o
            WHERE o.payment_status = 'paid'
            ${dateFilter}
            ${statusFilter}
            ${paymentMethodFilter}
            ${customerFilter}
            ORDER BY o.order_time DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), offset]);

        const transactions = sales.map(sale => ({
            id: sale.id,
            order_id: sale.order_id,
            customer_name: sale.customer_name,
            total_amount: parseFloat(sale.total_amount) || 0,
            payment_method: sale.payment_method,
            status: sale.status,
            created_at: sale.created_at,
            items_count: parseInt(sale.items_count) || 0
        }));

        console.log(`Found ${transactions.length} transactions`);
        console.log('Sample transaction:', transactions[0]);

        const total = countResult[0].total;
        const totalPages = Math.ceil(total / parseInt(limit));

        res.json({
            success: true,
            transactions: transactions,
            total: total,
            totalPages: totalPages,
            currentPage: parseInt(page),
            limit: parseInt(limit)
        });

    } catch (error) {
        console.error('Error fetching staff transactions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch transactions'
        });
    }
});

// Staff reward redemption endpoints (for Reward Processing UI)
router.get('/reward-redemptions/search/:claimCode', async(req, res) => {
    try {
        // Permissive for development: allow even without session
        const { claimCode } = req.params;
        const [rows] = await db.query(`
            SELECT 
                lrr.id,
                lrr.customer_id,
                lrr.reward_id,
                lrr.claim_code,
                lrr.points_redeemed,
                lrr.redemption_date,
                lrr.status,
                lrr.expires_at,
                c.full_name as customer_name,
                c.email as customer_email,
                lr.name as reward_name,
                lr.reward_type as reward_type
            FROM loyalty_reward_redemptions lrr
            JOIN customers c ON lrr.customer_id = c.id
            JOIN loyalty_rewards lr ON lrr.reward_id = lr.id
            WHERE lrr.claim_code = ?
        `, [claimCode]);
        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Redemption not found' });
        }
        return res.json({ success: true, redemption: rows[0] });
    } catch (err) {
        console.error('Staff search redemption error:', err && err.message ? err.message : err);
        return res.status(500).json({ success: false, error: 'Failed to search redemption' });
    }
});

router.get('/reward-redemptions/pending', async(req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                lrr.id,
                lrr.customer_id,
                lrr.reward_id,
                lrr.claim_code,
                lrr.points_redeemed,
                lrr.redemption_date,
                lrr.status,
                lrr.expires_at,
                c.full_name as customer_name,
                c.email as customer_email,
                lr.name as reward_name,
                lr.reward_type as reward_type
            FROM loyalty_reward_redemptions lrr
            JOIN customers c ON lrr.customer_id = c.id
            JOIN loyalty_rewards lr ON lrr.reward_id = lr.id
            WHERE lrr.status = 'pending'
            ORDER BY lrr.redemption_date DESC
        `);
        return res.json({ success: true, redemptions: rows });
    } catch (err) {
        console.error('Staff pending redemptions error:', err && err.message ? err.message : err);
        return res.status(500).json({ success: false, error: 'Failed to fetch pending redemptions' });
    }
});

router.post('/reward-redemptions/:redemptionId/:action', async(req, res) => {
    try {
        const { redemptionId, action } = req.params;
        const staffId = (req.session && req.session.staffUser && req.session.staffUser.id) || (req.session && req.session.adminUser && req.session.adminUser.id) || null;
        if (!['complete', 'cancel'].includes(action)) {
            return res.status(400).json({ success: false, error: 'Invalid action' });
        }
        const [redemptions] = await db.query('SELECT * FROM loyalty_reward_redemptions WHERE id = ?', [redemptionId]);
        if (!redemptions || redemptions.length === 0) {
            return res.status(404).json({ success: false, error: 'Redemption not found' });
        }
        const redemption = redemptions[0];
        if (redemption.status !== 'pending') {
            return res.status(400).json({ success: false, error: 'Redemption is not pending' });
        }
        try {
            await db.query(`
                UPDATE loyalty_reward_redemptions 
                SET status = ?, staff_id = ? 
                WHERE id = ?
            `, [action === 'complete' ? 'completed' : 'cancelled', staffId, redemptionId]);
        } catch (err) {
            console.error('Update redemption status failed:', err && err.message ? err.message : err);
            return res.status(500).json({ success: false, error: 'Failed to update redemption status' });
        }
        if (action === 'cancel') {
            try {
                await db.query('UPDATE customers SET loyalty_points = loyalty_points + ? WHERE id = ?', [redemption.points_redeemed, redemption.customer_id]);
                await db.query(`
                    INSERT INTO loyalty_transactions 
                    (customer_id, points_earned, transaction_type, description, redemption_id) 
                    VALUES (?, ?, 'refund', ?, ?)
                `, [redemption.customer_id, redemption.points_redeemed, `Refunded ${redemption.points_redeemed} points for cancelled reward redemption`, redemptionId]);
            } catch (refundErr) {
                console.error('Refund transaction failed:', refundErr && refundErr.message ? refundErr.message : refundErr);
                return res.status(500).json({ success: false, error: 'Failed to refund points for cancelled redemption' });
            }
        }
        return res.json({ success: true });
    } catch (err) {
        console.error('Staff process redemption error:', err && err.message ? err.message : err);
        return res.status(500).json({ success: false, error: 'Failed to process redemption' });
    }
});

// Get all orders for staff dashboard
router.get('/orders', async(req, res) => {
    try {
        const { status, customerId, tableNumber, page = 1, limit = 20 } = req.query;

        let sql = 'SELECT * FROM orders WHERE 1=1';
        const params = [];

        if (status) {
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
        console.error('Error fetching staff orders:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch orders' });
    }
});

// Get staff orders (same as admin orders but for staff)
router.get('/orders', async(req, res) => {
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
                try {
                    const [menuItem] = await db.query(
                        'SELECT name, base_price FROM menu_items WHERE id = ?', [item.menuItemId || item.menu_item_id || item.id]
                    );
                    return {
                        ...item,
                        name: (menuItem[0] && menuItem[0].name) || item.name || 'Unknown Item',
                        price: (menuItem[0] && menuItem[0].base_price) || item.price || 0
                    };
                } catch (error) {
                    console.warn('Failed to enrich menu item:', error);
                    return item;
                }
            }));

            return {
                orderId: order.order_id,
                id: order.order_id,
                customerName: order.customer_name,
                tableNumber: order.table_number,
                items: enrichedItems,
                totalPrice: parseFloat(order.total_price),
                status: order.status,
                paymentStatus: order.payment_status,
                paymentMethod: order.payment_method,
                orderTime: order.order_time,
                notes: order.notes,
                placedBy: order.staff_id ? 'staff' : 'customer',
                receiptPath: order.receipt_path,
                orderType: order.order_type
            };
        }));

        res.json({
            success: true,
            orders: mappedOrders,
            total: mappedOrders.length,
            page: parseInt(page),
            limit: parseInt(limit)
        });

    } catch (error) {
        console.error('Error fetching staff orders:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch orders'
        });
    }
});

module.exports = router;
        console.error('Error fetching staff orders:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch orders' });
    }
});

// Get staff orders (same as admin orders but for staff)
router.get('/orders', async(req, res) => {
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
                try {
                    const [menuItem] = await db.query(
                        'SELECT name, base_price FROM menu_items WHERE id = ?', [item.menuItemId || item.menu_item_id || item.id]
                    );
                    return {
                        ...item,
                        name: (menuItem[0] && menuItem[0].name) || item.name || 'Unknown Item',
                        price: (menuItem[0] && menuItem[0].base_price) || item.price || 0
                    };
                } catch (error) {
                    console.warn('Failed to enrich menu item:', error);
                    return item;
                }
            }));

            return {
                orderId: order.order_id,
                id: order.order_id,
                customerName: order.customer_name,
                tableNumber: order.table_number,
                items: enrichedItems,
                totalPrice: parseFloat(order.total_price),
                status: order.status,
                paymentStatus: order.payment_status,
                paymentMethod: order.payment_method,
                orderTime: order.order_time,
                notes: order.notes,
                placedBy: order.staff_id ? 'staff' : 'customer',
                receiptPath: order.receipt_path,
                orderType: order.order_type
            };
        }));

        res.json({
            success: true,
            orders: mappedOrders,
            total: mappedOrders.length,
            page: parseInt(page),
            limit: parseInt(limit)
        });

    } catch (error) {
        console.error('Error fetching staff orders:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch orders'
        });
    }
});

module.exports = router;