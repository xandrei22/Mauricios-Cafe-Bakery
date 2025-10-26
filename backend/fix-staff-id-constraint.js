const db = require('./config/db');

async function fixStaffIdConstraint() {
    try {
        console.log('🔧 Fixing staff_id foreign key constraint...');

        // First, drop the existing constraint if it exists
        try {
            await db.query('ALTER TABLE orders DROP FOREIGN KEY fk_orders_staff_id');
            console.log('✅ Dropped existing foreign key constraint');
        } catch (error) {
            if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
                console.log('ℹ️  Foreign key constraint does not exist, continuing...');
            } else {
                console.log('⚠️  Error dropping constraint:', error.message);
            }
        }

        // Add the constraint back with proper NULL handling
        await db.query(`
            ALTER TABLE orders 
            ADD CONSTRAINT fk_orders_staff_id 
            FOREIGN KEY (staff_id) REFERENCES users(id) 
            ON DELETE SET NULL 
            ON UPDATE CASCADE
        `);

        // Also fix the customer_id constraint to handle deletions properly
        try {
            await db.query('ALTER TABLE orders DROP FOREIGN KEY orders_ibfk_1');
            console.log('✅ Dropped existing customer_id foreign key constraint');
        } catch (error) {
            console.log('ℹ️  Customer foreign key constraint does not exist or already dropped');
        }

        await db.query(`
            ALTER TABLE orders 
            ADD CONSTRAINT fk_orders_customer_id 
            FOREIGN KEY (customer_id) REFERENCES customers(id) 
            ON DELETE CASCADE 
            ON UPDATE CASCADE
        `);
        console.log('✅ Added customer_id foreign key constraint with CASCADE delete');
        console.log('✅ Added foreign key constraint with proper NULL handling');

        // Test the constraint with a NULL value
        console.log('🧪 Testing constraint with NULL value...');
        try {
            await db.query(`
                INSERT INTO orders 
                (order_id, order_number, customer_name, items, total_price, status, payment_status, staff_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                `TEST-${Date.now()}`,
                `TEST-${Date.now()}`,
                'Test Customer',
                JSON.stringify([{ name: 'Test Item', quantity: 1, price: 10 }]),
                10,
                'pending',
                'pending',
                null
            ]);
            console.log('✅ Test insert with NULL staff_id successful');

            // Clean up test data
            await db.query('DELETE FROM orders WHERE order_id LIKE ?', [`TEST-%`]);
            console.log('✅ Cleaned up test data');

        } catch (error) {
            console.error('❌ Test insert failed:', error.message);
            throw error;
        }

        console.log('🎉 staff_id constraint fix completed successfully!');

    } catch (error) {
        console.error('❌ Error fixing staff_id constraint:', error);
        throw error;
    } finally {
        // Close the connection properly
        if (db && typeof db.end === 'function') {
            await db.end();
        }
    }
}

// Function to safely delete a customer and all their orders
async function deleteCustomerSafely(customerId) {
    try {
        console.log(`🗑️  Deleting customer ${customerId} and all associated orders...`);

        // The CASCADE constraint will automatically delete all orders
        await db.query('DELETE FROM customers WHERE id = ?', [customerId]);

        console.log('✅ Customer and all associated orders deleted successfully');

    } catch (error) {
        console.error('❌ Error deleting customer:', error);
        throw error;
    }
}

// Function to check for orphaned orders
async function checkOrphanedOrders() {
    try {
        const [orders] = await db.query(`
            SELECT o.id, o.customer_id, o.order_number, c.id as customer_exists
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            WHERE c.id IS NULL
        `);

        if (orders.length > 0) {
            console.log(`⚠️  Found ${orders.length} orphaned orders:`);
            orders.forEach(order => {
                console.log(`   - Order ${order.order_number} (ID: ${order.id}) references non-existent customer ${order.customer_id}`);
            });
        } else {
            console.log('✅ No orphaned orders found');
        }

        return orders;

    } catch (error) {
        console.error('❌ Error checking orphaned orders:', error);
        throw error;
    }
}

// Export functions for use in other files
module.exports = {
    fixStaffIdConstraint,
    deleteCustomerSafely,
    checkOrphanedOrders
};

// Run the fix if this file is executed directly
if (require.main === module) {
    fixStaffIdConstraint().catch(console.error);
}