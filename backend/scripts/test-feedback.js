// Test script to check feedback table and test submission
const mysql = require('mysql2/promise');
require('dotenv').config();

async function testFeedback() {
    let connection;

    try {
        console.log('🔄 Testing feedback system...');

        // Connect to MySQL
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'cafe_management'
        });

        console.log('✅ Connected to database');

        // Check if feedback table exists
        const [tables] = await connection.execute("SHOW TABLES LIKE 'feedback'");
        if (tables.length === 0) {
            console.log('❌ Feedback table does not exist!');
            return;
        }
        console.log('✅ Feedback table exists');

        // Check table structure
        const [columns] = await connection.execute("DESCRIBE feedback");
        console.log('📋 Feedback table structure:');
        columns.forEach(col => {
            console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });

        // Check existing feedback
        const [existingFeedback] = await connection.execute("SELECT COUNT(*) as count FROM feedback");
        console.log(`📊 Current feedback count: ${existingFeedback[0].count}`);

        // Test inserting feedback
        console.log('🧪 Testing feedback insertion...');
        const testFeedback = {
            customer_name: 'Test Customer',
            customer_email: 'test@example.com',
            order_id: 'TEST-ORDER-123',
            rating: 5,
            comment: 'Test feedback',
            category: 'General'
        };

        const [result] = await connection.execute(
            'INSERT INTO feedback (customer_name, customer_email, order_id, rating, comment, category) VALUES (?, ?, ?, ?, ?, ?)', [testFeedback.customer_name, testFeedback.customer_email, testFeedback.order_id, testFeedback.rating, testFeedback.comment, testFeedback.category]
        );

        console.log('✅ Test feedback inserted successfully, ID:', result.insertId);

        // Check if it was actually saved
        const [savedFeedback] = await connection.execute("SELECT * FROM feedback WHERE id = ?", [result.insertId]);
        console.log('📝 Saved feedback:', savedFeedback[0]);

        // Clean up test data
        await connection.execute("DELETE FROM feedback WHERE id = ?", [result.insertId]);
        console.log('🧹 Test data cleaned up');

    } catch (error) {
        console.error('❌ Error testing feedback:', error.message);
        console.error('Full error:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run the test
testFeedback();