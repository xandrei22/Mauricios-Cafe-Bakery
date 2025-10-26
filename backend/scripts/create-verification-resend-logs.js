const db = require('../config/db');

async function createVerificationResendLogsTable() {
    try {
        console.log('🔍 Checking verification_resend_logs table...');

        const [tables] = await db.query('SHOW TABLES LIKE "verification_resend_logs"');

        if (tables.length === 0) {
            console.log('📝 Creating verification_resend_logs table...');
            await db.query(`
                CREATE TABLE verification_resend_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    customer_id INT NOT NULL,
                    created_at DATETIME NOT NULL,
                    INDEX idx_customer_created (customer_id, created_at)
                )
            `);
            console.log('✅ verification_resend_logs table created successfully!');
        } else {
            console.log('✅ verification_resend_logs table already exists!');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

