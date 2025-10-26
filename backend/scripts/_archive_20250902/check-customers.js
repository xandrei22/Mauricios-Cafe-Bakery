const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkCustomers() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('🔍 Checking customers in database...\n');

        // Check all customers
        const [customers] = await connection.query('SELECT id, username, email, full_name, loyalty_points, created_at FROM customers ORDER BY id');
        console.log(`📊 Found ${customers.length} customers:`);
        
        if (customers.length === 0) {
            console.log('❌ No customers found in database!');
            console.log('💡 You need to create a customer account first.');
        } else {
            customers.forEach(customer => {
                console.log(`  - ID: ${customer.id}, Name: "${customer.full_name}", Email: ${customer.email}, Points: ${customer.loyalty_points}`);
            });
        }

        // Check if there are any orders
        const [orders] = await connection.query('SELECT COUNT(*) as count FROM orders');
        console.log(`\n📦 Total orders: ${orders[0].count}`);

        // Check loyalty transactions
        const [transactions] = await connection.query('SELECT COUNT(*) as count FROM loyalty_transactions');
        console.log(`💎 Total loyalty transactions: ${transactions[0].count}`);

        if (customers.length === 0) {
            console.log('\n🔧 Creating a test customer...');
            const [result] = await connection.query(`
                INSERT INTO customers (username, email, password, full_name, loyalty_points, created_at) 
                VALUES (?, ?, ?, ?, ?, NOW())
            `, ['testcustomer', 'test@example.com', '$2b$10$dummy.hash.for.test', 'Test Customer', 100]);
            
            console.log(`✅ Test customer created with ID: ${result.insertId}`);
            console.log('💡 You can now test the customer loyalty system with this customer ID');
        }

    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkCustomers();

require('dotenv').config();

async function checkCustomers() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('🔍 Checking customers in database...\n');

        // Check all customers
        const [customers] = await connection.query('SELECT id, username, email, full_name, loyalty_points, created_at FROM customers ORDER BY id');
        console.log(`📊 Found ${customers.length} customers:`);
        
        if (customers.length === 0) {
            console.log('❌ No customers found in database!');
            console.log('💡 You need to create a customer account first.');
        } else {
            customers.forEach(customer => {
                console.log(`  - ID: ${customer.id}, Name: "${customer.full_name}", Email: ${customer.email}, Points: ${customer.loyalty_points}`);
            });
        }

        // Check if there are any orders
        const [orders] = await connection.query('SELECT COUNT(*) as count FROM orders');
        console.log(`\n📦 Total orders: ${orders[0].count}`);

        // Check loyalty transactions
        const [transactions] = await connection.query('SELECT COUNT(*) as count FROM loyalty_transactions');
        console.log(`💎 Total loyalty transactions: ${transactions[0].count}`);

        if (customers.length === 0) {
            console.log('\n🔧 Creating a test customer...');
            const [result] = await connection.query(`
                INSERT INTO customers (username, email, password, full_name, loyalty_points, created_at) 
                VALUES (?, ?, ?, ?, ?, NOW())
            `, ['testcustomer', 'test@example.com', '$2b$10$dummy.hash.for.test', 'Test Customer', 100]);
            
            console.log(`✅ Test customer created with ID: ${result.insertId}`);
            console.log('💡 You can now test the customer loyalty system with this customer ID');
        }

    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkCustomers();
