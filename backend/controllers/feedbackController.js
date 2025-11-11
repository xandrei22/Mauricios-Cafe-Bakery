const pool = require('../config/db');
// Profanity filtering using naughty-words (en + es) and a small custom list
let BAD_WORDS = [];
try {
    const naughty = require('naughty-words');
    const en = (naughty && (naughty.en || naughty.english)) || [];
    const es = (naughty && (naughty.es || naughty.spanish)) || [];
    // Fallback to direct JSONs if needed
    const fallbackEn = (() => { try { return require('naughty-words/en.json'); } catch { return []; } })();
    const fallbackEs = (() => { try { return require('naughty-words/es.json'); } catch { return []; } })();
    // Custom local words to cover Tagalog/common colloquialisms
    const custom = ['puta', 'putangina', 'gago', 'ulol', 'punyeta'];
    BAD_WORDS = [...new Set([...(en || []), ...(es || []), ...fallbackEn, ...fallbackEs, ...custom])]
        .filter(Boolean)
        .map((w) => String(w).trim())
        .filter((w) => w.length > 0);
} catch (e) {
    // As a last resort, at least include our custom list
    BAD_WORDS = ['puta', 'putangina', 'gago', 'ulol', 'punyeta'];
}

const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PROFANITY_REGEXES = BAD_WORDS
    .filter(Boolean)
    .map((word) => new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i'));

const containsProfanity = (text) => {
    if (!text || typeof text !== 'string' || PROFANITY_REGEXES.length === 0) return false;
    return PROFANITY_REGEXES.some((regex) => regex.test(text));
};

// Submit new feedback
const submitFeedback = async(req, res) => {
    const { customer_name, rating, comment, category, customer_email, order_id } = req.body;
    if (!customer_name || !rating) {
        return res.status(400).json({ message: 'Customer name and rating are required.' });
    }

    const trimmedName = typeof customer_name === 'string' ? customer_name.trim() : customer_name;
    const trimmedComment = typeof comment === 'string' ? comment.trim() : comment;
    const trimmedCategory = typeof category === 'string' ? category.trim() : category;

    const finalCategory = trimmedCategory || 'General';
    const finalComment = trimmedComment || null;

    if (containsProfanity(trimmedName) || containsProfanity(finalComment) || containsProfanity(finalCategory)) {
        return res.status(400).json({
            message: 'Feedback contains inappropriate language. Please remove it and try again.'
        });
    }

    // Check if customer has placed any orders
    if (customer_email) {
        try {
            const [orderCheck] = await pool.query(
                'SELECT COUNT(*) as orderCount FROM orders WHERE customer_id IN (SELECT id FROM customers WHERE email = ?)', [customer_email]
            );

            if (orderCheck[0].orderCount === 0) {
                return res.status(403).json({
                    message: 'You must place at least one order before leaving feedback.',
                    hasOrders: false
                });
            }
        } catch (error) {
            console.error('Error checking customer orders:', error);
            return res.status(500).json({ message: 'Error verifying customer orders.' });
        }
    }

    // Check if feedback already exists for this order (if order_id is provided)
    if (order_id && customer_email) {
        try {
            const [existingFeedback] = await pool.query(
                'SELECT COUNT(*) as feedbackCount FROM feedback WHERE customer_email = ? AND order_id = ?', [customer_email, order_id]
            );

            if (existingFeedback[0].feedbackCount > 0) {
                return res.status(409).json({
                    message: 'You have already submitted feedback for this order.',
                    hasFeedback: true
                });
            }
        } catch (error) {
            console.error('Error checking existing feedback:', error);
            return res.status(500).json({ message: 'Error checking existing feedback.' });
        }
    }

    try {
        const [result] = await pool.query(
            'INSERT INTO feedback (customer_name, rating, comment, category, customer_email, order_id) VALUES (?, ?, ?, ?, ?, ?)', [trimmedName, rating, finalComment, finalCategory, customer_email, order_id]
        );

        // Emit real-time update for feedback submission
        const io = req.app.get('io');
        if (io) {
            io.to('admin-room').emit('feedback-updated', {
                type: 'feedback_submitted',
                feedbackId: result.insertId,
                customer_name: trimmedName,
                rating,
                category: finalCategory,
                timestamp: new Date()
            });
            io.emit('feedback-updated', {
                type: 'feedback_submitted',
                feedbackId: result.insertId,
                customer_name: trimmedName,
                rating,
                category: finalCategory,
                timestamp: new Date()
            });
        }

        res.status(201).json({ message: 'Feedback submitted successfully', feedbackId: result.insertId });
    } catch (error) {
        console.error('Error submitting feedback:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get all feedback
const getAllFeedback = async(req, res) => {
    try {
        const [feedback] = await pool.query('SELECT * FROM feedback ORDER BY feedback_time DESC');
        res.status(200).json(feedback);
    } catch (error) {
        console.error('Error fetching feedback:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get feedback metrics (average rating, total reviews, satisfied customers)
const getFeedbackMetrics = async(req, res) => {
    try {
        // Total reviews
        const [totalReviewsResult] = await pool.query('SELECT COUNT(*) AS totalReviews FROM feedback');
        const totalReviews = totalReviewsResult[0].totalReviews || 0;

        // Average rating
        const [averageRatingResult] = await pool.query('SELECT AVG(rating) AS averageRating FROM feedback');
        const averageRating = parseFloat(averageRatingResult[0].averageRating || 0).toFixed(1);

        // Satisfied customers (e.g., 4 or 5 stars)
        const [satisfiedCustomersResult] = await pool.query('SELECT COUNT(*) AS satisfiedCustomers FROM feedback WHERE rating >= 4');
        const satisfiedCustomers = totalReviews > 0 ? ((satisfiedCustomersResult[0].satisfiedCustomers || 0) / totalReviews * 100).toFixed(0) : 0;

        // Rating distribution
        const [ratingDistributionResult] = await pool.query(`
            SELECT 
                rating,
                COUNT(*) as count
            FROM feedback 
            GROUP BY rating 
            ORDER BY rating DESC
        `);

        const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        ratingDistributionResult.forEach(row => {
            ratingDistribution[row.rating] = row.count;
        });

        res.status(200).json({
            totalReviews,
            averageRating,
            satisfiedCustomers: `${satisfiedCustomers}%`,
            ratingDistribution
        });
    } catch (error) {
        console.error('Error fetching feedback metrics:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Delete feedback by id (admin only)
const deleteFeedback = async(req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM feedback WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Feedback not found' });
        }

        // Emit real-time update for feedback deletion
        const io = req.app.get('io');
        if (io) {
            io.to('admin-room').emit('feedback-updated', {
                type: 'feedback_deleted',
                feedbackId: id,
                timestamp: new Date()
            });
            io.emit('feedback-updated', {
                type: 'feedback_deleted',
                feedbackId: id,
                timestamp: new Date()
            });
        }

        res.status(200).json({ message: 'Feedback deleted successfully' });
    } catch (error) {
        console.error('Error deleting feedback:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    submitFeedback,
    getAllFeedback,
    getFeedbackMetrics,
    deleteFeedback,
};