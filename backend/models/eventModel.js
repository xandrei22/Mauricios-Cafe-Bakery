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
        console.log('📋 Events table columns found:', columnCache.length, 'columns');
        return columnCache;
    } catch (error) {
        console.error('❌ Error checking events table columns:', error.message);
        console.error('❌ Error code:', error.code);
        // If table doesn't exist, return empty array
        if (error.code === 'ER_NO_SUCH_TABLE') {
            console.error('❌ Events table does not exist!');
            return [];
        }
        // Return empty array to trigger migration
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
        console.log('📋 Missing columns:', missingColumns.join(', '));
        try {
            // Try to run the migration automatically
            const ensureSchema = require('../scripts/ensureEventsTableSchema');
            const migrationSuccess = await ensureSchema();
            
            if (!migrationSuccess) {
                throw new Error('Migration function returned false');
            }
            
            // Clear cache to force re-check
            columnCache = null;
            
            // Wait a bit for database to update
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Re-check columns
            const newColumns = await getEventTableColumns();
            const stillMissing = requiredColumns.filter(col => !newColumns.includes(col.toLowerCase()));
            if (stillMissing.length > 0) {
                console.error('❌ Still missing columns after migration:', stillMissing);
                throw new Error(`Migration failed. Missing columns: ${stillMissing.join(', ')}`);
            }
            console.log('✅ Migration completed successfully');
        } catch (migrationError) {
            console.error('❌ Automatic migration failed:', migrationError);
            console.error('❌ Migration error details:', migrationError.message);
            // Try one more time with direct SQL
            try {
                console.log('🔄 Attempting direct SQL migration...');
                const connection = await pool.getConnection();
                for (const colName of missingColumns) {
                    const colDef = {
                        'customer_id': 'INT NULL',
                        'customer_name': 'VARCHAR(255) NULL',
                        'contact_name': 'VARCHAR(255) NULL',
                        'contact_number': 'VARCHAR(20) NULL',
                        'event_start_time': 'TIME NULL',
                        'event_end_time': 'TIME NULL',
                        'address': 'TEXT NULL',
                        'event_type': 'VARCHAR(100) NULL',
                        'notes': 'TEXT NULL',
                        'cups': 'INT NULL'
                    }[colName];
                    
                    if (colDef) {
                        try {
                            await connection.query(`ALTER TABLE events ADD COLUMN ${colName} ${colDef}`);
                            console.log(`✅ Direct SQL: Added column ${colName}`);
                        } catch (err) {
                            if (err.code !== 'ER_DUP_FIELDNAME') {
                                throw err;
                            }
                        }
                    }
                }
                connection.release();
                columnCache = null;
                console.log('✅ Direct SQL migration completed');
            } catch (directError) {
                console.error('❌ Direct SQL migration also failed:', directError);
                throw new Error(`Database schema error: Missing columns (${missingColumns.join(', ')}). Please run: node scripts/fix-events-table.js`);
            }
        }
    }
}

// Create a new event
async function createEvent({ customer_id, customer_name, contact_name, contact_number, event_date, event_start_time, event_end_time, address, event_type, notes, cups }) {
    try {
        console.log('📝 [eventModel] Attempting to insert event into database');
        console.log('📝 [eventModel] Event data:', {
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
        console.log('🔍 [eventModel] Checking/ensuring event columns...');
        await ensureEventColumns();
        console.log('✅ [eventModel] Column check complete');
        
        // Build the INSERT query with all required columns
        const query = `INSERT INTO events (customer_id, customer_name, contact_name, contact_number, event_date, event_start_time, event_end_time, address, event_type, notes, cups, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`;
        const params = [customer_id, customer_name, contact_name, contact_number, event_date, event_start_time, event_end_time, address, event_type, notes || null, cups];
        
        console.log('📤 [eventModel] Executing INSERT query...');
        const [result] = await pool.query(query, params);

        console.log('✅ [eventModel] Database insertion successful. Event ID:', result.insertId);
        return result.insertId;
    } catch (error) {
        console.error('❌ [eventModel] Database error in createEvent:');
        console.error('   Error code:', error.code);
        console.error('   Error message:', error.message);
        console.error('   Error SQL state:', error.sqlState);
        console.error('   Full error:', error);
        
        // Provide more helpful error message
        if (error.code === 'ER_BAD_FIELD_ERROR') {
            const missingField = error.message.match(/Unknown column '([^']+)'/);
            if (missingField) {
                const errorMsg = `Database schema error: Column '${missingField[1]}' does not exist. The automatic migration may have failed.`;
                console.error('❌', errorMsg);
                throw new Error(errorMsg);
            }
        }
        
        // Re-throw with more context
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