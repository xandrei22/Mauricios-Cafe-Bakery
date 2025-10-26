// Script to create feedback table if it doesn't exist
const mysql = require('mysql2/promise');
require('dotenv').config();

async function createFeedbackTable() {
    let connection;

    try {
        console.log('🔄 Creating feedback table...');

        // Connect to MySQL
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'cafe_management'
        });

        console.log('✅ Connected to database');

        // Create feedback table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS feedback (
                id INT PRIMARY KEY AUTO_INCREMENT,
                customer_name VARCHAR(100) NOT NULL,
                customer_email VARCHAR(100) NOT NULL,
                order_id VARCHAR(50) DEFAULT NULL,
                rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
                comment TEXT DEFAULT NULL,
                category VARCHAR(50) DEFAULT 'General',
                feedback_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                INDEX idx_customer_email (customer_email),
                INDEX idx_order_id (order_id),
                INDEX idx_rating (rating),
                INDEX idx_feedback_time (feedback_time),
                
                UNIQUE KEY unique_order_feedback (customer_email, order_id)
            )
        `);

        console.log('✅ Feedback table created/verified successfully');

    } catch (error) {
        console.error('❌ Error creating feedback table:', error.message);
        console.error('Full error:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run the script
createFeedbackTable();