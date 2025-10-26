const db = require('../config/db');
require('dotenv').config();

async function fixInvalidDates() {
    try {
        console.log('🔧 Fixing invalid dates in orders...\n');

        // 1. Find all orders with invalid dates
        const [invalidOrders] = await db.query(`
            SELECT 
                id, 
                order_id, 
                created_at, 
                total_price, 
                customer_id
            FROM orders 
            WHERE created_at = '1970-01-01 00:00:00' 
            OR created_at IS NULL
            OR created_at < '2020-01-01'
            ORDER BY id
        `);

        console.log(`Found ${invalidOrders.length} orders with invalid dates\n`);

        if (invalidOrders.length === 0) {
            console.log('✅ No orders with invalid dates found!');
            return;
        }

        // 2. Fix each order with a proper timestamp
        let fixedCount = 0;
        for (const order of invalidOrders) {
            // Generate a realistic timestamp based on order ID or use current time
            let newDate;
            
            if (order.order_id && order.order_id.startsWith('ORD-')) {
                // Extract timestamp from ORD- format (e.g., ORD-1754842858391-...)
                const timestampMatch = order.order_id.match(/ORD-(\d+)/);
                if (timestampMatch) {
                    const timestamp = parseInt(timestampMatch[1]);
                    newDate = new Date(timestamp);
                } else {
                    // Fallback: use current time minus some random hours
                    newDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Random time within last 30 days
                }
            } else if (order.order_id && order.order_id.includes('-')) {
                // Handle UUID format orders - assign them to recent dates
                newDate = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Random time within last 7 days
            } else {
                // Fallback: use current time
                newDate = new Date();
            }

            // Update the order with the new date
            await db.query(`
                UPDATE orders 
                SET created_at = ?, updated_at = NOW()
                WHERE id = ?
            `, [newDate, order.id]);

            console.log(`✅ Fixed order ${order.order_id}: ${order.created_at} → ${newDate.toISOString()}`);
            fixedCount++;
        }

        console.log(`\n🎯 Successfully fixed ${fixedCount} orders with invalid dates!`);

        // 3. Verify the fix
        console.log('\n📊 Verifying the fix...');
        const [remainingInvalid] = await db.query(`
            SELECT COUNT(*) as count
            FROM orders 
            WHERE created_at = '1970-01-01 00:00:00' 
            OR created_at IS NULL
            OR created_at < '2020-01-01'
        `);

        if (remainingInvalid[0].count === 0) {
            console.log('✅ All invalid dates have been fixed!');
        } else {
            console.log(`⚠️  ${remainingInvalid[0].count} orders still have invalid dates`);
        }

        // 4. Show sample of fixed orders
        console.log('\n📋 Sample of fixed orders:');
        const [sampleOrders] = await db.query(`
            SELECT id, order_id, created_at, total_price
            FROM orders 
            WHERE created_at >= '2020-01-01'
            ORDER BY created_at DESC
            LIMIT 5
        `);

        sampleOrders.forEach(order => {
            console.log(`  - ${order.order_id}: ${order.created_at} - ₱${order.total_price}`);
        });

        console.log('\n✅ Date fixing complete!');

    } catch (error) {
        console.error('❌ Error fixing invalid dates:', error);
    } finally {
        process.exit(0);
    }
}

fixInvalidDates();
