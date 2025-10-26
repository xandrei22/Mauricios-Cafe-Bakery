const db = require('../config/db');

async function investigatePaymentSystem() {
    try {
        console.log('=== Investigating Payment System ===');

        // Step 1: Check recent orders and their payment flow
        console.log('1. Recent orders and payment status...');

        const [recentOrders] = await db.query(`
            SELECT 
                o.id,
                o.order_id,
                o.customer_name,
                o.status,
                o.payment_status,
                o.payment_method,
                o.created_at,
                o.updated_at
            FROM orders o
            ORDER BY o.created_at DESC
            LIMIT 10
        `);

        recentOrders.forEach(order => {
            console.log(`- ${order.order_id}: ${order.customer_name} (${order.status}, ${order.payment_status}, ${order.payment_method}) - Created: ${order.created_at}`);
        });

        // Step 2: Check payment transactions
        console.log('\n2. Recent payment transactions...');

        const [recentPayments] = await db.query(`
            SELECT 
                pt.id,
                pt.order_id,
                pt.payment_method,
                pt.amount,
                pt.status,
                pt.reference,
                pt.created_at
            FROM payment_transactions pt
            ORDER BY pt.created_at DESC
            LIMIT 10
        `);

        recentPayments.forEach(payment => {
            console.log(`- ${payment.order_id}: ${payment.payment_method} ${payment.amount} (${payment.status}) - Ref: ${payment.reference}`);
        });

        // Step 3: Check for any payment verification attempts
        console.log('\n3. Checking for payment verification attempts...');

        const [verificationAttempts] = await db.query(`
            SELECT 
                pt.reference,
                COUNT(*) as count
            FROM payment_transactions pt
            WHERE pt.reference LIKE '%Verified by%' OR pt.reference LIKE '%verify%'
            GROUP BY pt.reference
        `);

        if (verificationAttempts.length > 0) {
            verificationAttempts.forEach(attempt => {
                console.log(`- ${attempt.reference}: ${attempt.count} times`);
            });
        } else {
            console.log('❌ NO payment verification attempts found!');
        }

        // Step 4: Check current sugar inventory
        const [sugarResult] = await db.query('SELECT id, name, actual_quantity FROM ingredients WHERE name LIKE "%sugar%"');
        console.log('\n4. Current sugar inventory:', sugarResult[0]);

        // Step 5: Check if there are any orders that should have deducted ingredients
        console.log('\n5. Orders that should have deducted ingredients...');

        const [ordersForDeduction] = await db.query(`
            SELECT 
                o.id,
                o.order_id,
                o.customer_name,
                o.status,
                o.payment_status,
                o.payment_method,
                o.items
            FROM orders o
            WHERE o.payment_status = 'paid' 
            AND o.payment_method = 'cash'
            AND o.status = 'preparing'
            ORDER BY o.created_at DESC
            LIMIT 5
        `);

        console.log(`Found ${ordersForDeduction.length} orders that should have deducted ingredients:`);
        ordersForDeduction.forEach(order => {
            try {
                const items = JSON.parse(order.items);
                const hasCoffee = items.some(item =>
                    (item.menuItemId === 101 || item.id === 101) &&
                    item.name && item.name.toLowerCase().includes('coffee')
                );
                console.log(`- ${order.order_id}: ${order.customer_name} - Has coffee: ${hasCoffee ? 'YES' : 'NO'}`);
            } catch (e) {
                console.log(`- ${order.order_id}: ${order.customer_name} - Error parsing items`);
            }
        });

        // Step 6: Analysis
        console.log('\n=== ANALYSIS ===');

        if (verificationAttempts.length === 0) {
            console.log('❌ CRITICAL ISSUE: No payment verification is happening at all!');
            console.log('💡 This means ALL orders are bypassing ingredient deduction');
            console.log('💡 The payment system is not integrated with the verification flow');
        }

        console.log('\n=== ROOT CAUSE ===');
        console.log('1. Orders are being created and paid');
        console.log('2. But NO payment verification is happening');
        console.log('3. Therefore NO ingredient deduction is triggered');
        console.log('4. The payment system is completely separate from ingredient deduction');

        console.log('\n=== SOLUTION ===');
        console.log('1. Integrate ingredient deduction into the payment processing flow');
        console.log('2. OR force all payments to go through verification endpoints');
        console.log('3. OR create a payment trigger that automatically deducts ingredients');

        process.exit();

    } catch (error) {
        console.error('Investigation failed:', error);
        process.exit(1);
    }
}

