const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkCurrentRewards() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('🔍 Checking current rewards in database...\n');

        // Check all rewards
        const [rewards] = await connection.query('SELECT id, name, description, points_required, reward_type, is_active, created_at FROM loyalty_rewards ORDER BY id');
        console.log(`📊 Found ${rewards.length} rewards in loyalty_rewards table:`);

        if (rewards.length === 0) {
            console.log('✅ No rewards found - database is clean!');
        } else {
            rewards.forEach(reward => {
                console.log(`  - ID: ${reward.id}, Name: "${reward.name}", Points: ${reward.points_required}, Type: ${reward.reward_type}, Active: ${reward.is_active}`);
            });
        }

        // Check if there are any other reward-related tables
        const [tables] = await connection.query('SHOW TABLES LIKE "%reward%"');
        console.log(`\n📋 Reward-related tables found: ${tables.length}`);
        tables.forEach(table => {
            console.log(`  - ${Object.values(table)[0]}`);
        });

        // Check loyalty_transactions for any reward activity
        const [transactions] = await connection.query('SELECT COUNT(*) as count FROM loyalty_transactions WHERE transaction_type = "redeem"');
        console.log(`💎 Reward redemption transactions: ${transactions[0].count}`);

        // Check loyalty_reward_redemptions
        const [redemptions] = await connection.query('SELECT COUNT(*) as count FROM loyalty_reward_redemptions');
        console.log(`🎁 Reward redemptions: ${redemptions[0].count}`);

        if (rewards.length > 0) {
            console.log('\n🗑️  These rewards should have been deleted by the cleanup script!');
            console.log('🔧 Running cleanup again...');

            // Delete all rewards again
            const [deleteResult] = await connection.query('DELETE FROM loyalty_rewards');
            console.log(`✅ Deleted ${deleteResult.affectedRows} rewards`);

            // Verify deletion
            const [remainingRewards] = await connection.query('SELECT COUNT(*) as count FROM loyalty_rewards');
            console.log(`📊 Remaining rewards: ${remainingRewards[0].count}`);

            if (remainingRewards[0].count === 0) {
                console.log('🎉 All rewards successfully removed!');
            } else {
                console.log('⚠️  Some rewards still remain - there may be an issue with the deletion.');
            }
        }

    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}


require('dotenv').config();

async function checkCurrentRewards() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('🔍 Checking current rewards in database...\n');

        // Check all rewards
        const [rewards] = await connection.query('SELECT id, name, description, points_required, reward_type, is_active, created_at FROM loyalty_rewards ORDER BY id');
        console.log(`📊 Found ${rewards.length} rewards in loyalty_rewards table:`);

        if (rewards.length === 0) {
            console.log('✅ No rewards found - database is clean!');
        } else {
            rewards.forEach(reward => {
                console.log(`  - ID: ${reward.id}, Name: "${reward.name}", Points: ${reward.points_required}, Type: ${reward.reward_type}, Active: ${reward.is_active}`);
            });
        }

        // Check if there are any other reward-related tables
        const [tables] = await connection.query('SHOW TABLES LIKE "%reward%"');
        console.log(`\n📋 Reward-related tables found: ${tables.length}`);
        tables.forEach(table => {
            console.log(`  - ${Object.values(table)[0]}`);
        });

        // Check loyalty_transactions for any reward activity
        const [transactions] = await connection.query('SELECT COUNT(*) as count FROM loyalty_transactions WHERE transaction_type = "redeem"');
        console.log(`💎 Reward redemption transactions: ${transactions[0].count}`);

        // Check loyalty_reward_redemptions
        const [redemptions] = await connection.query('SELECT COUNT(*) as count FROM loyalty_reward_redemptions');
        console.log(`🎁 Reward redemptions: ${redemptions[0].count}`);

        if (rewards.length > 0) {
            console.log('\n🗑️  These rewards should have been deleted by the cleanup script!');
            console.log('🔧 Running cleanup again...');

            // Delete all rewards again
            const [deleteResult] = await connection.query('DELETE FROM loyalty_rewards');
            console.log(`✅ Deleted ${deleteResult.affectedRows} rewards`);

            // Verify deletion
            const [remainingRewards] = await connection.query('SELECT COUNT(*) as count FROM loyalty_rewards');
            console.log(`📊 Remaining rewards: ${remainingRewards[0].count}`);

            if (remainingRewards[0].count === 0) {
                console.log('🎉 All rewards successfully removed!');
            } else {
                console.log('⚠️  Some rewards still remain - there may be an issue with the deletion.');
            }
        }

    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

