const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');

// Customer: Create event
router.post('/events', eventController.createEvent);

// Admin: Get all events
router.get('/events/admin', eventController.getAllEvents);

// Customer: Get events by customer_id
router.get('/events/customer/:customer_id', eventController.getEventsByCustomer);

// Admin: Accept event
router.post('/events/:id/accept', eventController.acceptEvent);

// Admin: Reject event
router.post('/events/:id/reject', eventController.rejectEvent);

module.exports = router;