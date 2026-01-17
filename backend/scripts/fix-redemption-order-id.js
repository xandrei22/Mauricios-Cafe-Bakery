const db = require('../config/db');
require('dotenv').config();

async function fixRedemptionOrderId() {
    try {
        console.log('🔧 Fixing order_id column to allow NULL values in loyalty_reward_redemptions...\n');

        // Check current order_id column definition
        console.log('1️⃣ Checking current order_id column definition...');
        const [columns] = await db.query(`
            DESCRIBE loyalty_reward_redemptions
        `);

        const orderIdColumn = columns.find(col => col.Field === 'order_id');
        if (orderIdColumn) {
            console.log(`   Current order_id: ${orderIdColumn.Type} ${orderIdColumn.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);

            if (orderIdColumn.Null === 'YES') {
                console.log('✅ order_id already allows NULL values. No changes needed.');
                process.exit(0);
            }
        }

        // Drop foreign key constraints on order_id
        console.log('\n2️⃣ Finding and dropping foreign key constraints on order_id...');
        try {
            // Find the constraint name
            const [constraints] = await db.query(`
                SELECT CONSTRAINT_NAME 
                FROM information_schema.KEY_COLUMN_USAGE 
                WHERE TABLE_NAME = 'loyalty_reward_redemptions' 
                AND COLUMN_NAME = 'order_id' 
                AND REFERENCED_TABLE_NAME IS NOT NULL
                AND TABLE_SCHEMA = DATABASE()
            `);

            if (constraints.length === 0) {
                console.log('   No foreign key constraint found on order_id');
            } else {
                for (const constraint of constraints) {
                    const constraintName = constraint.CONSTRAINT_NAME;
                    console.log(`   Found constraint: ${constraintName}`);
                    try {
                        await db.query(`
                            ALTER TABLE loyalty_reward_redemptions 
                            DROP FOREIGN KEY \`${constraintName}\`
                        `);
                        console.log(`   ✅ Dropped constraint: ${constraintName}`);
                    } catch (dropErr) {
                        console.log(`   ⚠️  Could not drop constraint ${constraintName}:`, dropErr.message);
                    }
                }
            }
        } catch (err) {
            console.log('   ⚠️  Could not query for foreign keys:', err.message);
            console.log('   Trying common constraint names...');
            // Try common constraint names
            const commonNames = ['loyalty_reward_redemptions_ibfk_3', 'fk_redemption_order_id'];
            for (const name of commonNames) {
                try {
                    await db.query(`
                        ALTER TABLE loyalty_reward_redemptions 
                        DROP FOREIGN KEY \`${name}\`
                    `);
                    console.log(`   ✅ Dropped constraint: ${name}`);
                    break;
                } catch (dropErr) {
                    // Ignore if constraint doesn't exist
                }
            }
        }

        // Make order_id nullable
        console.log('\n3️⃣ Making order_id column nullable...');
        await db.query(`
            ALTER TABLE loyalty_reward_redemptions 
            MODIFY COLUMN order_id VARCHAR(50) NULL
        `);
        console.log('✅ order_id column is now nullable');

        // Re-add foreign key constraint with ON DELETE SET NULL
        console.log('\n4️⃣ Re-adding foreign key constraint with ON DELETE SET NULL...');
        try {
            await db.query(`
                ALTER TABLE loyalty_reward_redemptions 
                ADD CONSTRAINT fk_redemption_order_id 
                FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE SET NULL
            `);
            console.log('✅ Foreign key constraint re-added');
        } catch (err) {
            console.log('   Note: Could not add foreign key (may already exist):', err.message);
        }

        // Verify the change
        console.log('\n5️⃣ Verifying the change...');
        const [updatedColumns] = await db.query(`
            DESCRIBE loyalty_reward_redemptions
        `);

        const updatedOrderIdColumn = updatedColumns.find(col => col.Field === 'order_id');
        if (updatedOrderIdColumn) {
            console.log(`   Updated order_id: ${updatedOrderIdColumn.Type} ${updatedOrderIdColumn.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
            if (updatedOrderIdColumn.Null === 'YES') {
                console.log('\n✅ order_id column fix complete! Customers can now redeem rewards without an order.');
            } else {
                console.log('\n❌ order_id column is still NOT NULL. Please check the database manually.');
            }
        }

    } catch (error) {
        console.error('❌ Error fixing order_id column:', error);
        console.error('   Code:', error.code);
        console.error('   Message:', error.message);
    } finally {
        await db.end();
        process.exit(0);
    }
}

fixRedemptionOrderId();