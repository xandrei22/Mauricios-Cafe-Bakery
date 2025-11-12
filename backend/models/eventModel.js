const pool = require('../config/db');

// Cache for column check
let columnCache = null;

/**
 * Check which columns exist in the events table
 */
async function getEventTableColumns() {
    if (columnCache) {
        return columnCache;
    }
    
    try {
        const [columns] = await pool.query('DESCRIBE events');
        columnCache = columns.map(c => c.Field.toLowerCase());
        return columnCache;
    } catch (error) {
        console.error('Error checking events table columns:', error);
        // Return empty array if table doesn't exist
        return [];
    }
}

/**
 * Ensure required columns exist, run migration if needed
 */
async function ensureEventColumns() {
    const columns = await getEventTableColumns();
    const requiredColumns = [
        'customer_id', 'customer_name', 'contact_name', 'contact_number',
        'event_start_time', 'event_end_time', 'address', 'event_type', 'notes', 'cups'
    ];
    
    const missingColumns = requiredColumns.filter(col => !columns.includes(col.toLowerCase()));
    
    if (missingColumns.length > 0) {
        console.log('⚠️ Missing columns detected, running migration...');
        try {
            // Try to run the migration automatically
            const ensureSchema = require('../scripts/ensureEventsTableSchema');
            await ensureSchema();
            // Clear cache to force re-check
            columnCache = null;
            // Re-check columns
            const newColumns = await getEventTableColumns();
            const stillMissing = requiredColumns.filter(col => !newColumns.includes(col.toLowerCase()));
            if (stillMissing.length > 0) {
                throw new Error(`Migration failed. Missing columns: ${stillMissing.join(', ')}`);
            }
            console.log('✅ Migration completed successfully');
        } catch (migrationError) {
            console.error('❌ Automatic migration failed:', migrationError);
            throw new Error(`Database schema error: Missing columns (${missingColumns.join(', ')}). Please run: node scripts/fix-events-table.js`);
        }
    }
}

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

        // Ensure required columns exist before inserting
        await ensureEventColumns();
        
        // Build the INSERT query with all required columns
        const query = `INSERT INTO events (customer_id, customer_name, contact_name, contact_number, event_date, event_start_time, event_end_time, address, event_type, notes, cups, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`;
        const params = [customer_id, customer_name, contact_name, contact_number, event_date, event_start_time, event_end_time, address, event_type, notes, cups];
        
        const [result] = await pool.query(query, params);

        console.log('✅ Database insertion successful. Event ID:', result.insertId);
        return result.insertId;
    } catch (error) {
        console.error('❌ Database error in createEvent:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error SQL state:', error.sqlState);
        
        // Provide more helpful error message
        if (error.code === 'ER_BAD_FIELD_ERROR') {
            const missingField = error.message.match(/Unknown column '([^']+)'/);
            if (missingField) {
                throw new Error(`Database schema error: Column '${missingField[1]}' does not exist. The automatic migration may have failed. Please run: node scripts/fix-events-table.js`);
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