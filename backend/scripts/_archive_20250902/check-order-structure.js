const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkOrderStructure() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('🔍 Checking order table structure...\n');

        // Check table structure
        const [columns] = await connection.query('DESCRIBE orders');
        console.log('📋 Orders table columns:');
        columns.forEach(col => {
            console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
        });

        // Check sample orders
        const [orders] = await connection.query('SELECT * FROM orders LIMIT 3');
        console.log(`\n📊 Sample orders (${orders.length}):`);
        orders.forEach(order => {
            console.log(`  - Order ID: ${order.order_id || order.id}`);
            console.log(`    Customer ID: ${order.customer_id}`);
            console.log(`    Status: ${order.status}`);
            console.log(`    Total: ₱${order.total_price}`);
            console.log(`    Items: ${order.items ? 'JSON data' : 'No items'}`);
            console.log('    ---');
        });

        // Check if there are any completed orders
        const [completedOrders] = await connection.query(`
            SELECT COUNT(*) as count, 
                   SUM(total_price) as total_value,
                   COUNT(DISTINCT customer_id) as unique_customers
            FROM orders 
            WHERE status = 'completed'
        `);

        console.log('\n✅ Completed orders summary:');
        console.log(`  - Total completed: ${completedOrders[0].count}`);
        console.log(`  - Total value: ₱${completedOrders[0].total_value || 0}`);
        console.log(`  - Unique customers: ${completedOrders[0].unique_customers}`);

        // Check customer loyalty points
        const [customers] = await connection.query(`
            SELECT id, full_name, loyalty_points, email
            FROM customers 
            ORDER BY loyalty_points DESC 
            LIMIT 5
        `);

        console.log('\n👥 Top customers by loyalty points:');
        customers.forEach(customer => {
            console.log(`  - ${customer.full_name} (${customer.email}): ${customer.loyalty_points} points`);
        });

    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}


require('dotenv').config();

async function checkOrderStructure() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('🔍 Checking order table structure...\n');

        // Check table structure
        const [columns] = await connection.query('DESCRIBE orders');
        console.log('📋 Orders table columns:');
        columns.forEach(col => {
            console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
        });

        // Check sample orders
        const [orders] = await connection.query('SELECT * FROM orders LIMIT 3');
        console.log(`\n📊 Sample orders (${orders.length}):`);
        orders.forEach(order => {
            console.log(`  - Order ID: ${order.order_id || order.id}`);
            console.log(`    Customer ID: ${order.customer_id}`);
            console.log(`    Status: ${order.status}`);
            console.log(`    Total: ₱${order.total_price}`);
            console.log(`    Items: ${order.items ? 'JSON data' : 'No items'}`);
            console.log('    ---');
        });

        // Check if there are any completed orders
        const [completedOrders] = await connection.query(`
            SELECT COUNT(*) as count, 
                   SUM(total_price) as total_value,
                   COUNT(DISTINCT customer_id) as unique_customers
            FROM orders 
            WHERE status = 'completed'
        `);

        console.log('\n✅ Completed orders summary:');
        console.log(`  - Total completed: ${completedOrders[0].count}`);
        console.log(`  - Total value: ₱${completedOrders[0].total_value || 0}`);
        console.log(`  - Unique customers: ${completedOrders[0].unique_customers}`);

        // Check customer loyalty points
        const [customers] = await connection.query(`
            SELECT id, full_name, loyalty_points, email
            FROM customers 
            ORDER BY loyalty_points DESC 
            LIMIT 5
        `);

        console.log('\n👥 Top customers by loyalty points:');
        customers.forEach(customer => {
            console.log(`  - ${customer.full_name} (${customer.email}): ${customer.loyalty_points} points`);
        });

    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

