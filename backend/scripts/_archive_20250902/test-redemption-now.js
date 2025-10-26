const db = require('../config/db');
require('dotenv').config();

async function testRedemptionNow() {
    try {
        console.log('🧪 Testing reward redemption now that columns are fixed...\n');

        // Test the exact INSERT statement that was failing
        const customerId = 49;
        const rewardId = 65;
        const orderId = null;
        const redemptionProof = 'Test redemption proof';
        const staffId = null;
        const expirationTime = new Date(Date.now() + 20 * 60 * 1000); // 20 minutes from now

        console.log('1️⃣ Testing INSERT statement...');
        console.log(`   Customer ID: ${customerId}`);
        console.log(`   Reward ID: ${rewardId}`);
        console.log(`   Order ID: ${orderId}`);
        console.log(`   Expires at: ${expirationTime}`);

        // Try the INSERT
        const [insertResult] = await db.query(`
            INSERT INTO loyalty_reward_redemptions 
            (customer_id, reward_id, order_id, points_redeemed, redemption_proof, staff_id, status, expires_at) 
            VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
        `, [customerId, rewardId, orderId, 50, redemptionProof, staffId, expirationTime]);

        console.log('✅ INSERT successful!');
        console.log(`   Insert ID: ${insertResult.insertId}`);

        // Check if the record was created
        const [checkRecord] = await db.query(`
            SELECT * FROM loyalty_reward_redemptions WHERE id = ?
        `, [insertResult.insertId]);

        if (checkRecord.length > 0) {
            const record = checkRecord[0];
            console.log('\n2️⃣ Record created successfully:');
            console.log(`   ID: ${record.id}`);
            console.log(`   Customer ID: ${record.customer_id}`);
            console.log(`   Reward ID: ${record.reward_id}`);
            console.log(`   Status: ${record.status}`);
            console.log(`   Expires at: ${record.expires_at}`);
            console.log(`   Created at: ${record.created_at}`);
        }

        // Clean up - delete the test record
        console.log('\n3️⃣ Cleaning up test record...');
        await db.query(`
            DELETE FROM loyalty_reward_redemptions WHERE id = ?
        `, [insertResult.insertId]);
        console.log('✅ Test record deleted');

        console.log('\n🎉 Reward redemption is now working!');

    } catch (error) {
        console.error('❌ Error during test:', error);
        console.error('   Error code:', error.code);
        console.error('   SQL State:', error.sqlState);
        console.error('   SQL Message:', error.sqlMessage);
    } finally {
        process.exit(0);
    }
}

testRedemptionNow();
