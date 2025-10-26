const db = require('../config/db');
require('dotenv').config();

async function verifyColumns() {
    try {
        console.log('🔍 Verifying table columns...\n');
        
        const [columns] = await db.query(`
            DESCRIBE loyalty_reward_redemptions
        `);
        
        console.log('loyalty_reward_redemptions table columns:');
        columns.forEach(col => {
            console.log(`  - ${col.Field}: ${col.Type}`);
        });
        
        // Check specific columns
        const hasExpiresAt = columns.some(col => col.Field === 'expires_at');
        const hasRedemptionDate = columns.some(col => col.Field === 'redemption_date');
        const hasStaffId = columns.some(col => col.Field === 'staff_id');
        const hasRedemptionProof = columns.some(col => col.Field === 'redemption_proof');
        
        console.log('\nColumn status:');
        console.log(`  expires_at: ${hasExpiresAt ? '✅ EXISTS' : '❌ MISSING'}`);
        console.log(`  redemption_date: ${hasRedemptionDate ? '✅ EXISTS' : '❌ MISSING'}`);
        console.log(`  staff_id: ${hasStaffId ? '✅ EXISTS' : '❌ MISSING'}`);
        console.log(`  redemption_proof: ${hasRedemptionProof ? '✅ EXISTS' : '❌ MISSING'}`);
        
        if (hasExpiresAt && hasRedemptionDate && hasStaffId && hasRedemptionProof) {
            console.log('\n🎉 All required columns are present!');
        } else {
            console.log('\n⚠️ Some columns are still missing');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

verifyColumns();
