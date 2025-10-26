const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { ensureAuthenticated } = require('../middleware/authMiddleware');

// Get customer loyalty information (PUBLIC - no auth required for viewing)
router.get('/:customerId/loyalty', async(req, res) => {
    try {
        const { customerId } = req.params;

        // Get customer loyalty points and basic info
        const [customerResult] = await db.query(`
            SELECT 
                c.loyalty_points,
                c.created_at as member_since,
                COUNT(DISTINCT o.id) as total_orders,
                SUM(o.total_price) as total_spent
            FROM customers c
            LEFT JOIN orders o ON c.id = o.customer_id AND o.payment_status = 'paid'
            WHERE c.id = ?
            GROUP BY c.id, c.loyalty_points, c.created_at
        `, [customerId]);

        if (customerResult.length === 0) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }

        const customer = customerResult[0];

        // Calculate total points earned (1 point per peso spent + welcome points if enabled)
        let totalEarned = Math.floor(customer.total_spent || 0);

        // Check if welcome points are enabled
        const [welcomeSettings] = await db.query(`
            SELECT setting_value FROM loyalty_settings 
            WHERE setting_key = 'welcome_points_enabled'
        `);

        if (welcomeSettings.length > 0 && welcomeSettings[0].setting_value === 'true') {
            const [welcomePointsSettings] = await db.query(`
                SELECT setting_value FROM loyalty_settings 
                WHERE setting_key = 'welcome_points'
            `);

            if (welcomePointsSettings.length > 0) {
                const welcomePoints = parseInt(welcomePointsSettings[0].setting_value) || 0;
                totalEarned += welcomePoints;
            }
        }

        // Get total points redeemed
        const [redeemedResult] = await db.query(`
            SELECT COALESCE(SUM(points_redeemed), 0) as total_redeemed
            FROM loyalty_transactions 
            WHERE customer_id = ? AND transaction_type = 'redeem'
        `, [customerId]);

        const totalRedeemed = redeemedResult[0].total_redeemed || 0;

        const calculatedCurrent = Math.max(0, (totalEarned || 0) - (totalRedeemed || 0));
        const currentPoints = (customer.loyalty_points == null || customer.loyalty_points === 0) ? calculatedCurrent : customer.loyalty_points;

        res.json({
            success: true,
            loyalty_points: currentPoints,
            total_earned: totalEarned,
            total_redeemed: totalRedeemed,
            member_since: customer.member_since,
            total_orders: customer.total_orders || 0,
            total_spent: customer.total_spent || 0
        });

    } catch (error) {
        console.error('Error fetching customer loyalty:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch loyalty information' });
    }
});

// Get customer points earned history
router.get('/:customerId/points-earned-history', async(req, res) => {
    try {
        const { customerId } = req.params;

        // Get all orders for the customer with loyalty points earned
        const [orders] = await db.query(`
            SELECT 
                o.order_id,
                COALESCE(o.completed_time, o.order_time, o.updated_at, o.created_at) as order_date,
                o.total_price,
                o.status,
                o.items,
                COALESCE(lt.points_earned, 0) as points_earned
            FROM orders o
            LEFT JOIN loyalty_transactions lt ON o.id = lt.order_id AND lt.transaction_type = 'earn'
            WHERE o.customer_id = ? 
            AND o.payment_status = 'paid'
            ORDER BY COALESCE(o.completed_time, o.order_time, o.updated_at, o.created_at) DESC
        `, [customerId]);

        const pointsHistory = orders.map(order => {
            let items = [];
            try {
                items = JSON.parse(order.items);
            } catch (e) {
                items = [];
            }

            // Calculate points per item (assuming 1 point per peso spent)
            const itemsWithPoints = items.map(item => ({
                name: item.name || 'Unknown Item',
                quantity: item.quantity || 1,
                points_per_item: Math.floor((item.price || 0) * 0.1) // 10% of price as points
            }));

            // Use actual earned points from loyalty transaction, fallback to calculated points
            const actualPointsEarned = parseInt(order.points_earned) || 0;
            const calculatedPoints = Math.floor(parseFloat(order.total_price) || 0);
            const finalPoints = actualPointsEarned > 0 ? actualPointsEarned : calculatedPoints;

            // Handle invalid dates
            let orderDate = order.order_date;
            if (!orderDate || orderDate === 'Invalid Date' || orderDate === '1970-01-01 00:00:00') {
                orderDate = new Date().toISOString(); // Use current date as fallback
            }

            return {
                order_id: order.order_id,
                order_date: orderDate,
                total_amount: parseFloat(order.total_price) || 0,
                points_earned: finalPoints,
                items: itemsWithPoints,
                status: order.status || 'unknown'
            };
        });

        res.json({
            success: true,
            pointsHistory: pointsHistory
        });

    } catch (error) {
        console.error('Error fetching points earned history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch points earned history'
        });
    }
});

// Apply authentication to data modification routes (require login for changes)
router.use(ensureAuthenticated);

// Earn points from order completion
router.post('/:customerId/earn-points', async(req, res) => {
    try {
        const { customerId } = req.params;
        const { orderId, orderAmount, pointsEarned } = req.body;

        // Update customer loyalty points
        await db.query(`
            UPDATE customers 
            SET loyalty_points = loyalty_points + ? 
            WHERE id = ?
        `, [pointsEarned, customerId]);

        // Record loyalty transaction
        await db.query(`
            INSERT INTO loyalty_transactions 
            (customer_id, order_id, points_earned, transaction_type, description) 
            VALUES (?, ?, ?, 'earn', ?)
        `, [
            customerId,
            orderId,
            pointsEarned,
            `Earned ${pointsEarned} loyalty points from order #${orderId} (₱${orderAmount})`
        ]);

        res.json({
            success: true,
            message: `Earned ${pointsEarned} loyalty points`,
            newBalance: pointsEarned
        });

    } catch (error) {
        console.error('Error earning loyalty points:', error);
        res.status(500).json({ success: false, error: 'Failed to earn loyalty points' });
    }
});

// Get customer order history for loyalty tracking
router.get('/:customerId/orders', async(req, res) => {
    try {
        const { customerId } = req.params;

        const [orders] = await db.query(`
            SELECT 
                o.id,
                o.order_id,
                o.total_price,
                o.status,
                o.payment_status,
                o.created_at,
                o.items
            FROM orders o
            WHERE o.customer_id = ? AND o.payment_status = 'paid'
            ORDER BY 
                CASE 
                    WHEN o.created_at = '1970-01-01 00:00:00' OR o.created_at IS NULL THEN 0
                    ELSE 1
                END DESC,
                o.created_at DESC
        `, [customerId]);

        // Parse items JSON and format the response
        const formattedOrders = orders.map(order => {
            let items = [];
            try {
                items = JSON.parse(order.items || '[]');
            } catch (e) {
                items = [];
            }

            // Handle invalid dates
            let createdDate = order.created_at;
            if (!createdDate || createdDate === 'Invalid Date' || createdDate === '1970-01-01 00:00:00') {
                createdDate = new Date().toISOString(); // Use current date as fallback
            }

            return {
                id: order.id,
                order_id: order.order_id,
                total_price: order.total_price,
                status: order.status,
                payment_status: order.payment_status,
                created_at: createdDate,
                items: items.map(item => ({
                    name: item.name || 'Unknown Item',
                    quantity: item.quantity || 1,
                    price: item.price || 0
                }))
            };
        });

        res.json({
            success: true,
            orders: formattedOrders
        });

    } catch (error) {
        console.error('Error fetching customer orders:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch order history' });
    }
});

module.exports = router;