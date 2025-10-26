// Test script to check staff sales performance endpoint
const db = require('./config/db');

async function testStaffSales() {
    try {
        console.log('🧪 Testing staff sales performance query...');
        
        // Test the exact query from the adminRoutes.js
        const [staffData] = await db.query(`
            SELECT 
                CONCAT(s.first_name, ' ', s.last_name) as staff_name,
                SUM(o.total_price) as total_sales
            FROM orders o
            JOIN staff s ON o.staff_id = s.id
            WHERE o.payment_status = 'paid'
                AND o.order_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY s.id, s.first_name, s.last_name
            ORDER BY total_sales DESC
            LIMIT 6
        `);
        
        console.log('📊 Staff sales data:');
        console.log(JSON.stringify(staffData, null, 2));
        
        if (staffData.length === 0) {
            console.log('⚠️  No staff sales data found. This could be because:');
            console.log('   1. No orders have staff_id populated');
            console.log('   2. No orders have payment_status = "paid"');
            console.log('   3. No staff table exists or has no data');
            console.log('   4. Orders table doesn\'t have staff_id column');
            
            // Check if staff_id column exists
            const [columns] = await db.query('DESCRIBE orders');
            const hasStaffId = columns.some(col => col.Field === 'staff_id');
            console.log(`\n🔍 Orders table has staff_id column: ${hasStaffId ? '✅ YES' : '❌ NO'}`);
            
            // Check if staff table exists
            const [staffTable] = await db.query("SHOW TABLES LIKE 'staff'");
            console.log(`🔍 Staff table exists: ${staffTable.length > 0 ? '✅ YES' : '❌ NO'}`);
            
            // Check recent orders
            const [recentOrders] = await db.query(`
                SELECT id, staff_id, payment_status, total_price, order_time 
                FROM orders 
                ORDER BY order_time DESC 
                LIMIT 5
            `);
            console.log('\n📋 Recent orders:');
            console.log(JSON.stringify(recentOrders, null, 2));
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Full error:', error);
    } finally {
        process.exit(0);
    }
}

testStaffSales();










