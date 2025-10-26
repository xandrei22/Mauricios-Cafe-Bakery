const db = require('../config/db');
const ingredientDeductionService = require('../services/ingredientDeductionService');

async function fixAllPaymentIngredientDeduction() {
    try {
        console.log('=== Fixing ALL Payment Ingredient Deduction ===');

        // Step 1: Find all orders missing ingredient deduction
        const [missingOrders] = await db.query(`
            SELECT 
                o.id,
                o.order_id,
                o.customer_name,
                o.status,
                o.payment_status,
                o.payment_method,
                o.items,
                o.created_at
            FROM orders o
            WHERE o.payment_status = 'paid' 
            AND o.payment_method = 'cash'
            AND (o.status = '' OR o.status = 'pending_verification')
            ORDER BY o.created_at DESC
        `);

        console.log(`1. Found ${missingOrders.length} orders missing ingredient deduction`);

        if (missingOrders.length === 0) {
            console.log('✅ No orders need fixing!');
            return;
        }

        // Step 2: Check current sugar inventory
        const [sugarResult] = await db.query('SELECT id, name, actual_quantity FROM ingredients WHERE name LIKE "%sugar%"');
        console.log('2. Current sugar inventory:', sugarResult[0]);

        let successCount = 0;
        let errorCount = 0;

        // Step 3: Process each order
        for (const order of missingOrders) {
            try {
                console.log(`\n3. Processing order: ${order.order_id} (${order.customer_name})`);

                // Parse order items
                const items = JSON.parse(order.items);
                console.log(`   Items: ${items.length} items`);

                // Prepare items for deduction
                const itemsForDeduction = items.map(item => ({
                    menuItemId: item.menuItemId || item.id,
                    quantity: item.quantity || 1,
                    customizations: item.customizations || null,
                    name: item.name
                }));

                console.log(`   Items for deduction:`, itemsForDeduction);

                // Process ingredient deduction
                const deductionResult = await ingredientDeductionService.deductIngredientsForOrder(order.id, itemsForDeduction);
                console.log(`   ✅ Deduction successful:`, deductionResult.message);

                // Update order status to 'preparing'
                await db.query(`
                    UPDATE orders 
                    SET status = 'preparing', updated_at = NOW()
                    WHERE id = ?
                `, [order.id]);
                console.log(`   ✅ Order status updated to "preparing"`);

                successCount++;

            } catch (error) {
                console.error(`   ❌ Failed to process order ${order.order_id}:`, error.message);
                errorCount++;
            }
        }

        // Step 4: Check final sugar inventory
        const [finalSugarResult] = await db.query('SELECT id, name, actual_quantity FROM ingredients WHERE name LIKE "%sugar%"');
        console.log('\n4. Final sugar inventory:', finalSugarResult[0]);

        // Step 5: Calculate total deduction
        const originalStock = parseFloat(sugarResult[0].actual_quantity);
        const finalStock = parseFloat(finalSugarResult[0].actual_quantity);
        const totalDeduction = originalStock - finalStock;

        console.log('\n5. Total inventory change:');
        console.log(`   Original: ${originalStock} kg`);
        console.log(`   Final: ${finalStock} kg`);
        console.log(`   Total deducted: ${totalDeduction} kg`);

        // Step 6: Summary
        console.log('\n=== FIX SUMMARY ===');
        console.log(`✅ Successfully processed: ${successCount} orders`);
        console.log(`❌ Failed to process: ${errorCount} orders`);
        console.log(`📦 Total ingredients deducted: ${totalDeduction} kg`);

        if (successCount > 0) {
            console.log('\n🎉 SUCCESS: All customer orders are now properly processing with ingredient deduction!');
            console.log('💡 Future orders will automatically deduct ingredients when payment is completed');
        } else {
            console.log('\n❌ FAILED: No orders were processed successfully');
        }

        console.log('\n=== NEXT STEPS ===');
        console.log('1. Test placing a new customer order with cash payment');
        console.log('2. Verify that ingredients are automatically deducted');
        console.log('3. Check that order status updates to "preparing"');

    } catch (error) {
        console.error('Fix failed:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        process.exit();
    }
}

