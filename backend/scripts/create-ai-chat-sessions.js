const mysql = require('mysql2/promise');
require('dotenv').config();

(async() => {
    try {
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'cafeiq'
        });

        console.log('Ensuring ai_chat_sessions table exists...');
        await conn.query(`
      CREATE TABLE IF NOT EXISTS ai_chat_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(64) NOT NULL UNIQUE,
        customer_id INT NULL,
        messages JSON NOT NULL,
        dietary_preferences JSON NULL,
        recommendations JSON NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_customer_id (customer_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

        console.log('✅ ai_chat_sessions table is ready.');
        await conn.end();
    } catch (e) {
        console.error('❌ Failed to ensure table:', e.message);
        process.exit(1);
    }

