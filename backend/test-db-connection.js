// Test database connection script
require('dotenv').config();
const db = require('./config/db');

async function testConnection() {
    try {
        console.log('🔄 Testing database connection...');
        console.log('📋 Environment variables:');
        console.log('  - MYSQL_URL:', process.env.MYSQL_URL ? 'Set' : 'Not set');
        console.log('  - DB_HOST:', process.env.DB_HOST || 'Not set');
        console.log('  - DB_USER:', process.env.DB_USER || 'Not set');
        console.log('  - DB_NAME:', process.env.DB_NAME || 'Not set');

        // Test basic query
        const [result] = await db.query('SELECT 1 as test, NOW() as current_time');
        console.log('✅ Database connection successful!');
        console.log('📊 Test query result:', result[0]);

        // Test table existence
        const [tables] = await db.query('SHOW TABLES');
        console.log('📋 Available tables:', tables.map(t => Object.values(t)[0]));

    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('🔧 Full error:', error);
    } finally {
        // Close the connection pool
        await db.pool.end();
        console.log('🔌 Database connection closed');
    }
}

// Run the test
testConnection();
