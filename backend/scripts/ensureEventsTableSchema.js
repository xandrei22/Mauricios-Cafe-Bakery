const pool = require('../config/db');

/**
 * Ensures the events table has all required columns for event requests
 * This can be called on server startup to automatically fix the schema
 */
async function ensureEventsTableSchema() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('🔍 Checking events table schema...');

        // Check current table structure
        const [columns] = await connection.query('DESCRIBE events');
        const existingColumns = columns.map(c => c.Field.toLowerCase());
        console.log('📋 Existing columns:', existingColumns.join(', '));

        // Define columns we need
        const requiredColumns = [
            { name: 'customer_id', type: 'INT NULL' },
            { name: 'customer_name', type: 'VARCHAR(255) NULL' },
            { name: 'contact_name', type: 'VARCHAR(255) NULL' },
            { name: 'contact_number', type: 'VARCHAR(20) NULL' },
            { name: 'event_start_time', type: 'TIME NULL' },
            { name: 'event_end_time', type: 'TIME NULL' },
            { name: 'address', type: 'TEXT NULL' },
            { name: 'event_type', type: 'VARCHAR(100) NULL' },
            { name: 'notes', type: 'TEXT NULL' },
            { name: 'cups', type: 'INT NULL' },
            { name: 'admin_response_date', type: 'DATETIME NULL' }
        ];

        let addedColumns = 0;
        // Add missing columns
        for (const col of requiredColumns) {
            if (!existingColumns.includes(col.name.toLowerCase())) {
                try {
                    await connection.query(`ALTER TABLE events ADD COLUMN ${col.name} ${col.type}`);
                    console.log(`✅ Added column: ${col.name}`);
                    addedColumns++;
                } catch (error) {
                    if (error.code === 'ER_DUP_FIELDNAME') {
                        console.log(`⚠️ Column ${col.name} already exists`);
                    } else {
                        console.error(`❌ Error adding column ${col.name}:`, error.message);
                    }
                }
            }
        }

        // Update status enum to include event request statuses
        try {
            const statusColumn = columns.find(c => c.Field.toLowerCase() === 'status');
            if (statusColumn) {
                const currentType = statusColumn.Type;
                
                // Only update if it doesn't already include our values
                if (!currentType.includes('pending') || !currentType.includes('accepted') || !currentType.includes('rejected')) {
                    await connection.query(`
                        ALTER TABLE events 
                        MODIFY COLUMN status ENUM('draft','published','cancelled','completed','pending','accepted','rejected') DEFAULT 'pending'
                    `);
                    console.log('✅ Updated status enum to include pending, accepted, rejected');
                }
            }
        } catch (error) {
            console.error('⚠️ Error updating status enum (non-critical):', error.message);
        }

        // Add indexes (ignore errors if they already exist)
        const indexes = [
            { name: 'idx_events_customer_id', sql: 'CREATE INDEX idx_events_customer_id ON events(customer_id)' },
            { name: 'idx_events_status', sql: 'CREATE INDEX idx_events_status ON events(status)' }
        ];

        for (const index of indexes) {
            try {
                await connection.query(index.sql);
                console.log(`✅ Added index: ${index.name}`);
            } catch (error) {
                if (error.code === 'ER_DUP_KEYNAME') {
                    // Index already exists, that's fine
                } else {
                    console.error(`⚠️ Error adding index ${index.name}:`, error.message);
                }
            }
        }

        if (addedColumns > 0) {
            console.log(`✅ Events table schema updated: Added ${addedColumns} column(s)`);
        } else {
            console.log('✅ Events table schema is up to date');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Error ensuring events table schema:', error.message);
        // Don't throw - allow server to start even if migration fails
        // The error will be caught when trying to insert events
        return false;
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

module.exports = ensureEventsTableSchema;

