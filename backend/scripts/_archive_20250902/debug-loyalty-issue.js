const db = require('../config/db');
require('dotenv').config();

async function debugLoyaltyIssue() {
    try {
        console.log('🔍 Debugging loyalty system...\n');

        // 1. Check if customers table exists and has data
        console.log('1. Checking customers table...');
        try {
            const [customersCount] = await db.query('SELECT COUNT(*) as count FROM customers');
            console.log(`   - Total customers: ${customersCount[0].count}`);

            if (customersCount[0].count > 0) {
                const [sampleCustomers] = await db.query('SELECT id, full_name, email, loyalty_points FROM customers LIMIT 3');
                console.log('   - Sample customers:');
                sampleCustomers.forEach(customer => {
                    console.log(`     * ${customer.full_name} (ID: ${customer.id}): ${customer.loyalty_points} points`);
                });
            }
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }

        // 2. Check if loyalty_transactions table exists
        console.log('\n2. Checking loyalty_transactions table...');
        try {
            const [transactionsCount] = await db.query('SELECT COUNT(*) as count FROM loyalty_transactions');
            console.log(`   - Total loyalty transactions: ${transactionsCount[0].count}`);
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }

        // 3. Check if orders table has customer data
        console.log('\n3. Checking orders table...');
        try {
            const [ordersCount] = await db.query('SELECT COUNT(*) as count FROM orders WHERE customer_id IS NOT NULL');
            console.log(`   - Total orders with customer_id: ${ordersCount[0].count}`);

            if (ordersCount[0].count > 0) {
                const [sampleOrders] = await db.query(`
                    SELECT o.id, o.order_id, o.customer_id, o.total_price, o.payment_status, c.full_name
                    FROM orders o
                    LEFT JOIN customers c ON o.customer_id = c.id
                    WHERE o.customer_id IS NOT NULL
                    ORDER BY o.created_at DESC
                    LIMIT 3
                `);
                console.log('   - Sample orders with customers:');
                sampleOrders.forEach(order => {
                    console.log(`     * Order ${order.order_id}: ${order.full_name || 'Unknown'} (ID: ${order.customer_id}), Amount: ${order.total_price}, Status: ${order.payment_status}`);
                });
            }
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }

        // 4. Test the specific customer loyalty query
        console.log('\n4. Testing customer loyalty query...');
        try {
            // Get a customer ID to test with
            const [testCustomer] = await db.query('SELECT id FROM customers LIMIT 1');

            if (testCustomer.length > 0) {
                const customerId = testCustomer[0].id;
                console.log(`   - Testing with customer ID: ${customerId}`);

                const [customerResult] = await db.query(`
                    SELECT 
                        c.loyalty_points,
                        c.created_at as member_since,
                        COUNT(DISTINCT o.id) as total_orders,
                        SUM(o.total_price) as total_spent
                    FROM customers c
                    LEFT JOIN orders o ON c.id = o.customer_id AND o.payment_status = 'paid'
                    WHERE c.id = ?
                    GROUP BY c.id, c.loyalty_points, c.created_at
                `, [customerId]);

                if (customerResult.length > 0) {
                    console.log('   ✅ Customer loyalty query successful:');
                    console.log(`     - Loyalty points: ${customerResult[0].loyalty_points}`);
                    console.log(`     - Total orders: ${customerResult[0].total_orders}`);
                    console.log(`     - Total spent: ${customerResult[0].total_spent}`);
                } else {
                    console.log('   ❌ Customer loyalty query returned no results');
                }
            } else {
                console.log('   ❌ No customers found to test with');
            }
        } catch (error) {
            console.log(`   ❌ Error testing customer loyalty query: ${error.message}`);
        }

        // 5. Check if loyalty_settings table exists
        console.log('\n5. Checking loyalty_settings table...');
        try {
            const [settingsCount] = await db.query('SELECT COUNT(*) as count FROM loyalty_settings');
            console.log(`   - Total loyalty settings: ${settingsCount[0].count}`);

            if (settingsCount[0].count > 0) {
                const [settings] = await db.query('SELECT setting_key, setting_value FROM loyalty_settings');
                console.log('   - Loyalty settings:');
                settings.forEach(setting => {
                    console.log(`     * ${setting.setting_key}: ${setting.setting_value}`);
                });
            }
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }

        console.log('\n✅ Debug complete!');

    } catch (error) {
        console.error('❌ Debug failed:', error);
    } finally {
        process.exit(0);
    }
}

debugLoyaltyIssue();