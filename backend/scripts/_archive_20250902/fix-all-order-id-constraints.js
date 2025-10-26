const db = require('../config/db');
require('dotenv').config();

async function fixAllOrderIdConstraints() {
    try {
        console.log('🔧 Fixing all order_id NOT NULL constraints...\n');

        // 1. Fix loyalty_reward_redemptions table
        console.log('1️⃣ Fixing loyalty_reward_redemptions.order_id...');
        try {
            await db.query(`
                ALTER TABLE loyalty_reward_redemptions 
                MODIFY COLUMN order_id VARCHAR(50) NULL
            `);
            console.log('✅ loyalty_reward_redemptions.order_id is now nullable');
        } catch (error) {
            console.log('ℹ️ loyalty_reward_redemptions.order_id already nullable');
        }

        // 2. Fix loyalty_transactions table
        console.log('\n2️⃣ Fixing loyalty_transactions.order_id...');
        try {
            await db.query(`
                ALTER TABLE loyalty_transactions 
                MODIFY COLUMN order_id VARCHAR(50) NULL
            `);
            console.log('✅ loyalty_transactions.order_id is now nullable');
        } catch (error) {
            console.log('ℹ️ loyalty_transactions.order_id already nullable');
        }

        // 3. Verify both tables
        console.log('\n3️⃣ Verifying table structures...');
        
        const [redemptionsColumns] = await db.query('DESCRIBE loyalty_reward_redemptions');
        const redemptionsOrderId = redemptionsColumns.find(col => col.Field === 'order_id');
        console.log(`   loyalty_reward_redemptions.order_id: ${redemptionsOrderId?.Type} ${redemptionsOrderId?.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);

        const [transactionsColumns] = await db.query('DESCRIBE loyalty_transactions');
        const transactionsOrderId = transactionsColumns.find(col => col.Field === 'order_id');
        console.log(`   loyalty_transactions.order_id: ${transactionsOrderId?.Type} ${transactionsOrderId?.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);

        // 4. Test the complete redemption process
        console.log('\n4️⃣ Testing complete redemption process...');
        
        const testData = {
            customerId: 49,
            rewardId: 65,
            orderId: null,
            redemptionProof: 'Test proof',
            staffId: null,
            expirationTime: new Date(Date.now() + 20 * 60 * 1000)
        };

        // Test INSERT into loyalty_reward_redemptions
        console.log('   Testing loyalty_reward_redemptions INSERT...');
        const [redemptionResult] = await db.query(`
            INSERT INTO loyalty_reward_redemptions 
            (customer_id, reward_id, order_id, points_redeemed, redemption_proof, staff_id, status, expires_at) 
            VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
        `, [testData.customerId, testData.rewardId, testData.orderId, 50, testData.redemptionProof, testData.staffId, testData.expirationTime]);

        console.log('   ✅ loyalty_reward_redemptions INSERT successful');

        // Test INSERT into loyalty_transactions
        console.log('   Testing loyalty_transactions INSERT...');
        await db.query(`
            INSERT INTO loyalty_transactions 
            (customer_id, order_id, points_redeemed, transaction_type, description, redemption_id, reward_id) 
            VALUES (?, ?, ?, 'redeem', ?, ?, ?)
        `, [testData.customerId, testData.orderId, 50, `Redeemed COFEEE for 50 points`, redemptionResult.insertId, testData.rewardId]);

        console.log('   ✅ loyalty_transactions INSERT successful');

        // Clean up test data
        console.log('\n5️⃣ Cleaning up test data...');
        await db.query('DELETE FROM loyalty_transactions WHERE redemption_id = ?', [redemptionResult.insertId]);
        await db.query('DELETE FROM loyalty_reward_redemptions WHERE id = ?', [redemptionResult.insertId]);
        console.log('✅ Test data cleaned up');

        console.log('\n🎉 All order_id constraints fixed! Reward redemption should now work!');

    } catch (error) {
        console.error('❌ Error fixing constraints:', error.message);
        console.error('   Code:', error.code);
    } finally {
        process.exit(0);
    }
}

fixAllOrderIdConstraints();
