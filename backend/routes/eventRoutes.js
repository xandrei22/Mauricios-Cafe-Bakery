const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { authenticateJWT } = require('../middleware/jwtAuth');

// Customer: Create event (requires authentication)
router.post('/events', authenticateJWT, eventController.createEvent);

// Admin: Get all events (requires authentication)
router.get('/events/admin', authenticateJWT, eventController.getAllEvents);

// Customer: Get events by customer_id (requires authentication)
router.get('/events/customer/:customer_id', authenticateJWT, eventController.getEventsByCustomer);

// Admin: Accept event (requires authentication)
router.post('/events/:id/accept', authenticateJWT, eventController.acceptEvent);

// Admin: Reject event (requires authentication)
router.post('/events/:id/reject', authenticateJWT, eventController.rejectEvent);

module.exports = router;