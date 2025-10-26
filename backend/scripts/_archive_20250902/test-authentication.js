const mysql = require('mysql2/promise');
require('dotenv').config();

async function testAuthentication() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('🔒 Testing Authentication System...\n');

        // Check if admin users exist
        const [adminUsers] = await connection.query(`
            SELECT id, username, email, role, status 
            FROM users 
            WHERE role = 'admin' AND status = 'active'
            ORDER BY id
        `);

        console.log(`👥 Admin users found: ${adminUsers.length}`);
        adminUsers.forEach(user => {
            console.log(`  - ID: ${user.id}, Username: ${user.username}, Email: ${user.email}, Role: ${user.role}`);
        });

        if (adminUsers.length === 0) {
            console.log('\n⚠️  WARNING: No admin users found!');
            console.log('   You need at least one admin user to test authentication.');
            console.log('   Run: node scripts/check-admin-user.js to create one.');
            return;
        }

        // Check if customers exist
        const [customers] = await connection.query(`
            SELECT id, full_name, email, loyalty_points 
            FROM customers 
            ORDER BY id 
            LIMIT 5
        `);

        console.log(`\n👤 Customers found: ${customers.length}`);
        customers.forEach(customer => {
            console.log(`  - ID: ${customer.id}, Name: ${customer.full_name}, Email: ${customer.email}, Points: ${customer.loyalty_points}`);
        });

        // Check loyalty settings
        const [loyaltySettings] = await connection.query(`
            SELECT setting_key, setting_value 
            FROM loyalty_settings 
            WHERE setting_key IN ('loyalty_enabled', 'points_per_peso')
            ORDER BY setting_key
        `);

        console.log('\n⚙️  Loyalty Settings:');
        loyaltySettings.forEach(setting => {
            console.log(`  - ${setting.setting_key}: ${setting.setting_value}`);
        });

        // Check if there are any completed orders with customer_id
        const [completedOrders] = await connection.query(`
            SELECT COUNT(*) as total,
                   COUNT(CASE WHEN customer_id IS NOT NULL THEN 1 END) as with_customer,
                   COUNT(CASE WHEN customer_id IS NULL THEN 1 END) as without_customer,
                   SUM(total_price) as total_value
            FROM orders 
            WHERE status = 'completed'
        `);

        console.log('\n📊 Completed Orders Analysis:');
        console.log(`  - Total completed: ${completedOrders[0].total}`);
        console.log(`  - With customer ID: ${completedOrders[0].with_customer}`);
        console.log(`  - Without customer ID: ${completedOrders[0].without_customer}`);
        console.log(`  - Total value: ₱${completedOrders[0].total_value || 0}`);

        if (completedOrders[0].without_customer > 0) {
            console.log('\n⚠️  WARNING: Some completed orders are not linked to customers!');
            console.log('   These orders will not earn loyalty points.');
        }

        console.log('\n✅ Authentication system check completed!');
        console.log('\n💡 To test the system:');
        console.log('   1. Try accessing /admin without logging in - should redirect to login');
        console.log('   2. Login with admin credentials');
        console.log('   3. Access admin pages - should work');
        console.log('   4. Create an order with a customer ID');
        console.log('   5. Complete the order - customer should earn points');

    } catch (error) {
        console.error('❌ Test error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}


require('dotenv').config();

async function testAuthentication() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('🔒 Testing Authentication System...\n');

        // Check if admin users exist
        const [adminUsers] = await connection.query(`
            SELECT id, username, email, role, status 
            FROM users 
            WHERE role = 'admin' AND status = 'active'
            ORDER BY id
        `);

        console.log(`👥 Admin users found: ${adminUsers.length}`);
        adminUsers.forEach(user => {
            console.log(`  - ID: ${user.id}, Username: ${user.username}, Email: ${user.email}, Role: ${user.role}`);
        });

        if (adminUsers.length === 0) {
            console.log('\n⚠️  WARNING: No admin users found!');
            console.log('   You need at least one admin user to test authentication.');
            console.log('   Run: node scripts/check-admin-user.js to create one.');
            return;
        }

        // Check if customers exist
        const [customers] = await connection.query(`
            SELECT id, full_name, email, loyalty_points 
            FROM customers 
            ORDER BY id 
            LIMIT 5
        `);

        console.log(`\n👤 Customers found: ${customers.length}`);
        customers.forEach(customer => {
            console.log(`  - ID: ${customer.id}, Name: ${customer.full_name}, Email: ${customer.email}, Points: ${customer.loyalty_points}`);
        });

        // Check loyalty settings
        const [loyaltySettings] = await connection.query(`
            SELECT setting_key, setting_value 
            FROM loyalty_settings 
            WHERE setting_key IN ('loyalty_enabled', 'points_per_peso')
            ORDER BY setting_key
        `);

        console.log('\n⚙️  Loyalty Settings:');
        loyaltySettings.forEach(setting => {
            console.log(`  - ${setting.setting_key}: ${setting.setting_value}`);
        });

        // Check if there are any completed orders with customer_id
        const [completedOrders] = await connection.query(`
            SELECT COUNT(*) as total,
                   COUNT(CASE WHEN customer_id IS NOT NULL THEN 1 END) as with_customer,
                   COUNT(CASE WHEN customer_id IS NULL THEN 1 END) as without_customer,
                   SUM(total_price) as total_value
            FROM orders 
            WHERE status = 'completed'
        `);

        console.log('\n📊 Completed Orders Analysis:');
        console.log(`  - Total completed: ${completedOrders[0].total}`);
        console.log(`  - With customer ID: ${completedOrders[0].with_customer}`);
        console.log(`  - Without customer ID: ${completedOrders[0].without_customer}`);
        console.log(`  - Total value: ₱${completedOrders[0].total_value || 0}`);

        if (completedOrders[0].without_customer > 0) {
            console.log('\n⚠️  WARNING: Some completed orders are not linked to customers!');
            console.log('   These orders will not earn loyalty points.');
        }

        console.log('\n✅ Authentication system check completed!');
        console.log('\n💡 To test the system:');
        console.log('   1. Try accessing /admin without logging in - should redirect to login');
        console.log('   2. Login with admin credentials');
        console.log('   3. Access admin pages - should work');
        console.log('   4. Create an order with a customer ID');
        console.log('   5. Complete the order - customer should earn points');

    } catch (error) {
        console.error('❌ Test error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

