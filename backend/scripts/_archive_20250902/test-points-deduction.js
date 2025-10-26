const db = require('../config/db');
require('dotenv').config();

async function testPointsDeduction() {
    try {
        console.log('🧪 Testing points deduction for reward claiming...\n');

        const customerId = 49;
        const rewardId = 65; // COFEEE reward

        // 1. Check current customer points
        console.log('1️⃣ Checking current customer points...');
        const [customers] = await db.query(`
            SELECT id, full_name, loyalty_points, email
            FROM customers WHERE id = ?
        `, [customerId]);

        if (customers.length === 0) {
            console.log('❌ Customer not found');
            return;
        }

        const customer = customers[0];
        console.log(`   Customer: ${customer.full_name} (${customer.email})`);
        console.log(`   Current points: ${customer.loyalty_points}`);

        // 2. Check reward details
        console.log('\n2️⃣ Checking reward details...');
        const [rewards] = await db.query(`
            SELECT * FROM loyalty_rewards WHERE id = ?
        `, [rewardId]);

        if (rewards.length === 0) {
            console.log('❌ Reward not found');
            return;
        }

        const reward = rewards[0];
        console.log(`   Reward: ${reward.name}`);
        console.log(`   Points required: ${reward.points_required}`);
        console.log(`   Max redemptions: ${reward.max_redemptions_per_customer}`);

        // 3. Check recent redemptions
        console.log('\n3️⃣ Checking recent redemptions...');
        const [recentRedemptions] = await db.query(`
            SELECT COUNT(*) as count FROM loyalty_reward_redemptions 
            WHERE customer_id = ? AND reward_id = ? AND status IN ('pending', 'completed')
            AND redemption_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `, [customerId, rewardId]);

        console.log(`   Recent redemptions: ${recentRedemptions[0].count}`);

        // 4. Check if customer can redeem
        const canRedeem = customer.loyalty_points >= reward.points_required &&
            recentRedemptions[0].count < reward.max_redemptions_per_customer;

        console.log(`\n4️⃣ Can customer redeem? ${canRedeem ? '✅ YES' : '❌ NO'}`);
        
        if (!canRedeem) {
            if (customer.loyalty_points < reward.points_required) {
                console.log(`   ❌ Insufficient points: ${customer.loyalty_points} < ${reward.points_required}`);
            }
            if (recentRedemptions[0].count >= reward.max_redemptions_per_customer) {
                console.log(`   ❌ Max redemptions reached: ${recentRedemptions[0].count} >= ${reward.max_redemptions_per_customer}`);
            }
        }

        // 5. Check loyalty transactions
        console.log('\n5️⃣ Checking loyalty transactions...');
        const [transactions] = await db.query(`
            SELECT * FROM loyalty_transactions 
            WHERE customer_id = ? AND reward_id = ? AND transaction_type = 'redeem'
            ORDER BY created_at DESC
            LIMIT 5
        `, [customerId, rewardId]);

        console.log(`   Recent redeem transactions: ${transactions.length}`);
        transactions.forEach(tx => {
            console.log(`   - ${tx.description}: ${tx.points_redeemed} points at ${tx.created_at}`);
        });

        // 6. Check reward redemptions
        console.log('\n6️⃣ Checking reward redemptions...');
        const [redemptions] = await db.query(`
            SELECT * FROM loyalty_reward_redemptions 
            WHERE customer_id = ? AND reward_id = ?
            ORDER BY created_at DESC
            LIMIT 5
        `, [customerId, rewardId]);

        console.log(`   Recent redemptions: ${redemptions.length}`);
        redemptions.forEach(redemption => {
            console.log(`   - Status: ${redemption.status}, Points: ${redemption.points_redeemed}, Created: ${redemption.created_at}`);
        });

        console.log('\n✅ Points deduction test complete!');

    } catch (error) {
        console.error('❌ Error during test:', error.message);
    } finally {
        process.exit(0);
    }
}

testPointsDeduction();

