const db = require('../config/db');
require('dotenv').config();

async function debugOrderIssues() {
    try {
        console.log('🔍 Debugging order issues...\n');

        // 1. Check the specific problematic order
        console.log('1. Checking the problematic order...');
        const [problemOrder] = await db.query(`
            SELECT 
                o.id,
                o.order_id,
                o.created_at,
                o.total_price,
                o.payment_status,
                o.status,
                o.items,
                c.full_name
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            WHERE o.order_id LIKE '%da8b197c-76b5-11f0-9a22-a036bc2e54ba%'
            OR o.order_id LIKE '%da8b197c%'
        `);

        if (problemOrder.length > 0) {
            const order = problemOrder[0];
            console.log('   Found order:');
            console.log(`     - ID: ${order.id}`);
            console.log(`     - Order ID: ${order.order_id}`);
            console.log(`     - Created: ${order.created_at}`);
            console.log(`     - Total: ${order.total_price}`);
            console.log(`     - Status: ${order.status}`);
            console.log(`     - Payment: ${order.payment_status}`);
            console.log(`     - Customer: ${order.full_name}`);
            
            // Parse items
            try {
                const items = JSON.parse(order.items || '[]');
                console.log(`     - Items: ${JSON.stringify(items, null, 2)}`);
            } catch (e) {
                console.log(`     - Items parse error: ${e.message}`);
            }
        } else {
            console.log('   ❌ Order not found');
        }

        // 2. Check loyalty transactions for this order
        console.log('\n2. Checking loyalty transactions...');
        const [transactions] = await db.query(`
            SELECT * FROM loyalty_transactions 
            WHERE order_id = ? OR order_id = ?
        `, [problemOrder[0]?.id, problemOrder[0]?.order_id]);

        if (transactions.length > 0) {
            console.log('   Loyalty transactions found:');
            transactions.forEach(tx => {
                console.log(`     - ID: ${tx.id}, Type: ${tx.transaction_type}, Points: ${tx.points_earned || tx.points_redeemed}, Order: ${tx.order_id}`);
            });
        } else {
            console.log('   ❌ No loyalty transactions found for this order');
        }

        // 3. Check recent orders for the customer
        console.log('\n3. Checking recent orders for customer...');
        const [recentOrders] = await db.query(`
            SELECT 
                o.id,
                o.order_id,
                o.created_at,
                o.total_price,
                o.payment_status,
                o.status
            FROM orders o
            WHERE o.customer_id = ?
            ORDER BY o.created_at DESC
            LIMIT 5
        `, [problemOrder[0]?.customer_id || 1]);

        console.log('   Recent orders:');
        recentOrders.forEach(order => {
            console.log(`     - ${order.order_id}: ${order.created_at} - ₱${order.total_price} - ${order.status}`);
        });

        // 4. Check if there are any orders with invalid dates
        console.log('\n4. Checking for orders with invalid dates...');
        const [invalidDateOrders] = await db.query(`
            SELECT 
                id, order_id, created_at, total_price, customer_id
            FROM orders 
            WHERE created_at = '1970-01-01 00:00:00' 
            OR created_at IS NULL
            OR created_at < '2020-01-01'
            LIMIT 10
        `);

        if (invalidDateOrders.length > 0) {
            console.log(`   Found ${invalidDateOrders.length} orders with invalid dates:`);
            invalidDateOrders.forEach(order => {
                console.log(`     - ${order.order_id}: ${order.created_at} - ₱${order.total_price}`);
            });
        } else {
            console.log('   ✅ No orders with invalid dates found');
        }

        console.log('\n✅ Debug complete!');

    } catch (error) {
        console.error('❌ Debug failed:', error);
    } finally {
        process.exit(0);
    }
}

debugOrderIssues();
