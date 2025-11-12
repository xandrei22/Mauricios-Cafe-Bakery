const eventModel = require('../models/eventModel');
const emailService = require('../utils/emailService'); // For notification (optional)
const notificationService = require('../services/notificationService');

// Customer: Create event
async function createEvent(req, res) {
    try {
        console.log('📥 Event creation request received');
        console.log('📥 Request body:', JSON.stringify(req.body, null, 2));
        console.log('📥 Request headers:', req.headers);
        
        const { 
            customer_id, 
            customer_name, 
            contact_name,
            contact_number, 
            event_date, 
            event_start_time,
            event_end_time,
            address, 
            event_type, 
            notes, 
            cups 
        } = req.body;

        // Add debugging logs
        console.log('📋 Extracted event data:', {
            customer_id,
            customer_name,
            contact_name,
            contact_number,
            event_date,
            event_start_time,
            event_end_time,
            address,
            event_type,
            notes,
            cups
        });

        // Validate required fields
        if (!customer_name) {
            console.log('❌ Validation failed - missing customer_name');
            return res.status(400).json({ success: false, message: 'Customer name is required.' });
        }
        if (!contact_number) {
            console.log('❌ Validation failed - missing contact_number');
            return res.status(400).json({ success: false, message: 'Contact number is required.' });
        }
        if (!event_date) {
            console.log('❌ Validation failed - missing event_date');
            return res.status(400).json({ success: false, message: 'Event date is required.' });
        }
        if (!event_start_time) {
            console.log('❌ Validation failed - missing event_start_time');
            return res.status(400).json({ success: false, message: 'Event start time is required.' });
        }
        if (!event_end_time) {
            console.log('❌ Validation failed - missing event_end_time');
            return res.status(400).json({ success: false, message: 'Event end time is required.' });
        }
        // Validate that end time is after start time
        if (event_end_time <= event_start_time) {
            console.log('❌ Validation failed - end time must be after start time');
            return res.status(400).json({ success: false, message: 'Event end time must be after start time.' });
        }
        if (!address) {
            console.log('❌ Validation failed - missing address');
            return res.status(400).json({ success: false, message: 'Address is required.' });
        }
        if (!event_type) {
            console.log('❌ Validation failed - missing event_type');
            return res.status(400).json({ success: false, message: 'Event type is required.' });
        }
        // Validate cups - must be at least 80
        const cupsNum = Number(cups);
        if (!cups || isNaN(cupsNum) || cupsNum < 80) {
            console.log('❌ Validation failed - invalid cups:', cups);
            return res.status(400).json({ success: false, message: 'Minimum order is 80 cups. Please enter a valid number.' });
        }
        
        // Validate and clean contact number format (Philippine mobile format)
        const cleanedContactNumber = String(contact_number || '').replace(/[\s\-\(\)\+]/g, '');
        console.log('🔍 Contact number validation:', {
            original: contact_number,
            cleaned: cleanedContactNumber,
            length: cleanedContactNumber.length
        });
        
        // Must be 11 digits starting with 09 or 0
        if (cleanedContactNumber.length !== 11) {
            console.log('❌ Validation failed - contact number length:', cleanedContactNumber.length, 'Expected: 11');
            return res.status(400).json({ 
                success: false, 
                message: `Contact number must be 11 digits. You entered ${cleanedContactNumber.length} digits. Please use format: 09XXXXXXXXX or 0XXXXXXXXXX.` 
            });
        }
        
        const phMobileRegex = /^(09|0)\d{9}$/; // 11 digits: 09XXXXXXXXX or 0XXXXXXXXXX
        if (!phMobileRegex.test(cleanedContactNumber)) {
            console.log('❌ Validation failed - invalid contact number format:', contact_number, 'Cleaned:', cleanedContactNumber);
            return res.status(400).json({ 
                success: false, 
                message: 'Please enter a valid Philippine mobile number starting with 09 or 0 (11 digits total). Example: 09123456789 or 09214733335.' 
            });
        }

        console.log('✅ Validation passed, creating event in database...');
        console.log('📝 Using cleaned contact number:', cleanedContactNumber);
        
        let eventId;
        try {
            eventId = await eventModel.createEvent({ 
                customer_id, 
                customer_name, 
                contact_name,
                contact_number: cleanedContactNumber, // Use cleaned contact number
                event_date, 
                event_start_time,
                event_end_time,
                address, 
                event_type, 
                notes, 
                cups: cupsNum // Ensure it's a number
            });
            console.log('✅ Event created successfully with ID:', eventId);
        } catch (dbError) {
            console.error('❌ Database error creating event:', dbError);
            console.error('❌ Database error stack:', dbError.stack);
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to create event. Please try again later.',
                error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
            });
        }

        // Create notification for new event request (don't fail if notification fails)
        try {
            console.log('📢 Creating notification for event request:', eventId);
            await notificationService.notifyEventRequest({
                id: eventId,
                event_date: event_date,
                cups: cupsNum,
                customer_name: customer_name,
                contact_number: cleanedContactNumber
            });
            console.log('✅ Notification created successfully');
        } catch (notificationError) {
            console.error('⚠️ Failed to create event request notification (non-critical):', notificationError);
            // Don't fail the request if notification fails - event is already created
        }

        // Emit real-time update for new event
        const io = req.app.get('io');
        if (io) {
            console.log('📡 Emitting Socket.IO events for new event:', eventId);
            
            const eventData = {
                type: 'event_created',
                eventId,
                customer_name,
                event_type,
                event_date,
                cups: cupsNum,
                timestamp: new Date().toISOString()
            };
            
            // Notify admin room specifically (most important)
            console.log('📡 Emitting to admin-room...');
            io.to('admin-room').emit('event-updated', eventData);
            
            // Also emit new-notification event for admins (for notification system)
            const notificationData = {
                notification_type: 'event_request',
                title: 'New Event Request',
                message: `New event request for ${event_date} - ${cupsNum} cups from ${customer_name}`,
                priority: 'high',
                eventId: eventId,
                timestamp: new Date().toISOString()
            };
            console.log('📡 Emitting new-notification to admin-room...');
            io.to('admin-room').emit('new-notification', notificationData);
            
            // Broadcast to all (for admin dashboard updates)
            console.log('📡 Broadcasting event-updated to all clients...');
            io.emit('event-updated', eventData);
            
            console.log('✅ All Socket.IO events emitted successfully');
        } else {
            console.error('❌ Socket.IO instance not available - notifications may not be delivered in real-time');
        }

        console.log('✅ Sending success response to client. Event ID:', eventId);
        res.status(201).json({ 
            success: true, 
            eventId: eventId,
            message: 'Event request submitted successfully. Admin has been notified.' 
        });
    } catch (err) {
        console.error('❌ Error creating event:', err);
        console.error('❌ Error stack:', err.stack);
        res.status(500).json({ 
            success: false, 
            message: 'Server error. Please try again later.',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
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

        // Create notification for customer
        if (event.customer_id) {
            try {
                await notificationService.notifyEventStatusUpdate({
                    eventId: id,
                    customerId: event.customer_id,
                    status: 'accepted',
                    eventDate: event.event_date,
                    eventType: event.event_type,
                    customerName: event.customer_name
                });
            } catch (notificationError) {
                console.error('Failed to create event acceptance notification:', notificationError);
            }
        }

        // Emit real-time update for event acceptance
        const io = req.app.get('io');
        if (io) {
            // Notify admin room
            io.to('admin-room').emit('event-updated', {
                type: 'event_accepted',
                eventId: id,
                customer_name: event.customer_name,
                event_type: event.event_type,
                timestamp: new Date()
            });
            // Notify customer if they have a socket connection (using email)
            if (customerEmail) {
                io.to(`customer-${customerEmail}`).emit('event-updated', {
                    type: 'event_accepted',
                    eventId: id,
                    customer_name: event.customer_name,
                    event_type: event.event_type,
                    timestamp: new Date()
                });
            }
            // Broadcast to all (for admin dashboard updates)
            io.emit('event-updated', {
                type: 'event_accepted',
                eventId: id,
                customer_name: event.customer_name,
                event_type: event.event_type,
                timestamp: new Date()
            });
            // Emit new notification event for customer (broadcast, will be filtered by user_id on frontend)
            if (event.customer_id) {
                io.emit('new-notification', {
                    user_id: event.customer_id,
                    user_type: 'customer',
                    notification_type: 'event_request',
                    title: 'Event Request Accepted',
                    message: `Your event request for ${event.event_date} has been accepted! You will be contacted for further details.`
                });
            }
        }

        res.json({ success: true, message: 'Event accepted. Customer notified.' });
    } catch (err) {
        console.error('Error accepting event:', err);
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

        // Create notification for customer
        if (event.customer_id) {
            try {
                await notificationService.notifyEventStatusUpdate({
                    eventId: id,
                    customerId: event.customer_id,
                    status: 'rejected',
                    eventDate: event.event_date,
                    eventType: event.event_type,
                    customerName: event.customer_name
                });
            } catch (notificationError) {
                console.error('Failed to create event rejection notification:', notificationError);
            }
        }

        // Emit real-time update for event rejection
        const io = req.app.get('io');
        if (io) {
            // Notify admin room
            io.to('admin-room').emit('event-updated', {
                type: 'event_rejected',
                eventId: id,
                customer_name: event.customer_name,
                event_type: event.event_type,
                timestamp: new Date()
            });
            // Notify customer if they have a socket connection (using email)
            if (customerEmail) {
                io.to(`customer-${customerEmail}`).emit('event-updated', {
                    type: 'event_rejected',
                    eventId: id,
                    customer_name: event.customer_name,
                    event_type: event.event_type,
                    timestamp: new Date()
                });
            }
            // Broadcast to all (for admin dashboard updates)
            io.emit('event-updated', {
                type: 'event_rejected',
                eventId: id,
                customer_name: event.customer_name,
                event_type: event.event_type,
                timestamp: new Date()
            });
            // Emit new notification event for customer (broadcast, will be filtered by user_id on frontend)
            if (event.customer_id) {
                io.emit('new-notification', {
                    user_id: event.customer_id,
                    user_type: 'customer',
                    notification_type: 'event_request',
                    title: 'Event Request Rejected',
                    message: `Your event request for ${event.event_date} has been rejected. Please contact us for more information.`
                });
            }
        }

        res.json({ success: true, message: 'Event rejected. Customer notified.' });
    } catch (err) {
        console.error('Error rejecting event:', err);
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