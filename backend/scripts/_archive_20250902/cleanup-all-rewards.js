const mysql = require('mysql2/promise');
require('dotenv').config();

async function cleanupAllRewards() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('🧹 Cleaning up ALL rewards from database...\n');

        // Show current rewards
        console.log('📊 Current rewards in database:');
        const [rewards] = await connection.query('SELECT id, name, points_required, reward_type FROM loyalty_rewards ORDER BY id');

        if (rewards.length === 0) {
            console.log('✅ No rewards found - database is already clean!');
            return;
        }

        rewards.forEach(reward => {
            console.log(`  - ID: ${reward.id}, Name: "${reward.name}", Points: ${reward.points_required}, Type: ${reward.reward_type}`);
        });

        console.log(`\n🗑️  About to delete ALL ${rewards.length} rewards from the database...`);
        console.log('⚠️  This action cannot be undone!');
        console.log('⚠️  This will give you a completely clean slate to create your own rewards.');

        // Delete all rewards
        console.log('\n🔧 Deleting all rewards...');
        const [result] = await connection.query('DELETE FROM loyalty_rewards');
        console.log(`✅ Deleted ${result.affectedRows} rewards`);

        // Verify deletion
        console.log('\n🔍 Verifying cleanup...');
        const [remainingRewards] = await connection.query('SELECT COUNT(*) as count FROM loyalty_rewards');
        console.log(`📊 Remaining rewards: ${remainingRewards[0].count}`);

        if (remainingRewards[0].count === 0) {
            console.log('✅ All rewards have been successfully removed!');
            console.log('🎉 Your loyalty system is now completely clean.');
            console.log('💡 You can now create your own custom rewards through the admin interface.');
        } else {
            console.log('⚠️  Some rewards remain - there may be an issue with the deletion.');
        }

        // Also clean up any related data
        console.log('\n🧹 Cleaning up related data...');

        // Check if there are any redemptions that reference deleted rewards
        const [redemptions] = await connection.query('SELECT COUNT(*) as count FROM loyalty_reward_redemptions');
        if (redemptions[0].count > 0) {
            console.log(`⚠️  Found ${redemptions[0].count} reward redemptions - these may reference deleted rewards`);
            console.log('💡 You may want to clean these up as well if they\'re not needed');
        } else {
            console.log('✅ No reward redemptions found');
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

async function cleanupAllRewards() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('🧹 Cleaning up ALL rewards from database...\n');

        // Show current rewards
        console.log('📊 Current rewards in database:');
        const [rewards] = await connection.query('SELECT id, name, points_required, reward_type FROM loyalty_rewards ORDER BY id');

        if (rewards.length === 0) {
            console.log('✅ No rewards found - database is already clean!');
            return;
        }

        rewards.forEach(reward => {
            console.log(`  - ID: ${reward.id}, Name: "${reward.name}", Points: ${reward.points_required}, Type: ${reward.reward_type}`);
        });

        console.log(`\n🗑️  About to delete ALL ${rewards.length} rewards from the database...`);
        console.log('⚠️  This action cannot be undone!');
        console.log('⚠️  This will give you a completely clean slate to create your own rewards.');

        // Delete all rewards
        console.log('\n🔧 Deleting all rewards...');
        const [result] = await connection.query('DELETE FROM loyalty_rewards');
        console.log(`✅ Deleted ${result.affectedRows} rewards`);

        // Verify deletion
        console.log('\n🔍 Verifying cleanup...');
        const [remainingRewards] = await connection.query('SELECT COUNT(*) as count FROM loyalty_rewards');
        console.log(`📊 Remaining rewards: ${remainingRewards[0].count}`);

        if (remainingRewards[0].count === 0) {
            console.log('✅ All rewards have been successfully removed!');
            console.log('🎉 Your loyalty system is now completely clean.');
            console.log('💡 You can now create your own custom rewards through the admin interface.');
        } else {
            console.log('⚠️  Some rewards remain - there may be an issue with the deletion.');
        }

        // Also clean up any related data
        console.log('\n🧹 Cleaning up related data...');

        // Check if there are any redemptions that reference deleted rewards
        const [redemptions] = await connection.query('SELECT COUNT(*) as count FROM loyalty_reward_redemptions');
        if (redemptions[0].count > 0) {
            console.log(`⚠️  Found ${redemptions[0].count} reward redemptions - these may reference deleted rewards`);
            console.log('💡 You may want to clean these up as well if they\'re not needed');
        } else {
            console.log('✅ No reward redemptions found');
        }

    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

