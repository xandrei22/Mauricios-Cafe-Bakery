const db = require('../config/db');
require('dotenv').config();

async function checkFixedDates() {
    try {
        console.log('🔍 Checking if invalid dates were fixed...\n');

        // 1. Check remaining invalid dates
        const [remainingInvalid] = await db.query(`
            SELECT COUNT(*) as count
            FROM orders 
            WHERE created_at = '1970-01-01 00:00:00' 
            OR created_at IS NULL
            OR created_at < '2020-01-01'
        `);

        console.log(`📊 Orders with invalid dates: ${remainingInvalid[0].count}`);

        if (remainingInvalid[0].count === 0) {
            console.log('✅ All invalid dates have been fixed!');
        } else {
            console.log('❌ Some orders still have invalid dates');
        }

        // 2. Show sample of recent orders with proper dates
        console.log('\n📋 Sample of recent orders:');
        const [recentOrders] = await db.query(`
            SELECT id, order_id, created_at, total_price, customer_id
            FROM orders 
            WHERE created_at >= '2020-01-01'
            ORDER BY created_at DESC
            LIMIT 10
        `);

        recentOrders.forEach(order => {
            const date = new Date(order.created_at);
            console.log(`  - ${order.order_id}: ${date.toLocaleString()} - ₱${order.total_price}`);
        });

        // 3. Check the specific problematic order from the image
        console.log('\n🔍 Checking the specific order from the image...');
        const [problemOrder] = await db.query(`
            SELECT 
                o.id,
                o.order_id,
                o.created_at,
                o.total_price,
                o.payment_status,
                o.status,
                c.full_name
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            WHERE o.order_id LIKE '%da8b197c%'
        `);

        if (problemOrder.length > 0) {
            const order = problemOrder[0];
            const date = new Date(order.created_at);
            console.log(`   Found order: ${order.order_id}`);
            console.log(`   - Date: ${order.created_at} → ${date.toLocaleString()}`);
            console.log(`   - Total: ₱${order.total_price}`);
            console.log(`   - Status: ${order.status}`);
            console.log(`   - Customer: ${order.full_name}`);
        }

        // 4. Check loyalty transactions for points
        console.log('\n💰 Checking loyalty points for orders...');
        const [loyaltyData] = await db.query(`
            SELECT 
                o.order_id,
                o.total_price,
                COALESCE(lt.points_earned, 0) as points_earned
            FROM orders o
            LEFT JOIN loyalty_transactions lt ON o.id = lt.order_id AND lt.transaction_type = 'earn'
            WHERE o.customer_id = 49
            ORDER BY o.created_at DESC
            LIMIT 5
        `);

        loyaltyData.forEach(order => {
            console.log(`  - ${order.order_id}: ₱${order.total_price} → ${order.points_earned} points`);
        });

        console.log('\n✅ Date check complete!');

    } catch (error) {
        console.error('❌ Error checking dates:', error);
    } finally {
        process.exit(0);
    }
}

checkFixedDates();
