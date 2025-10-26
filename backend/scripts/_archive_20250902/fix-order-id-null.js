const db = require('../config/db');
require('dotenv').config();

async function fixOrderIdNull() {
    try {
        console.log('🔧 Fixing order_id column to allow NULL values...\n');

        // Check current order_id column definition
        console.log('1️⃣ Checking current order_id column definition...');
        const [columns] = await db.query(`
            DESCRIBE loyalty_reward_redemptions
        `);

        const orderIdColumn = columns.find(col => col.Field === 'order_id');
        if (orderIdColumn) {
            console.log(`   Current order_id: ${orderIdColumn.Type} ${orderIdColumn.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
        }

        // Make order_id nullable
        console.log('\n2️⃣ Making order_id column nullable...');
        await db.query(`
            ALTER TABLE loyalty_reward_redemptions 
            MODIFY COLUMN order_id VARCHAR(50) NULL
        `);
        console.log('✅ order_id column is now nullable');

        // Verify the change
        console.log('\n3️⃣ Verifying the change...');
        const [updatedColumns] = await db.query(`
            DESCRIBE loyalty_reward_redemptions
        `);

        const updatedOrderIdColumn = updatedColumns.find(col => col.Field === 'order_id');
        if (updatedOrderIdColumn) {
            console.log(`   Updated order_id: ${updatedOrderIdColumn.Type} ${updatedOrderIdColumn.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
        }

        console.log('\n✅ order_id column fix complete!');

    } catch (error) {
        console.error('❌ Error fixing order_id column:', error);
    } finally {
        process.exit(0);
    }
}

fixOrderIdNull();
