const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Generate unique claim code
function generateClaimCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
const qrService = require('../services/qrService');
const { ensureAuthenticated } = require('../middleware/authMiddleware');
const { ensureStaffAuthenticated } = require('../middleware/staffAuthMiddleware');

// Apply authentication to all loyalty routes
router.use(ensureAuthenticated);

// Get customer loyalty points
router.get('/points/:customerId', (req, res, next) => {
    // Check if staff is authenticated, otherwise use regular auth
    if (req.session.staffUser && (req.session.staffUser.role === 'staff' || req.session.staffUser.role === 'admin')) {
        return next();
    }
    // Fall back to regular authentication
    return ensureAuthenticated(req, res, next);
}, async(req, res) => {
    try {
        const { customerId } = req.params;

        const [customers] = await db.query(`
            SELECT id, full_name, loyalty_points, created_at 
            FROM customers WHERE id = ?
        `, [customerId]);

        if (customers.length === 0) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }

        const customer = customers[0];

        // Get recent transactions
        const [transactions] = await db.query(`
            SELECT * FROM loyalty_transactions 
            WHERE customer_id = ? 
            ORDER BY created_at DESC 
            LIMIT 10
        `, [customerId]);

        res.json({
            success: true,
            customer: {
                id: customer.id,
                name: customer.full_name,
                points: customer.loyalty_points,
                memberSince: customer.created_at
            },
            recentTransactions: transactions
        });
    } catch (error) {
        console.error('Error fetching loyalty points:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch loyalty points' });
    }
});

// Earn points from order (updated to use settings)
router.post('/earn', async(req, res) => {
    try {
        const { customerId, orderId, orderAmount } = req.body;

        // Get loyalty settings
        const [settings] = await db.query(`
            SELECT setting_key, setting_value FROM loyalty_settings 
            WHERE setting_key IN ('loyalty_enabled', 'points_per_peso')
        `);

        const settingsObj = {};
        settings.forEach(setting => {
            settingsObj[setting.setting_key] = setting.setting_value;
        });

        // Check if loyalty is enabled
        if (settingsObj.loyalty_enabled !== 'true') {
            return res.status(400).json({
                success: false,
                error: 'Loyalty system is currently disabled'
            });
        }

        // Calculate points based on settings
        const pointsPerPeso = parseFloat(settingsObj.points_per_peso || '1');
        const pointsEarned = Math.floor(orderAmount * pointsPerPeso);

        // Start transaction
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Update customer points
            await connection.query(`
                UPDATE customers 
                SET loyalty_points = loyalty_points + ? 
                WHERE id = ?
            `, [pointsEarned, customerId]);

            // Record transaction
            await connection.query(`
                INSERT INTO loyalty_transactions 
                (customer_id, order_id, points_earned, transaction_type, description) 
                VALUES (?, ?, ?, 'earn', ?)
            `, [customerId, orderId, pointsEarned, `Earned ${pointsEarned} points from order #${orderId}`]);

            await connection.commit();

            // Get updated points
            const [customers] = await db.query(`
                SELECT loyalty_points FROM customers WHERE id = ?
            `, [customerId]);

            res.json({
                success: true,
                pointsEarned,
                newBalance: customers[0].loyalty_points,
                message: `Earned ${pointsEarned} points!`
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error earning points:', error);
        res.status(500).json({ success: false, error: 'Failed to earn points' });
    }
});

// NEW: Redeem reward with order validation and proof tracking
router.post('/redeem-reward', async(req, res) => {
    try {
        const { customerId, rewardId, orderId, redemptionProof, staffId } = req.body;

        // Validate required fields
        if (!customerId || !rewardId || !redemptionProof) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: customerId, rewardId, redemptionProof'
            });
        }

        // Get loyalty settings
        const [settings] = await db.query(`
            SELECT setting_key, setting_value FROM loyalty_settings 
            WHERE setting_key IN ('rewards_enabled', 'minimum_points_redemption')
        `);

        const settingsObj = {};
        settings.forEach(setting => {
            settingsObj[setting.setting_key] = setting.setting_value;
        });

        // Check if rewards are enabled
        if (settingsObj.rewards_enabled !== 'true') {
            return res.status(400).json({
                success: false,
                error: 'Rewards redemption is currently disabled'
            });
        }

        // Verify the order exists and belongs to the customer (if orderId is provided)
        let order = null;
        if (orderId) {
            const [orders] = await db.query(`
                SELECT id, order_id, customer_id, status, total_amount 
                FROM orders 
                WHERE order_id = ? AND customer_id = ?
            `, [orderId, customerId]);

            if (orders.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Order not found or does not belong to this customer'
                });
            }

            order = orders[0];

            // Check if order is active (not cancelled/completed)
            if (order.status === 'cancelled') {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot redeem rewards for cancelled orders'
                });
            }
        }

        // Get reward details
        const [rewards] = await db.query(`
            SELECT * FROM loyalty_rewards WHERE id = ? AND is_active = TRUE
        `, [rewardId]);

        if (rewards.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Reward not found or inactive'
            });
        }

        const reward = rewards[0];

        // Note: Order requirement removed - rewards can be claimed independently
        // The system already has proper safeguards (one-time claim limit, 20-minute expiration)

        // Check minimum points requirement
        const minimumPoints = parseInt(settingsObj.minimum_points_redemption || '10');
        if (reward.points_required < minimumPoints) {
            return res.status(400).json({
                success: false,
                error: `Minimum ${minimumPoints} points required for redemption`
            });
        }

        // Get current customer points
        const [customers] = await db.query(`
            SELECT loyalty_points FROM customers WHERE id = ?
        `, [customerId]);

        if (customers.length === 0) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }

        let currentPoints = customers[0].loyalty_points || 0;

        // Fallback-derived balance if stored points are zero/stale
        if (!currentPoints) {
            const [txnAgg] = await db.query(`
                SELECT 
                    COALESCE(SUM(points_earned), 0) AS earned,
                    COALESCE(SUM(points_redeemed), 0) AS redeemed
                FROM loyalty_transactions 
                WHERE customer_id = ?
            `, [customerId]);
            currentPoints = Math.max(0, ((txnAgg[0] && txnAgg[0].earned) || 0) - ((txnAgg[0] && txnAgg[0].redeemed) || 0));
            if (!currentPoints) {
                const [orderAgg] = await db.query(`
                    SELECT COALESCE(SUM(total_price), 0) AS total_paid
                    FROM orders WHERE customer_id = ? AND payment_status = 'paid'
                `, [customerId]);
                currentPoints = Math.max(0, Math.floor((orderAgg[0] && orderAgg[0].total_paid) || 0) - (((txnAgg[0] && txnAgg[0].redeemed) || 0)));
            }
        }

        if (currentPoints < reward.points_required) {
            return res.status(400).json({
                success: false,
                error: 'Insufficient points',
                currentPoints,
                requiredPoints: reward.points_required
            });
        }

        // Check if customer has already redeemed this reward type (1 per customer rule)
        const [existingRedemptions] = await db.query(`
            SELECT COUNT(*) as count FROM loyalty_reward_redemptions 
            WHERE customer_id = ? AND reward_id = ? AND status IN ('pending', 'completed')
        `, [customerId, rewardId]);

        if (existingRedemptions[0].count >= reward.max_redemptions_per_customer) {
            return res.status(400).json({
                success: false,
                error: `Maximum redemptions (${reward.max_redemptions_per_customer}) for this reward already reached`
            });
        }

        // Generate unique claim code
        const claimCode = generateClaimCode();

        // Create reward redemption record with 20-minute expiration
        const expirationTime = new Date(Date.now() + 20 * 60 * 1000); // 20 minutes from now

        const [redemptionResult] = await db.query(`
            INSERT INTO loyalty_reward_redemptions 
            (customer_id, reward_id, order_id, points_redeemed, redemption_proof, staff_id, status, expires_at, claim_code) 
            VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
        `, [customerId, rewardId, orderId, reward.points_required, redemptionProof, staffId || null, expirationTime, claimCode]);

        const redemptionId = redemptionResult.insertId;

        // Deduct points from effective balance to keep DB in sync
        const newBalance = Math.max(0, currentPoints - reward.points_required);
        await db.query(`
            UPDATE customers 
            SET loyalty_points = ? 
            WHERE id = ?
        `, [newBalance, customerId]);

        // Record loyalty transaction
        await db.query(`
            INSERT INTO loyalty_transactions 
            (customer_id, order_id, points_redeemed, transaction_type, description, redemption_id, reward_id) 
            VALUES (?, ?, ?, 'redeem', ?, ?, ?)
        `, [
            customerId,
            orderId,
            reward.points_required,
            `Redeemed ${reward.name} for ${reward.points_required} points`,
            redemptionId,
            rewardId
        ]);

        // Get updated points
        const [updatedCustomers] = await db.query(`
            SELECT loyalty_points FROM customers WHERE id = ?
        `, [customerId]);

        res.json({
            success: true,
            redemptionId,
            rewardName: reward.name,
            pointsRedeemed: reward.points_required,
            newBalance: newBalance,
            message: `Successfully redeemed ${reward.name}!`,
            redemptionProof,
            status: 'pending',
            expiresAt: expirationTime,
            expiresInMinutes: 20,
            claimCode: claimCode,
            nextSteps: 'Staff will confirm your reward usage when you claim it. Claim expires in 20 minutes.'
        });
    } catch (error) {
        console.error('Error redeeming reward:', error);
        res.status(500).json({ success: false, error: 'Failed to redeem reward' });
    }
});

// NEW: Confirm reward usage (staff only)
router.post('/confirm-reward-usage', async(req, res) => {
    try {
        const { redemptionId, staffId, usageType, menuItemId, discountAmount, confirmationNotes } = req.body;

        if (!redemptionId || !usageType) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: redemptionId, usageType'
            });
        }

        // Resolve staff/admin identity (accept staff or admin)
        let effectiveStaffId = staffId || (req.session && req.session.staffUser && req.session.staffUser.id) || (req.session && req.session.adminUser && req.session.adminUser.id) || null;
        let staffDisplayName = 'staff';
        if (effectiveStaffId) {
            try {
                const [staffRows] = await db.query(`
                    SELECT id, full_name FROM users WHERE id = ? AND role IN ('staff','manager','admin')
                `, [effectiveStaffId]);
                if (staffRows && staffRows.length > 0) {
                    staffDisplayName = staffRows[0].full_name || 'staff';
                } else {
                    const [adminRows] = await db.query(`
                        SELECT id, full_name FROM admins WHERE id = ?
                    `, [effectiveStaffId]);
                    if (adminRows && adminRows.length > 0) {
                        staffDisplayName = adminRows[0].full_name || 'admin';
                    }
                }
            } catch (e) {
                // ignore lookup error; proceed with generic name
            }
        }

        // Get redemption details
        const [redemptions] = await db.query(`
            SELECT * FROM loyalty_reward_redemptions WHERE id = ? AND status = 'pending'
        `, [redemptionId]);

        if (redemptions.length === 0) {
            return res.status(404).json({ success: false, error: 'Redemption not found or already processed' });
        }

        const redemption = redemptions[0];

        // Start transaction
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // If expired, mark expired and return
            if (new Date(redemption.expires_at) < new Date()) {
                await connection.query(`
                    UPDATE loyalty_reward_redemptions 
                    SET status = 'expired', updated_at = NOW() 
                    WHERE id = ?
                `, [redemptionId]);
                await connection.commit();
                return res.status(400).json({ success: false, error: 'Redemption has expired' });
            }

            // Update redemption status to completed
            await connection.query(`
                UPDATE loyalty_reward_redemptions 
                SET status = 'completed', notes = ?, staff_id = ? 
                WHERE id = ?
            `, [confirmationNotes || `Confirmed by ${staffDisplayName}`, effectiveStaffId || null, redemptionId]);

            // Try to log the usage (best-effort)
            try {
                await connection.query(`
                    INSERT INTO loyalty_reward_usage_log 
                    (redemption_id, usage_type, menu_item_id, discount_amount, staff_confirmation_id, confirmation_notes) 
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [redemptionId, usageType, menuItemId || null, discountAmount || null, effectiveStaffId || null, confirmationNotes || `Confirmed by ${staffDisplayName}`]);
            } catch (logErr) {
                console.warn('loyalty_reward_usage_log insert failed (non-fatal):', logErr && logErr.message ? logErr.message : logErr);
            }

            await connection.commit();

            res.json({
                success: true,
                message: 'Reward usage confirmed successfully',
                redemptionId,
                confirmedBy: staffDisplayName,
                usageType,
                confirmationNotes: confirmationNotes || `Confirmed by ${staffDisplayName}`
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error confirming reward usage:', error);
        res.status(500).json({ success: false, error: 'Failed to confirm reward usage' });
    }
});

// NEW: Get customer's available rewards
router.get('/available-rewards/:customerId', async(req, res) => {
    try {
        const { customerId } = req.params;

        // Get customer's current points
        const [customers] = await db.query(`
            SELECT loyalty_points FROM customers WHERE id = ?
        `, [customerId]);

        if (customers.length === 0) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }

        let currentPoints = customers[0].loyalty_points || 0;

        // Fallback if points not stored yet: derive from transactions or orders
        if (!currentPoints) {
            const [txnAgg] = await db.query(`
                SELECT 
                    COALESCE(SUM(points_earned), 0) AS earned,
                    COALESCE(SUM(points_redeemed), 0) AS redeemed
                FROM loyalty_transactions 
                WHERE customer_id = ?
            `, [customerId]);
            currentPoints = Math.max(0, ((txnAgg[0] && txnAgg[0].earned) || 0) - ((txnAgg[0] && txnAgg[0].redeemed) || 0));
            if (!currentPoints) {
                const [orderAgg] = await db.query(`
                    SELECT COALESCE(SUM(total_price), 0) AS total_paid
                    FROM orders WHERE customer_id = ? AND payment_status = 'paid'
                `, [customerId]);
                currentPoints = Math.max(0, Math.floor((orderAgg[0] && orderAgg[0].total_paid) || 0) - (((txnAgg[0] && txnAgg[0].redeemed) || 0)));
            }
        }

        // Get all active rewards
        const [rewards] = await db.query(`
            SELECT * FROM loyalty_rewards WHERE is_active = TRUE ORDER BY points_required ASC
        `, []);

        // Get customer's redemptions to check limits (1 per customer rule)
        const [recentRedemptions] = await db.query(`
            SELECT reward_id, COUNT(*) as redemption_count 
            FROM loyalty_reward_redemptions 
            WHERE customer_id = ? AND status IN ('pending', 'completed')
            GROUP BY reward_id
        `, [customerId]);

        const redemptionCounts = {};
        recentRedemptions.forEach(redemption => {
            redemptionCounts[redemption.reward_id] = redemption.redemption_count;
        });

        // Filter and enhance rewards with availability info
        const availableRewards = rewards
            .filter(reward => {
                const redemptionCount = redemptionCounts[reward.id] || 0;
                return currentPoints >= reward.points_required &&
                    redemptionCount < reward.max_redemptions_per_customer;
            })
            .map(reward => {
                const redemptionCount = redemptionCounts[reward.id] || 0;
                return {
                    ...reward,
                    canRedeem: true,
                    currentRedemptions: redemptionCount,
                    remainingRedemptions: Math.max(0, reward.max_redemptions_per_customer - redemptionCount)
                };
            });

        res.json({
            success: true,
            customerPoints: currentPoints,
            availableRewards,
            message: `Found ${availableRewards.length} rewards available`
        });
    } catch (error) {
        console.error('Error fetching available rewards:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch available rewards' });
    }
});

/**
 * STAFF: Get loyalty reward redemptions list
 * Returns a limited set of fields suitable for staff processing views.
 * Query params: status=pending|processed|cancelled|expired (default pending)
 */
router.get('/staff/claimed-rewards', async(req, res) => {
    try {
        // Basic role check using session, fallback to allow if JWT middleware added elsewhere
        const isStaff = (req.session && (req.session.staffUser || req.session.user)) ? true : false;
        if (!isStaff) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const { status = 'pending' } = req.query;
        const valid = ['pending', 'processed', 'cancelled', 'expired'];
        const targetStatus = valid.includes(String(status)) ? String(status) : 'pending';

        const [rows] = await db.query(`
            SELECT 
                lrr.id,
                lrr.status,
                lrr.redemption_date,
                lrr.expires_at,
                c.full_name as customer_name,
                lr.name as reward_name,
                lr.points_required as points_cost
            FROM loyalty_reward_redemptions lrr
            JOIN customers c ON lrr.customer_id = c.id
            JOIN loyalty_rewards lr ON lrr.reward_id = lr.id
            WHERE lrr.status = ?
            ORDER BY lrr.redemption_date DESC
            LIMIT 100
        `, [targetStatus]);

        return res.json({ success: true, claimedRewards: rows });
    } catch (err) {
        console.error('Error fetching staff claimed rewards:', err);
        return res.status(500).json({ success: false, error: 'Failed to fetch claimed rewards' });
    }
});

// NEW: Get customer's redemption history
router.get('/redemption-history/:customerId', async(req, res) => {
    try {
        const { customerId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const offset = (page - 1) * limit;

        // Get total count
        const [countResult] = await db.query(`
            SELECT COUNT(*) as total FROM loyalty_reward_redemptions WHERE customer_id = ?
        `, [customerId]);

        // Get redemptions with reward details
        const [redemptions] = await db.query(`
            SELECT 
                lrr.*,
                lr.name as reward_name,
                lr.reward_type,
                lr.description as reward_description,
                u.full_name as staff_name
            FROM loyalty_reward_redemptions lrr
            JOIN loyalty_rewards lr ON lrr.reward_id = lr.id
            LEFT JOIN users u ON lrr.staff_id = u.id
            WHERE lrr.customer_id = ?
            ORDER BY lrr.redemption_date DESC
            LIMIT ? OFFSET ?
        `, [customerId, parseInt(limit), offset]);

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
        console.error('Error fetching redemption history:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch redemption history' });
    }
});

// Legacy redeem points (kept for backward compatibility)
router.post('/redeem', (req, res, next) => {
    // Check if staff is authenticated, otherwise use regular auth
    if (req.session.staffUser && (req.session.staffUser.role === 'staff' || req.session.staffUser.role === 'admin')) {
        return next();
    }
    // Fall back to regular authentication
    return ensureAuthenticated(req, res, next);
}, async(req, res) => {
    try {
        const { customerId, pointsToRedeem, redemptionType, description } = req.body;

        // Get loyalty settings
        const [settings] = await db.query(`
            SELECT setting_key, setting_value FROM loyalty_settings 
            WHERE setting_key IN ('rewards_enabled', 'minimum_points_redemption')
        `);

        const settingsObj = {};
        settings.forEach(setting => {
            settingsObj[setting.setting_key] = setting.setting_value;
        });

        // Check if rewards are enabled
        if (settingsObj.rewards_enabled !== 'true') {
            return res.status(400).json({
                success: false,
                error: 'Rewards redemption is currently disabled'
            });
        }

        // Check minimum points requirement
        const minimumPoints = parseInt(settingsObj.minimum_points_redemption || '10');
        if (pointsToRedeem < minimumPoints) {
            return res.status(400).json({
                success: false,
                error: `Minimum ${minimumPoints} points required for redemption`
            });
        }

        // Get current points
        const [customers] = await db.query(`
            SELECT loyalty_points FROM customers WHERE id = ?
        `, [customerId]);

        if (customers.length === 0) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }

        const currentPoints = customers[0].loyalty_points;

        if (currentPoints < pointsToRedeem) {
            return res.status(400).json({
                success: false,
                error: 'Insufficient points',
                currentPoints,
                requestedPoints: pointsToRedeem
            });
        }

        // Start transaction
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Update customer points
            await connection.query(`
                UPDATE customers 
                SET loyalty_points = loyalty_points - ? 
                WHERE id = ?
            `, [pointsToRedeem, customerId]);

            // Record transaction
            await connection.query(`
                INSERT INTO loyalty_transactions 
                (customer_id, points_redeemed, transaction_type, description) 
                VALUES (?, ?, 'redeem', ?)
            `, [customerId, pointsToRedeem, description || `${redemptionType} redemption`]);

            await connection.commit();

            // Get updated points
            const [updatedCustomers] = await db.query(`
                SELECT loyalty_points FROM customers WHERE id = ?
            `, [customerId]);

            res.json({
                success: true,
                pointsRedeemed: pointsToRedeem,
                newBalance: updatedCustomers[0].loyalty_points,
                message: `Successfully redeemed ${pointsToRedeem} points!`
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error redeeming points:', error);
        res.status(500).json({ success: false, error: 'Failed to redeem points' });
    }
});

// Get loyalty transaction history
router.get('/transactions/:customerId', async(req, res) => {
    try {
        const { customerId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const offset = (page - 1) * limit;

        // Get total count
        const [countResult] = await db.query(`
            SELECT COUNT(*) as total FROM loyalty_transactions WHERE customer_id = ?
        `, [customerId]);

        // Get transactions
        const [transactions] = await db.query(`
            SELECT * FROM loyalty_transactions 
            WHERE customer_id = ? 
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        `, [customerId, parseInt(limit), offset]);

        res.json({
            success: true,
            transactions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total,
                totalPages: Math.ceil(countResult[0].total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching transaction history:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch transaction history' });
    }
});

// Generate loyalty QR code
router.post('/qr/:customerId', async(req, res) => {
    try {
        const { customerId } = req.params;

        const qrCode = await qrService.generateLoyaltyQR(customerId);

        res.json({ success: true, qrCode });
    } catch (error) {
        console.error('Error generating loyalty QR code:', error);
        res.status(500).json({ success: false, error: 'Failed to generate QR code' });
    }
});

// Get loyalty rewards catalog
router.get('/rewards', async(req, res) => {
    try {
        // Get active rewards from database
        const [rewards] = await db.query(`
            SELECT * FROM loyalty_rewards 
            WHERE is_active = TRUE 
            ORDER BY points_required ASC
        `);

        res.json({ success: true, rewards });
    } catch (error) {
        console.error('Error fetching rewards catalog:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch rewards' });
    }
});

// Get customer loyalty statistics
router.get('/stats/:customerId', async(req, res) => {
    try {
        const { customerId } = req.params;

        // Get customer info
        const [customers] = await db.query(`
            SELECT loyalty_points, created_at FROM customers WHERE id = ?
        `, [customerId]);

        if (customers.length === 0) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }

        // Get transaction statistics
        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as totalTransactions,
                SUM(points_earned) as totalEarned,
                SUM(points_redeemed) as totalRedeemed,
                MAX(created_at) as lastTransaction
            FROM loyalty_transactions 
            WHERE customer_id = ?
        `, [customerId]);

        // Get monthly breakdown
        const [monthlyStats] = await db.query(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                SUM(points_earned) as earned,
                SUM(points_redeemed) as redeemed
            FROM loyalty_transactions 
            WHERE customer_id = ? 
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month DESC
            LIMIT 12
        `, [customerId]);

        const customer = customers[0];
        const statistics = stats[0];

        res.json({
            success: true,
            stats: {
                currentPoints: customer.loyalty_points,
                memberSince: customer.created_at,
                totalTransactions: statistics.totalTransactions || 0,
                totalEarned: statistics.totalEarned || 0,
                totalRedeemed: statistics.totalRedeemed || 0,
                lastTransaction: statistics.lastTransaction,
                monthlyBreakdown: monthlyStats
            }
        });
    } catch (error) {
        console.error('Error fetching loyalty statistics:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
    }
});

// Adjust points (admin only)
router.post('/adjust', async(req, res) => {
    try {
        const { customerId, points, reason, type } = req.body;

        if (!customerId || !points || !reason || !type) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: customerId, points, reason, type'
            });
        }

        // Validate type
        if (!['add', 'subtract'].includes(type)) {
            return res.status(400).json({
                success: false,
                error: 'Type must be either "add" or "subtract"'
            });
        }

        // Get current customer points
        const [customers] = await db.query(
            'SELECT loyalty_points FROM customers WHERE id = ?', [customerId]
        );

        if (customers.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Customer not found'
            });
        }

        const currentPoints = customers[0].loyalty_points;
        let newPoints;

        if (type === 'add') {
            newPoints = currentPoints + points;
        } else {
            newPoints = Math.max(0, currentPoints - points); // Prevent negative points
        }

        // Update customer points
        await db.query(
            'UPDATE customers SET loyalty_points = ? WHERE id = ?', [newPoints, customerId]
        );

        // Record the adjustment transaction
        await db.query(`
            INSERT INTO loyalty_transactions 
            (customer_id, points_earned, points_redeemed, transaction_type, description, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        `, [
            customerId,
            type === 'add' ? points : 0,
            type === 'subtract' ? points : 0,
            'admin_adjustment',
            reason
        ]);

        res.json({
            success: true,
            message: `Points ${type === 'add' ? 'added' : 'subtracted'} successfully`,
            previousPoints: currentPoints,
            newPoints: newPoints,
            adjustment: points
        });

    } catch (error) {
        console.error('Error adjusting loyalty points:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to adjust loyalty points'
        });
    }
});

// Admin: Get all claimed rewards for processing
router.get('/admin/claimed-rewards', async(req, res) => {
    try {
        // Basic authentication check - in production, use proper JWT middleware
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        // For development, accept any auth header
        console.log('Admin route accessed with auth:', authHeader);

        // Get all claimed rewards with customer and reward details
        const [claimedRewards] = await db.query(`
            SELECT 
                lrr.*,
                c.full_name as customer_name,
                c.email as customer_email,
                lr.name as reward_name,
                lr.reward_type,
                lr.description as reward_description
            FROM loyalty_reward_redemptions lrr
            JOIN customers c ON lrr.customer_id = c.id
            JOIN loyalty_rewards lr ON lrr.reward_id = lr.id
            ORDER BY lrr.created_at DESC
        `);

        res.json({
            success: true,
            claimedRewards
        });
    } catch (error) {
        console.error('Error fetching claimed rewards:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch claimed rewards'
        });
    }
});

// Staff: Search redemption by claim code
router.get('/staff/search/:claimCode', async(req, res) => {
    try {
        // allow staff or admin sessions
        const isStaff = (req.session && req.session.staffUser);
        const isAdmin = (req.session && (req.session.adminUser || req.session.admin));
        if (!isStaff && !isAdmin) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const { claimCode } = req.params;

        const [redemptions] = await db.query(`
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

        if (redemptions.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Redemption not found'
            });
        }

        res.json({
            success: true,
            redemption: redemptions[0]
        });
    } catch (error) {
        console.error('Error searching redemption:', error);
        res.status(500).json({ success: false, error: 'Failed to search redemption' });
    }
});

// Staff: Get pending redemptions
router.get('/staff/pending', async(req, res) => {
    try {
        // allow staff or admin sessions
        const isStaff = (req.session && req.session.staffUser);
        const isAdmin = (req.session && (req.session.adminUser || req.session.admin));
        if (!isStaff && !isAdmin) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const [redemptions] = await db.query(`
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

        res.json({
            success: true,
            redemptions
        });
    } catch (error) {
        console.error('Error fetching pending redemptions:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch pending redemptions' });
    }
});

// Staff: Process redemption (complete or cancel)
router.post('/staff/:redemptionId/:action', ensureStaffAuthenticated, async(req, res) => {
    try {
        const { redemptionId, action } = req.params;
        const staffId = req.user.id;

        if (!['complete', 'cancel'].includes(action)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid action. Must be "complete" or "cancel"'
            });
        }

        // Get redemption details
        const [redemptions] = await db.query(`
            SELECT * FROM loyalty_reward_redemptions WHERE id = ?
        `, [redemptionId]);

        if (redemptions.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Redemption not found'
            });
        }

        const redemption = redemptions[0];

        // Check if redemption is still pending
        if (redemption.status !== 'pending') {
            return res.status(400).json({
                success: false,
                error: 'Redemption is not pending'
            });
        }

        // Check if redemption has expired
        if (new Date(redemption.expires_at) < new Date()) {
            // Auto-expire the redemption
            await db.query(`
                UPDATE loyalty_reward_redemptions 
                SET status = 'expired', staff_id = ? 
                WHERE id = ?
            `, [staffId, redemptionId]);

            return res.status(400).json({
                success: false,
                error: 'Redemption has expired'
            });
        }

        const newStatus = action === 'complete' ? 'completed' : 'cancelled';

        // Update redemption status
        await db.query(`
            UPDATE loyalty_reward_redemptions 
            SET status = ?, staff_id = ?, processed_at = NOW() 
            WHERE id = ?
        `, [newStatus, staffId, redemptionId]);

        // If cancelled, refund the points
        if (action === 'cancel') {
            await db.query(`
                UPDATE customers 
                SET loyalty_points = loyalty_points + ? 
                WHERE id = ?
            `, [redemption.points_redeemed, redemption.customer_id]);

            // Record refund transaction
            await db.query(`
                INSERT INTO loyalty_transactions 
                (customer_id, points_earned, transaction_type, description, redemption_id) 
                VALUES (?, ?, 'refund', ?, ?)
            `, [
                redemption.customer_id,
                redemption.points_redeemed,
                `Refunded ${redemption.points_redeemed} points for cancelled reward redemption`,
                redemptionId
            ]);
        }

        res.json({
            success: true,
            message: `Redemption ${action === 'complete' ? 'completed' : 'cancelled'} successfully`
        });
    } catch (error) {
        console.error('Error processing redemption:', error);
        res.status(500).json({ success: false, error: 'Failed to process redemption' });
    }
});

// Compatibility aliases for staff reward processing UI
router.get('/staff/reward-redemptions/search/:claimCode', async(req, res) => {
    // Delegate to the same logic as staff search
    req.params.claimCode = req.params.claimCode;
    try {
        const isStaff = (req.session && req.session.staffUser);
        const isAdmin = (req.session && (req.session.adminUser || req.session.admin));
        if (!isStaff && !isAdmin) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }
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
        console.error('Alias staff search error:', err);
        return res.status(500).json({ success: false, error: 'Failed to search redemption' });
    }
});

router.get('/staff/reward-redemptions/pending', async(req, res) => {
    try {
        const isStaff = (req.session && req.session.staffUser);
        const isAdmin = (req.session && (req.session.adminUser || req.session.admin));
        if (!isStaff && !isAdmin) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }
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
        console.error('Alias staff pending error:', err);
        return res.status(500).json({ success: false, error: 'Failed to fetch pending redemptions' });
    }
});

router.post('/staff/reward-redemptions/:redemptionId/:action', async(req, res) => {
    try {
        const isStaff = (req.session && req.session.staffUser);
        const isAdmin = (req.session && (req.session.adminUser || req.session.admin));
        if (!isStaff && !isAdmin) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }
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
        await db.query(`
            UPDATE loyalty_reward_redemptions 
            SET status = ?, staff_id = ?, processed_at = NOW() 
            WHERE id = ?
        `, [action === 'complete' ? 'completed' : 'cancelled', staffId, redemptionId]);
        if (action === 'cancel') {
            await db.query('UPDATE customers SET loyalty_points = loyalty_points + ? WHERE id = ?', [redemption.points_redeemed, redemption.customer_id]);
            await db.query(`
                INSERT INTO loyalty_transactions 
                (customer_id, points_earned, transaction_type, description, redemption_id) 
                VALUES (?, ?, 'refund', ?, ?)
            `, [redemption.customer_id, redemption.points_redeemed, `Refunded ${redemption.points_redeemed} points for cancelled reward redemption`, redemptionId]);
        }
        return res.json({ success: true });
    } catch (err) {
        console.error('Alias staff process error:', err);
        return res.status(500).json({ success: false, error: 'Failed to process redemption' });
    }
});

module.exports = router;