const db = require('./config/db');

async function testPaymentVerification() {
    try {
        // Find an order with pending_verification status
        const [orders] = await db.query(`
      SELECT order_id, status, payment_status, customer_name 
      FROM orders 
      WHERE status = 'pending_verification' 
      ORDER BY created_at DESC 
      LIMIT 1
    `);

        if (orders.length === 0) {
            console.log('No orders with pending_verification status found');

            // Check for orders with paid payment but pending status
            const [paidOrders] = await db.query(`
        SELECT order_id, status, payment_status, customer_name 
        FROM orders 
        WHERE payment_status = 'paid' AND status = 'pending'
        ORDER BY created_at DESC 
        LIMIT 1
      `);

            if (paidOrders.length > 0) {
                console.log('Found orders with paid payment but pending status:');
                paidOrders.forEach(order => {
                    console.log(`Order ${order.order_id}: status=${order.status}, payment_status=${order.payment_status}, customer=${order.customer_name}`);
                });

                // Test updating one of these orders to preparing
                const testOrder = paidOrders[0];
                console.log(`\nTesting update for order ${testOrder.order_id}...`);

                const [updateResult] = await db.query(`
          UPDATE orders 
          SET status = 'preparing' 
          WHERE order_id = ?
        `, [testOrder.order_id]);

                console.log(`Update result: ${updateResult.affectedRows} rows affected`);

                // Verify the update
                const [updatedOrder] = await db.query(`
          SELECT order_id, status, payment_status 
          FROM orders 
          WHERE order_id = ?
        `, [testOrder.order_id]);

                console.log('Updated order:', updatedOrder[0]);
            }
        } else {
            console.log('Found orders with pending_verification status:');
            orders.forEach(order => {
                console.log(`Order ${order.order_id}: status=${order.status}, payment_status=${order.payment_status}, customer=${order.customer_name}`);
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}




