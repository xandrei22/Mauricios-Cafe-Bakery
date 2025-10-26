const mysql = require('mysql2/promise');
require('dotenv').config();

async function testLoyaltyPoints() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('🧪 Testing loyalty points system...\n');

        // Get a customer to test with
        const [customers] = await connection.query('SELECT id, full_name, loyalty_points FROM customers LIMIT 1');
        if (customers.length === 0) {
            console.log('❌ No customers found in database');
            return;
        }

        const customer = customers[0];
        console.log(`👤 Testing with customer: ${customer.full_name} (ID: ${customer.id})`);
        console.log(`💰 Current loyalty points: ${customer.loyalty_points}`);

        // Create a test order
        const testOrder = {
            customer_id: customer.id,
            items: JSON.stringify([
                { menu_item_id: 1, quantity: 2, customizations: null }
            ]),
            total_price: 150.00, // ₱150 order
            status: 'pending'
        };

        console.log(`\n🛒 Creating test order: ₱${testOrder.total_price}`);
        
        const [orderResult] = await connection.query(`
            INSERT INTO orders (customer_id, items, total_price, status, order_time, order_number) 
            VALUES (?, ?, ?, ?, NOW(), ?)
        `, [testOrder.customer_id, testOrder.items, testOrder.total_price, testOrder.status, `TEST_${Date.now()}`]);

        const orderId = orderResult.insertId;
        console.log(`✅ Test order created with ID: ${orderId}`);

        // Now simulate completing the order (this should trigger loyalty points)
        console.log('\n🔄 Simulating order completion...');
        
        // Import the order processing service
        const OrderProcessingService = require('../services/orderProcessingService');
        
        try {
            const result = await OrderProcessingService.updateOrderStatus(orderId, 'completed');
            console.log('✅ Order status updated successfully');
            console.log('📝 Result:', result.message);
        } catch (error) {
            console.error('❌ Failed to update order status:', error.message);
        }

        // Check if points were awarded
        console.log('\n🔍 Checking if loyalty points were awarded...');
        
        const [updatedCustomer] = await connection.query('SELECT loyalty_points FROM customers WHERE id = ?', [customer.id]);
        const newPoints = updatedCustomer[0].loyalty_points;
        
        console.log(`💰 New loyalty points: ${newPoints}`);
        console.log(`📈 Points change: ${newPoints - customer.loyalty_points}`);

        if (newPoints > customer.loyalty_points) {
            console.log('🎉 SUCCESS: Loyalty points were awarded!');
        } else {
            console.log('❌ FAILED: No loyalty points were awarded');
        }

        // Check loyalty transactions
        const [transactions] = await connection.query(`
            SELECT * FROM loyalty_transactions 
            WHERE customer_id = ? AND order_id = ? 
            ORDER BY created_at DESC
        `, [customer.id, orderId]);

        console.log(`\n📊 Loyalty transactions for this order: ${transactions.length}`);
        transactions.forEach(transaction => {
            console.log(`  - Type: ${transaction.transaction_type}, Points: ${transaction.points_earned}, Description: ${transaction.description}`);
        });

        // Clean up test order
        console.log('\n🧹 Cleaning up test order...');
        await connection.query('DELETE FROM orders WHERE order_id = ?', [orderId]);
        console.log('✅ Test order cleaned up');

    } catch (error) {
        console.error('❌ Test error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

testLoyaltyPoints();


async function testLoyaltyPoints() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('🧪 Testing loyalty points system...\n');

        // Get a customer to test with
        const [customers] = await connection.query('SELECT id, full_name, loyalty_points FROM customers LIMIT 1');
        if (customers.length === 0) {
            console.log('❌ No customers found in database');
            return;
        }

        const customer = customers[0];
        console.log(`👤 Testing with customer: ${customer.full_name} (ID: ${customer.id})`);
        console.log(`💰 Current loyalty points: ${customer.loyalty_points}`);

        // Create a test order
        const testOrder = {
            customer_id: customer.id,
            items: JSON.stringify([
                { menu_item_id: 1, quantity: 2, customizations: null }
            ]),
            total_price: 150.00, // ₱150 order
            status: 'pending'
        };

        console.log(`\n🛒 Creating test order: ₱${testOrder.total_price}`);
        
        const [orderResult] = await connection.query(`
            INSERT INTO orders (customer_id, items, total_price, status, order_time, order_number) 
            VALUES (?, ?, ?, ?, NOW(), ?)
        `, [testOrder.customer_id, testOrder.items, testOrder.total_price, testOrder.status, `TEST_${Date.now()}`]);

        const orderId = orderResult.insertId;
        console.log(`✅ Test order created with ID: ${orderId}`);

        // Now simulate completing the order (this should trigger loyalty points)
        console.log('\n🔄 Simulating order completion...');
        
        // Import the order processing service
        const OrderProcessingService = require('../services/orderProcessingService');
        
        try {
            const result = await OrderProcessingService.updateOrderStatus(orderId, 'completed');
            console.log('✅ Order status updated successfully');
            console.log('📝 Result:', result.message);
        } catch (error) {
            console.error('❌ Failed to update order status:', error.message);
        }

        // Check if points were awarded
        console.log('\n🔍 Checking if loyalty points were awarded...');
        
        const [updatedCustomer] = await connection.query('SELECT loyalty_points FROM customers WHERE id = ?', [customer.id]);
        const newPoints = updatedCustomer[0].loyalty_points;
        
        console.log(`💰 New loyalty points: ${newPoints}`);
        console.log(`📈 Points change: ${newPoints - customer.loyalty_points}`);

        if (newPoints > customer.loyalty_points) {
            console.log('🎉 SUCCESS: Loyalty points were awarded!');
        } else {
            console.log('❌ FAILED: No loyalty points were awarded');
        }

        // Check loyalty transactions
        const [transactions] = await connection.query(`
            SELECT * FROM loyalty_transactions 
            WHERE customer_id = ? AND order_id = ? 
            ORDER BY created_at DESC
        `, [customer.id, orderId]);

        console.log(`\n📊 Loyalty transactions for this order: ${transactions.length}`);
        transactions.forEach(transaction => {
            console.log(`  - Type: ${transaction.transaction_type}, Points: ${transaction.points_earned}, Description: ${transaction.description}`);
        });

        // Clean up test order
        console.log('\n🧹 Cleaning up test order...');
        await connection.query('DELETE FROM orders WHERE order_id = ?', [orderId]);
        console.log('✅ Test order cleaned up');

    } catch (error) {
        console.error('❌ Test error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

testLoyaltyPoints();
