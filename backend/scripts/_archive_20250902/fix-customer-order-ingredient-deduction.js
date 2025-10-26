const db = require('../config/db');
const ingredientDeductionService = require('../services/ingredientDeductionService');

async function fixCustomerOrderIngredientDeduction() {
    try {
        console.log('=== Fixing Customer Order Ingredient Deduction ===');
        
        // Step 1: Find the broken customer order
        const orderId = 'ORD-1756551821630-cdnh1mo1b';
        const [orderResult] = await db.query('SELECT * FROM orders WHERE order_id = ?', [orderId]);
        
        if (orderResult.length === 0) {
            console.log('Order not found');
            return;
        }
        
        const order = orderResult[0];
        console.log('1. Found broken order:', {
            id: order.id,
            order_id: order.order_id,
            customer_name: order.customer_name,
            status: order.status,
            payment_status: order.payment_status
        });
        
        // Step 2: Check current sugar inventory
        const [sugarResult] = await db.query('SELECT id, name, actual_quantity FROM ingredients WHERE name LIKE "%sugar%"');
        console.log('2. Current sugar inventory:', sugarResult[0]);
        
        // Step 3: Parse order items
        const items = JSON.parse(order.items);
        console.log('3. Order items:', items);
        
        // Step 4: Process ingredient deduction manually
        console.log('4. Processing ingredient deduction...');
        const itemsForDeduction = items.map(item => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            customizations: item.customizations || null,
            name: item.name
        }));
        
        console.log('5. Items for deduction:', itemsForDeduction);
        
        const deductionResult = await ingredientDeductionService.deductIngredientsForOrder(order.id, itemsForDeduction);
        console.log('6. Deduction result:', deductionResult);
        
        // Step 7: Update order status to 'preparing'
        await db.query(`
            UPDATE orders 
            SET status = 'preparing', updated_at = NOW()
            WHERE id = ?
        `, [order.id]);
        console.log('7. Order status updated to "preparing"');
        
        // Step 8: Check updated sugar inventory
        const [updatedSugarResult] = await db.query('SELECT id, name, actual_quantity FROM ingredients WHERE name LIKE "%sugar%"');
        console.log('8. Updated sugar inventory:', updatedSugarResult[0]);
        
        // Step 9: Calculate the difference
        const originalStock = parseFloat(sugarResult[0].actual_quantity);
        const newStock = parseFloat(updatedSugarResult[0].actual_quantity);
        const difference = originalStock - newStock;
        
        console.log('9. Inventory change:');
        console.log(`   Original: ${originalStock} kg`);
        console.log(`   New: ${newStock} kg`);
        console.log(`   Difference: ${difference} kg`);
        
        if (difference > 0) {
            console.log('✅ SUCCESS: Ingredients were deducted!');
            console.log('✅ Customer order is now fixed and processing!');
        } else {
            console.log('❌ FAILED: No ingredients were deducted');
        }
        
        // Step 10: Verify order status
        const [finalOrderResult] = await db.query('SELECT status FROM orders WHERE id = ?', [order.id]);
        console.log('10. Final order status:', finalOrderResult[0].status);
        
        console.log('=== Fix Complete ===');
        
    } catch (error) {
        console.error('Fix failed:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        process.exit();
    }
}

fixCustomerOrderIngredientDeduction();
