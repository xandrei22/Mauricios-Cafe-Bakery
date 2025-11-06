// Test script to verify staff_id assignment is working
const db = require('../config/db');

async function testStaffIdAssignment() {
    try {
        console.log('🧪 Testing staff_id assignment...');

        // Check if there are any orders at all
        const [allOrders] = await db.query(`
            SELECT COUNT(*) as total_orders,
                   COUNT(CASE WHEN staff_id IS NOT NULL THEN 1 END) as orders_with_staff,
                   COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders,
                   COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders
            FROM orders
        `);

        console.log('📊 Order Statistics:', allOrders[0]);

        // Check if there are any staff users
        const [staffUsers] = await db.query(`
            SELECT id, username, email, role FROM users WHERE role IN ('admin', 'staff')
        `);

        console.log('👥 Staff Users:', staffUsers);

        // Show recent orders
        const [recentOrders] = await db.query(`
            SELECT 
                order_id, 
                customer_name, 
                total_price, 
                status, 
                payment_status, 
                staff_id,
                order_time
            FROM orders 
            ORDER BY order_time DESC 
            LIMIT 5
        `);

        console.log('📋 Recent Orders:', recentOrders);

        if (allOrders[0].orders_with_staff === 0 && allOrders[0].total_orders > 0) {
            console.log('⚠️  No orders have staff_id assigned. Need to run fix script.');
        } else if (allOrders[0].orders_with_staff > 0) {
            console.log('✅ Some orders have staff_id assigned.');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        process.exit(0);
    }
}







