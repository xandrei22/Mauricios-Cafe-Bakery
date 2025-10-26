const db = require('../config/db');
require('dotenv').config();

async function checkTableStructure() {
    try {
        console.log('🔍 Checking database table structure...\n');

        // Check loyalty_reward_redemptions table
        console.log('1️⃣ loyalty_reward_redemptions table:');
        const [redemptionsStructure] = await db.query(`
            DESCRIBE loyalty_reward_redemptions
        `);

        redemptionsStructure.forEach(column => {
            console.log(`   - ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${column.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
        });

        // Check loyalty_rewards table
        console.log('\n2️⃣ loyalty_rewards table:');
        const [rewardsStructure] = await db.query(`
            DESCRIBE loyalty_rewards
        `);

        rewardsStructure.forEach(column => {
            console.log(`   - ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${column.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
        });

        // Check if the expires_at column exists
        console.log('\n3️⃣ Checking for expires_at column...');
        const hasExpiresAt = redemptionsStructure.some(col => col.Field === 'expires_at');
        console.log(`   expires_at column exists: ${hasExpiresAt ? '✅ YES' : '❌ NO'}`);

        // Check if redemption_date column exists
        const hasRedemptionDate = redemptionsStructure.some(col => col.Field === 'redemption_date');
        console.log(`   redemption_date column exists: ${hasRedemptionDate ? '✅ YES' : '❌ NO'}`);

        // Check if staff_id column exists
        const hasStaffId = redemptionsStructure.some(col => col.Field === 'staff_id');
        console.log(`   staff_id column exists: ${hasStaffId ? '✅ YES' : '❌ NO'}`);

        // Check if redemption_proof column exists
        const hasRedemptionProof = redemptionsStructure.some(col => col.Field === 'redemption_proof');
        console.log(`   redemption_proof column exists: ${hasRedemptionProof ? '✅ YES' : '❌ NO'}`);

        console.log('\n✅ Table structure check complete!');

    } catch (error) {
        console.error('❌ Error checking table structure:', error);
    } finally {
        process.exit(0);
    }
}

checkTableStructure();
