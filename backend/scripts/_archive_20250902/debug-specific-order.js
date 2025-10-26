const db = require('../config/db');

async function debugSpecificOrder() {
    try {
        console.log('=== Debugging Specific Customer Order ===');

        const orderId = 'ORD-1756551821630-cdnh1mo1b';

        // Get order details
        const [orderResult] = await db.query('SELECT * FROM orders WHERE order_id = ?', [orderId]);

        if (orderResult.length === 0) {
            console.log('Order not found');
            return;
        }

        const order = orderResult[0];
        console.log('Order details:', {
            id: order.id,
            order_id: order.order_id,
            customer_name: order.customer_name,
            status: order.status,
            payment_status: order.payment_status,
            payment_method: order.payment_method,
            items: order.items,
            created_at: order.created_at,
            updated_at: order.updated_at
        });

        // Parse items to see structure
        try {
            const items = JSON.parse(order.items);
            console.log('\nParsed items:');
            items.forEach((item, index) => {
                console.log(`Item ${index + 1}:`, {
                    keys: Object.keys(item),
                    values: item
                });
            });
        } catch (parseError) {
            console.log('Failed to parse items:', parseError.message);
        }

        // Check if there are any payment transactions
        const [paymentResult] = await db.query('SELECT * FROM payment_transactions WHERE order_id = ?', [orderId]);
        console.log('\nPayment transactions:', paymentResult);

        // Check if ingredients were deducted (look for recent inventory changes)
        const [inventoryResult] = await db.query(`
            SELECT * FROM ingredients WHERE name LIKE '%sugar%'
        `);
        console.log('\nCurrent sugar inventory:', inventoryResult[0]);

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

