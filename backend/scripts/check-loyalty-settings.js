const db = require('../config/db');

async function checkLoyaltySettings() {
    try {
        console.log('🔍 Checking loyalty_settings table...');

        const [tables] = await db.query('SHOW TABLES LIKE "loyalty_settings"');

        if (tables.length === 0) {
            console.log('📝 Creating loyalty_settings table...');
            await db.query(`
                CREATE TABLE loyalty_settings (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    setting_key VARCHAR(50),
                    setting_value VARCHAR(100)
                )
            `);

            // Insert default settings
            await db.query(`
                INSERT INTO loyalty_settings (setting_key, setting_value) VALUES 
                ('welcome_points_enabled', 'true'),
                ('welcome_points', '50')
            `);

            console.log('✅ loyalty_settings table created with default values!');
        } else {
            console.log('✅ loyalty_settings table already exists!');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

