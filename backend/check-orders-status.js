const db = require('./config/db');

async function checkOrders() {
    try {
        const [orders] = await db.query(`
      SELECT order_id, status, payment_status, customer_name 
      FROM orders 
      WHERE status IN ('preparing', 'confirmed', 'processing') 
         OR payment_status = 'paid' 
      ORDER BY created_at DESC 
      LIMIT 10
    `);

        console.log('Orders with preparing/confirmed/processing status or paid payment:');
        orders.forEach(order => {
            console.log(`Order ${order.order_id}: status=${order.status}, payment_status=${order.payment_status}, customer=${order.customer_name}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}




