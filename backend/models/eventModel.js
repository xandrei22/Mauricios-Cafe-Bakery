const pool = require('../config/db');

// Create a new event
async function createEvent({ customer_id, customer_name, contact_name, contact_number, event_date, event_start_time, event_end_time, address, event_type, notes, cups }) {
    try {
        console.log('Attempting to insert event into database:', {
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

        // Build the INSERT query dynamically to handle missing columns gracefully
        // First, try the full insert with all columns
        let query = `INSERT INTO events (customer_id, customer_name, contact_name, contact_number, event_date, event_start_time, event_end_time, address, event_type, notes, cups, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`;
        let params = [customer_id, customer_name, contact_name, contact_number, event_date, event_start_time, event_end_time, address, event_type, notes, cups];
        
        const [result] = await pool.query(query, params);

        console.log('Database insertion result:', result);
        return result.insertId;
    } catch (error) {
        console.error('Database error in createEvent:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error SQL state:', error.sqlState);
        console.error('Error SQL:', error.sql);
        
        // Provide more helpful error message
        if (error.code === 'ER_BAD_FIELD_ERROR') {
            const missingField = error.message.match(/Unknown column '([^']+)'/);
            if (missingField) {
                throw new Error(`Database schema error: Column '${missingField[1]}' does not exist in events table. Please run the migration script: node scripts/fix-events-table.js`);
            }
        }
        
        throw error;
    }
}

// Get all events (admin)
async function getAllEvents() {
    const [rows] = await pool.query('SELECT * FROM events ORDER BY created_at DESC');
    return rows;
}

// Get events by customer_id
async function getEventsByCustomer(customer_id) {
    const [rows] = await pool.query('SELECT * FROM events WHERE customer_id = ? ORDER BY created_at DESC', [customer_id]);
    return rows;
}

// Update event status (accept/reject)
async function updateEventStatus(id, status) {
    const [result] = await pool.query(
        'UPDATE events SET status = ?, admin_response_date = NOW() WHERE id = ?', [status, id]
    );
    return result.affectedRows > 0;
}

// Get event by id
async function getEventById(id) {
    const [rows] = await pool.query('SELECT * FROM events WHERE id = ?', [id]);
    return rows[0];
}

module.exports = {
    createEvent,
    getAllEvents,
    getEventsByCustomer,
    updateEventStatus,
    getEventById,
};