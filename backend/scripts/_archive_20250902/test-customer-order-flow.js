const db = require('../config/db');
const orderProcessingService = require('../services/orderProcessingService');

async function testCustomerOrderFlow() {
    try {
        console.log('=== Testing Complete Customer Order Flow ===');
        
        // Step 1: Check current sugar inventory
        const [sugarResult] = await db.query('SELECT id, name, actual_quantity FROM ingredients WHERE name LIKE "%sugar%"');
        console.log('1. Current sugar inventory:', sugarResult[0]);
        
        // Step 2: Create a test customer order (simulating what the frontend sends)
        const testOrderData = {
            order_id: `TEST-${Date.now()}`,
            order_number: `TEST-${Date.now()}`,
            customer_id: 49, // Use existing customer ID
            customer_name: 'Test Customer',
            table_number: 1,
            items: JSON.stringify([
                {
                    menuItemId: 101, // Coffee menu item ID
                    name: 'coffee',
                    quantity: 1,
                    price: 100.00,
                    notes: 'Test order',
                    customizations: null
                }
            ]),
            total_price: 100.00,
            status: 'pending_verification',
            payment_status: 'pending',
            payment_method: 'cash',
            notes: 'Test order for ingredient deduction',
            order_type: 'dine_in',
            queue_position: 1,
            estimated_ready_time: new Date(Date.now() + 15 * 60000),
            order_time: new Date()
        };
        
        console.log('2. Creating test order with data:', testOrderData);
        
        const [orderResult] = await db.query(`
            INSERT INTO orders (
                order_id, order_number, customer_id, customer_name, table_number, items, total_price,
                status, payment_status, payment_method, notes, order_type, queue_position, estimated_ready_time, order_time
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            testOrderData.order_id,
            testOrderData.order_number,
            testOrderData.customer_id,
            testOrderData.customer_name,
            testOrderData.table_number,
            testOrderData.items,
            testOrderData.total_price,
            testOrderData.status,
            testOrderData.payment_status,
            testOrderData.payment_method,
            testOrderData.notes,
            testOrderData.order_type,
            testOrderData.queue_position,
            testOrderData.estimated_ready_time,
            testOrderData.order_time
        ]);
        
        const orderDbId = orderResult.insertId;
        console.log('3. Test order created with DB ID:', orderDbId);
        
        // Step 3: Verify the payment (simulating admin verification)
        console.log('4. Verifying payment (this should trigger ingredient deduction)...');
        
        const verificationResult = await orderProcessingService.verifyCashPayment(testOrderData.order_id, 'test-admin');
        console.log('5. Payment verification result:', verificationResult);
        
        // Step 6: Check updated sugar inventory
        const [updatedSugarResult] = await db.query('SELECT id, name, actual_quantity FROM ingredients WHERE name LIKE "%sugar%"');
        console.log('6. Updated sugar inventory:', updatedSugarResult[0]);
        
        // Step 7: Calculate the difference
        const originalStock = parseFloat(sugarResult[0].actual_quantity);
        const newStock = parseFloat(updatedSugarResult[0].actual_quantity);
        const difference = originalStock - newStock;
        
        console.log('7. Inventory change:');
        console.log(`   Original: ${originalStock} kg`);
        console.log(`   New: ${newStock} kg`);
        console.log(`   Difference: ${difference} kg`);
        
        if (difference > 0) {
            console.log('✅ SUCCESS: Ingredients were deducted!');
        } else {
            console.log('❌ FAILED: No ingredients were deducted');
        }
        
        // Step 8: Clean up test order
        await db.query('DELETE FROM orders WHERE id = ?', [orderDbId]);
        console.log('8. Test order cleaned up');
        
        console.log('=== Test Complete ===');
        
    } catch (error) {
        console.error('Test failed:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        process.exit();
    }
}

testCustomerOrderFlow();
