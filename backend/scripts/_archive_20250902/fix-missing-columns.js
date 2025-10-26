const db = require('../config/db');
require('dotenv').config();

async function fixMissingColumns() {
    try {
        console.log('🔧 Fixing missing columns in loyalty_reward_redemptions table...\n');

        // Check current table structure
        console.log('1️⃣ Current table structure:');
        const [currentStructure] = await db.query(`
            DESCRIBE loyalty_reward_redemptions
        `);

        currentStructure.forEach(column => {
            console.log(`   - ${column.Field}: ${column.Type}`);
        });

        // Check if expires_at column exists
        const hasExpiresAt = currentStructure.some(col => col.Field === 'expires_at');
        
        if (!hasExpiresAt) {
            console.log('\n2️⃣ Adding missing expires_at column...');
            await db.query(`
                ALTER TABLE loyalty_reward_redemptions 
                ADD COLUMN expires_at DATETIME NULL
            `);
            console.log('✅ Added expires_at column');
        } else {
            console.log('\n✅ expires_at column already exists');
        }

        // Check if redemption_date column exists
        const hasRedemptionDate = currentStructure.some(col => col.Field === 'redemption_date');
        
        if (!hasRedemptionDate) {
            console.log('\n3️⃣ Adding missing redemption_date column...');
            await db.query(`
                ALTER TABLE loyalty_reward_redemptions 
                ADD COLUMN redemption_date DATETIME DEFAULT CURRENT_TIMESTAMP
            `);
            console.log('✅ Added redemption_date column');
        } else {
            console.log('\n✅ redemption_date column already exists');
        }

        // Check if staff_id column exists
        const hasStaffId = currentStructure.some(col => col.Field === 'staff_id');
        
        if (!hasStaffId) {
            console.log('\n4️⃣ Adding missing staff_id column...');
            await db.query(`
                ALTER TABLE loyalty_reward_redemptions 
                ADD COLUMN staff_id INT NULL
            `);
            console.log('✅ Added staff_id column');
        } else {
            console.log('\n✅ staff_id column already exists');
        }

        // Check if redemption_proof column exists
        const hasRedemptionProof = currentStructure.some(col => col.Field === 'redemption_proof');
        
        if (!hasRedemptionProof) {
            console.log('\n5️⃣ Adding missing redemption_proof column...');
            await db.query(`
                ALTER TABLE loyalty_reward_redemptions 
                ADD COLUMN redemption_proof TEXT NULL
            `);
            console.log('✅ Added redemption_proof column');
        } else {
            console.log('\n✅ redemption_proof column already exists');
        }

        // Show final table structure
        console.log('\n6️⃣ Final table structure:');
        const [finalStructure] = await db.query(`
            DESCRIBE loyalty_reward_redemptions
        `);

        finalStructure.forEach(column => {
            console.log(`   - ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });

        console.log('\n✅ All missing columns have been added!');

    } catch (error) {
        console.error('❌ Error fixing missing columns:', error);
    } finally {
        process.exit(0);
    }
}

fixMissingColumns();
