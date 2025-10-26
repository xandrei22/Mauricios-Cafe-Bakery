const db = require('../config/db');
require('dotenv').config();

async function checkLoyaltyTransactions() {
    try {
        console.log('🔍 Checking loyalty_transactions table structure...\n');
        
        // Check table structure
        const [columns] = await db.query('DESCRIBE loyalty_transactions');
        console.log('loyalty_transactions table columns:');
        columns.forEach(col => {
            console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });
        
        // Check if order_id is NOT NULL
        const orderIdColumn = columns.find(col => col.Field === 'order_id');
        if (orderIdColumn) {
            console.log(`\n⚠️ order_id column: ${orderIdColumn.Type} ${orderIdColumn.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
            
            if (orderIdColumn.Null === 'NO') {
                console.log('❌ This is the problem! order_id cannot be NULL in loyalty_transactions');
                console.log('   But the code tries to insert NULL when redeeming rewards without orders');
            }
        }
        
        // Check if there are any existing records with NULL order_id
        const [nullOrderRecords] = await db.query(`
            SELECT COUNT(*) as count FROM loyalty_transactions WHERE order_id IS NULL
        `);
        console.log(`\nRecords with NULL order_id: ${nullOrderRecords[0].count}`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit(0);
    }
}

checkLoyaltyTransactions();
