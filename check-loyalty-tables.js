const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkLoyaltyTables() {
    console.log('🔍 Checking Loyalty Tables...\n');

    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        // Check if loyalty_settings table exists
        console.log('1. Checking loyalty_settings table...');
        const [settings] = await pool.query('SELECT * FROM loyalty_settings');
        console.log(`✅ loyalty_settings table has ${settings.length} records`);

        if (settings.length > 0) {
            console.log('   Sample settings:');
            settings.slice(0, 3).forEach(setting => {
                console.log(`   - ${setting.setting_key}: ${setting.setting_value}`);
            });
        }

        // Check if loyalty_rewards table exists
        console.log('\n2. Checking loyalty_rewards table...');
        const [rewards] = await pool.query('SELECT * FROM loyalty_rewards');
        console.log(`✅ loyalty_rewards table has ${rewards.length} records`);

        if (rewards.length > 0) {
            console.log('   Sample rewards:');
            rewards.slice(0, 3).forEach(reward => {
                console.log(`   - ${reward.name}: ${reward.points_required} points`);
            });
        }

        // Check if loyalty_transactions table exists
        console.log('\n3. Checking loyalty_transactions table...');
        const [transactions] = await pool.query('SELECT COUNT(*) as count FROM loyalty_transactions');
        console.log(`✅ loyalty_transactions table has ${transactions[0].count} records`);

        // Check if customers table has loyalty_points column
        console.log('\n4. Checking customers table...');
        const [customers] = await pool.query('SELECT COUNT(*) as count, SUM(loyalty_points) as total_points FROM customers');
        console.log(`✅ customers table has ${customers[0].count} customers with ${customers[0].total_points || 0} total points`);

        console.log('\n🎉 All loyalty tables are properly set up!');
        console.log('\n📋 Next Steps:');
        console.log('1. Make sure you are logged in as admin');
        console.log('2. Try updating loyalty settings again');
        console.log('3. Check browser console for any errors');

    } catch (error) {
        console.error('❌ Error checking tables:', error.message);

        if (error.code === 'ER_NO_SUCH_TABLE') {
            console.log('\n🔧 Table missing! Please restart the backend server to create tables.');
        }
    } finally {
        await pool.end();
    }
}

checkLoyaltyTables();