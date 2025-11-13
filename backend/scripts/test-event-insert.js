const pool = require('../config/db');

async function testEventInsert() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('✅ Connected to database');

        // Check if events table exists
        const [tables] = await connection.query(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE() 
            AND table_name = 'events'
        `);
        
        if (tables[0].count === 0) {
            console.error('❌ Events table does not exist!');
            return;
        }
        
        console.log('✅ Events table exists');

        // Check table structure
        const [columns] = await connection.query('DESCRIBE events');
        console.log('\n📋 Events table columns:');
        columns.forEach(col => {
            console.log(`   - ${col.Field} (${col.Type})`);
        });

        // Check for required columns
        const columnNames = columns.map(c => c.Field.toLowerCase());
        const required = [
            'customer_id', 'customer_name', 'contact_name', 'contact_number',
            'event_start_time', 'event_end_time', 'address', 'event_type', 'notes', 'cups'
        ];
        
        const missing = required.filter(col => !columnNames.includes(col.toLowerCase()));
        
        if (missing.length > 0) {
            console.log('\n❌ Missing columns:', missing.join(', '));
            console.log('\n🔄 Attempting to add missing columns...');
            
            for (const colName of missing) {
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
                        console.log(`✅ Added column: ${colName}`);
                    } catch (err) {
                        if (err.code === 'ER_DUP_FIELDNAME') {
                            console.log(`⚠️ Column ${colName} already exists`);
                        } else {
                            console.error(`❌ Error adding ${colName}:`, err.message);
                        }
                    }
                }
            }
        } else {
            console.log('\n✅ All required columns exist');
        }

        // Test insert
        console.log('\n🧪 Testing INSERT...');
        const testData = {
            customer_id: 1,
            customer_name: 'Test Customer',
            contact_name: 'Test Contact',
            contact_number: '09123456789',
            event_date: '2025-12-01',
            event_start_time: '10:00:00',
            event_end_time: '14:00:00',
            address: 'Test Address',
            event_type: 'test',
            notes: 'Test event',
            cups: 100
        };

        const [result] = await connection.query(`
            INSERT INTO events 
            (customer_id, customer_name, contact_name, contact_number, event_date, event_start_time, event_end_time, address, event_type, notes, cups, status, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
        `, [
            testData.customer_id,
            testData.customer_name,
            testData.contact_name,
            testData.contact_number,
            testData.event_date,
            testData.event_start_time,
            testData.event_end_time,
            testData.address,
            testData.event_type,
            testData.notes,
            testData.cups
        ]);

        console.log('✅ Test INSERT successful! Event ID:', result.insertId);
        
        // Clean up test data
        await connection.query('DELETE FROM events WHERE id = ?', [result.insertId]);
        console.log('✅ Test data cleaned up');

    } catch (error) {
        console.error('❌ Error:', error);
        console.error('   Code:', error.code);
        console.error('   Message:', error.message);
        console.error('   SQL State:', error.sqlState);
    } finally {
        if (connection) {
            connection.release();
        }
        await pool.end();
    }
}

testEventInsert();



