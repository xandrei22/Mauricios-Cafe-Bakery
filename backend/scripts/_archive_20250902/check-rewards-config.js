const db = require('../config/db');
require('dotenv').config();

async function checkRewardsConfig() {
    try {
        console.log('🎁 Checking loyalty rewards configuration...\n');

        const [rewards] = await db.query(`
            SELECT 
                id,
                name,
                description,
                points_required,
                reward_type,
                requires_order,
                is_active,
                validity_days,
                max_redemptions_per_customer
            FROM loyalty_rewards 
            ORDER BY points_required ASC
        `);

        console.log('Current Rewards Configuration:');
        console.log('================================');
        
        rewards.forEach(reward => {
            console.log(`\n🎁 ${reward.name}`);
            console.log(`   - ID: ${reward.id}`);
            console.log(`   - Type: ${reward.reward_type}`);
            console.log(`   - Points Required: ${reward.points_required}`);
            console.log(`   - Requires Order: ${reward.requires_order ? '❌ YES (BLOCKS CLAIMING)' : '✅ NO (CAN CLAIM)'}`);
            console.log(`   - Active: ${reward.is_active ? '✅ YES' : '❌ NO'}`);
            console.log(`   - Validity: ${reward.validity_days} days`);
            console.log(`   - Max Redemptions: ${reward.max_redemptions_per_customer}`);
            console.log(`   - Description: ${reward.description}`);
        });

        console.log('\n🔧 Recommendations:');
        console.log('===================');
        
        const problematicRewards = rewards.filter(r => r.requires_order && r.is_active);
        if (problematicRewards.length > 0) {
            console.log('❌ These rewards require orders and will block customer claiming:');
            problematicRewards.forEach(r => {
                console.log(`   - ${r.name} (ID: ${r.id})`);
            });
            console.log('\n💡 To fix: Set requires_order = FALSE for customer-facing rewards');
        } else {
            console.log('✅ All active rewards can be claimed without orders');
        }

        console.log('\n✅ Rewards configuration check complete!');

    } catch (error) {
        console.error('❌ Error checking rewards configuration:', error);
    } finally {
        process.exit(0);
    }
}

checkRewardsConfig();
