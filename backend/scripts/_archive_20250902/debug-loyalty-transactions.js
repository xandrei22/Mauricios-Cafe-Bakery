const db = require('../config/db');
require('dotenv').config();

async function debugLoyaltyTransactions() {
    try {
        console.log('🔍 Debugging loyalty_transactions table...\n');

        // 1. Check table structure
        console.log('1. Checking loyalty_transactions table structure...');
        try {
            const [columns] = await db.query(`
                SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'loyalty_transactions'
                ORDER BY ORDINAL_POSITION
            `);
            
            console.log('   - Table columns:');
            columns.forEach(col => {
                console.log(`     * ${col.COLUMN_NAME}: ${col.DATA_TYPE} (nullable: ${col.IS_NULLABLE})`);
            });
        } catch (error) {
            console.log(`   ❌ Error checking table structure: ${error.message}`);
        }

        // 2. Check if table has data
        console.log('\n2. Checking loyalty_transactions data...');
        try {
            const [count] = await db.query('SELECT COUNT(*) as count FROM loyalty_transactions');
            console.log(`   - Total transactions: ${count[0].count}`);
            
            if (count[0].count > 0) {
                const [sampleTransactions] = await db.query('SELECT * FROM loyalty_transactions LIMIT 3');
                console.log('   - Sample transactions:');
                sampleTransactions.forEach(tx => {
                    console.log(`     * ID: ${tx.id}, Customer: ${tx.customer_id}, Order: ${tx.order_id}, Type: ${tx.transaction_type}, Points: ${tx.points_earned || tx.points_redeemed || 0}`);
                });
            }
        } catch (error) {
            console.log(`   ❌ Error checking data: ${error.message}`);
        }

        // 3. Check orders table structure
        console.log('\n3. Checking orders table structure...');
        try {
            const [orderColumns] = await db.query(`
                SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'orders'
                ORDER BY ORDINAL_POSITION
            `);
            
            console.log('   - Orders table columns:');
            orderColumns.forEach(col => {
                console.log(`     * ${col.COLUMN_NAME}: ${col.DATA_TYPE} (nullable: ${col.IS_NULLABLE})`);
            });
        } catch (error) {
            console.log(`   ❌ Error checking orders structure: ${error.message}`);
        }

        // 4. Test the problematic query
        console.log('\n4. Testing the points-earned-history query...');
        try {
            // Get a customer ID to test with
            const [testCustomer] = await db.query('SELECT id FROM customers LIMIT 1');
            
            if (testCustomer.length > 0) {
                const customerId = testCustomer[0].id;
                console.log(`   - Testing with customer ID: ${customerId}`);
                
                // Test the exact query from the route
                const [orders] = await db.query(`
                    SELECT 
                        o.order_id,
                        o.created_at as order_date,
                        o.total_amount,
                        o.status,
                        o.items,
                        COALESCE(lt.points_earned, 0) as points_earned
                    FROM orders o
                    LEFT JOIN loyalty_transactions lt ON o.order_id = lt.order_id AND lt.transaction_type = 'earned'
                    WHERE o.customer_id = ? 
                    AND o.payment_status = 'paid'
                    ORDER BY o.created_at DESC
                `, [customerId]);
                
                console.log(`   ✅ Query successful: Found ${orders.length} orders`);
                if (orders.length > 0) {
                    console.log('   - Sample order data:');
                    console.log(`     * Order ID: ${orders[0].order_id}`);
                    console.log(`     * Date: ${orders[0].order_date}`);
                    console.log(`     * Amount: ${orders[0].total_amount}`);
                    console.log(`     * Points: ${orders[0].points_earned}`);
                }
            } else {
                console.log('   ❌ No customers found to test with');
            }
        } catch (error) {
            console.log(`   ❌ Query failed: ${error.message}`);
            console.log(`   - Error details:`, error);
        }

        console.log('\n✅ Debug complete!');

    } catch (error) {
        console.error('❌ Debug failed:', error);
    } finally {
        process.exit(0);
    }
}

debugLoyaltyTransactions();
