const db = require('../config/db');
require('dotenv').config();

async function quickVerify() {
    try {
        console.log('🔍 Quick verification of database structure...\n');
        
        // Check table structure
        const [columns] = await db.query('DESCRIBE loyalty_reward_redemptions');
        console.log('Table columns:');
        columns.forEach(col => {
            console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });
        
        // Test INSERT with NULL order_id
        console.log('\n🧪 Testing INSERT with NULL order_id...');
        const testData = {
            customerId: 49,
            rewardId: 65,
            orderId: null,
            redemptionProof: 'Test proof',
            staffId: null,
            expirationTime: new Date(Date.now() + 20 * 60 * 1000)
        };
        
        const [insertResult] = await db.query(`
            INSERT INTO loyalty_reward_redemptions 
            (customer_id, reward_id, order_id, points_redeemed, redemption_proof, staff_id, status, expires_at) 
            VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
        `, [testData.customerId, testData.rewardId, testData.orderId, 50, testData.redemptionProof, testData.staffId, testData.expirationTime]);
        
        console.log('✅ INSERT successful! ID:', insertResult.insertId);
        
        // Clean up
        await db.query('DELETE FROM loyalty_reward_redemptions WHERE id = ?', [insertResult.insertId]);
        console.log('✅ Test record cleaned up');
        
        console.log('\n🎉 Database is ready for reward redemption!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('   Code:', error.code);
    } finally {
        process.exit(0);
    }
}

quickVerify();
