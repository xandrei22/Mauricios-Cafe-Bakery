const db = require('../config/db');

async function checkLoyaltyTable() {
    try {
        console.log('🔍 Checking loyalty_transactions table...');

        const [tables] = await db.query('SHOW TABLES LIKE "loyalty_transactions"');

        if (tables.length === 0) {
            console.log('📝 Creating loyalty_transactions table...');
            await db.query(`
                CREATE TABLE loyalty_transactions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    customer_id INT,
                    points_earned INT,
                    transaction_type VARCHAR(20),
                    description TEXT,
                    created_at DATETIME
                )
            `);
            console.log('✅ loyalty_transactions table created successfully!');
        } else {
            console.log('✅ loyalty_transactions table already exists!');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

