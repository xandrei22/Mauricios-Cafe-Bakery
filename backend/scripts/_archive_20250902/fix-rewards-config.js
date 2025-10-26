const db = require('../config/db');
require('dotenv').config();

async function fixRewardsConfig() {
    try {
        console.log('🔧 Fixing rewards configuration...\n');

        // Fix the COFEEE reward to allow claiming without orders
        const [result] = await db.query(`
            UPDATE loyalty_rewards 
            SET requires_order = FALSE 
            WHERE name = 'COFEEE' AND id = 65
        `);

        if (result.affectedRows > 0) {
            console.log('✅ Fixed COFEEE reward: Now allows claiming without orders');
        } else {
            console.log('⚠️  COFEEE reward not found or already fixed');
        }

        // Also fix any other rewards that might have this issue
        const [otherResults] = await db.query(`
            UPDATE loyalty_rewards 
            SET requires_order = FALSE 
            WHERE requires_order = TRUE 
            AND reward_type IN ('drink', 'food', 'discount', 'bonus')
        `);

        if (otherResults.affectedRows > 0) {
            console.log(`✅ Fixed ${otherResults.affectedRows} other rewards to allow claiming without orders`);
        }

        // Verify the fix
        console.log('\n📊 Verifying the fix...');
        const [rewards] = await db.query(`
            SELECT name, requires_order, is_active 
            FROM loyalty_rewards 
            WHERE is_active = TRUE
        `);

        console.log('\nCurrent Rewards Status:');
        rewards.forEach(reward => {
            const status = reward.requires_order ? '❌ Requires Order' : '✅ No Order Required';
            console.log(`  ${reward.name}: ${status}`);
        });

        console.log('\n🎯 Now customers can claim rewards without placing orders!');
        console.log('✅ Rewards configuration fixed successfully!');

    } catch (error) {
        console.error('❌ Error fixing rewards configuration:', error);
    } finally {
        process.exit(0);
    }
}

fixRewardsConfig();