const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { ensureAdminAuthenticated } = require('../middleware/adminAuthMiddleware');
const { login, checkSession, logout, createStaff, editStaff, getAllStaff, countStaff, countAdmins, deleteStaff, getRevenueMetrics, getOrderMetrics, getInventoryMetrics, forgotPassword, resetPassword } = require('../controllers/adminController');
const ActivityLogger = require('../utils/activityLogger');
const AdminInventoryService = require('../services/adminInventoryService');

// Admin login route (does not require authentication)
router.post('/login', login);

// Admin session check (does not require full authentication as it checks session status)
router.get('/check-session', checkSession);

// Admin logout (does not require full authentication as it destroys session)
router.post('/logout', logout);

// Admin forgot password and reset password (do not require authentication)
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Test endpoint to verify database connectivity (public for testing)
router.get('/test', async(req, res) => {
    try {
        // Simple test queries
        const [customerCount] = await db.query('SELECT COUNT(*) as count FROM customers');
        const [orderCount] = await db.query('SELECT COUNT(*) as count FROM orders');
        const [ingredientCount] = await db.query('SELECT COUNT(*) as count FROM ingredients');

        res.json({
            success: true,
            message: 'Database connection successful',
            counts: {
                customers: customerCount[0].count,
                orders: orderCount[0].count,
                ingredients: ingredientCount[0].count
            }
        });
    } catch (error) {
        console.error('Test endpoint error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Protected Admin Routes (require authentication and admin role)
// Temporarily bypass authentication for testing
// router.use(ensureAdminAuthenticated);

// Test route to check authentication
router.get('/test-auth', (req, res) => {
    console.log('Test auth route accessed');
    console.log('Session:', req.session);
    console.log('User:', req.session.user);

    res.json({
        success: true,
        message: 'Admin authentication working',
        user: req.session.user,
        sessionId: req.sessionID
    });
});

// Unified metrics summary for admin and staff
router.get('/metrics/summary', async(req, res) => {
    try {
        const { range = 'today' } = req.query;
        let startFilter = '';
        let prevFilter = '';
        if (range === 'today') {
            startFilter = 'AND created_at >= CURDATE()';
            prevFilter = 'AND created_at >= DATE_SUB(CURDATE(), INTERVAL 1 DAY) AND created_at < CURDATE()';
        } else if (range === '7d') {
            startFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
            prevFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY) AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)';
        } else if (range === '30d') {
            startFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
            prevFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 60 DAY) AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)';
        }

        // Revenue: completed minus refunded
        const [completedRows] = await db.query(`
            SELECT COALESCE(SUM(amount),0) as amt FROM payment_transactions WHERE status = 'completed' ${startFilter}
        `);
        const [refundedRows] = await db.query(`
            SELECT COALESCE(SUM(amount),0) as amt FROM payment_transactions WHERE status = 'refunded' ${startFilter}
        `);
        const revenue = Number(completedRows[0].amt) - Number(refundedRows[0].amt);

        // Previous period revenue for growth calculation
        const [completedPrev] = await db.query(`
            SELECT COALESCE(SUM(amount),0) as amt FROM payment_transactions WHERE status = 'completed' ${prevFilter}
        `);
        const [refundedPrev] = await db.query(`
            SELECT COALESCE(SUM(amount),0) as amt FROM payment_transactions WHERE status = 'refunded' ${prevFilter}
        `);
        const prevRevenue = Number(completedPrev[0].amt) - Number(refundedPrev[0].amt);
        const growthPercent = prevRevenue === 0 ? (revenue > 0 ? 100 : 0) : ((revenue - prevRevenue) / prevRevenue * 100);

        // Orders by status in range (by order_time)
        let orderTimeFilter = '';
        if (range === 'today') orderTimeFilter = 'AND order_time >= CURDATE()';
        else if (range === '7d') orderTimeFilter = 'AND order_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
        else if (range === '30d') orderTimeFilter = 'AND order_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)';

        const [orderAgg] = await db.query(`
            SELECT 
              COUNT(*) total,
              SUM(status='pending') pending,
              SUM(status='processing') processing,
              SUM(status='ready') ready,
              SUM(status='completed') completed,
              SUM(status='cancelled') cancelled
            FROM orders
            WHERE 1=1 ${orderTimeFilter}
        `);

        // Inventory counts
        const [invCounts] = await db.query(`
            SELECT 
              SUM(actual_quantity > reorder_level) as in_stock,
              SUM(actual_quantity <= reorder_level AND actual_quantity > 0) as low_stock,
              SUM(actual_quantity <= 0) as out_of_stock
            FROM ingredients
        `);

        // Inventory transactions count
        const [txCountRows] = await db.query(`
            SELECT COUNT(*) as cnt FROM inventory_transactions WHERE 1=1 ${startFilter}
        `);

        res.json({
            success: true,
            range,
            revenue,
            prevRevenue,
            growthPercent,
            orders: {
                total: Number(orderAgg[0].total || 0),
                pending: Number(orderAgg[0].pending || 0),
                processing: Number(orderAgg[0].processing || 0),
                ready: Number(orderAgg[0].ready || 0),
                completed: Number(orderAgg[0].completed || 0),
                cancelled: Number(orderAgg[0].cancelled || 0)
            },
            inventory: {
                in_stock: Number(invCounts[0].in_stock || 0),
                low_stock: Number(invCounts[0].low_stock || 0),
                out_of_stock: Number(invCounts[0].out_of_stock || 0)
            },
            transactions: {
                count: Number(txCountRows[0].cnt || 0)
            }
        });
    } catch (error) {
        console.error('Metrics summary error:', error);
        res.status(500).json({ success: false, error: 'Failed to load metrics' });
    }
});

// Dashboard SSE stream endpoint
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

    // Clean up on client disconnect
    req.on('close', () => {
        clearInterval(heartbeat);
    });
});

// Admin dashboard data endpoint
router.get('/dashboard', async(req, res) => {
    try {
        // Get revenue metrics
        const [revenueResult] = await db.query(`
            SELECT 
                SUM(CASE WHEN DATE(created_at) = CURDATE() THEN total_price ELSE 0 END) as today,
                SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN total_price ELSE 0 END) as week,
                SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN total_price ELSE 0 END) as month,
                (
                    SELECT ((SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN total_price ELSE 0 END) - 
                             SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 60 DAY) AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY) THEN total_price ELSE 0 END)) / 
                            SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 60 DAY) AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY) THEN total_price ELSE 0 END)) * 100
                    FROM orders 
                    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 60 DAY)
                ) as growth
            FROM orders 
            WHERE payment_status = 'paid'
        `);

        // Get order metrics
        const [orderResult] = await db.query(`
            SELECT 
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                COUNT(*) as total
            FROM orders
        `);

        // Get customer metrics
        const [customerResult] = await db.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN c.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as new,
                COUNT(DISTINCT o.customer_id) as active
            FROM customers c
            LEFT JOIN orders o ON c.id = o.customer_id 
            WHERE c.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);

        // Get inventory metrics
        const [inventoryResult] = await db.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN actual_quantity <= reorder_level THEN 1 END) as low_stock,
                COUNT(CASE WHEN actual_quantity = 0 THEN 1 END) as out_of_stock
            FROM ingredients
        `);

        res.json({
            success: true,
            data: {
                revenue: {
                    today: parseFloat(revenueResult[0].today) || 0,
                    week: parseFloat(revenueResult[0].week) || 0,
                    month: parseFloat(revenueResult[0].month) || 0,
                    growth: parseFloat(revenueResult[0].growth) || 0
                },
                orders: {
                    pending: orderResult[0].pending || 0,
                    processing: orderResult[0].processing || 0,
                    completed: orderResult[0].completed || 0,
                    total: orderResult[0].total || 0
                },
                customers: {
                    total: customerResult[0].total || 0,
                    new: customerResult[0].new || 0,
                    active: customerResult[0].active || 0
                },
                inventory: {
                    total: inventoryResult[0].total || 0,
                    low_stock: inventoryResult[0].low_stock || 0,
                    out_of_stock: inventoryResult[0].out_of_stock || 0
                }
            }
        });

    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch dashboard data'
        });
    }
});

// Chart data endpoints
// Sales trend data for line chart
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

        console.log('Sales chart data:', { labels, data });

        res.json({
            success: true,
            labels: labels,
            data: data
        });
    } catch (error) {
        console.error('Sales chart error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch sales data'
        });
    }
});

// Ingredients usage data for pie chart
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

        console.log('Ingredients chart data:', { labels, data });

        res.json({
            success: true,
            labels: labels,
            data: data
        });
    } catch (error) {
        console.error('Ingredients chart error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch ingredients data'
        });
    }
});

// Menu items popularity data for bar chart
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

        const counts = new Map();
        for (const row of orders) {
            let parsed = [];
            try {
                parsed = JSON.parse(row.items || '[]');
            } catch (e) {
                parsed = [];
            }
            for (const item of parsed) {
                // Try multiple possible field names for menu item ID
                const menuItemId = item && (item.menu_item_id || item.menuItemId || item.id) ?
                    (item.menu_item_id || item.menuItemId || item.id) : null;
                const qty = Number(item && item.quantity ? item.quantity : 1);

                if (menuItemId) {
                    // Get the actual menu item name from the database
                    const [menuItem] = await db.query(`
                        SELECT name FROM menu_items WHERE id = ?
                    `, [menuItemId]);

                    if (menuItem.length > 0) {
                        const name = menuItem[0].name;
                        counts.set(name, (counts.get(name) || 0) + qty);
                    }
                    // Skip items that no longer exist in menu_items table
                } else {
                    // Fallback to stored name if no menu_item_id
                    const name = (item && item.name) ? item.name : null;
                    if (name && name !== 'Unknown') {
                        counts.set(name, (counts.get(name) || 0) + qty);
                    }
                    // Skip items with no name or "Unknown" name
                }
            }
        }

        const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
        const labels = sorted.map(([name]) => name);
        const data = sorted.map(([, count]) => count);

        res.json({
            success: true,
            labels: labels,
            data: data
        });
    } catch (error) {
        console.error('Menu items chart error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch menu items data'
        });
    }
});

// Staff sales performance data for horizontal bar chart
router.get('/dashboard/staff-sales', async(req, res) => {
    try {
        const [staffData] = await db.query(`
            SELECT 
                CASE 
                    WHEN CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) = ' ' 
                    THEN CONCAT('Staff ', u.id)
                    ELSE TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')))
                END as staff_name,
                SUM(o.total_price) as total_sales
            FROM orders o
            JOIN users u ON o.staff_id = u.id
            WHERE o.payment_status = 'paid'
                AND o.order_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY u.id, u.first_name, u.last_name
            ORDER BY total_sales DESC
            LIMIT 6
        `);

        const labels = staffData.map(item => item.staff_name);
        const data = staffData.map(item => parseFloat(item.total_sales) || 0);

        res.json({
            success: true,
            labels: labels,
            data: data
        });
    } catch (error) {
        console.error('Staff sales chart error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch staff sales data'
        });
    }
});

// Staff performance data with daily and monthly breakdowns
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

        // Get staff performance data - include all orders regardless of payment status for now
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
            LEFT JOIN users u ON o.staff_id = u.id
            WHERE o.order_time >= DATE_SUB(NOW(), ${interval})
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
            WHERE o.order_time >= DATE_SUB(NOW(), ${interval})
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
        let sortedStaff = Object.values(staffPerformance)
            .sort((a, b) => b.total_sales - a.total_sales)
            .slice(0, 10); // Top 10 staff

        // If no staff data found, try to get orders without staff association
        if (sortedStaff.length === 0) {
            console.log('No staff data found, checking for orders without staff association');
            const [ordersWithoutStaff] = await db.query(`
                SELECT 
                    'Unknown Staff' as staff_name,
                    NULL as staff_id,
                    ${groupBy} as period,
                    SUM(total_price) as total_sales,
                    COUNT(id) as order_count,
                    AVG(total_price) as avg_order_value
                FROM orders
                WHERE order_time >= DATE_SUB(NOW(), ${interval})
                GROUP BY ${groupBy}
                ORDER BY period DESC, total_sales DESC
            `);

            if (ordersWithoutStaff.length > 0) {
                console.log('Found orders without staff association:', ordersWithoutStaff);
                const fallbackStaff = {
                    staff_name: 'Unknown Staff',
                    staff_id: null,
                    periods: ordersWithoutStaff.map(item => ({
                        period: item.period,
                        sales: parseFloat(item.total_sales) || 0,
                        orders: parseInt(item.order_count) || 0,
                        avg_order_value: parseFloat(item.avg_order_value) || 0
                    })),
                    total_sales: ordersWithoutStaff.reduce((sum, item) => sum + (parseFloat(item.total_sales) || 0), 0),
                    total_orders: ordersWithoutStaff.reduce((sum, item) => sum + (parseInt(item.order_count) || 0), 0),
                    avg_order_value: 0
                };
                fallbackStaff.avg_order_value = fallbackStaff.total_orders > 0 ? fallbackStaff.total_sales / fallbackStaff.total_orders : 0;
                sortedStaff.push(fallbackStaff);
            }
        }

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

// Debug endpoint to check orders data
router.get('/debug/orders', async(req, res) => {
    try {
        const [orders] = await db.query(`
            SELECT 
                id,
                staff_id,
                total_price,
                payment_status,
                order_time,
                status
            FROM orders 
            ORDER BY order_time DESC 
            LIMIT 20
        `);

        const [users] = await db.query(`
            SELECT 
                id,
                first_name,
                last_name,
                role
            FROM users 
            WHERE role = 'staff'
        `);

        res.json({
            success: true,
            recent_orders: orders,
            staff_users: users
        });
    } catch (error) {
        console.error('Debug orders error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch debug data'
        });
    }
});

// Admin Inventory Management Routes
router.get('/inventory', async(req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                id,
                name,
                category,
                sku,
                actual_unit,
                actual_quantity,
                reorder_level,
                cost_per_actual_unit AS cost_per_unit,
                extra_price_per_unit,
                storage_location,
                days_of_stock,
                description,
                is_available,
                visible_in_customization,
                COALESCE(updated_at, created_at, NOW()) AS last_updated,
                CASE 
                    WHEN actual_quantity <= 0 THEN 'out_of_stock'
                    WHEN actual_quantity <= reorder_level THEN 'low_stock'
                    ELSE 'in_stock'
                END AS status
            FROM ingredients 
            ORDER BY name ASC
        `);

        res.json({
            success: true,
            inventory: rows.map(item => ({
                ...item,
                actual_quantity: parseFloat(item.actual_quantity),
                reorder_level: parseFloat(item.reorder_level),
                cost_per_unit: parseFloat(item.cost_per_unit),
                extra_price_per_unit: item.extra_price_per_unit != null ? parseFloat(item.extra_price_per_unit) : null
            }))
        });
    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch inventory data'
        });
    }
});

// Get inventory categories
router.get('/inventory/categories', async(req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT DISTINCT category 
            FROM ingredients 
            WHERE category IS NOT NULL AND category != ''
            ORDER BY category ASC
        `);

        res.json({
            success: true,
            categories: rows.map(row => row.category)
        });
    } catch (error) {
        console.error('Error fetching inventory categories:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch inventory categories'
        });
    }
});

// Add new ingredient
router.post('/inventory', async(req, res) => {
    try {
        const {
            name,
            category,
            sku,
            description,
            actual_unit,
            initial_quantity,
            reorder_level,
            days_of_stock,
            cost_per_unit,
            storage_location
        } = req.body;

        // Validate required fields
        if (!name || !category || !sku || !actual_unit || !initial_quantity) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: name, category, sku, actual_unit, initial_quantity'
            });
        }

        // Check if SKU already exists
        const [existingSku] = await db.query('SELECT id FROM ingredients WHERE sku = ?', [sku]);
        if (existingSku.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'SKU already exists'
            });
        }

        // Insert new ingredient
        const [result] = await db.query(`
            INSERT INTO ingredients (
                name, category, sku, description, actual_unit, 
                actual_quantity, reorder_level, days_of_stock, 
                cost_per_actual_unit, storage_location, is_available, visible_in_customization
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, TRUE)
        `, [
            name, category, sku, description, actual_unit,
            parseFloat(initial_quantity) || 0,
            parseFloat(reorder_level) || 0,
            parseInt(days_of_stock) || 0,
            parseFloat(cost_per_unit) || 0,
            storage_location
        ]);

        // Log admin activity (create ingredient)
        try {
            const adminId = (req.session && (
                (req.session.user && req.session.user.id) ||
                (req.session.admin && req.session.admin.id) ||
                (req.session.adminUser && req.session.adminUser.id)
            )) || null;
            if (adminId) {
                await ActivityLogger.logAdminActivity(
                    adminId,
                    'create_ingredient',
                    'ingredient',
                    result.insertId,
                    null, { name, category, sku, actual_unit, actual_quantity: parseFloat(initial_quantity) || 0 },
                    `Created ingredient ${name}`,
                    req
                );
            }
        } catch (e) {
            console.warn('Activity log (create_ingredient) failed:', e.message);
        }

        // Emit real-time update for new ingredient
        try {
            const io = req.app.get('io');
            if (io) {
                io.to('admin-room').emit('inventory-updated', {
                    type: 'ingredient_added',
                    ingredientId: result.insertId,
                    name,
                    category,
                    actual_quantity: parseFloat(initial_quantity) || 0,
                    unit: actual_unit,
                    timestamp: new Date()
                });
                io.to('staff-room').emit('inventory-updated', {
                    type: 'ingredient_added',
                    ingredientId: result.insertId,
                    name,
                    category,
                    actual_quantity: parseFloat(initial_quantity) || 0,
                    unit: actual_unit,
                    timestamp: new Date()
                });
            }
        } catch (emitErr) {
            console.warn('inventory-updated emit (create) failed:', emitErr.message);
        }

        res.json({
            success: true,
            message: 'Ingredient added successfully',
            ingredientId: result.insertId
        });
    } catch (error) {
        console.error('Error adding ingredient:', error);
        res.status(500).json({
            success: false,
            error: `Failed to add item: ${error.message}`
        });
    }
});

// Update ingredient
router.put('/inventory/:id', async(req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            category,
            actual_quantity,
            actual_unit,
            reorder_level,
            cost_per_unit,
            extra_price_per_unit
        } = req.body;

        // Validate required fields
        if (!name || !category || !actual_quantity || !actual_unit) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: name, category, actual_quantity, actual_unit'
            });
        }

        // Get current ingredient for logging
        const [existing] = await db.query('SELECT * FROM ingredients WHERE id = ?', [id]);
        const oldValues = existing.length > 0 ? existing[0] : null;

        // Ensure extra_price_per_unit column exists
        try {
            await db.query(`
                ALTER TABLE ingredients 
                ADD COLUMN IF NOT EXISTS extra_price_per_unit DECIMAL(10,2) NULL DEFAULT NULL
            `);
        } catch (schemaErr) {
            // Ignore if DB version doesn't support IF NOT EXISTS and column already exists
            const msg = (schemaErr && schemaErr.message) ? schemaErr.message : '';
            if (!/Duplicate column name|exists/i.test(String(msg))) {
                console.warn('extra_price_per_unit column check:', msg);
            }
        }

        // Update ingredient
        await db.query(`
            UPDATE ingredients 
            SET name = ?, category = ?, actual_quantity = ?, actual_unit = ?, 
                reorder_level = ?, cost_per_actual_unit = ?, extra_price_per_unit = COALESCE(?, extra_price_per_unit),
                updated_at = NOW()
            WHERE id = ?
        `, [
            name, category, parseFloat(actual_quantity), actual_unit,
            parseFloat(reorder_level) || 0, parseFloat(cost_per_unit) || 0,
            (extra_price_per_unit != null ? parseFloat(extra_price_per_unit) : null),
            id
        ]);

        // Fetch new values for logging
        const [updated] = await db.query('SELECT * FROM ingredients WHERE id = ?', [id]);
        const newValues = updated.length > 0 ? updated[0] : null;

        // Record inventory transaction when quantity changed manually via form
        try {
            if (oldValues && newValues && oldValues.actual_quantity !== newValues.actual_quantity) {
                const previousQty = parseFloat(oldValues.actual_quantity) || 0;
                const newQty = parseFloat(newValues.actual_quantity) || 0;
                const delta = newQty - previousQty; // positive = restock, negative = manual usage
                const type = delta >= 0 ? 'restock' : 'manual_usage';

                await db.query(`
                    INSERT INTO inventory_transactions 
                    (ingredient_id, transaction_type, actual_amount, previous_actual_quantity, new_actual_quantity, notes, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, NOW())
                `, [
                    id,
                    type,
                    Math.abs(delta),
                    previousQty,
                    newQty,
                    type === 'restock' ? 'Manual restock via admin form' : 'Manual deduction via admin form'
                ]);
            }
        } catch (txErr) {
            console.warn('inventory_transactions insert (manual change) failed:', txErr.message);
        }

        // Log admin activity
        try {
            const adminId = (req.session && (
                (req.session.user && req.session.user.id) ||
                (req.session.admin && req.session.admin.id) ||
                (req.session.adminUser && req.session.adminUser.id)
            )) || null;
            if (adminId) {
                await ActivityLogger.logAdminActivity(
                    adminId,
                    'update_ingredient',
                    'ingredient',
                    id,
                    oldValues,
                    newValues,
                    `Updated ingredient ${name}`,
                    req
                );
            }
        } catch (e) {
            console.warn('Activity log (update_ingredient) failed:', e.message);
        }

        // Emit real-time update for ingredient update
        try {
            const io = req.app.get('io');
            if (io) {
                io.to('admin-room').emit('inventory-updated', {
                    type: 'ingredient_updated',
                    ingredientId: id,
                    name,
                    category,
                    previous: oldValues ? oldValues.actual_quantity : undefined,
                    new: newValues ? newValues.actual_quantity : undefined,
                    unit: newValues ? newValues.actual_unit : undefined,
                    timestamp: new Date()
                });
                io.to('staff-room').emit('inventory-updated', {
                    type: 'ingredient_updated',
                    ingredientId: id,
                    name,
                    category,
                    previous: oldValues ? oldValues.actual_quantity : undefined,
                    new: newValues ? newValues.actual_quantity : undefined,
                    unit: newValues ? newValues.actual_unit : undefined,
                    timestamp: new Date()
                });
            }
        } catch (emitErr) {
            console.warn('inventory-updated emit (update) failed:', emitErr.message);
        }

        res.json({
            success: true,
            message: 'Ingredient updated successfully'
        });
    } catch (error) {
        console.error('Error updating ingredient:', error);
        res.status(500).json({
            success: false,
            error: `Failed to update item: ${error.message}`
        });
    }
});

// Delete ingredient
router.delete('/inventory/:id', async(req, res) => {
    try {
        const { id } = req.params;

        // Check if ingredient is used in any menu items
        const [menuUsage] = await db.query(`
            SELECT COUNT(*) as count 
            FROM menu_item_ingredients 
            WHERE ingredient_id = ?
        `, [id]);

        if (menuUsage[0].count > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete ingredient that is used in menu items'
            });
        }

        // Get current ingredient for logging
        const [existing] = await db.query('SELECT * FROM ingredients WHERE id = ?', [id]);
        const oldValues = existing.length > 0 ? existing[0] : null;

        // Delete ingredient
        await db.query('DELETE FROM ingredients WHERE id = ?', [id]);

        // Emit real-time update for ingredient delete
        try {
            const io = req.app.get('io');
            if (io) {
                io.to('admin-room').emit('inventory-updated', {
                    type: 'ingredient_deleted',
                    ingredientId: id,
                    name: oldValues ? oldValues.name : undefined,
                    timestamp: new Date()
                });
                io.to('staff-room').emit('inventory-updated', {
                    type: 'ingredient_deleted',
                    ingredientId: id,
                    name: oldValues ? oldValues.name : undefined,
                    timestamp: new Date()
                });
            }
        } catch (emitErr) {
            console.warn('inventory-updated emit (delete) failed:', emitErr.message);
        }

        // Log admin activity
        try {
            const adminId = (req.session && (
                (req.session.user && req.session.user.id) ||
                (req.session.admin && req.session.admin.id) ||
                (req.session.adminUser && req.session.adminUser.id)
            )) || null;
            if (adminId) {
                await ActivityLogger.logAdminActivity(
                    adminId,
                    'delete_ingredient',
                    'ingredient',
                    id,
                    oldValues,
                    null,
                    `Deleted ingredient ${oldValues && oldValues.name ? oldValues.name : id}`,
                    req
                );
            }
        } catch (e) {
            console.warn('Activity log (delete_ingredient) failed:', e.message);
        }

        res.json({
            success: true,
            message: 'Ingredient deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting ingredient:', error);
        res.status(500).json({
            success: false,
            error: `Failed to delete item: ${error.message}`
        });
    }
});

// Update ingredient customization visibility
router.put('/inventory/:id/customization-visibility', async(req, res) => {
    try {
        const { id } = req.params;
        const { visible_in_customization } = req.body;

        if (typeof visible_in_customization !== 'boolean') {
            return res.status(400).json({
                success: false,
                error: 'visible_in_customization must be a boolean value'
            });
        }

        // Update ingredient customization visibility
        await db.query(`
            UPDATE ingredients 
            SET visible_in_customization = ?, updated_at = NOW()
            WHERE id = ?
        `, [visible_in_customization, id]);

        res.json({
            success: true,
            message: `Customization visibility updated to ${visible_in_customization ? 'visible' : 'hidden'}`
        });
    } catch (error) {
        console.error('Error updating customization visibility:', error);
        res.status(500).json({
            success: false,
            error: `Failed to update customization visibility: ${error.message}`
        });
    }
});

// Bulk import ingredients
router.post('/inventory/bulk', async(req, res) => {
    try {
        // This endpoint expects a CSV file upload
        // For now, we'll handle the basic structure
        // You can enhance this with actual CSV parsing later

        const { ingredients } = req.body;

        if (!ingredients || !Array.isArray(ingredients)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request. Expected an array of ingredients.'
            });
        }

        const results = [];
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            for (const ingredient of ingredients) {
                try {
                    const {
                        name,
                        category,
                        sku,
                        description,
                        actual_unit,
                        initial_quantity,
                        reorder_level,
                        days_of_stock,
                        cost_per_unit,
                        storage_location
                    } = ingredient;

                    // Validate required fields
                    if (!name || !category || !sku || !actual_unit || !initial_quantity) {
                        results.push({
                            success: false,
                            name: name || 'Unknown',
                            error: 'Missing required fields'
                        });
                        continue;
                    }

                    // Check if SKU already exists
                    const [existingSku] = await connection.query(
                        'SELECT id FROM ingredients WHERE sku = ?', [sku]
                    );

                    if (existingSku.length > 0) {
                        results.push({
                            success: false,
                            name,
                            error: 'SKU already exists'
                        });
                        continue;
                    }

                    // Insert ingredient
                    const [result] = await connection.query(`
                        INSERT INTO ingredients (
                            name, category, sku, description, actual_unit, 
                            actual_quantity, reorder_level, days_of_stock, 
                            cost_per_actual_unit, storage_location, is_available, visible_in_customization
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, TRUE)
                    `, [
                        name, category, sku, description, actual_unit,
                        parseFloat(initial_quantity) || 0,
                        parseFloat(reorder_level) || 0,
                        parseInt(days_of_stock) || 30,
                        parseFloat(cost_per_unit) || 0,
                        storage_location
                    ]);

                    results.push({
                        success: true,
                        name,
                        ingredientId: result.insertId
                    });
                } catch (error) {
                    results.push({
                        success: false,
                        name: ingredient.name || 'Unknown',
                        error: error.message
                    });
                }
            }

            await connection.commit();

            const successCount = results.filter(r => r.success).length;
            const errorCount = results.length - successCount;

            res.status(errorCount > 0 ? 207 : 201).json({
                success: errorCount === 0,
                message: `Processed ${results.length} ingredients (${successCount} success, ${errorCount} failed)`,
                results
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error in bulk import:', error);
        res.status(500).json({
            success: false,
            error: `Failed to process bulk import: ${error.message}`
        });
    }
});

// Staff dashboard data endpoint
router.get('/staff-dashboard', async(req, res) => {
    try {
        // Get order metrics
        const [orderResult] = await db.query(`
            SELECT 
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
                COUNT(CASE WHEN status = 'ready' THEN 1 END) as ready,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                COUNT(*) as total
            FROM orders
        `);

        // Get today's stats
        const [todayResult] = await db.query(`
            SELECT 
                COUNT(*) as orders,
                SUM(total_price) as revenue,
                COUNT(DISTINCT customer_id) as customers
            FROM orders 
            WHERE DATE(created_at) = CURDATE()
        `);

        // Get recent orders
        const [recentOrdersResult] = await db.query(`
            SELECT 
                order_id as id,
                customer_name as customer,
                items,
                total_price as amount,
                status,
                created_at as time,
                table_number as tableNumber
            FROM orders 
            WHERE status IN ('pending', 'pending_verification', 'processing', 'ready')
            ORDER BY created_at DESC 
            LIMIT 10
        `);

        // Get low stock items
        const [lowStockResult] = await db.query(`
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

        // Get upcoming events
        const [eventsResult] = await db.query(`
            SELECT 
                id,
                customer_name as customer,
                event_type as eventType,
                event_date as eventDate,
                guest_count as guestCount,
                status
            FROM events 
            WHERE event_date >= CURDATE() AND status IN ('pending', 'confirmed')
            ORDER BY event_date ASC
            LIMIT 10
        `);

        const dashboardData = {
            orders: {
                pending: orderResult[0].pending || 0,
                processing: orderResult[0].processing || 0,
                ready: orderResult[0].ready || 0,
                completed: orderResult[0].completed || 0,
                total: orderResult[0].total || 0
            },
            todayStats: {
                orders: todayResult[0].orders || 0,
                revenue: parseFloat(todayResult[0].revenue) || 0,
                customers: todayResult[0].customers || 0
            },
            recentOrders: recentOrdersResult.map(order => ({
                id: order.id,
                customer: order.customer,
                items: JSON.parse(order.items).map(item => item.name),
                amount: parseFloat(order.amount),
                status: order.status,
                time: order.time,
                tableNumber: order.tableNumber
            })),
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

        res.json({
            success: true,
            ...dashboardData
        });

    } catch (error) {
        console.error('Error fetching staff dashboard data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch dashboard data'
        });
    }
});

// Update order status
router.put('/orders/:orderId/status', async(req, res) => {
    try {
        const { orderId } = req.params;
        const { status, notes } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                error: 'Status is required'
            });
        }

        // Get order details for ingredient deduction
        const [orderResult] = await db.query(`
            SELECT * FROM orders WHERE id = ?
        `, [orderId]);

        if (orderResult.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        const order = orderResult[0];

        // Update order status
        let updateQuery = 'UPDATE orders SET status = ?, updated_at = NOW()';
        let updateParams = [status];

        // Automatically set payment status to 'paid' when order is completed
        if (status === 'completed') {
            updateQuery += ', payment_status = ?, completed_time = NOW()';
            updateParams.push('paid');
        }

        updateQuery += ' WHERE id = ?';
        updateParams.push(orderId);

        await db.query(updateQuery, updateParams);

        // If just completed, award loyalty points per settings
        if (status === 'completed' && order.customer_id) {
            try {
                const [loyaltySettings] = await db.query(`
                    SELECT setting_key, setting_value FROM loyalty_settings 
                    WHERE setting_key IN ('loyalty_enabled', 'points_per_peso')
                `);
                const settingsObj = {};
                loyaltySettings.forEach(s => settingsObj[s.setting_key] = s.setting_value);
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
                console.error('Admin status: awarding points failed:', pointsErr);
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

                console.log('🔔 Admin status update: Deducting ingredients for order', orderId);
                await ingredientDeductionService.deductIngredientsForOrder(orderId, itemsForDeduction, req);
            } catch (deductionError) {
                console.error('Failed to deduct ingredients during status update:', deductionError);
                // Don't fail the status update if ingredient deduction fails
            }
        }

        // Log the status change
        await db.query(`
            INSERT INTO inventory_transactions (
                ingredient_id, transaction_type, quantity, unit, 
                reference_type, reference_id, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
            null, 'status_change', 1, 'order', 'order', orderId,
            `Order ${orderId} status changed to ${status} by admin`
        ]);

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            io.to(`order-${order.order_id}`).emit('order-updated', {
                orderId: order.order_id,
                status,
                timestamp: new Date()
            });
            io.to('staff-room').emit('order-updated', {
                orderId: order.order_id,
                status,
                timestamp: new Date()
            });
            io.to('admin-room').emit('order-updated', {
                orderId: order.order_id,
                status,
                timestamp: new Date()
            });
        }

        res.json({
            success: true,
            message: `Order status updated to ${status}`
        });

    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update order status'
        });
    }
});

// Verify payment and process order (Admin)
router.post('/orders/:orderId/verify-payment', async(req, res) => {
    try {
        const { orderId } = req.params;
        const { paymentMethod, verifiedBy, reference, transactionId } = req.body;

        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Get order details with customer email
            const [orderResult] = await connection.query(`
                SELECT o.*, c.email as customer_email 
                FROM orders o 
                LEFT JOIN customers c ON o.customer_id = c.id 
                WHERE o.order_id = ? OR o.id = ?
            `, [orderId, orderId]);

            if (orderResult.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Order not found'
                });
            }

            const order = orderResult[0];
            const orderItems = JSON.parse(order.items || '[]');

            // Check if ingredients were already deducted
            // Note: inventory_transactions table doesn't exist in local database
            // const [deductionCheck] = await connection.query(`
            //     SELECT COUNT(*) as count 
            //     FROM inventory_transactions 
            //     WHERE reference_type = 'order' AND reference_id = ? AND transaction_type = 'usage'
            // `, [orderId]);

            // Note: Ingredient deduction now happens when order is marked as 'ready', not during payment verification

            // Update payment status and move to preparing status
            await connection.query(`
                UPDATE orders 
                SET payment_status = 'paid', 
                    payment_method = ?,
                    status = 'preparing',
                    updated_at = NOW() 
                WHERE order_id = ? OR id = ?
            `, [paymentMethod || 'cash', orderId, orderId]);

            // Log payment verification
            const txId = transactionId || `${(paymentMethod || 'cash').toUpperCase()}_${Date.now()}`;
            const refVal = reference || (verifiedBy ? `Verified by ${verifiedBy}` : null);

            // Check if there's already a payment transaction for this order
            const [existingTx] = await connection.query(`
                SELECT id FROM payment_transactions 
                WHERE order_id = ? AND status = 'completed'
                ORDER BY created_at DESC LIMIT 1
            `, [order.order_id]);

            if (existingTx.length > 0 && refVal) {
                // Update existing transaction with admin reference
                await connection.query(`
                    UPDATE payment_transactions 
                    SET reference = ?, transaction_id = ?, updated_at = NOW()
                    WHERE id = ?
                `, [refVal, txId, existingTx[0].id]);
            } else {
                // Insert new payment transaction
                await connection.query(`
                    INSERT INTO payment_transactions 
                    (order_id, payment_method, amount, transaction_id, status, reference, created_at) 
                    VALUES (?, ?, ?, ?, 'completed', ?, NOW())
                `, [order.order_id, paymentMethod || 'cash', order.total_price, txId, refVal]);
            }

            await connection.commit();

            // Emit real-time update (canonical: confirmed + paid)
            const io = req.app.get('io');
            if (io) {
                console.log('📡 Emitting payment verification updates...');
                console.log('  - Order ID:', orderId);
                console.log('  - Customer email:', order.customer_email);
                console.log('  - Customer name:', order.customer_name);

                const payload = {
                    orderId,
                    status: 'preparing',
                    paymentStatus: 'paid',
                    paymentMethod: paymentMethod || 'cash',
                    verifiedBy: verifiedBy || 'admin',
                    timestamp: new Date()
                };

                io.to(`order-${orderId}`).emit('order-updated', payload);
                io.to('admin-room').emit('order-updated', payload);
                io.to('staff-room').emit('order-updated', payload);
                io.to('admin-room').emit('payment-updated', payload);
                io.to('staff-room').emit('payment-updated', payload);

                const customerRoom = `customer-${order.customer_email || order.customer_name}`;
                io.to(customerRoom).emit('order-updated', payload);
                if (order.customer_email) {
                    io.to(`customer-${order.customer_email}`).emit('order-updated', payload);
                }
            }

            res.json({
                success: true,
                message: 'Payment verified successfully',
                orderId,
                status: 'preparing',
                paymentStatus: 'paid'
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({
            success: false,
            error: `Failed to verify payment: ${error.message}`
        });
    }
});

// Refund order (Admin) - full refund
router.post('/orders/:orderId/refund', async(req, res) => {
            const { orderId } = req.params;
            const { amount, reason } = req.body || {};
            const adminId = (req.session && (
                (req.session.admin && req.session.admin.id) ||
                (req.session.user && req.session.user.id) ||
                (req.session.adminUser && req.session.adminUser.id)
            )) || null;
            const connection = await db.getConnection();
            try {
                await connection.beginTransaction();

                const [orderRows] = await connection.query('SELECT * FROM orders WHERE id = ? OR order_id = ?', [orderId, orderId]);
                if (orderRows.length === 0) {
                    await connection.rollback();
                    return res.status(404).json({ success: false, error: 'Order not found' });
                }
                const order = orderRows[0];

                // Compute refund amount (default to total price)
                const refundAmount = amount != null ? Number(amount) : Number(order.total_price || order.total_amount || 0);

                // Mark order as refunded
                await connection.query('UPDATE orders SET payment_status = ?, status = ?, updated_at = NOW() WHERE id = ?', ['refunded', 'cancelled', order.id]);

                // Record payment transaction as refunded
                await connection.query(`
            INSERT INTO payment_transactions (order_id, payment_method, amount, status, reference, created_at)
            VALUES (?, ?, ?, 'refunded', ?, NOW())
        `, [order.order_id || order.id, order.payment_method || 'cash', refundAmount, reason || 'Admin refund']);

                await connection.commit();

                // Intentionally do NOT restore inventory on refund per requirement

                // Log admin activity
                try {
                    if (adminId) {
                        await ActivityLogger.logAdminActivity(
                                adminId,
                                'refund_order',
                                'order',
                                order.order_id || order.id, { status: order.status, payment_status: order.payment_status }, { status: 'cancelled', payment_status: 'refunded' },
                                `Refunded order ${order.order_id || order.id} for ₱${refundAmount}${reason ? ` (${reason})` : ''}`,
                    req
                );
            }
        } catch (e) { console.warn('Refund activity log failed:', e.message); }

        // Emit realtime updates
        try {
            const io = req.app.get('io');
            if (io) {
                io.to('admin-room').emit('order-updated', { orderId: order.order_id || order.id, status: 'cancelled', paymentStatus: 'refunded', timestamp: new Date() });
                io.to('staff-room').emit('order-updated', { orderId: order.order_id || order.id, status: 'cancelled', paymentStatus: 'refunded', timestamp: new Date() });
            }
        } catch (e) { console.warn('Refund emit failed:', e.message); }

        return res.json({ success: true, message: 'Order refunded successfully' });
    } catch (error) {
        try { await connection.rollback(); } catch (_) {}
        console.error('Refund error:', error);
        return res.status(500).json({ success: false, error: 'Failed to refund order' });
    } finally {
        connection.release();
    }
});

router.get('/menu', (req, res) => res.json({ message: 'Menu Data' }));
router.get('/events', (req, res) => res.json({ message: 'Manage Events Data' }));
router.get('/loyalty', (req, res) => res.json({ message: 'Loyalty Points Data' }));
router.get('/feedback', (req, res) => res.json({ message: 'Feedback Data' }));
router.get('/logs', (req, res) => res.json({ message: 'Activity Logs Data' }));
router.get('/settings', (req, res) => res.json({ message: 'Settings Data' }));

// Get comprehensive activity logs (admin and staff activities)
router.get('/activity-logs', async(req, res) => {
    try {
        const { page = 1, limit = 50, user_type = 'all', action_type = 'all', start_date, end_date } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                'admin' as user_type,
                aal.id,
                aal.admin_id as user_id,
                a.username as username,
                aal.action_type,
                aal.target_type,
                aal.target_id,
                aal.old_values,
                aal.new_values,
                aal.description,
                aal.created_at
            FROM admin_activity_log aal
            JOIN admin a ON aal.admin_id = a.id
            
            UNION ALL
            
            SELECT 
                'staff' as user_type,
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
        `;

        const whereConditions = [];
        const params = [];

        if (user_type !== 'all') {
            whereConditions.push('user_type = ?');
            params.push(user_type);
        }

        if (action_type !== 'all') {
            whereConditions.push('action_type = ?');
            params.push(action_type);
        }

        if (start_date) {
            whereConditions.push('created_at >= ?');
            params.push(start_date);
        }

        if (end_date) {
            whereConditions.push('created_at <= ?');
            params.push(end_date + ' 23:59:59');
        }

        if (whereConditions.length > 0) {
            query = `SELECT * FROM (${query}) as combined_logs WHERE ${whereConditions.join(' AND ')}`;
        } else {
            query = `SELECT * FROM (${query}) as combined_logs`;
        }

        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM (${query}) as count_query`;
        const [countResult] = await db.query(countQuery, params);
        const total = countResult[0].total;

        // Get paginated results
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const [activities] = await db.query(query, params);

        // Format the activities
        const formattedActivities = activities.map(activity => ({
            id: activity.id,
            user_type: activity.user_type,
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
        console.error('Error fetching activity logs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch activity logs'
        });
    }
});

// Get activity log statistics
router.get('/activity-logs/stats', async(req, res) => {
    try {
        const { start_date, end_date } = req.query;

        let dateFilter = '';
        const params = [];

        if (start_date && end_date) {
            dateFilter = 'WHERE created_at BETWEEN ? AND ?';
            params.push(start_date, end_date + ' 23:59:59');
        }

        // Get activity counts by user type
        const userTypeQuery = `
            SELECT 
                user_type,
                COUNT(*) as count
            FROM (
                SELECT 'admin' as user_type, created_at FROM admin_activity_log
                UNION ALL
                SELECT 'staff' as user_type, created_at FROM staff_activity_log
            ) as combined_logs
            ${dateFilter}
            GROUP BY user_type
        `;

        // Get activity counts by action type
        const actionTypeQuery = `
            SELECT 
                action_type,
                COUNT(*) as count
            FROM (
                SELECT action_type, created_at FROM admin_activity_log
                UNION ALL
                SELECT action_type, created_at FROM staff_activity_log
            ) as combined_logs
            ${dateFilter}
            GROUP BY action_type
            ORDER BY count DESC
        `;

        // Get recent activity (last 7 days)
        const recentActivityQuery = `
            SELECT 
                user_type,
                action_type,
                COUNT(*) as count
            FROM (
                SELECT 'admin' as user_type, action_type, created_at FROM admin_activity_log
                UNION ALL
                SELECT 'staff' as user_type, action_type, created_at FROM staff_activity_log
            ) as combined_logs
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY user_type, action_type
            ORDER BY count DESC
        `;

        const [userTypeStats] = await db.query(userTypeQuery, params);
        const [actionTypeStats] = await db.query(actionTypeQuery, params);
        const [recentActivity] = await db.query(recentActivityQuery);

        res.json({
            success: true,
            stats: {
                by_user_type: userTypeStats,
                by_action_type: actionTypeStats,
                recent_activity: recentActivity
            }
        });

    } catch (error) {
        console.error('Error fetching activity log stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch activity log statistics'
        });
    }
});

// Staff Management Routes (require authentication and admin role)
router.post('/staff', createStaff);
router.put('/staff/:id', editStaff);
router.get('/staff', getAllStaff);
router.get('/metrics/staff/count', countStaff);
router.get('/metrics/admins/count', countAdmins);
router.delete('/staff/:id', deleteStaff);

// Loyalty Management Routes
// Get loyalty settings
router.get('/loyalty/settings', async(req, res) => {
    try {
        const [settings] = await db.query('SELECT * FROM loyalty_settings ORDER BY setting_key');

        // Convert settings array to object for easier frontend handling
        const settingsObj = {};
        settings.forEach(setting => {
            settingsObj[setting.setting_key] = {
                value: setting.setting_value,
                description: setting.description,
                updated_at: setting.updated_at
            };
        });

        res.json({ success: true, settings: settingsObj });
    } catch (error) {
        console.error('Error fetching loyalty settings:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch loyalty settings' });
    }
});

// Update loyalty settings
router.put('/loyalty/settings', async(req, res) => {
    try {
        console.log('Loyalty settings update request received');
        console.log('Request body:', req.body);
        console.log('Session data:', {
            adminUser: req.session.adminUser,
            admin: req.session.admin,
            user: req.session.user
        });

        const { settings } = req.body;
        const adminId = (req.session.adminUser && req.session.adminUser.id) || (req.session.admin && req.session.admin.id) || null; // Get admin ID from session

        if (!adminId) {
            console.log('No admin ID found in session');
            return res.status(401).json({ success: false, error: 'Admin not authenticated' });
        }

        console.log('Settings to update:', settings);
        console.log('Admin ID:', adminId);

        const connection = await db.getConnection();

        await connection.beginTransaction();

        try {
            for (const [key, value] of Object.entries(settings)) {
                console.log(`Updating setting: ${key} = ${value}`);
                await connection.query(`
                    UPDATE loyalty_settings 
                    SET setting_value = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP 
                    WHERE setting_key = ?
                `, [value, adminId || null, key]);
            }

            await connection.commit();
            console.log('Settings updated successfully');
            res.json({ success: true, message: 'Loyalty settings updated successfully' });
        } catch (error) {
            await connection.rollback();
            console.error('Database error:', error);
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error updating loyalty settings:', error);
        res.status(500).json({ success: false, error: 'Failed to update loyalty settings' });
    }
});

// Get loyalty rewards
router.get('/loyalty/rewards', ensureAdminAuthenticated, async(req, res) => {
    try {
        const [rewards] = await db.query('SELECT * FROM loyalty_rewards ORDER BY points_required ASC');
        res.json({ success: true, rewards });
    } catch (error) {
        console.error('Error fetching loyalty rewards:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch loyalty rewards' });
    }
});

// Create new loyalty reward
router.post('/loyalty/rewards', ensureAdminAuthenticated, async(req, res) => {
    try {
        const { name, description, points_required, reward_type, discount_percentage, image_url } = req.body;

        const [result] = await db.query(`
            INSERT INTO loyalty_rewards 
            (name, description, points_required, reward_type, discount_percentage, image_url) 
            VALUES (?, ?, ?, ?, ?, ?)
        `, [name, description, points_required, reward_type, discount_percentage || null, image_url || null]);

        res.json({
            success: true,
            message: 'Reward created successfully',
            rewardId: result.insertId
        });
    } catch (error) {
        console.error('Error creating loyalty reward:', error);
        res.status(500).json({ success: false, error: 'Failed to create loyalty reward' });
    }
});

// Update loyalty reward
router.put('/loyalty/rewards/:id', ensureAdminAuthenticated, async(req, res) => {
    try {
        const { id } = req.params;
        const { name, description, points_required, reward_type, discount_percentage, image_url, is_active } = req.body;

        await db.query(`
            UPDATE loyalty_rewards 
            SET name = ?, description = ?, points_required = ?, reward_type = ?, 
                discount_percentage = ?, image_url = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `, [name, description, points_required, reward_type, discount_percentage || null, image_url || null, is_active, id]);

        res.json({ success: true, message: 'Reward updated successfully' });
    } catch (error) {
        console.error('Error updating loyalty reward:', error);
        res.status(500).json({ success: false, error: 'Failed to update loyalty reward' });
    }
});

// Delete loyalty reward
router.delete('/loyalty/rewards/:id', ensureAdminAuthenticated, async(req, res) => {
    try {
        const { id } = req.params;

        await db.query('DELETE FROM loyalty_rewards WHERE id = ?', [id]);

        res.json({ success: true, message: 'Reward deleted successfully' });
    } catch (error) {
        console.error('Error deleting loyalty reward:', error);
        res.status(500).json({ success: false, error: 'Failed to delete loyalty reward' });
    }
});

// Toggle reward status
router.patch('/loyalty/rewards/:id/toggle', ensureAdminAuthenticated, async(req, res) => {
    try {
        const { id } = req.params;

        const [currentReward] = await db.query('SELECT is_active FROM loyalty_rewards WHERE id = ?', [id]);

        if (currentReward.length === 0) {
            return res.status(404).json({ success: false, error: 'Reward not found' });
        }

        const newStatus = !currentReward[0].is_active;

        await db.query('UPDATE loyalty_rewards SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newStatus, id]);

        res.json({
            success: true,
            message: `Reward ${newStatus ? 'activated' : 'deactivated'} successfully`,
            is_active: newStatus
        });
    } catch (error) {
        console.error('Error toggling reward status:', error);
        res.status(500).json({ success: false, error: 'Failed to toggle reward status' });
    }
});

// Get loyalty statistics
router.get('/loyalty/stats', ensureAdminAuthenticated, async(req, res) => {
    try {
        // Get total customers with loyalty points
        const [customerStats] = await db.query(`
            SELECT 
                COUNT(*) as total_customers,
                COUNT(CASE WHEN loyalty_points > 0 THEN 1 END) as active_members,
                AVG(loyalty_points) as avg_points,
                SUM(loyalty_points) as total_points
            FROM customers
        `);

        // Get transaction statistics
        const [transactionStats] = await db.query(`
            SELECT 
                COUNT(*) as total_transactions,
                SUM(points_earned) as total_earned,
                SUM(points_redeemed) as total_redeemed,
                COUNT(CASE WHEN transaction_type = 'earn' THEN 1 END) as earn_transactions,
                COUNT(CASE WHEN transaction_type = 'redeem' THEN 1 END) as redeem_transactions
            FROM loyalty_transactions
        `);

        // Get monthly breakdown
        const [monthlyStats] = await db.query(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                COUNT(*) as transactions,
                SUM(points_earned) as earned,
                SUM(points_redeemed) as redeemed
            FROM loyalty_transactions 
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month DESC
            LIMIT 12
        `);

        // Get top customers by points
        const [topCustomers] = await db.query(`
            SELECT 
                full_name,
                loyalty_points,
                created_at
            FROM customers 
            WHERE loyalty_points > 0
            ORDER BY loyalty_points DESC 
            LIMIT 10
        `);

        res.json({
            success: true,
            data: {
                customerStats: customerStats[0],
                transactionStats: transactionStats[0],
                monthlyStats,
                topCustomers
            }
        });

    } catch (error) {
        console.error('Error fetching loyalty statistics:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch loyalty statistics' });
    }
});

// Get customer loyalty details
router.get('/loyalty/customers', ensureAdminAuthenticated, async(req, res) => {
    try {
        const { page = 1, limit = 20, search = '' } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = '';
        let params = [];

        if (search) {
            whereClause = 'WHERE full_name LIKE ? OR email LIKE ?';
            params = [`%${search}%`, `%${search}%`];
        }

        // Get total count
        const [countResult] = await db.query(`
            SELECT COUNT(*) as total FROM customers ${whereClause}
        `, params);

        // Get customers with loyalty info
        const [customers] = await db.query(`
            SELECT 
                id, full_name, email, loyalty_points, created_at,
                (SELECT COUNT(*) FROM loyalty_transactions WHERE customer_id = customers.id) as transaction_count
            FROM customers 
            ${whereClause}
            ORDER BY loyalty_points DESC, created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), offset]);

        res.json({
            success: true,
            customers,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total,
                totalPages: Math.ceil(countResult[0].total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching customer loyalty data:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch customer loyalty data' });
    }
});

// Adjust customer points (admin)
router.post('/loyalty/customers/:customerId/adjust', ensureAdminAuthenticated, async(req, res) => {
    try {
        const { customerId } = req.params;
        const { pointsAdjustment, reason, adminId } = req.body;

        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Update customer points
            await connection.query(`
                UPDATE customers 
                SET loyalty_points = loyalty_points + ? 
                WHERE id = ?
            `, [pointsAdjustment, customerId]);

            // Record adjustment
            const description = pointsAdjustment > 0 ?
                `Admin adjustment: +${pointsAdjustment} points - ${reason}` :
                `Admin adjustment: ${pointsAdjustment} points - ${reason}`;

            await connection.query(`
                INSERT INTO loyalty_transactions 
                (customer_id, points_earned, points_redeemed, transaction_type, description) 
                VALUES (?, ?, ?, 'adjustment', ?)
            `, [
                customerId,
                pointsAdjustment > 0 ? pointsAdjustment : 0,
                pointsAdjustment < 0 ? Math.abs(pointsAdjustment) : 0,
                description
            ]);

            await connection.commit();

            // Get updated points
            const [customers] = await db.query(`
                SELECT loyalty_points FROM customers WHERE id = ?
            `, [customerId]);

            res.json({
                success: true,
                adjustment: pointsAdjustment,
                newBalance: customers[0].loyalty_points,
                message: `Points adjusted by ${pointsAdjustment > 0 ? '+' : ''}${pointsAdjustment}`
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error adjusting customer points:', error);
        res.status(500).json({ success: false, error: 'Failed to adjust customer points' });
    }
});

// NEW: Get all loyalty reward redemptions (admin only)
router.get('/loyalty/redemptions', async(req, res) => {
    try {
        const { page = 1, limit = 20, status, customerId, rewardId } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (status) {
            whereClause += ' AND lrr.status = ?';
            params.push(status);
        }

        if (customerId) {
            whereClause += ' AND lrr.customer_id = ?';
            params.push(customerId);
        }

        if (rewardId) {
            whereClause += ' AND lrr.reward_id = ?';
            params.push(rewardId);
        }

        // Get total count
        const [countResult] = await db.query(`
            SELECT COUNT(*) as total 
            FROM loyalty_reward_redemptions lrr
            ${whereClause}
        `, params);

        // Get redemptions with full details
        const [redemptions] = await db.query(`
            SELECT 
                lrr.*,
                c.full_name as customer_name,
                c.email as customer_email,
                c.phone as customer_phone,
                lr.name as reward_name,
                lr.reward_type,
                lr.description as reward_description,
                lr.points_required,
                u.full_name as staff_name,
                o.total_amount as order_amount,
                o.status as order_status
            FROM loyalty_reward_redemptions lrr
            JOIN customers c ON lrr.customer_id = c.id
            JOIN loyalty_rewards lr ON lrr.reward_id = lr.id
            LEFT JOIN users u ON lrr.staff_id = u.id
            LEFT JOIN orders o ON lrr.order_id = o.order_id
            ${whereClause}
            ORDER BY lrr.redemption_date DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), offset]);

        res.json({
            success: true,
            redemptions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total,
                totalPages: Math.ceil(countResult[0].total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching loyalty redemptions:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch redemptions' });
    }
});

// NEW: Get loyalty redemption details (admin only)
router.get('/loyalty/redemptions/:redemptionId', async(req, res) => {
    try {
        const { redemptionId } = req.params;

        // Get redemption details
        const [redemptions] = await db.query(`
            SELECT 
                lrr.*,
                c.full_name as customer_name,
                c.email as customer_email,
                c.phone as customer_phone,
                c.loyalty_points as current_points,
                lr.name as reward_name,
                lr.reward_type,
                lr.description as reward_description,
                lr.points_required,
                lr.terms_conditions,
                u.full_name as staff_name,
                o.total_amount as order_amount,
                o.status as order_status,
                o.order_time as order_date
            FROM loyalty_reward_redemptions lrr
            JOIN customers c ON lrr.customer_id = c.id
            JOIN loyalty_rewards lr ON lrr.reward_id = lr.id
            LEFT JOIN users u ON lrr.staff_id = u.id
            LEFT JOIN orders o ON lrr.order_id = o.order_id
            WHERE lrr.id = ?
        `, [redemptionId]);

        if (redemptions.length === 0) {
            return res.status(404).json({ success: false, error: 'Redemption not found' });
        }

        const redemption = redemptions[0];

        // Get usage log if completed
        let usageLog = null;
        if (redemption.status === 'completed') {
            const [usageLogs] = await db.query(`
                SELECT 
                    lrul.*,
                    u.full_name as staff_name
                FROM loyalty_reward_usage_log lrul
                LEFT JOIN users u ON lrul.staff_confirmation_id = u.id
                WHERE lrul.redemption_id = ?
            `, [redemptionId]);

            if (usageLogs.length > 0) {
                usageLog = usageLogs[0];
            }
        }

        // Get customer's redemption history for this reward type
        const [redemptionHistory] = await db.query(`
            SELECT 
                lrr.id,
                lrr.redemption_date,
                lrr.status,
                lrr.redemption_proof,
                o.total_amount as order_amount
            FROM loyalty_reward_redemptions lrr
            LEFT JOIN orders o ON lrr.order_id = o.order_id
            WHERE lrr.customer_id = ? AND lrr.reward_id = ? AND lrr.id != ?
            ORDER BY lrr.redemption_date DESC
            LIMIT 5
        `, [redemption.customer_id, redemption.reward_id, redemptionId]);

        res.json({
            success: true,
            redemption: {
                ...redemption,
                usageLog,
                redemptionHistory
            }
        });
    } catch (error) {
        console.error('Error fetching redemption details:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch redemption details' });
    }
});

// NEW: Update redemption status (admin only)
router.put('/loyalty/redemptions/:redemptionId/status', async(req, res) => {
    try {
        const { redemptionId } = req.params;
        const { status, notes, adminId } = req.body;

        // Validate status
        const validStatuses = ['pending', 'completed', 'cancelled', 'expired'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
            });
        }

        // Verify admin
        const [admins] = await db.query(`
            SELECT id FROM users WHERE id = ? AND role IN ('admin', 'manager')
        `, [adminId]);

        if (admins.length === 0) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }

        // Get current redemption
        const [redemptions] = await db.query(`
            SELECT * FROM loyalty_reward_redemptions WHERE id = ?
        `, [redemptionId]);

        if (redemptions.length === 0) {
            return res.status(404).json({ success: false, error: 'Redemption not found' });
        }

        const redemption = redemptions[0];

        // If cancelling, refund points
        if (status === 'cancelled' && redemption.status === 'pending') {
            const connection = await db.getConnection();
            await connection.beginTransaction();

            try {
                // Refund points
                await connection.query(`
                    UPDATE customers 
                    SET loyalty_points = loyalty_points + ? 
                    WHERE id = ?
                `, [redemption.points_redeemed, redemption.customer_id]);

                // Update redemption status
                await connection.query(`
                    UPDATE loyalty_reward_redemptions 
                    SET status = ?, notes = ?, updated_at = NOW() 
                    WHERE id = ?
                `, [status, notes || 'Cancelled by admin', redemptionId]);

                // Record refund transaction
                await connection.query(`
                    INSERT INTO loyalty_transactions 
                    (customer_id, points_earned, transaction_type, description, redemption_id) 
                    VALUES (?, ?, 'refund', ?)
                `, [
                    redemption.customer_id,
                    redemption.points_redeemed,
                    `Points refunded for cancelled ${redemption.redemption_proof}`
                ]);

                await connection.commit();
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        } else {
            // Just update status
            await db.query(`
                UPDATE loyalty_reward_redemptions 
                SET status = ?, notes = ?, updated_at = NOW() 
                WHERE id = ?
            `, [status, notes || `Status updated to ${status} by admin`, redemptionId]);
        }

        res.json({
            success: true,
            message: `Redemption status updated to ${status}`,
            redemptionId,
            newStatus: status
        });
    } catch (error) {
        console.error('Error updating redemption status:', error);
        res.status(500).json({ success: false, error: 'Failed to update redemption status' });
    }
});

// NEW: Get loyalty system statistics (admin only)
router.get('/loyalty/statistics', async(req, res) => {
    try {
        const { period = 'month' } = req.query;

        let dateFilter = '';
        let params = [];

        switch (period) {
            case 'week':
                dateFilter = 'WHERE lrr.redemption_date >= DATE_SUB(NOW(), INTERVAL 1 WEEK)';
                break;
            case 'month':
                dateFilter = 'WHERE lrr.redemption_date >= DATE_SUB(NOW(), INTERVAL 1 MONTH)';
                break;
            case 'quarter':
                dateFilter = 'WHERE lrr.redemption_date >= DATE_SUB(NOW(), INTERVAL 3 MONTH)';
                break;
            case 'year':
                dateFilter = 'WHERE lrr.redemption_date >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
                break;
            default:
                dateFilter = 'WHERE lrr.redemption_date >= DATE_SUB(NOW(), INTERVAL 1 MONTH)';
        }

        // Get redemption statistics
        const [redemptionStats] = await db.query(`
            SELECT 
                COUNT(*) as total_redemptions,
                SUM(lrr.points_redeemed) as total_points_redeemed,
                COUNT(DISTINCT lrr.customer_id) as unique_customers,
                COUNT(DISTINCT lrr.reward_id) as unique_rewards,
                AVG(lrr.points_redeemed) as avg_points_per_redemption
            FROM loyalty_reward_redemptions lrr
            ${dateFilter}
        `, params);

        // Get status breakdown
        const [statusBreakdown] = await db.query(`
            SELECT 
                lrr.status,
                COUNT(*) as count,
                SUM(lrr.points_redeemed) as total_points
            FROM loyalty_reward_redemptions lrr
            ${dateFilter}
            GROUP BY lrr.status
        `, params);

        // Get top rewards
        const [topRewards] = await db.query(`
            SELECT 
                lr.name as reward_name,
                lr.reward_type,
                COUNT(*) as redemption_count,
                SUM(lrr.points_redeemed) as total_points_redeemed
            FROM loyalty_reward_redemptions lrr
            JOIN loyalty_rewards lr ON lrr.reward_id = lr.id
            ${dateFilter}
            GROUP BY lrr.reward_id, lr.name, lr.reward_type
            ORDER BY redemption_count DESC
            LIMIT 10
        `, params);

        // Get top customers
        const [topCustomers] = await db.query(`
            SELECT 
                c.full_name,
                c.email,
                COUNT(*) as redemption_count,
                SUM(lrr.points_redeemed) as total_points_redeemed
            FROM loyalty_reward_redemptions lrr
            JOIN customers c ON lrr.customer_id = c.id
            ${dateFilter}
            GROUP BY lrr.customer_id, c.full_name, c.email
            ORDER BY redemption_count DESC
            LIMIT 10
        `, params);

        // Get daily redemption trend
        const [dailyTrend] = await db.query(`
            SELECT 
                DATE(lrr.redemption_date) as date,
                COUNT(*) as redemptions,
                SUM(lrr.points_redeemed) as points_redeemed
            FROM loyalty_reward_redemptions lrr
            ${dateFilter}
            GROUP BY DATE(lrr.redemption_date)
            ORDER BY date DESC
            LIMIT 30
        `, params);

        res.json({
            success: true,
            period,
            statistics: {
                overview: redemptionStats[0],
                statusBreakdown,
                topRewards,
                topCustomers,
                dailyTrend
            }
        });
    } catch (error) {
        console.error('Error fetching loyalty statistics:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch loyalty statistics' });
    }
});

// NEW: Export loyalty redemptions (admin only)
router.get('/loyalty/export', async(req, res) => {
    try {
        const { format = 'json', status, startDate, endDate } = req.query;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (status) {
            whereClause += ' AND lrr.status = ?';
            params.push(status);
        }

        if (startDate) {
            whereClause += ' AND lrr.redemption_date >= ?';
            params.push(startDate);
        }

        if (endDate) {
            whereClause += ' AND lrr.redemption_date <= ?';
            params.push(endDate);
        }

        // Get all redemptions for export
        const [redemptions] = await db.query(`
            SELECT 
                lrr.id,
                lrr.redemption_date,
                lrr.status,
                lrr.points_redeemed,
                lrr.redemption_proof,
                lrr.notes,
                c.full_name as customer_name,
                c.email as customer_email,
                c.phone as customer_phone,
                lr.name as reward_name,
                lr.reward_type,
                lr.points_required,
                o.order_id,
                o.total_amount as order_amount,
                u.full_name as staff_name
            FROM loyalty_reward_redemptions lrr
            JOIN customers c ON lrr.customer_id = c.id
            JOIN loyalty_rewards lr ON lrr.reward_id = lr.id
            LEFT JOIN orders o ON lrr.order_id = o.order_id
            LEFT JOIN users u ON lrr.staff_id = u.id
            ${whereClause}
            ORDER BY lrr.redemption_date DESC
        `, params);

        if (format === 'csv') {
            // Convert to CSV format
            const csvHeaders = [
                'ID', 'Redemption Date', 'Status', 'Points Redeemed', 'Redemption Proof',
                'Notes', 'Customer Name', 'Customer Email', 'Customer Phone', 'Reward Name',
                'Reward Type', 'Points Required', 'Order ID', 'Order Amount', 'Staff Name'
            ];

            const csvData = redemptions.map(redemption => [
                redemption.id,
                redemption.redemption_date,
                redemption.status,
                redemption.points_redeemed,
                redemption.redemption_proof,
                redemption.notes || '',
                redemption.customer_name,
                redemption.customer_email,
                redemption.customer_phone,
                redemption.reward_name,
                redemption.reward_type,
                redemption.points_required,
                redemption.order_id || '',
                redemption.order_amount || '',
                redemption.staff_name || ''
            ]);

            const csvContent = [csvHeaders, ...csvData]
                .map(row => row.map(field => `"${field}"`).join(','))
                .join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="loyalty-redemptions-${new Date().toISOString().split('T')[0]}.csv"`);
            res.send(csvContent);
        } else {
            // Return JSON format
            res.json({
                success: true,
                redemptions,
                total: redemptions.length,
                exportDate: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Error exporting loyalty data:', error);
        res.status(500).json({ success: false, error: 'Failed to export loyalty data' });
    }
});

// Temporary test route for staff (no authentication required for testing)
router.get('/staff-test', (req, res) => {
    res.json([{
            id: 1,
            username: 'test_staff',
            email: 'test@example.com',
            role: 'staff',
            first_name: 'Test',
            last_name: 'Staff',
            age: 25
        },
        {
            id: 2,
            username: 'test_admin',
            email: 'admin@example.com',
            role: 'admin',
            first_name: 'Test',
            last_name: 'Admin',
            age: 30
        }
    ]);
});

// New metrics routes for Dashboard statistics
router.get('/metrics/revenue', getRevenueMetrics);
router.get('/metrics/orders', getOrderMetrics);
router.get('/metrics/inventory', getInventoryMetrics);

// Add amount_paid column to event_sales table
router.post('/fix-event-sales-table', async(req, res) => {
    try {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            // Add amount_paid column to event_sales table
            await connection.query(`
                ALTER TABLE event_sales ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10,2) DEFAULT 0.00 AFTER amount
            `);

            // Update existing records to set amount_paid = amount where status = 'paid'
            await connection.query(`
                UPDATE event_sales 
                SET amount_paid = amount 
                WHERE status = 'paid' AND amount_paid = 0
            `);

            await connection.commit();

            res.json({
                success: true,
                message: 'Event sales table schema updated successfully',
                changes: [
                    'Added amount_paid column to event_sales table (DECIMAL)',
                    'Updated existing paid records to set amount_paid = amount'
                ]
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Error fixing event sales table:', error);
        res.status(500).json({
            success: false,
            error: `Failed to fix event sales table: ${error.message}`
        });
    }
});

// Update event sales payment amount
router.put('/event-sales/:id/amount-paid', async(req, res) => {
    try {
        const { id } = req.params;
        const { amount_paid } = req.body;

        if (amount_paid === undefined || amount_paid < 0) {
            return res.status(400).json({
                success: false,
                error: 'Amount paid must be a non-negative number'
            });
        }

        await db.query(
            'UPDATE event_sales SET amount_paid = ?, updated_at = NOW() WHERE id = ?',
            [parseFloat(amount_paid), id]
        );

        res.json({
            success: true,
            message: 'Payment amount updated successfully'
        });

    } catch (error) {
        console.error('Error updating payment amount:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update payment amount'
        });
    }
});

// Update event sales amount to be paid
router.put('/event-sales/:id/amount-to-be-paid', async(req, res) => {
    try {
        const { id } = req.params;
        const { amount_to_be_paid } = req.body;

        if (amount_to_be_paid === undefined || amount_to_be_paid < 0) {
            return res.status(400).json({
                success: false,
                error: 'Amount to be paid must be a non-negative number'
            });
        }

        await db.query(
            'UPDATE event_sales SET amount_to_be_paid = ?, updated_at = NOW() WHERE id = ?',
            [parseFloat(amount_to_be_paid), id]
        );

        res.json({
            success: true,
            message: 'Amount to be paid updated successfully'
        });

    } catch (error) {
        console.error('Error updating amount to be paid:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update amount to be paid'
        });
    }
});

// Update event sales payment status
router.put('/event-sales/:id/status', async(req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['not_paid', 'downpayment', 'fully_paid', 'refunded', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Must be one of: not_paid, downpayment, fully_paid, refunded, cancelled'
            });
        }

        // Update status
        await db.query(
            'UPDATE event_sales SET status = ?, updated_at = NOW() WHERE id = ?',
            [status, id]
        );

        res.json({
            success: true,
            message: 'Payment status updated successfully'
        });

    } catch (error) {
        console.error('Error updating payment status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update payment status'
        });
    }
});

// Fix orders table schema
router.post('/fix-orders-table', async(req, res) => {
    try {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            // Add missing columns to orders table
            await connection.query(`
                ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL
            `);

            await connection.query(`
                ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_ready_time TIMESTAMP DEFAULT NULL
            `);

            await connection.query(`
                ALTER TABLE orders ADD COLUMN IF NOT EXISTS queue_position INT DEFAULT 0
            `);

            await connection.query(`
                ALTER TABLE orders ADD COLUMN IF NOT EXISTS qr_code TEXT DEFAULT NULL
            `);

            // Add missing columns to payment_transactions table
            await connection.query(`
                ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL
            `);

            await connection.query(`
                ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS staff_id VARCHAR(50) DEFAULT NULL
            `);

            await connection.commit();

            res.json({
                success: true,
                message: 'Database schema fixed successfully',
                changes: [
                    'Added notes column to orders table (TEXT)',
                    'Added estimated_ready_time column to orders table (TIMESTAMP)',
                    'Added queue_position column to orders table (INT)',
                    'Added qr_code column to orders table (TEXT)',
                    'Added notes column to payment_transactions table (TEXT)',
                    'Added staff_id column to payment_transactions table (VARCHAR)'
                ]
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Error fixing orders table:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fix orders table',
            details: error.message
        });
    }
});

// Error handling for routes
router.use((err, req, res, next) => {
    console.error('Route error:', err);
    res.status(500).json({ error: 'Route error occurred' });
});

// Admin Menu Management Routes
// Add new menu item
router.post('/inventory/menu', async(req, res) => {
    try {
        const {
            name,
            description,
            category,
            base_price,
            image_url,
            is_available,
            allow_customization
        } = req.body;

        // Validate required fields
        if (!name || !category || !base_price) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: name, category, base_price'
            });
        }

        // Insert new menu item
        const [result] = await db.query(`
            INSERT INTO menu_items (
                name, description, category, base_price, display_price,
                is_available, allow_customization, visible_in_customer_menu,
                visible_in_pos, is_customizable
            ) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, TRUE, ?)
        `, [
            name, description, category, parseFloat(base_price), parseFloat(base_price),
            is_available !== false, allow_customization !== false, allow_customization !== false
        ]);

        // Log admin activity (create menu item)
        try {
            const adminId = (req.session && (
                (req.session.user && req.session.user.id) ||
                (req.session.admin && req.session.admin.id) ||
                (req.session.adminUser && req.session.adminUser.id)
            )) || null;
            if (adminId) {
                await ActivityLogger.logAdminActivity(
                    adminId,
                    'create_menu_item',
                    'menu_item',
                    result.insertId,
                    null, { name, category, base_price: parseFloat(base_price) },
                    `Created menu item ${name}`,
                    req
                );
            }
        } catch (e) {
            console.warn('Activity log (create_menu_item) failed:', e.message);
        }

        res.json({
            success: true,
            message: 'Menu item added successfully',
            menuItemId: result.insertId
        });
    } catch (error) {
        console.error('Error adding menu item:', error);
        res.status(500).json({
            success: false,
            error: `Failed to add menu item: ${error.message}`
        });
    }
});

// Update menu item
router.put('/inventory/menu/:id', async(req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            description,
            category,
            base_price,
            image_url,
            is_available,
            allow_customization
        } = req.body;

        // Validate required fields
        if (!name || !category || !base_price) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: name, category, base_price'
            });
        }

        // Get current menu item for logging
        const [existing] = await db.query('SELECT * FROM menu_items WHERE id = ?', [id]);
        const oldValues = existing.length > 0 ? existing[0] : null;

        // Update menu item
        await db.query(`
            UPDATE menu_items 
            SET name = ?, description = ?, category = ?, base_price = ?, 
                display_price = ?, image_url = ?, is_available = ?, 
                allow_customization = ?, is_customizable = ?, updated_at = NOW()
            WHERE id = ?
        `, [
            name, description, category, parseFloat(base_price), parseFloat(base_price),
            image_url, is_available !== false, allow_customization !== false,
            allow_customization !== false, id
        ]);

        // Fetch new values for logging
        const [updated] = await db.query('SELECT * FROM menu_items WHERE id = ?', [id]);
        const newValues = updated.length > 0 ? updated[0] : null;

        // Log admin activity
        try {
            const adminId = (req.session && (
                (req.session.user && req.session.user.id) ||
                (req.session.admin && req.session.admin.id) ||
                (req.session.adminUser && req.session.adminUser.id)
            )) || null;
            if (adminId) {
                await ActivityLogger.logAdminActivity(
                    adminId,
                    'update_menu_item',
                    'menu_item',
                    id,
                    oldValues,
                    newValues,
                    `Updated menu item ${name}`,
                    req
                );
            }
        } catch (e) {
            console.warn('Activity log (update_menu_item) failed:', e.message);
        }

        res.json({
            success: true,
            message: 'Menu item updated successfully'
        });
    } catch (error) {
        console.error('Error updating menu item:', error);
        res.status(500).json({
            success: false,
            error: `Failed to update menu item: ${error.message}`
        });
    }
});

// Delete menu item
router.delete('/inventory/menu/:id', async(req, res) => {
    try {
        const { id } = req.params;

        // Check if menu item is used in any orders
        const [orderUsage] = await db.query(`
            SELECT COUNT(*) as count 
            FROM orders 
            WHERE items LIKE '%"menu_item_id":' || ? || '%'
        `, [id]);

        if (orderUsage[0].count > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete menu item that is used in orders'
            });
        }

        // Get current menu item for logging
        const [existing] = await db.query('SELECT * FROM menu_items WHERE id = ?', [id]);
        const oldValues = existing.length > 0 ? existing[0] : null;

        // Delete menu item
        await db.query('DELETE FROM menu_items WHERE id = ?', [id]);

        // Log admin activity
        try {
            const adminId = (req.session && (
                (req.session.user && req.session.user.id) ||
                (req.session.admin && req.session.admin.id) ||
                (req.session.adminUser && req.session.adminUser.id)
            )) || null;
            if (adminId) {
                await ActivityLogger.logAdminActivity(
                    adminId,
                    'delete_menu_item',
                    'menu_item',
                    id,
                    oldValues,
                    null,
                    `Deleted menu item ${oldValues && oldValues.name ? oldValues.name : id}`,
                    req
                );
            }
        } catch (e) {
            console.warn('Activity log (delete_menu_item) failed:', e.message);
        }

        res.json({
            success: true,
            message: 'Menu item deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting menu item:', error);
        res.status(500).json({
            success: false,
            error: `Failed to delete menu item: ${error.message}`
        });
    }
});

// Get all menu items
router.get('/inventory/menu', async(req, res) => {
    try {
        const [menuItems] = await db.query(`
            SELECT 
                id, name, description, category, base_price, display_price,
                image_url, is_available, allow_customization, visible_in_customer_menu,
                visible_in_pos, is_customizable, created_at, updated_at
            FROM menu_items 
            ORDER BY category, name
        `);

        // Use consistent deduplication for admin menu
        const { getAdminMenuItems } = require('../utils/menuDeduplication');
        const uniqueItems = getAdminMenuItems(menuItems);

        res.json({
            success: true,
            menu_items: uniqueItems
        });
    } catch (error) {
        console.error('Error fetching menu items:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch menu items'
        });
    }
});

// Real sales dashboard data endpoint
router.get('/sales', async(req, res) => {
    try {
        console.log('Admin Sales API called with query:', req.query);
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
                today: parseFloat(revenueResult[0]?.today || 0),
                week: parseFloat(revenueResult[0]?.week || 0),
                month: parseFloat(revenueResult[0]?.month || 0),
                year: parseFloat(revenueResult[0]?.year || 0),
                growth: parseFloat(revenueResult[0]?.growth || 0)
            },
            orders: {
                total: parseInt(orderResult[0]?.total || 0),
                completed: parseInt(orderResult[0]?.completed || 0),
                pending: parseInt(orderResult[0]?.pending || 0),
                cancelled: parseInt(orderResult[0]?.cancelled || 0),
                today: parseInt(orderResult[0]?.today || 0)
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

        console.log('Admin sales data generated:', {
            revenue: salesData.revenue,
            orders: salesData.orders,
            topItemsCount: salesData.topItems.length
        });

        res.json({
            success: true,
            data: salesData
        });

    } catch (error) {
        console.error('Error fetching admin sales data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch sales data'
        });
    }
});

// Original complex sales route (commented out for now)
router.get('/sales-original', async(req, res) => {
    try {
        const { period, startDate, endDate } = req.query;

        let dateFilter = '';
        let dateFilterAliased = '';
        let dateParams = [];

        if (startDate && endDate) {
            dateFilter = 'AND order_time BETWEEN ? AND ?';
            dateFilterAliased = 'AND o.order_time BETWEEN ? AND ?';
            dateParams = [startDate, endDate];
        } else {
            // Default period filtering
            switch (period) {
                case 'today':
                    dateFilter = 'AND DATE(order_time) = CURDATE()';
                    dateFilterAliased = 'AND DATE(o.order_time) = CURDATE()';
                    break;
                case 'week':
                    dateFilter = 'AND order_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
                    dateFilterAliased = 'AND o.order_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
                    break;
                case 'month':
                    dateFilter = 'AND order_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
                    dateFilterAliased = 'AND o.order_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
                    break;
                case 'year':
                    dateFilter = 'AND order_time >= DATE_SUB(NOW(), INTERVAL 365 DAY)';
                    dateFilterAliased = 'AND o.order_time >= DATE_SUB(NOW(), INTERVAL 365 DAY)';
                    break;
                default:
                    dateFilter = 'AND order_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
                    dateFilterAliased = 'AND o.order_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
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
                COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as today
            FROM orders 
            WHERE payment_status = 'paid' ${dateFilter}
        `, dateParams);

        // Get top selling items
        const [topItemsResult] = await db.query(`
            SELECT 
                JSON_EXTRACT(items, '$[0].name') as name,
                COUNT(*) as quantity,
                SUM(total_price) as revenue
            FROM orders 
            WHERE payment_status = 'paid' ${dateFilter}
            GROUP BY JSON_EXTRACT(items, '$[0].name')
            ORDER BY quantity DESC
            LIMIT 10
        `, dateParams);

        // Calculate ingredient costs for top items
        const topItemsWithCosts = await Promise.all(topItemsResult.map(async(item) => {
            try {
                const itemName = (item.name || '').replace(/"/g, '') || 'Unknown';

                // Get ingredient cost for this item (simplified calculation)
                const [costResult] = await db.query(`
                    SELECT 
                        COALESCE(SUM(mii.required_actual_amount * i.cost_per_actual_unit), 0) as cost
                    FROM menu_item_ingredients mii
                    JOIN ingredients i ON mii.ingredient_id = i.id
                    JOIN menu_items mi ON mii.menu_item_id = mi.id
                    WHERE mi.name = ?
                `, [itemName]);

                const cost = costResult[0] ? costResult[0].cost : 0;
                const profit = item.revenue - cost;

                return {
                    name: itemName,
                    quantity: item.quantity,
                    revenue: parseFloat(item.revenue),
                    cost: parseFloat(cost),
                    profit: parseFloat(profit)
                };
            } catch (error) {
                return {
                    name: (item.name || '').replace(/"/g, '') || 'Unknown',
                    quantity: item.quantity,
                    revenue: parseFloat(item.revenue),
                    cost: 0,
                    profit: parseFloat(item.revenue)
                };
            }
        }));

        // Get payment methods breakdown
        const [paymentMethodsResult] = await db.query(`
            SELECT 
                COALESCE(payment_method, 'unknown') as method,
                COUNT(*) as count,
                SUM(total_price) as amount
            FROM orders 
            WHERE payment_status = 'paid' ${dateFilter}
            GROUP BY payment_method
            ORDER BY amount DESC
        `, dateParams);

        // Calculate percentages for payment methods
        const totalRevenue = revenueResult[0] ? revenueResult[0].month : 0;
        const paymentMethods = paymentMethodsResult.map(pm => ({
            method: pm.method,
            count: pm.count,
            amount: parseFloat(pm.amount),
            percentage: totalRevenue > 0 ? (parseFloat(pm.amount) / totalRevenue) * 100 : 0
        }));

        // Get daily breakdown
        const [dailyBreakdownResult] = await db.query(`
            SELECT 
                DATE(order_time) as date,
                COUNT(*) as orders,
                SUM(total_price) as revenue
            FROM orders 
            WHERE payment_status = 'paid' ${dateFilter}
            GROUP BY DATE(order_time)
            ORDER BY date DESC
            LIMIT 30
        `, dateParams);

        // Calculate ingredient costs for daily breakdown
        const dailyBreakdown = await Promise.all(dailyBreakdownResult.map(async (day) => {
            try {
                const [costResult] = await db.query(`
                    SELECT 
                        COALESCE(SUM(
                            CASE 
                                WHEN mii.required_actual_amount IS NOT NULL THEN mii.required_actual_amount * i.cost_per_actual_unit
                                ELSE 0 
                            END
                        ), 0) as cost
                    FROM orders o
                    JOIN menu_item_ingredients mii ON JSON_EXTRACT(o.items, '$[0].menu_item_id') = mii.menu_item_id
                    JOIN ingredients i ON mii.ingredient_id = i.id
                    WHERE DATE(o.order_time) = ? AND o.payment_status = 'paid'
                `, [day.date]);

                const cost = costResult[0] ? costResult[0].cost : 0;
                const profit = parseFloat(day.revenue) - cost;

                return {
                    date: day.date,
                    orders: day.orders,
                    revenue: parseFloat(day.revenue),
                    cost: parseFloat(cost),
                    profit: parseFloat(profit)
                };
            } catch (error) {
                return {
                    date: day.date,
                    orders: day.orders,
                    revenue: parseFloat(day.revenue),
                    cost: 0,
                    profit: parseFloat(day.revenue)
                };
            }
        }));

        // Calculate total ingredient costs from actual orders
        const [ordersForCosts] = await db.query(`
            SELECT items
            FROM orders 
            WHERE payment_status = 'paid' ${dateFilterAliased}
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

        const topIngredients = topIngredientsResult.map(ingredient => ({
            name: ingredient.name,
            quantity: parseFloat(ingredient.quantity) || 0
        }));

        const salesData = {
            revenue: {
                today: parseFloat(revenueResult[0] ? revenueResult[0].today : 0),
                week: parseFloat(revenueResult[0] ? revenueResult[0].week : 0),
                month: parseFloat(revenueResult[0] ? revenueResult[0].month : 0),
                year: parseFloat(revenueResult[0] ? revenueResult[0].year : 0),
                growth: parseFloat(revenueResult[0] ? revenueResult[0].growth : 0)
            },
            orders: {
                total: orderResult[0] ? orderResult[0].total : 0,
                completed: orderResult[0] ? orderResult[0].completed : 0,
                pending: orderResult[0] ? orderResult[0].pending : 0,
                cancelled: orderResult[0] ? orderResult[0].cancelled : 0,
                today: orderResult[0] ? orderResult[0].today : 0
            },
            topItems: topItemsWithCosts,
            paymentMethods,
            dailyBreakdown,
            ingredientCosts: {
                totalCost: parseFloat(totalIngredientCost) || 0,
                averagePerOrder: parseFloat(averagePerOrder) || 0,
                topIngredients
            }
        };

        res.json({
            success: true,
            data: salesData
        });

    } catch (error) {
        console.error('Error fetching sales data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch sales data'
        });
    }
});

// Create sample data for testing charts
router.post('/dashboard/create-sample-data', async(req, res) => {
    try {
        console.log('Creating sample data for dashboard charts...');
        
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
                items: JSON.stringify([
                    {
                        menu_item_id: 1,
                        name: 'Cappuccino',
                        quantity: 1,
                        price: orderValue
                    }
                ])
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

        console.log(`Created ${sampleOrders.length} sample orders`);
        res.json({ success: true, message: `Created ${sampleOrders.length} sample orders` });
        
    } catch (error) {
        console.error('Error creating sample data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create sample data'
        });
    }
});

// Create event sales record
router.post('/event-sales', async (req, res) => {
    try {
        const { event_id, amount, payment_method, status, amount_paid, amount_to_be_paid } = req.body;

        // Validate required fields
        if (!event_id || !amount || !payment_method || !status) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: event_id, amount, payment_method, status'
            });
        }

        // Validate amount
        if (amount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Amount must be greater than 0'
            });
        }

        // Validate status
        const validStatuses = ['not_paid', 'downpayment', 'fully_paid'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Must be one of: not_paid, downpayment, fully_paid'
            });
        }

        // Check if event exists
        const [eventCheck] = await db.query('SELECT id FROM events WHERE id = ?', [event_id]);
        if (eventCheck.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }

        // Insert event sales record
        const [result] = await db.query(`
            INSERT INTO event_sales (event_id, amount, payment_method, status, amount_paid, amount_to_be_paid, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
            event_id,
            parseFloat(amount),
            payment_method,
            status,
            parseFloat(amount_paid) || 0,
            parseFloat(amount_to_be_paid) || parseFloat(amount)
        ]);

        res.json({
            success: true,
            message: 'Event sales record created successfully',
            data: {
                id: result.insertId,
                event_id,
                amount: parseFloat(amount),
                payment_method,
                status,
                amount_paid: parseFloat(amount_paid) || 0,
                amount_to_be_paid: parseFloat(amount_to_be_paid) || parseFloat(amount)
            }
        });

    } catch (error) {
        console.error('Error creating event sales record:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create event sales record'
        });
    }
});

// Event sales reporting
router.get('/sales/events', async (req, res) => {
    try {
        const { period, startDate, endDate } = req.query;

        let dateFilter = '';
        let params = [];
        if (startDate && endDate) {
            dateFilter = 'AND es.created_at BETWEEN ? AND ?';
            params.push(startDate, endDate);
        } else {
            switch (period) {
                case 'today':
                    dateFilter = 'AND DATE(es.created_at) = CURDATE()';
                    break;
                case 'week':
                    dateFilter = 'AND es.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
                    break;
                case 'month':
                    dateFilter = 'AND es.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
                    break;
                case 'year':
                    dateFilter = 'AND es.created_at >= DATE_SUB(NOW(), INTERVAL 365 DAY)';
                    break;
                default:
                    dateFilter = 'AND es.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
            }
        }

        // Payment status counts
        const [totals] = await db.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN es.status = 'not_paid' THEN 1 ELSE 0 END), 0) as not_fully_paid,
                COALESCE(SUM(CASE WHEN es.status = 'downpayment' THEN 1 ELSE 0 END), 0) as downpayment,
                COALESCE(SUM(CASE WHEN es.status IN ('not_paid', 'downpayment') THEN 1 ELSE 0 END), 0) as pending_payments,
                COALESCE(COUNT(*), 0) as total_events
            FROM event_sales es
            WHERE 1=1 ${dateFilter}
        `, params);

        // Breakdown by day
        const [byDay] = await db.query(`
            SELECT DATE(es.created_at) as day, SUM(es.amount) as total
            FROM event_sales es
            WHERE 1=1 ${dateFilter}
            GROUP BY DATE(es.created_at)
            ORDER BY day ASC
        `, params);

        // Top events by revenue
        const [topEvents] = await db.query(`
            SELECT 
                e.id as event_id,
                e.customer_name,
                e.event_type,
                e.event_date,
                SUM(es.amount) as revenue,
                COUNT(es.id) as transactions
            FROM event_sales es
            JOIN events e ON e.id = es.event_id
            WHERE 1=1 ${dateFilter}
            GROUP BY e.id, e.customer_name, e.event_type, e.event_date
            ORDER BY revenue DESC
            LIMIT 10
        `, params);

        // Recent transactions
        const [recent] = await db.query(`
            SELECT 
                es.id,
                es.amount,
                es.payment_method,
                es.status,
                es.created_at,
                COALESCE(es.amount_paid, 0) as amount_paid,
                COALESCE(es.amount_to_be_paid, 0) as amount_to_be_paid,
                e.id as event_id,
                e.customer_name,
                e.event_type,
                e.event_date,
                e.contact_number,
                e.address
            FROM event_sales es
            JOIN events e ON e.id = es.event_id
            WHERE 1=1 ${dateFilter}
            ORDER BY es.created_at DESC
            LIMIT 50
        `, params);

        res.json({
            success: true,
            data: {
                totals: {
                    not_fully_paid: parseInt(totals[0]?.not_fully_paid || 0),
                    downpayment: parseInt(totals[0]?.downpayment || 0),
                    pending_payments: parseInt(totals[0]?.pending_payments || 0),
                    total_events: parseInt(totals[0]?.total_events || 0)
                },
                byDay: byDay.map(r => ({ day: r.day, total: parseFloat(r.total) })),
                topEvents: topEvents.map(r => ({
                    event_id: r.event_id,
                    customer_name: r.customer_name,
                    event_type: r.event_type,
                    event_date: r.event_date,
                    revenue: parseFloat(r.revenue),
                    transactions: parseInt(r.transactions)
                })),
                recent: recent.map(r => ({
                    id: r.id,
                    amount: parseFloat(r.amount),
                    payment_method: r.payment_method,
                    status: r.status,
                    created_at: r.created_at,
                    amount_paid: parseFloat(r.amount_paid || 0),
                    amount_to_be_paid: parseFloat(r.amount_to_be_paid || 0),
                    event: {
                        id: r.event_id,
                        customer_name: r.customer_name,
                        event_type: r.event_type,
                        event_date: r.event_date,
                        contact_number: r.contact_number,
                        address: r.address
                    }
                }))
            }
        });
    } catch (error) {
        console.error('Error fetching event sales:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch event sales' });
    }
});


// Download inventory report
router.get('/inventory/download', async(req, res) => {
    try {
        const { format } = req.query;

        // Get all inventory data
        const [inventoryData] = await db.query(`
            SELECT 
                i.id,
                i.sku,
                i.name,
                i.category,
                i.actual_quantity,
                i.actual_unit,
                i.reorder_level,
                i.cost_per_actual_unit,
                i.storage_location,
                i.days_of_stock,
                i.is_available,
                i.created_at,
                i.updated_at
            FROM ingredients i
            ORDER BY i.category, i.name
        `);

        if (format === 'excel') {
            // Set headers for Excel download
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=inventory-report-${new Date().toISOString().split('T')[0]}.xlsx`);

            // Return CSV format (Excel can open CSV files)
            let csvContent = 'SKU,Name,Category,Current Stock,Unit,Reorder Level,Cost per Unit,Storage Location,Days of Stock,Status,Created At,Updated At\n';

            inventoryData.forEach(item => {
                const status = item.actual_quantity <= 0 ? 'Out of Stock' :
                    item.actual_quantity <= item.reorder_level ? 'Low Stock' : 'In Stock';

                csvContent += `"${item.sku}","${item.name}","${item.category}","${item.actual_quantity}","${item.actual_unit}","${item.reorder_level}","${item.cost_per_actual_unit}","${item.storage_location}","${item.days_of_stock}","${status}","${item.created_at}","${item.updated_at}"\n`;
            });

            res.send(csvContent);
        } else if (format === 'pdf') {
            // Set headers for PDF download
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=inventory-report-${new Date().toISOString().split('T')[0]}.pdf`);

            // Return a simple text representation
            let pdfContent = `Inventory Report\n`;
            pdfContent += `Generated: ${new Date().toLocaleDateString()}\n\n`;

            // Group by category
            const groupedByCategory = {};
            inventoryData.forEach(item => {
                if (!groupedByCategory[item.category]) {
                    groupedByCategory[item.category] = [];
                }
                groupedByCategory[item.category].push(item);
            });

            Object.keys(groupedByCategory).sort().forEach(category => {
                pdfContent += `\n${category.toUpperCase()}\n`;
                pdfContent += '─'.repeat(category.length) + '\n';

                groupedByCategory[category].forEach(item => {
                    const status = item.actual_quantity <= 0 ? 'OUT OF STOCK' :
                        item.actual_quantity <= item.reorder_level ? 'LOW STOCK' : 'In Stock';

                    pdfContent += `\n${item.name} (${item.sku})\n`;
                    pdfContent += `  Stock: ${item.actual_quantity} ${item.actual_unit}\n`;
                    pdfContent += `  Reorder Level: ${item.reorder_level} ${item.actual_unit}\n`;
                    pdfContent += `  Cost: ₱${item.cost_per_actual_unit} per ${item.actual_unit}\n`;
                    pdfContent += `  Storage: ${item.storage_location}\n`;
                    pdfContent += `  Days of Stock: ${item.days_of_stock}\n`;
                    pdfContent += `  Status: ${status}\n`;
                });
            });

            res.send(pdfContent);
        } else {
            res.status(400).json({ success: false, error: 'Invalid format specified' });
        }

    } catch (error) {
        console.error('Error downloading inventory report:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to download inventory report'
        });
    }
});

// Get detailed order transaction history
router.get('/transactions/orders', ensureAdminAuthenticated, async(req, res) => {
    try {
        const { date, status } = req.query;

        let dateFilter = '';
        let statusFilter = '';
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

        const [orders] = await db.query(`
            SELECT 
                o.id,
                o.order_id,
                o.customer_name,
                o.total_amount,
                o.payment_method,
                o.payment_status,
                o.status as order_status,
                o.order_time,
                o.items
            FROM orders o
            WHERE o.payment_status = 'paid'
            ${dateFilter}
            ${statusFilter}
            ORDER BY o.order_time DESC
        `, params);

        const transactions = orders.map(order => {
            let items = [];
            try {
                items = JSON.parse(order.items);
            } catch (e) {
                items = [];
            }

            return {
                id: order.id,
                order_id: order.order_id,
                customer_name: order.customer_name,
                total_amount: parseFloat(order.total_amount) || 0,
                payment_method: order.payment_method,
                payment_status: order.payment_status,
                order_status: order.order_status,
                created_at: order.created_at,
                items: items.map(item => ({
                    name: item.name || 'Unknown Item',
                    quantity: item.quantity || 1,
                    price: parseFloat(item.price) || 0
                }))
            };
        });

        res.json({
            success: true,
            transactions: transactions
        });

    } catch (error) {
        console.error('Error fetching order transactions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch order transactions'
        });
    }
});

// Get detailed sales transaction history
router.get('/transactions/sales', async(req, res) => {
    try {
        console.log('Transactions API called with query:', req.query);
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

        const totalCount = countResult[0].total;

        const [sales] = await db.query(`
            SELECT 
                o.id,
                o.order_id,
                o.customer_name,
                o.total_price as total_amount,
                o.payment_method,
                o.status,
                o.order_time as created_at,
                JSON_LENGTH(o.items) as items_count,
                pt.reference,
                NULL as receipt_path
            FROM orders o
            LEFT JOIN payment_transactions pt ON o.order_id = pt.order_id AND pt.status = 'completed'
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
            items_count: parseInt(sale.items_count) || 0,
            reference: sale.reference || null,
            receipt_path: sale.receipt_path || null
        }));

        console.log(`Found ${transactions.length} transactions`);
        console.log('Sample transaction:', transactions[0]);
        console.log('Sample raw sale data:', sales[0]);

        const totalPages = Math.ceil(totalCount / parseInt(limit));

        res.json({
            success: true,
            transactions: transactions,
            total: totalCount,
            totalPages: totalPages,
            currentPage: parseInt(page),
            limit: parseInt(limit)
        });

    } catch (error) {
        console.error('Error fetching sales transactions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch sales transactions'
        });
    }
});

// Get detailed payment transaction history
router.get('/transactions/payments', ensureAdminAuthenticated, async(req, res) => {
    try {
        const { date, status } = req.query;

        let dateFilter = '';
        let statusFilter = '';
        let params = [];

        // Build date filter
        if (date && date !== 'all') {
            switch (date) {
                case 'today':
                    dateFilter = 'AND DATE(pt.created_at) = CURDATE()';
                    break;
                case 'week':
                    dateFilter = 'AND YEARWEEK(pt.created_at) = YEARWEEK(CURDATE())';
                    break;
                case 'month':
                    dateFilter = 'AND YEAR(pt.created_at) = YEAR(CURDATE()) AND MONTH(pt.created_at) = MONTH(CURDATE())';
                    break;
                case 'year':
                    dateFilter = 'AND YEAR(pt.created_at) = YEAR(CURDATE())';
                    break;
            }
        }

        // Build status filter
        if (status && status !== 'all') {
            statusFilter = 'AND pt.status = ?';
            params.push(status);
        }

        const [payments] = await db.query(`
            SELECT 
                pt.id,
                pt.order_id,
                pt.payment_method,
                pt.amount,
                pt.status,
                pt.reference,
                pt.created_at,
                o.customer_name
            FROM payment_transactions pt
            LEFT JOIN orders o ON pt.order_id = o.order_id
            WHERE pt.status = 'completed'
            ${dateFilter}
            ${statusFilter}
            ORDER BY pt.created_at DESC
        `, params);

        const transactions = payments.map(payment => ({
            id: payment.id,
            order_id: payment.order_id,
            payment_method: payment.payment_method,
            amount: parseFloat(payment.amount) || 0,
            status: payment.status,
            reference: payment.reference,
            created_at: payment.created_at,
            customer_name: payment.customer_name || 'Unknown Customer'
        }));

        res.json({
            success: true,
            transactions: transactions
        });

    } catch (error) {
        console.error('Error fetching payment transactions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch payment transactions'
        });
    }
});

// Download sales report
router.get('/sales/download', async(req, res) => {
    try {
        const { 
            period, 
            format, 
            status, 
            payment_method, 
            customer, 
            startDate, 
            endDate, 
            exportStartDate, 
            exportEndDate,
            type 
        } = req.query;

        console.log('Download request with params:', req.query);

        // Build date filter
        let dateFilter = '';
        let params = [];

        // Use export date range if provided, otherwise use regular date range
        const startDateToUse = exportStartDate || startDate;
        const endDateToUse = exportEndDate || endDate;

        if (startDateToUse && endDateToUse) {
            dateFilter = 'AND DATE(o.order_time) BETWEEN ? AND ?';
            params.push(startDateToUse, endDateToUse);
        } else if (period && period !== 'all') {
            switch (period) {
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

        // Build additional filters
        let statusFilter = '';
        let paymentMethodFilter = '';
        let customerFilter = '';

        if (status && status !== 'all') {
            statusFilter = 'AND o.status = ?';
            params.push(status);
        }

        if (payment_method && payment_method !== 'all') {
            paymentMethodFilter = 'AND o.payment_method = ?';
            params.push(payment_method);
        }

        if (customer && customer.trim() !== '') {
            customerFilter = 'AND o.customer_name LIKE ?';
            params.push(`%${customer}%`);
        }

        // Get filtered transactions
        const [sales] = await db.query(`
            SELECT 
                o.id,
                o.order_id,
                o.customer_name,
                o.total_amount as total_amount,
                o.payment_method,
                o.status,
                o.order_time as created_at,
                JSON_LENGTH(o.items) as items_count,
                pt.reference,
                o.receipt_path
            FROM orders o
            LEFT JOIN payment_transactions pt ON o.order_id = pt.order_id AND pt.status = 'completed'
            WHERE o.payment_status = 'paid'
            ${dateFilter}
            ${statusFilter}
            ${paymentMethodFilter}
            ${customerFilter}
            ORDER BY o.order_time DESC
        `, params);

        const transactions = sales.map(sale => ({
            id: sale.id,
            order_id: sale.order_id,
            customer_name: sale.customer_name,
            total_amount: parseFloat(sale.total_amount) || 0,
            payment_method: sale.payment_method,
            status: sale.status,
            created_at: sale.created_at,
            items_count: parseInt(sale.items_count) || 0,
            reference: sale.reference || null,
            receipt_path: sale.receipt_path || null
        }));

        // If type=transactions, only export transaction details (skip overview data)
        if (type === 'transactions') {
            console.log(`Exporting ${transactions.length} transaction details only`);
            console.log('Type parameter:', type);
            console.log('Format parameter:', format);
            
            // Generate filename for transaction details
            const dateSuffix = startDateToUse && endDateToUse 
                ? `${startDateToUse}-to-${endDateToUse}` 
                : period || 'all';
            const timestamp = new Date().toISOString().split('T')[0];
            
            if (format === 'excel') {
                try {
                    // Use the Node build to get a Buffer instead of a Blob
                    const writeExcelFile = require('write-excel-file/node');
                    
                    // Prepare transaction data for Excel
                    const excelData = [
                        ['Order ID', 'Customer', 'Date', 'Time', 'Payment Method', 'Status', 'Amount', 'Items Count'],
                        ...transactions.map(transaction => [
                            transaction.order_id,
                            transaction.customer_name,
                            new Date(transaction.created_at).toLocaleDateString('en-US'),
                            new Date(transaction.created_at).toLocaleTimeString('en-US'),
                            transaction.payment_method,
                            transaction.status,
                            transaction.total_amount,
                            transaction.items_count
                        ])
                    ];
                    
                    // Generate Excel buffer
                    const excelBuffer = await writeExcelFile(excelData, {
                        schema: [
                            { type: String, value: row => row[0] },
                            { type: String, value: row => row[1] },
                            { type: String, value: row => row[2] },
                            { type: String, value: row => row[3] },
                            { type: String, value: row => row[4] },
                            { type: String, value: row => row[5] },
                            { type: Number, value: row => row[6] },
                            { type: Number, value: row => row[7] }
                        ]
                    });
                    
                    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                    res.setHeader('Content-Disposition', `attachment; filename="transaction-details-${dateSuffix}-${timestamp}.xlsx"`);
                    res.setHeader('Cache-Control', 'no-cache');
                    if (excelBuffer && typeof excelBuffer.pipe === 'function') {
                        excelBuffer.pipe(res);
                    } else {
                        const txOut = Buffer.isBuffer(excelBuffer) ? excelBuffer : Buffer.from(excelBuffer);
                        res.setHeader('Content-Length', txOut.length);
                        res.end(txOut);
                    }
                    return;
                } catch (excelError) {
                    console.error('Excel generation error:', excelError);
                    res.status(500).json({
                        success: false,
                        error: 'Failed to generate Excel file: ' + excelError.message
                    });
                    return;
                }
            } else if (format === 'pdf') {
                try {
                    const { jsPDF } = require('jspdf');
                    const autoTable = require('jspdf-autotable');
                    
                    const doc = new jsPDF();
                    
                    // Add title
                    doc.setFontSize(16);
                    doc.text('Transaction Details Report', 14, 22);
                    
                    // Add date range
                    const dateRangeText = startDateToUse && endDateToUse 
                        ? `${startDateToUse} to ${endDateToUse}` 
                        : period === 'today' ? 'Today' :
                          period === 'week' ? 'This Week' :
                          period === 'month' ? 'This Month' :
                          period === 'year' ? 'This Year' : 'All Time';
                    
                    doc.setFontSize(10);
                    doc.text(`Period: ${dateRangeText}`, 14, 30);
                    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 35);
                    doc.text(`Total Transactions: ${transactions.length}`, 14, 40);
                    
                    // Prepare table data
                    const tableData = transactions.map(transaction => [
                        transaction.order_id,
                        transaction.customer_name,
                        new Date(transaction.created_at).toLocaleDateString('en-US'),
                        transaction.payment_method,
                        transaction.status,
                        `₱${transaction.total_amount.toFixed(2)}`
                    ]);
                    
                    // Add table
                    autoTable(doc, {
                        head: [['Order ID', 'Customer', 'Date', 'Payment Method', 'Status', 'Amount']],
                        body: tableData,
                        startY: 50,
                        styles: { fontSize: 8 },
                        headStyles: { fillColor: [255, 193, 7] },
                        margin: { left: 14, right: 14 }
                    });
                    
                    // Generate PDF buffer and convert correctly
                    const pdfArrayBuffer = doc.output('arraybuffer');
                    const pdfBuffer = Buffer.from(pdfArrayBuffer);
                    
                    // Set headers
                    res.setHeader('Content-Type', 'application/pdf');
                    res.setHeader('Content-Disposition', `attachment; filename="transaction-details-${dateSuffix}-${timestamp}.pdf"`);
                    res.setHeader('Content-Length', pdfBuffer.length);
                    res.setHeader('Cache-Control', 'no-cache');
                    
                    // Send PDF file as binary
                    res.end(pdfBuffer);
                    return;
                } catch (pdfError) {
                    console.error('PDF generation error:', pdfError);
                    res.status(500).json({
                        success: false,
                        error: 'Failed to generate PDF file: ' + pdfError.message
                    });
                    return;
                }
            }
        }

        console.log(`Exporting ${transactions.length} transactions`);

        // Generate filename
        const dateSuffix = startDateToUse && endDateToUse 
            ? `${startDateToUse}-to-${endDateToUse}` 
            : period || 'all';
        const timestamp = new Date().toISOString().split('T')[0];
        
        // Generate date range text for display
        const dateRangeText = startDateToUse && endDateToUse 
            ? `${startDateToUse} to ${endDateToUse}` 
            : period === 'today' ? 'Today' :
              period === 'week' ? 'This Week' :
              period === 'month' ? 'This Month' :
              period === 'year' ? 'This Year' : 'All Time';

        if (format === 'excel') {
            try {
                // Generate Excel file
                console.log('Generating Excel file...');
                const writeExcelFile = require('write-excel-file/node');
                
                // Calculate overview metrics
                const totalRevenue = transactions.reduce((sum, t) => sum + t.total_amount, 0);
                const totalOrders = transactions.length;
                const completedOrders = transactions.filter(t => t.status === 'completed').length;
                const pendingOrders = transactions.filter(t => t.status === 'pending').length;
                const cancelledOrders = transactions.filter(t => t.status === 'cancelled').length;
                
                // Payment method breakdown
                const paymentMethods = {};
                transactions.forEach(t => {
                    const method = t.payment_method || 'Unknown';
                    if (!paymentMethods[method]) {
                        paymentMethods[method] = { count: 0, amount: 0 };
                    }
                    paymentMethods[method].count++;
                    paymentMethods[method].amount += t.total_amount;
                });

                // Create comprehensive data array (no generic column labels)
                const excelData = [
                    ['Sales Report Overview', ''],
                    ['', ''],
                    ['Report Period', dateRangeText],
                    ['Generated Date', new Date().toLocaleDateString()],
                    ['', ''],
                    ['SUMMARY METRICS', ''],
                    ['Total Revenue', `₱${totalRevenue.toFixed(2)}`],
                    ['Total Orders', totalOrders],
                    ['Completed Orders', completedOrders],
                    ['Pending Orders', pendingOrders],
                    ['Cancelled Orders', cancelledOrders],
                    ['Completion Rate', `${((completedOrders / totalOrders) * 100).toFixed(1)}%`],
                    ['', ''],
                    ['PAYMENT METHODS', ''],
                    ['Method', 'Count', 'Amount', 'Percentage']
                ];

                // Add payment method breakdown
                Object.entries(paymentMethods).forEach(([method, data]) => {
                    const percentage = ((data.amount / totalRevenue) * 100).toFixed(1);
                    excelData.push([method, data.count, `₱${data.amount.toFixed(2)}`, `${percentage}%`]);
                });

                // Add separator and transaction details
                excelData.push(['', '', '', '']);
                excelData.push(['TRANSACTION DETAILS']);
                excelData.push(['Order ID', 'Customer Name', 'Date', 'Time', 'Items Count', 'Payment Method', 'Status', 'Total Amount']);

                // Add transaction data
                transactions.forEach(transaction => {
                    excelData.push([
                        String(transaction.order_id ?? ''),
                        String(transaction.customer_name ?? ''),
                        new Date(transaction.created_at).toLocaleDateString(),
                        new Date(transaction.created_at).toLocaleTimeString(),
                        String(transaction.items_count ?? ''),
                        String(transaction.payment_method ?? ''),
                        String(transaction.status ?? ''),
                        String(transaction.total_amount ?? '')
                    ]);
                });

                console.log('Excel data prepared:', transactions.length, 'transactions');

                // Generate Excel buffer
                    const excelBuffer = await writeExcelFile(excelData, {
                    schema: [
                        { column: 'Column 1', type: String, value: row => String(row[0] ?? '') },
                        { column: 'Column 2', type: String, value: row => String(row[1] ?? '') },
                        { column: 'Column 3', type: String, value: row => String(row[2] ?? '') },
                        { column: 'Column 4', type: String, value: row => String(row[3] ?? '') },
                        { column: 'Column 5', type: String, value: row => String(row[4] ?? '') },
                        { column: 'Column 6', type: String, value: row => String(row[5] ?? '') },
                        { column: 'Column 7', type: String, value: row => String(row[6] ?? '') },
                        { column: 'Column 8', type: String, value: row => String(row[7] ?? '') }
                    ]
                });

                console.log('Excel buffer generated, size:', excelBuffer.length);

                // Stream or buffer-safe send
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename="sales-report-${dateSuffix}-${timestamp}.xlsx"`);
                res.setHeader('Cache-Control', 'no-cache');
                if (excelBuffer && typeof excelBuffer.pipe === 'function') {
                    excelBuffer.pipe(res);
                } else {
                    const outBuffer = Buffer.isBuffer(excelBuffer) ? excelBuffer : Buffer.from(excelBuffer);
                    res.setHeader('Content-Length', outBuffer.length);
                    res.end(outBuffer);
                }
                console.log('Excel file sent successfully');
            } catch (excelError) {
                console.error('Excel generation error:', excelError);
                res.status(500).json({
                    success: false,
                    error: 'Failed to generate Excel file: ' + excelError.message
                });
                return;
            }

        } else if (format === 'pdf') {
            try {
                // Generate PDF file
                console.log('Generating PDF file...');
                const { jsPDF } = require('jspdf');
                const autoTable = require('jspdf-autotable');

                const doc = new jsPDF();

                // Calculate overview metrics
                const totalRevenue = transactions.reduce((sum, t) => sum + t.total_amount, 0);
                const totalOrders = transactions.length;
                const completedOrders = transactions.filter(t => t.status === 'completed').length;
                const pendingOrders = transactions.filter(t => t.status === 'pending').length;
                const cancelledOrders = transactions.filter(t => t.status === 'cancelled').length;
                const completionRate = totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) : '0.0';

                // Payment method breakdown
                const paymentMethods = {};
                transactions.forEach(t => {
                    const method = t.payment_method || 'Unknown';
                    if (!paymentMethods[method]) {
                        paymentMethods[method] = { count: 0, amount: 0 };
                    }
                    paymentMethods[method].count++;
                    paymentMethods[method].amount += t.total_amount;
                });

                // Add title
                doc.setFontSize(18);
                doc.text('Sales Report', 14, 22);

                // Add date range info
                doc.setFontSize(10);
                const dateRangeText = startDateToUse && endDateToUse 
                    ? `${startDateToUse} to ${endDateToUse}` 
                    : `Period: ${period || 'All'}`;
                doc.text(dateRangeText, 14, 30);
                doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 36);

                // Add overview section
                doc.setFontSize(12);
                doc.text('OVERVIEW SUMMARY', 14, 48);
                
                doc.setFontSize(10);
                let yPos = 56;
                doc.text(`Total Revenue: ₱${totalRevenue.toFixed(2)}`, 14, yPos);
                yPos += 6;
                doc.text(`Total Orders: ${totalOrders}`, 14, yPos);
                yPos += 6;
                doc.text(`Completed: ${completedOrders} (${completionRate}%)`, 14, yPos);
                yPos += 6;
                doc.text(`Pending: ${pendingOrders}`, 14, yPos);
                yPos += 6;
                doc.text(`Cancelled: ${cancelledOrders}`, 14, yPos);
                yPos += 10;

                // Add payment methods section
                doc.setFontSize(12);
                doc.text('PAYMENT METHODS', 14, yPos);
                yPos += 8;

                doc.setFontSize(10);
                Object.entries(paymentMethods).forEach(([method, data]) => {
                    const percentage = ((data.amount / totalRevenue) * 100).toFixed(1);
                    doc.text(`${method}: ${data.count} orders (₱${data.amount.toFixed(2)} - ${percentage}%)`, 14, yPos);
                    yPos += 6;
                });

                yPos += 10;

                // Add transaction details section
                doc.setFontSize(12);
                doc.text('TRANSACTION DETAILS', 14, yPos);

                // Prepare table data
                const tableData = transactions.map(transaction => [
                    transaction.order_id,
                    transaction.customer_name,
                    new Date(transaction.created_at).toLocaleDateString(),
                    transaction.payment_method,
                    transaction.status,
                    `₱${transaction.total_amount.toFixed(2)}`
                ]);

                console.log('PDF table data prepared:', tableData.length, 'rows');

                // Add table
                autoTable(doc, {
                    head: [['Order ID', 'Customer', 'Date', 'Payment Method', 'Status', 'Amount']],
                    body: tableData,
                    startY: yPos + 8,
                    styles: { fontSize: 8 },
                    headStyles: { fillColor: [255, 193, 7] },
                    margin: { left: 14, right: 14 }
                });

                // Generate PDF buffer
                const pdfBuffer = doc.output('arraybuffer');

                console.log('PDF buffer generated, size:', pdfBuffer.byteLength);

                // Set headers
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="sales-report-${dateSuffix}-${timestamp}.pdf"`);
                res.setHeader('Content-Length', pdfBuffer.byteLength);
                res.setHeader('Cache-Control', 'no-cache');

                // Send PDF file as binary
                res.end(Buffer.from(pdfBuffer), 'binary');
                console.log('PDF file sent successfully');
            } catch (pdfError) {
                console.error('PDF generation error:', pdfError);
                res.status(500).json({
                    success: false,
                    error: 'Failed to generate PDF file: ' + pdfError.message
                });
                return;
            }

        } else {
            res.status(400).json({
                success: false,
                error: 'Invalid format. Use "excel" or "pdf"'
            });
        }

    } catch (error) {
        console.error('Error generating sales report:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate sales report'
        });
    }
});

// Test endpoint to verify packages are working
router.get('/test-export', async(req, res) => {
    try {
        console.log('Testing export packages...');
        
        // Test write-excel-file
        const writeExcelFile = require('write-excel-file/node');
        const testData = [
            ['Name', 'Value'],
            ['Test', 123]
        ];
                    const excelBuffer = await writeExcelFile(testData, {
            schema: [
                { column: 'Name', type: String, value: row => row[0] },
                { column: 'Value', type: Number, value: row => row[1] }
            ]
        });
        
        // Test PDF
        const jsPDF = require('jspdf').jsPDF;
        const doc = new jsPDF();
        doc.text('Test PDF', 10, 10);
        const pdfBuffer = doc.output('arraybuffer');
        
        res.json({
            success: true,
            message: 'Export packages are working',
            excelSize: excelBuffer.length,
            pdfSize: pdfBuffer.byteLength
        });
    } catch (error) {
        console.error('Test export error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Test endpoint to download a simple Excel file
router.get('/test-excel', async(req, res) => {
    try {
        const writeExcelFile = require('write-excel-file/node');
        const testData = [
            ['Order ID', 'Customer', 'Amount'],
            ['TEST-001', 'Test Customer', 100.50],
            ['TEST-002', 'Another Customer', 250.75]
        ];
        
        const excelBuffer = await writeExcelFile(testData, {
            schema: [
                { column: 'Order ID', type: String, value: row => row[0] },
                { column: 'Customer', type: String, value: row => row[1] },
                { column: 'Amount', type: Number, value: row => row[2] }
            ]
        });
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="test-report.xlsx"');
        res.setHeader('Content-Length', excelBuffer.length);
        res.setHeader('Cache-Control', 'no-cache');
        
        res.end(excelBuffer, 'binary');
    } catch (error) {
        console.error('Test Excel error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Test endpoint to download a simple PDF file
router.get('/test-pdf', async(req, res) => {
    try {
        const jsPDF = require('jspdf').jsPDF;
        const doc = new jsPDF();
        
        doc.setFontSize(16);
        doc.text('Test Sales Report', 14, 22);
        
        doc.setFontSize(12);
        doc.text('This is a test PDF file', 14, 35);
        doc.text('Generated at: ' + new Date().toLocaleString(), 14, 45);
        
        const pdfBuffer = doc.output('arraybuffer');
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="test-report.pdf"');
        res.setHeader('Content-Length', pdfBuffer.byteLength);
        res.setHeader('Cache-Control', 'no-cache');
        
        res.end(Buffer.from(pdfBuffer), 'binary');
    } catch (error) {
        console.error('Test PDF error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Event Sales Analytics API
router.get('/sales/events', async (req, res) => {
    try {
        const { startDate, endDate, period } = req.query;
        
        // Build date filter
        let dateFilter = '';
        let params = [];
        
        if (startDate && endDate) {
            dateFilter = 'WHERE DATE(created_at) BETWEEN ? AND ?';
            params = [startDate, endDate];
        } else if (period === 'today') {
            dateFilter = 'WHERE DATE(created_at) = CURDATE()';
        } else if (period === 'week') {
            dateFilter = 'WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 WEEK)';
        } else if (period === 'month') {
            dateFilter = 'WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)';
        } else if (period === 'year') {
            dateFilter = 'WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
        } else {
            // Default to last 30 days
            dateFilter = 'WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        }

        // Get event sales totals
        const [totalsResult] = await db.query(`
            SELECT 
                COUNT(*) as total_events,
                SUM(CASE WHEN payment_status = 'not_paid' THEN 1 ELSE 0 END) as not_fully_paid,
                SUM(CASE WHEN payment_status = 'downpayment' THEN 1 ELSE 0 END) as downpayment,
                SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) as pending_payments
            FROM event_sales 
            ${dateFilter}
        `, params);

        // Get daily breakdown
        const [dailyResult] = await db.query(`
            SELECT 
                DATE(created_at) as day,
                SUM(amount) as total
            FROM event_sales 
            ${dateFilter}
            GROUP BY DATE(created_at)
            ORDER BY day DESC
            LIMIT 30
        `, params);

        // Get top events by revenue
        const [topEventsResult] = await db.query(`
            SELECT 
                es.event_id,
                e.customer_name,
                e.event_type,
                e.event_date,
                SUM(es.amount) as revenue,
                COUNT(es.id) as transactions
            FROM event_sales es
            JOIN events e ON es.event_id = e.id
            ${dateFilter.replace('created_at', 'es.created_at')}
            GROUP BY es.event_id, e.customer_name, e.event_type, e.event_date
            ORDER BY revenue DESC
            LIMIT 10
        `, params);

        // Get recent transactions
        const [recentResult] = await db.query(`
            SELECT 
                es.id,
                es.amount,
                es.payment_method,
                es.status,
                es.created_at,
                es.amount_paid,
                es.amount_to_be_paid,
                e.id as event_id,
                e.customer_name,
                e.event_type,
                e.event_date,
                e.contact_number,
                e.address
            FROM event_sales es
            JOIN events e ON es.event_id = e.id
            ${dateFilter.replace('created_at', 'es.created_at')}
            ORDER BY es.created_at DESC
            LIMIT 20
        `, params);

        const data = {
            totals: totalsResult[0] || {
                total_events: 0,
                not_fully_paid: 0,
                downpayment: 0,
                pending_payments: 0
            },
            byDay: dailyResult.map(row => ({
                day: row.day,
                total: parseFloat(row.total) || 0
            })),
            topEvents: topEventsResult.map(row => ({
                event_id: row.event_id,
                customer_name: row.customer_name,
                event_type: row.event_type,
                event_date: row.event_date,
                revenue: parseFloat(row.revenue) || 0,
                transactions: row.transactions
            })),
            recent: recentResult.map(row => ({
                id: row.id,
                amount: parseFloat(row.amount) || 0,
                payment_method: row.payment_method,
                status: row.status,
                created_at: row.created_at,
                amount_paid: parseFloat(row.amount_paid) || 0,
                amount_to_be_paid: parseFloat(row.amount_to_be_paid) || 0,
                event: {
                    id: row.event_id,
                    customer_name: row.customer_name,
                    event_type: row.event_type,
                    event_date: row.event_date,
                    contact_number: row.contact_number,
                    address: row.address
                }
            }))
        };

        res.json({
            success: true,
            data
        });

    } catch (error) {
        console.error('Event sales analytics error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Update event sales amount to be paid
router.put('/event-sales/:id/amount-to-be-paid', async (req, res) => {
    try {
        const { id } = req.params;
        const { amount_to_be_paid } = req.body;

        await db.query(
            'UPDATE event_sales SET amount_to_be_paid = ? WHERE id = ?',
            [amount_to_be_paid, id]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Update amount to be paid error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update event sales amount paid
router.put('/event-sales/:id/amount-paid', async (req, res) => {
    try {
        const { id } = req.params;
        const { amount_paid } = req.body;

        await db.query(
            'UPDATE event_sales SET amount_paid = ? WHERE id = ?',
            [amount_paid, id]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Update amount paid error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update event sales status
router.put('/event-sales/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        await db.query(
            'UPDATE event_sales SET status = ? WHERE id = ?',
            [status, id]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Admin sales download endpoint (Excel export)
router.get('/sales/download', async(req, res) => {
    try {
        console.log('Admin sales download called with params:', req.query);
        
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

        console.log(`Found ${salesData.length} orders for admin export`);

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

        console.log(`Generated admin Excel file with ${buffer.length} bytes`);

        // Set response headers
        const filename = `admin-sales-report-${period}-${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length);

        // Send file
        res.send(buffer);

    } catch (error) {
        console.error('Error generating admin sales download:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            error: 'Failed to generate sales report: ' + error.message
        });
    }
});

// Event sales download endpoint (Excel export)
router.get('/event-sales/download', async(req, res) => {
    try {
        console.log('Event sales download called with params:', req.query);
        
        const { format = 'excel', period = 'month', startDate, endDate, status, payment_method, customer } = req.query;

        // Build date filter
        let dateFilter = '';
        let params = [];
        
        if (startDate && endDate) {
            dateFilter = 'AND DATE(es.created_at) BETWEEN ? AND ?';
            params.push(startDate, endDate);
        } else {
            switch (period) {
                case 'today':
                    dateFilter = 'AND DATE(es.created_at) = CURDATE()';
                    break;
                case 'week':
                    dateFilter = 'AND es.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
                    break;
                case 'month':
                    dateFilter = 'AND es.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
                    break;
                case 'year':
                    dateFilter = 'AND es.created_at >= DATE_SUB(NOW(), INTERVAL 365 DAY)';
                    break;
                default:
                    dateFilter = 'AND es.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
            }
        }

        // Build additional filters
        let statusFilter = '';
        let paymentMethodFilter = '';
        let customerFilter = '';

        if (status && status !== 'all') {
            statusFilter = 'AND es.status = ?';
            params.push(status);
        }

        if (payment_method && payment_method !== 'all') {
            paymentMethodFilter = 'AND es.payment_method = ?';
            params.push(payment_method);
        }

        if (customer && customer.trim() !== '') {
            customerFilter = 'AND e.customer_name LIKE ?';
            params.push(`%${customer.trim()}%`);
        }

        // Get event sales data with event details
        const [eventSalesData] = await db.query(`
            SELECT 
                es.id,
                es.amount,
                es.amount_paid,
                es.amount_to_be_paid,
                es.payment_method,
                es.status,
                es.created_at,
                e.id as event_id,
                e.customer_name,
                e.event_type,
                e.event_date,
                e.contact_number,
                e.address
            FROM event_sales es
            LEFT JOIN events e ON es.event_id = e.id
            WHERE 1=1 ${dateFilter} ${statusFilter} ${paymentMethodFilter} ${customerFilter}
            ORDER BY es.created_at DESC
        `, params);

        console.log(`Found ${eventSalesData.length} event sales records for export`);

        // Generate Excel file
        const XLSX = require('xlsx');
        
        // Create workbook
        const workbook = XLSX.utils.book_new();

        // Summary sheet
        const totalRevenue = eventSalesData.reduce((sum, record) => sum + parseFloat(record.amount || 0), 0);
        const totalPaid = eventSalesData.reduce((sum, record) => sum + parseFloat(record.amount_paid || 0), 0);
        const totalOutstanding = eventSalesData.reduce((sum, record) => sum + parseFloat(record.amount_to_be_paid || 0), 0);
        
        const summaryData = {
            'Report Period': period,
            'Start Date': startDate || 'N/A',
            'End Date': endDate || 'N/A',
            'Total Events': eventSalesData.length,
            'Total Revenue': `₱${totalRevenue.toFixed(2)}`,
            'Total Paid': `₱${totalPaid.toFixed(2)}`,
            'Total Outstanding': `₱${totalOutstanding.toFixed(2)}`,
            'Generated On': new Date().toLocaleString()
        };

        const summarySheet = XLSX.utils.json_to_sheet([summaryData]);

        // Event sales transactions sheet
        const transactionsData = eventSalesData.map(record => ({
            'Event ID': record.event_id,
            'Customer Name': record.customer_name || 'N/A',
            'Event Type': record.event_type || 'N/A',
            'Event Date': record.event_date ? new Date(record.event_date).toLocaleDateString() : 'N/A',
            'Contact Number': record.contact_number || 'N/A',
            'Address': record.address || 'N/A',
            'Total Amount': `₱${parseFloat(record.amount || 0).toFixed(2)}`,
            'Amount Paid': `₱${parseFloat(record.amount_paid || 0).toFixed(2)}`,
            'Amount to be Paid': `₱${parseFloat(record.amount_to_be_paid || 0).toFixed(2)}`,
            'Payment Method': record.payment_method || 'N/A',
            'Status': record.status || 'N/A',
            'Transaction Date': new Date(record.created_at).toLocaleDateString(),
            'Transaction Time': new Date(record.created_at).toLocaleTimeString()
        }));

        const transactionsSheet = XLSX.utils.json_to_sheet(transactionsData);

        // Payment status breakdown sheet
        const statusBreakdown = eventSalesData.reduce((acc, record) => {
            const status = record.status || 'unknown';
            if (!acc[status]) {
                acc[status] = { count: 0, total: 0 };
            }
            acc[status].count += 1;
            acc[status].total += parseFloat(record.amount || 0);
            return acc;
        }, {});

        const statusData = Object.entries(statusBreakdown).map(([status, data]) => ({
            'Status': status,
            'Count': data.count,
            'Total Amount': `₱${data.total.toFixed(2)}`,
            'Average Amount': `₱${(data.total / data.count).toFixed(2)}`
        }));

        const statusSheet = XLSX.utils.json_to_sheet(statusData);

        // Add sheets to workbook
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
        XLSX.utils.book_append_sheet(workbook, transactionsSheet, 'Event Sales');
        XLSX.utils.book_append_sheet(workbook, statusSheet, 'Status Breakdown');

        // Generate buffer
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        console.log(`Generated event sales Excel file with ${buffer.length} bytes`);

        // Set response headers
        const dateSuffix = startDate && endDate 
            ? `${startDate}-to-${endDate}` 
            : period;
        const filename = `event-sales-report-${dateSuffix}-${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length);

        // Send file
        res.send(buffer);

    } catch (error) {
        console.error('Error generating event sales download:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            error: 'Failed to generate event sales report: ' + error.message
        });
    }
});

// Staff management endpoints
router.get('/staff/stats', async(req, res) => {
    try {
        // Get staff statistics
        const [totalStaff] = await db.query(`SELECT COUNT(*) as count FROM users WHERE role IN ('staff', 'manager', 'admin')`);
        const [activeStaff] = await db.query(`SELECT COUNT(*) as count FROM users WHERE role IN ('staff', 'manager', 'admin') AND status = 'active'`);
        const [staffByRole] = await db.query(`
            SELECT role, COUNT(*) as count 
            FROM users 
            WHERE role IN ('staff', 'manager', 'admin') 
            GROUP BY role
        `);
        
        res.json({
            success: true,
            stats: {
                totalStaff: totalStaff[0].count,
                activeStaff: activeStaff[0].count,
                staffByRole: staffByRole.reduce((acc, row) => {
                    acc[row.role] = row.count;
                    return acc;
                }, {})
            }
        });
    } catch (error) {
        console.error('Error fetching staff stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch staff stats' });
    }
});

router.get('/staff', async(req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const offset = (page - 1) * limit;
        
        let whereClause = "WHERE role IN ('staff', 'manager', 'admin')";
        let params = [];
        
        if (search) {
            whereClause += " AND (full_name LIKE ? OR email LIKE ? OR username LIKE ?)";
            const searchTerm = `%${search}%`;
            params = [searchTerm, searchTerm, searchTerm];
        }
        
        // Get total count
        const [countResult] = await db.query(`SELECT COUNT(*) as total FROM users ${whereClause}`, params);
        
        // Get staff members
        const [staff] = await db.query(`
            SELECT 
                id, username, email, full_name, role, 
                created_at, last_login_at, status
            FROM users 
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), offset]);
        
        res.json({
            success: true,
            staff,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total,
                totalPages: Math.ceil(countResult[0].total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching staff:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch staff' });
    }
});

module.exports = router;