// Fix existing orders that don't have staff_id but should have one
const db = require('../config/db');

async function fixExistingOrdersStaffId() {
    try {
        console.log('🔧 Fixing existing orders without staff_id...');

        // Find orders that don't have staff_id but have been processed
        const [ordersWithoutStaff] = await db.query(`
            SELECT id, order_id, status, payment_status, created_at, updated_at
            FROM orders 
            WHERE staff_id IS NULL 
            AND (status IN ('completed', 'ready', 'preparing') OR payment_status = 'paid')
            ORDER BY created_at DESC
        `);

        console.log(`Found ${ordersWithoutStaff.length} orders without staff_id`);

        if (ordersWithoutStaff.length === 0) {
            console.log('✅ No orders need fixing');
            return;
        }

        // For now, we'll assign these orders to a default staff member
        // In a real scenario, you might want to assign them to the admin or a specific staff member
        const [defaultStaff] = await db.query(`
            SELECT id FROM users WHERE role = 'admin' LIMIT 1
        `);

        if (defaultStaff.length === 0) {
            console.log('❌ No admin user found to assign orders to');
            return;
        }

        const defaultStaffId = defaultStaff[0].id;

        // Update orders to assign them to the default staff member
        for (const order of ordersWithoutStaff) {
            await db.query(`
                UPDATE orders 
                SET staff_id = ? 
                WHERE id = ?
            `, [defaultStaffId, order.id]);

            console.log(`✅ Updated order ${order.order_id} to staff_id ${defaultStaffId}`);
        }

        console.log(`🎉 Successfully updated ${ordersWithoutStaff.length} orders`);

    } catch (error) {
        console.error('❌ Error fixing orders:', error);
    } finally {
        process.exit(0);
    }
}

// Run the script



