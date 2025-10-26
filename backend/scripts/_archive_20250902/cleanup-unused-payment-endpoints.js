const db = require('../config/db');

async function cleanupUnusedPaymentEndpoints() {
    try {
        console.log('=== Cleaning Up Unused Payment Endpoints ===');

        // Step 1: Check which payment verification endpoints are actually being used
        console.log('1. Analyzing payment verification usage...');

        // Check customer order verification usage
        const [customerVerifications] = await db.query(`
            SELECT COUNT(*) as count 
            FROM payment_transactions pt
            JOIN orders o ON pt.order_id = o.order_id
            WHERE o.customer_id IS NOT NULL 
            AND pt.reference LIKE '%Verified by%'
        `);

        console.log('Customer order verifications:', customerVerifications[0].count);

        // Check admin order verification usage
        const [adminVerifications] = await db.query(`
            SELECT COUNT(*) as count 
            FROM payment_transactions pt
            JOIN orders o ON pt.order_id = o.order_id
            WHERE o.customer_id IS NULL 
            AND pt.reference LIKE '%Verified by%'
        `);

        console.log('Admin order verifications:', adminVerifications[0].count);

        // Check total payment transactions
        const [totalTransactions] = await db.query(`
            SELECT COUNT(*) as count FROM payment_transactions
        `);

        console.log('Total payment transactions:', totalTransactions[0].count);

        // Step 2: Check for orders with missing ingredient deduction
        console.log('\n2. Checking for orders with missing ingredient deduction...');

        // Check orders that are paid but have empty status (indicating missing verification)
        const [missingDeduction] = await db.query(`
            SELECT 
                o.id,
                o.order_id,
                o.customer_name,
                o.status,
                o.payment_status,
                o.payment_method,
                o.created_at
            FROM orders o
            WHERE o.payment_status = 'paid' 
            AND o.payment_method = 'cash'
            AND (o.status = '' OR o.status = 'pending_verification')
            ORDER BY o.created_at DESC
            LIMIT 10
        `);

        console.log('Orders missing ingredient deduction:', missingDeduction.length);
        missingDeduction.forEach(order => {
            console.log(`- ${order.order_id}: ${order.customer_name} (${order.status})`);
        });

        // Step 3: Check current sugar inventory
        const [sugarResult] = await db.query('SELECT id, name, actual_quantity FROM ingredients WHERE name LIKE "%sugar%"');
        console.log('\n3. Current sugar inventory:', sugarResult[0]);

        // Step 4: Check payment transaction patterns
        console.log('\n4. Analyzing payment transaction patterns...');

        const [paymentPatterns] = await db.query(`
            SELECT 
                reference,
                COUNT(*) as count
            FROM payment_transactions 
            GROUP BY reference 
            ORDER BY count DESC 
            LIMIT 5
        `);

        console.log('Payment transaction patterns:');
        paymentPatterns.forEach(pattern => {
            console.log(`- ${pattern.reference}: ${pattern.count} times`);
        });

        // Step 5: Recommendations
        console.log('\n=== RECOMMENDATIONS ===');

        if (customerVerifications[0].count === 0) {
            console.log('❌ Customer order verification endpoint is NOT being used');
            console.log('💡 This is why customer orders are not deducting ingredients');
        } else {
            console.log('✅ Customer order verification endpoint is being used');
        }

        if (adminVerifications[0].count === 0) {
            console.log('❌ Admin order verification endpoint is NOT being used');
            console.log('💡 Can be removed to reduce confusion');
        } else {
            console.log('✅ Admin order verification endpoint is being used');
        }

        if (missingDeduction.length > 0) {
            console.log(`❌ Found ${missingDeduction.length} orders missing ingredient deduction`);
            console.log('💡 These need to be processed through the correct verification endpoint');
        }

        console.log('\n=== SOLUTION ===');
        console.log('1. Use ONLY /api/customer/verify-payment/:orderId for customer orders');
        console.log('2. Remove unused admin/staff verification endpoints');
        console.log('3. Ensure all cash payments go through ingredient deduction');

        process.exit();

    } catch (error) {
        console.error('Cleanup analysis failed:', error);
        process.exit(1);
    }
}

cleanupUnusedPaymentEndpoints();