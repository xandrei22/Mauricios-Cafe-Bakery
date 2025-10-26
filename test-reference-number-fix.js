const mysql = require('mysql2/promise');

// Test script to verify reference number fix
async function testReferenceNumberFix() {
    let connection;

    try {
        // Connect to database
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '', // Add your password here
            database: 'coffee_shop'
        });

        console.log('🔍 Testing reference number fix...\n');

        // 1. Check if payment_transactions table exists and has correct structure
        console.log('1. Checking payment_transactions table structure...');
        const [columns] = await connection.execute('DESCRIBE payment_transactions');
        console.log('   Columns:', columns.map(col => `${col.Field} (${col.Type})`).join(', '));

        // 2. Check recent payment transactions to see if reference numbers are being saved
        console.log('\n2. Checking recent payment transactions...');
        const [recentTransactions] = await connection.execute(`
            SELECT pt.*, o.order_id as order_uuid, o.customer_name 
            FROM payment_transactions pt 
            LEFT JOIN orders o ON pt.order_id = o.order_id 
            ORDER BY pt.created_at DESC 
            LIMIT 5
        `);

        if (recentTransactions.length === 0) {
            console.log('   No payment transactions found.');
        } else {
            console.log('   Recent transactions:');
            recentTransactions.forEach((tx, index) => {
                console.log(`   ${index + 1}. Order: ${tx.order_uuid || 'NOT FOUND'}`);
                console.log(`      Payment Method: ${tx.payment_method}`);
                console.log(`      Reference: ${tx.reference || 'NULL'}`);
                console.log(`      Transaction ID: ${tx.transaction_id}`);
                console.log(`      Amount: ${tx.amount}`);
                console.log(`      Status: ${tx.status}`);
                console.log(`      Created: ${tx.created_at}`);
                console.log('');
            });
        }

        // 3. Check if there are any orphaned payment transactions (with wrong order_id)
        console.log('3. Checking for orphaned payment transactions...');
        const [orphanedTransactions] = await connection.execute(`
            SELECT pt.* 
            FROM payment_transactions pt 
            LEFT JOIN orders o ON pt.order_id = o.order_id 
            WHERE o.order_id IS NULL
        `);

        if (orphanedTransactions.length === 0) {
            console.log('   ✅ No orphaned payment transactions found.');
        } else {
            console.log(`   ⚠️  Found ${orphanedTransactions.length} orphaned payment transactions:`);
            orphanedTransactions.forEach((tx, index) => {
                console.log(`   ${index + 1}. Order ID: ${tx.order_id}, Reference: ${tx.reference || 'NULL'}`);
            });
        }

        // 4. Test the JOIN query used in admin sales
        console.log('\n4. Testing admin sales query...');
        const [salesTest] = await connection.execute(`
            SELECT 
                o.id,
                o.order_id,
                o.customer_name,
                o.total_price as total_amount,
                o.payment_method,
                o.status,
                o.order_time as created_at,
                JSON_LENGTH(o.items) as items_count,
                pt.reference,
                o.receipt_path
            FROM orders o
            LEFT JOIN payment_transactions pt ON o.order_id = pt.order_id AND pt.status = 'completed'
            WHERE o.payment_status = 'paid'
            ORDER BY o.order_time DESC
            LIMIT 3
        `);

        if (salesTest.length === 0) {
            console.log('   No paid orders found for testing.');
        } else {
            console.log('   Sample sales data:');
            salesTest.forEach((sale, index) => {
                console.log(`   ${index + 1}. Order: ${sale.order_id}`);
                console.log(`      Customer: ${sale.customer_name}`);
                console.log(`      Payment Method: ${sale.payment_method}`);
                console.log(`      Reference: ${sale.reference || 'NULL'}`);
                console.log(`      Amount: ${sale.total_amount}`);
                console.log('');
            });
        }

        console.log('✅ Reference number fix test completed!');

    } catch (error) {
        console.error('❌ Error during test:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run the test









