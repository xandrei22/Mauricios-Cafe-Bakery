const db = require('../config/db');
require('dotenv').config();

async function testRewardRedemption() {
    try {
        console.log('🧪 Testing reward redemption process...\n');

        // 1. Check customer loyalty points
        console.log('1️⃣ Checking customer loyalty points...');
        const [customers] = await db.query(`
            SELECT id, full_name, loyalty_points, email
            FROM customers 
            WHERE id = 49
        `);

        if (customers.length === 0) {
            console.log('❌ Customer 49 not found');
            return;
        }

        const customer = customers[0];
        console.log(`   Customer: ${customer.full_name} (${customer.email})`);
        console.log(`   Current points: ${customer.loyalty_points}`);

        // 2. Check available rewards
        console.log('\n2️⃣ Checking available rewards...');
        const [rewards] = await db.query(`
            SELECT id, name, points_required, requires_order, is_active
            FROM loyalty_rewards 
            WHERE is_active = TRUE
            ORDER BY points_required ASC
        `);

        console.log('   Available rewards:');
        rewards.forEach(reward => {
            console.log(`   - ${reward.name}: ${reward.points_required} points (requires_order: ${reward.requires_order})`);
        });

        // 3. Check loyalty settings
        console.log('\n3️⃣ Checking loyalty settings...');
        const [settings] = await db.query(`
            SELECT setting_key, setting_value 
            FROM loyalty_settings
        `);

        console.log('   Loyalty settings:');
        settings.forEach(setting => {
            console.log(`   - ${setting.setting_key}: ${setting.setting_value}`);
        });

        // 4. Test the redemption logic step by step
        console.log('\n4️⃣ Testing redemption logic...');
        
        const customerId = 49;
        const rewardId = 65; // COFEEE reward
        const orderId = null;
        const redemptionProof = 'Test redemption proof';

        // Check if reward exists and is active
        const [rewardCheck] = await db.query(`
            SELECT * FROM loyalty_rewards WHERE id = ? AND is_active = TRUE
        `, [rewardId]);

        if (rewardCheck.length === 0) {
            console.log('❌ Reward not found or inactive');
            return;
        }

        const reward = rewardCheck[0];
        console.log(`   Reward found: ${reward.name} (${reward.points_required} points)`);

        // Check if reward requires order
        if (reward.requires_order && !orderId) {
            console.log('❌ Reward requires order but no orderId provided');
            return;
        }

        // Check minimum points
        const minimumPoints = parseInt(settings.find(s => s.setting_key === 'minimum_points_redemption')?.setting_value || '10');
        if (reward.points_required < minimumPoints) {
            console.log(`❌ Reward points (${reward.points_required}) below minimum (${minimumPoints})`);
            return;
        }

        // Check customer has enough points
        if (customer.loyalty_points < reward.points_required) {
            console.log(`❌ Customer has ${customer.loyalty_points} points, needs ${reward.points_required}`);
            return;
        }

        // Check existing redemptions
        const [existingRedemptions] = await db.query(`
            SELECT COUNT(*) as count FROM loyalty_reward_redemptions 
            WHERE customer_id = ? AND reward_id = ? AND status IN ('pending', 'completed')
            AND redemption_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
        `, [customerId, rewardId, reward.validity_days || 30]);

        if (existingRedemptions[0].count >= (reward.max_redemptions_per_customer || 999)) {
            console.log(`❌ Maximum redemptions (${reward.max_redemptions_per_customer}) already reached`);
            return;
        }

        console.log('✅ All validation checks passed!');
        console.log('✅ Reward should be redeemable');

        // 5. Check if there are any database constraints or triggers
        console.log('\n5️⃣ Checking database structure...');
        const [tableInfo] = await db.query(`
            DESCRIBE loyalty_reward_redemptions
        `);

        console.log('   loyalty_reward_redemptions table structure:');
        tableInfo.forEach(column => {
            console.log(`   - ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${column.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
        });

        console.log('\n✅ Test complete!');

    } catch (error) {
        console.error('❌ Error during test:', error);
    } finally {
        process.exit(0);
    }
}

testRewardRedemption();
