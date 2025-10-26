const db = require('../config/db');
require('dotenv').config();

async function checkLoyaltyStatus() {
    try {
        console.log('📊 Checking current loyalty points status...\n');

        const [customers] = await db.query(`
            SELECT 
                c.id,
                c.full_name,
                c.email,
                c.loyalty_points,
                COALESCE(SUM(lt.points_earned), 0) as total_earned,
                COALESCE(SUM(lt.points_redeemed), 0) as total_redeemed
            FROM customers c
            LEFT JOIN loyalty_transactions lt ON c.id = lt.customer_id
            GROUP BY c.id, c.full_name, c.email, c.loyalty_points
            ORDER BY c.loyalty_points DESC
        `);

        console.log('Current Loyalty Points Status:');
        console.log('================================');

        customers.forEach(customer => {
            console.log(`\n👤 ${customer.full_name} (${customer.email})`);
            console.log(`   - Current Points: ${customer.loyalty_points}`);
            console.log(`   - Total Earned: ${customer.total_earned}`);
            console.log(`   - Total Redeemed: ${customer.total_redeemed}`);
            console.log(`   - Available for Rewards: ${customer.loyalty_points >= 50 ? '✅ YES' : '❌ NO (needs 50+ points)'}`);
        });

        console.log('\n🎯 Reward Claiming Status:');
        console.log('==========================');

        const [rewards] = await db.query(`
            SELECT id, name, points_required, is_active 
            FROM loyalty_rewards 
            WHERE is_active = TRUE
            ORDER BY points_required ASC
        `);

        rewards.forEach(reward => {
            console.log(`\n🎁 ${reward.name}`);
            console.log(`   - Points Required: ${reward.points_required}`);
            console.log(`   - Status: ${reward.is_active ? '✅ Active' : '❌ Inactive'}`);

            customers.forEach(customer => {
                if (customer.loyalty_points >= reward.points_required) {
                    console.log(`   - ${customer.full_name}: ✅ Can claim (${customer.loyalty_points} points)`);
                } else {
                    console.log(`   - ${customer.full_name}: ❌ Cannot claim (${customer.loyalty_points}/${reward.points_required} points)`);
                }
            });
        });

        console.log('\n✅ Status check complete!');

    } catch (error) {
        console.error('❌ Error checking loyalty status:', error);
    } finally {
        process.exit(0);
    }
}

checkLoyaltyStatus();