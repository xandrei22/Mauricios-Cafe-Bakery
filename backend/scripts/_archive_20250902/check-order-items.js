const db = require('../config/db');

async function checkOrderItems() {
    try {
        const [columns] = await db.query('DESCRIBE order_items');
        console.log('Order items table columns:');
        columns.forEach(col => {
            console.log(`- ${col.Field} (${col.Type})`);
        });
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        process.exit(0);
    }
}

checkOrderItems();
