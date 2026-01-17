const pool = require('../config/db');

async function fixEventsTable() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('✅ Connected to database');

        // Check current table structure
        const [columns] = await connection.query('DESCRIBE events');
        console.log('📋 Current events table columns:', columns.map(c => c.Field).join(', '));

        const existingColumns = columns.map(c => c.Field.toLowerCase());

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

        // Add missing columns
        for (const col of requiredColumns) {
            if (!existingColumns.includes(col.name.toLowerCase())) {
                try {
                    await connection.query(`ALTER TABLE events ADD COLUMN ${col.name} ${col.type}`);
                    console.log(`✅ Added column: ${col.name}`);
                } catch (error) {
                    if (error.code === 'ER_DUP_FIELDNAME') {
                        console.log(`⚠️ Column ${col.name} already exists`);
                    } else {
                        throw error;
                    }
                }
            } else {
                console.log(`✅ Column ${col.name} already exists`);
            }
        }

        // Update status enum to include event request statuses
        try {
            // Check current status enum values
            const statusColumn = columns.find(c => c.Field.toLowerCase() === 'status');
            if (statusColumn) {
                const currentType = statusColumn.Type;
                console.log('📋 Current status column type:', currentType);
                
                // Only update if it doesn't already include our values
                if (!currentType.includes('pending') || !currentType.includes('accepted') || !currentType.includes('rejected')) {
                    await connection.query(`
                        ALTER TABLE events 
                        MODIFY COLUMN status ENUM('draft','published','cancelled','completed','pending','accepted','rejected') DEFAULT 'pending'
                    `);
                    console.log('✅ Updated status enum to include pending, accepted, rejected');
                } else {
                    console.log('✅ Status enum already includes required values');
                }
            }
        } catch (error) {
            console.error('⚠️ Error updating status enum:', error.message);
            // Continue - this is not critical
        }

        // Add indexes
        try {
            await connection.query('CREATE INDEX IF NOT EXISTS idx_events_customer_id ON events(customer_id)');
            console.log('✅ Added index on customer_id');
        } catch (error) {
            if (error.code === 'ER_DUP_KEYNAME') {
                console.log('✅ Index on customer_id already exists');
            } else {
                console.error('⚠️ Error adding index:', error.message);
            }
        }

        try {
            await connection.query('CREATE INDEX IF NOT EXISTS idx_events_status ON events(status)');
            console.log('✅ Added index on status');
        } catch (error) {
            if (error.code === 'ER_DUP_KEYNAME') {
                console.log('✅ Index on status already exists');
            } else {
                console.error('⚠️ Error adding index:', error.message);
            }
        }

        console.log('✅ Events table fix completed successfully!');
        
    } catch (error) {
        console.error('❌ Error fixing events table:', error);
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
        // Don't close the pool - it's shared
    }
}

// Run the fix
fixEventsTable()
    .then(() => {
        console.log('✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });

