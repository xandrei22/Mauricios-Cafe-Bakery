const eventModel = require('../models/eventModel');
const emailService = require('../utils/emailService'); // For notification (optional)
const notificationService = require('../services/notificationService');

// Customer: Create event
async function createEvent(req, res) {
    try {
        const { customer_id, customer_name, contact_number, event_date, address, event_type, notes, cups } = req.body;

        // Add debugging logs
        console.log('Event submission received:', {
            customer_id,
            customer_name,
            contact_number,
            event_date,
            address,
            event_type,
            notes,
            cups
        });

        if (!customer_name || !contact_number || !event_date || !address || !event_type || !cups) {
            console.log('Validation failed - missing required fields');
            return res.status(400).json({ success: false, message: 'All required fields are required.' });
        }

        console.log('Creating event in database...');
        const eventId = await eventModel.createEvent({ customer_id, customer_name, contact_number, event_date, address, event_type, notes, cups });
        console.log('Event created successfully with ID:', eventId);

        // Create notification for new event request
        try {
            await notificationService.notifyEventRequest({
                id: eventId,
                event_date: event_date,
                cups: cups,
                customer_name: customer_name,
                contact_number: contact_number
            });
        } catch (notificationError) {
            console.error('Failed to create event request notification:', notificationError);
        }

        // Emit real-time update for new event
        const io = req.app.get('io');
        if (io) {
            io.to('admin-room').emit('event-updated', {
                type: 'event_created',
                eventId,
                customer_name,
                event_type,
                event_date,
                cups,
                timestamp: new Date()
            });
            io.emit('event-updated', {
                type: 'event_created',
                eventId,
                customer_name,
                event_type,
                event_date,
                cups,
                timestamp: new Date()
            });
        }

        res.status(201).json({ success: true, eventId });
    } catch (err) {
        console.error('Error creating event:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
}

// Admin: Get all events
async function getAllEvents(req, res) {
    try {
        const events = await eventModel.getAllEvents();
        res.json({ success: true, events });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
}

// Customer: Get events by customer_id
async function getEventsByCustomer(req, res) {
    try {
        const { customer_id } = req.params;
        const events = await eventModel.getEventsByCustomer(customer_id);
        res.json({ success: true, events });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
}

// Admin: Accept event
async function acceptEvent(req, res) {
    try {
        const { id } = req.params;
        const updated = await eventModel.updateEventStatus(id, 'accepted');
        if (!updated) return res.status(404).json({ success: false, message: 'Event not found.' });
        // Fetch event and customer email
        const event = await eventModel.getEventById(id);
        let customerEmail = null;
        if (event.customer_id) {
            // Fetch from customers table
            const pool = require('../config/db');
            const [rows] = await pool.query('SELECT email FROM customers WHERE id = ?', [event.customer_id]);
            if (rows.length > 0) customerEmail = rows[0].email;
        }
        // If not found, try to use event.customer_name as email (if you store it)
        if (!customerEmail && event.customer_name && event.customer_name.includes('@')) {
            customerEmail = event.customer_name;
        }
        if (customerEmail) {
            await emailService.sendEventStatusEmail(customerEmail, 'accepted', event);
        }

        // Emit real-time update for event acceptance
        const io = req.app.get('io');
        if (io) {
            io.to('admin-room').emit('event-updated', {
                type: 'event_accepted',
                eventId: id,
                customer_name: event.customer_name,
                event_type: event.event_type,
                timestamp: new Date()
            });
            io.emit('event-updated', {
                type: 'event_accepted',
                eventId: id,
                customer_name: event.customer_name,
                event_type: event.event_type,
                timestamp: new Date()
            });
        }

        res.json({ success: true, message: 'Event accepted. Customer notified.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
}

// Admin: Reject event
async function rejectEvent(req, res) {
    try {
        const { id } = req.params;
        const updated = await eventModel.updateEventStatus(id, 'rejected');
        if (!updated) return res.status(404).json({ success: false, message: 'Event not found.' });
        // Fetch event and customer email
        const event = await eventModel.getEventById(id);
        let customerEmail = null;
        if (event.customer_id) {
            // Fetch from customers table
            const pool = require('../config/db');
            const [rows] = await pool.query('SELECT email FROM customers WHERE id = ?', [event.customer_id]);
            if (rows.length > 0) customerEmail = rows[0].email;
        }
        // If not found, try to use event.customer_name as email (if you store it)
        if (!customerEmail && event.customer_name && event.customer_name.includes('@')) {
            customerEmail = event.customer_name;
        }
        if (customerEmail) {
            await emailService.sendEventStatusEmail(customerEmail, 'rejected', event);
        }

        // Emit real-time update for event rejection
        const io = req.app.get('io');
        if (io) {
            io.to('admin-room').emit('event-updated', {
                type: 'event_rejected',
                eventId: id,
                customer_name: event.customer_name,
                event_type: event.event_type,
                timestamp: new Date()
            });
            io.emit('event-updated', {
                type: 'event_rejected',
                eventId: id,
                customer_name: event.customer_name,
                event_type: event.event_type,
                timestamp: new Date()
            });
        }

        res.json({ success: true, message: 'Event rejected. Customer notified.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
}

module.exports = {
    createEvent,
    getAllEvents,
    getEventsByCustomer,
    acceptEvent,
    rejectEvent,
};