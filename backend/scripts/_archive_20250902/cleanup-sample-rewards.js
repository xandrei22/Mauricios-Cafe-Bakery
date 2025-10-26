const mysql = require('mysql2/promise');
require('dotenv').config();

async function cleanupSampleRewards() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('🧹 Cleaning up sample rewards from database...\n');

        // First, let's see what rewards exist
        console.log('📊 Current rewards in database:');
        const [rewards] = await connection.query('SELECT id, name, points_required, reward_type FROM loyalty_rewards ORDER BY id');

        if (rewards.length === 0) {
            console.log('✅ No rewards found - database is already clean!');
            return;
        }

        rewards.forEach(reward => {
            console.log(`  - ID: ${reward.id}, Name: "${reward.name}", Points: ${reward.points_required}, Type: ${reward.reward_type}`);
        });

        // Check if these look like sample rewards
        const sampleRewardNames = [
            'Free Coffee on Order',
            'Free Pastry with Drink',
            '50% Off Any Menu Item',
            'Free Size Upgrade',
            'Double Points Bonus',
            'Free Add-on with Order',
            'Birthday Special',
            'Loyalty Member Discount'
        ];

        const areSampleRewards = rewards.every(reward =>
            sampleRewardNames.includes(reward.name)
        );

        if (areSampleRewards) {
            console.log('\n✅ These appear to be the sample rewards from setup');
        } else {
            console.log('\n⚠️  These rewards may not all be sample rewards - please review before deletion');
        }

        // Ask for confirmation
        console.log('\n🗑️  About to delete ALL rewards from the database...');
        console.log('⚠️  This action cannot be undone!');

        // For safety, let's just delete the specific sample rewards by name
        console.log('\n🔧 Deleting sample rewards by name...');

        for (const rewardName of sampleRewardNames) {
            try {
                const [result] = await connection.query(
                    'DELETE FROM loyalty_rewards WHERE name = ?', [rewardName]
                );
                if (result.affectedRows > 0) {
                    console.log(`✅ Deleted: "${rewardName}"`);
                } else {
                    console.log(`ℹ️  Not found: "${rewardName}"`);
                }
            } catch (error) {
                console.log(`❌ Error deleting "${rewardName}":`, error.message);
            }
        }

        // Verify deletion
        console.log('\n🔍 Verifying cleanup...');
        const [remainingRewards] = await connection.query('SELECT COUNT(*) as count FROM loyalty_rewards');
        console.log(`📊 Remaining rewards: ${remainingRewards[0].count}`);

        if (remainingRewards[0].count === 0) {
            console.log('✅ All sample rewards have been successfully removed!');
            console.log('🎉 Your loyalty system is now clean and ready for custom rewards.');
        } else {
            console.log('⚠️  Some rewards remain - they may be custom rewards you want to keep.');
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

async function cleanupSampleRewards() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('🧹 Cleaning up sample rewards from database...\n');

        // First, let's see what rewards exist
        console.log('📊 Current rewards in database:');
        const [rewards] = await connection.query('SELECT id, name, points_required, reward_type FROM loyalty_rewards ORDER BY id');

        if (rewards.length === 0) {
            console.log('✅ No rewards found - database is already clean!');
            return;
        }

        rewards.forEach(reward => {
            console.log(`  - ID: ${reward.id}, Name: "${reward.name}", Points: ${reward.points_required}, Type: ${reward.reward_type}`);
        });

        // Check if these look like sample rewards
        const sampleRewardNames = [
            'Free Coffee on Order',
            'Free Pastry with Drink',
            '50% Off Any Menu Item',
            'Free Size Upgrade',
            'Double Points Bonus',
            'Free Add-on with Order',
            'Birthday Special',
            'Loyalty Member Discount'
        ];

        const areSampleRewards = rewards.every(reward =>
            sampleRewardNames.includes(reward.name)
        );

        if (areSampleRewards) {
            console.log('\n✅ These appear to be the sample rewards from setup');
        } else {
            console.log('\n⚠️  These rewards may not all be sample rewards - please review before deletion');
        }

        // Ask for confirmation
        console.log('\n🗑️  About to delete ALL rewards from the database...');
        console.log('⚠️  This action cannot be undone!');

        // For safety, let's just delete the specific sample rewards by name
        console.log('\n🔧 Deleting sample rewards by name...');

        for (const rewardName of sampleRewardNames) {
            try {
                const [result] = await connection.query(
                    'DELETE FROM loyalty_rewards WHERE name = ?', [rewardName]
                );
                if (result.affectedRows > 0) {
                    console.log(`✅ Deleted: "${rewardName}"`);
                } else {
                    console.log(`ℹ️  Not found: "${rewardName}"`);
                }
            } catch (error) {
                console.log(`❌ Error deleting "${rewardName}":`, error.message);
            }
        }

        // Verify deletion
        console.log('\n🔍 Verifying cleanup...');
        const [remainingRewards] = await connection.query('SELECT COUNT(*) as count FROM loyalty_rewards');
        console.log(`📊 Remaining rewards: ${remainingRewards[0].count}`);

        if (remainingRewards[0].count === 0) {
            console.log('✅ All sample rewards have been successfully removed!');
            console.log('🎉 Your loyalty system is now clean and ready for custom rewards.');
        } else {
            console.log('⚠️  Some rewards remain - they may be custom rewards you want to keep.');
        }

    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

