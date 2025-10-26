const express = require('express');
const { submitFeedback, getAllFeedback, getFeedbackMetrics, deleteFeedback } = require('../controllers/feedbackController');
const { ensureAdminAuthenticated } = require('../middleware/adminAuthMiddleware');
const pool = require('../config/db');
const router = express.Router();

// Route for submitting feedback
router.post('/feedback', submitFeedback);

// Route for getting all feedback (admin only, if applicable)
router.get('/feedback', getAllFeedback);

// Route for getting feedback metrics (admin only, if applicable)
router.get('/feedback/metrics', getFeedbackMetrics);

// Route for deleting feedback (admin only)
router.delete('/feedback/:id', ensureAdminAuthenticated, deleteFeedback);

// Route for checking if customer has orders and has submitted feedback
router.get('/feedback/check-orders', async(req, res) => {
    try {
        const { customer_email } = req.query;

        if (!customer_email) {
            return res.status(400).json({ message: 'Customer email is required.' });
        }

        // Check if customer has orders
        const [orderCheck] = await pool.query(
            'SELECT COUNT(*) as orderCount FROM orders WHERE customer_id IN (SELECT id FROM customers WHERE email = ?)', [customer_email]
        );

        // Check if customer has already submitted feedback
        const [feedbackCheck] = await pool.query(
            'SELECT COUNT(*) as feedbackCount FROM feedback WHERE customer_email = ?', [customer_email]
        );

        res.json({
            hasOrders: orderCheck[0].orderCount > 0,
            orderCount: orderCheck[0].orderCount,
            hasSubmittedFeedback: feedbackCheck[0].feedbackCount > 0,
            feedbackCount: feedbackCheck[0].feedbackCount
        });
    } catch (error) {
        console.error('Error checking customer orders:', error);
        res.status(500).json({ message: 'Error checking customer orders.' });
    }
});

// Route for checking if feedback exists for a specific order
router.get('/feedback/check-order', async(req, res) => {
    try {
        const { order_id, customer_email } = req.query;

        if (!order_id || !customer_email) {
            return res.status(400).json({ message: 'Order ID and customer email are required.' });
        }

        // Check if customer has already submitted feedback for this specific order
        const [feedbackCheck] = await pool.query(
            'SELECT COUNT(*) as feedbackCount FROM feedback WHERE customer_email = ? AND order_id = ?', [customer_email, order_id]
        );

        res.json({
            hasFeedback: feedbackCheck[0].feedbackCount > 0,
            feedbackCount: feedbackCheck[0].feedbackCount
        });
    } catch (error) {
        console.error('Error checking order feedback:', error);
        res.status(500).json({ message: 'Error checking order feedback.' });
    }
});

module.exports = router;