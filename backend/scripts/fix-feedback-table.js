// Script to fix feedback table structure
const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixFeedbackTable() {
    let connection;

    try {
        console.log('🔄 Fixing feedback table structure...');

        // Connect to MySQL
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'cafe_management'
        });

        console.log('✅ Connected to database');

        // Add missing columns
        console.log('📝 Adding missing columns...');

        // Add customer_email column
        try {
            await connection.execute('ALTER TABLE feedback ADD COLUMN customer_email VARCHAR(100) NOT NULL AFTER customer_name');
            console.log('✅ Added customer_email column');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ customer_email column already exists');
            } else {
                throw error;
            }
        }

        // Add order_id column
        try {
            await connection.execute('ALTER TABLE feedback ADD COLUMN order_id VARCHAR(50) DEFAULT NULL AFTER customer_email');
            console.log('✅ Added order_id column');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ order_id column already exists');
            } else {
                throw error;
            }
        }

        // Add unique constraint for preventing duplicate feedback
        try {
            await connection.execute('ALTER TABLE feedback ADD CONSTRAINT unique_order_feedback UNIQUE (customer_email, order_id)');
            console.log('✅ Added unique constraint');
        } catch (error) {
            if (error.code === 'ER_DUP_KEYNAME') {
                console.log('ℹ️ Unique constraint already exists');
            } else {
                console.log('⚠️ Could not add unique constraint:', error.message);
            }
        }

        // Check final table structure
        const [columns] = await connection.execute("DESCRIBE feedback");
        console.log('📋 Updated feedback table structure:');
        columns.forEach(col => {
            console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });

        console.log('✅ Feedback table structure fixed successfully!');

    } catch (error) {
        console.error('❌ Error fixing feedback table:', error.message);
        console.error('Full error:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run the fix
fixFeedbackTable();