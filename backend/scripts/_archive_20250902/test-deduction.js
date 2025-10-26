#!/usr/bin/env node

const db = require('../config/db');
const ingredientDeductionService = require('../services/ingredientDeductionService');

async function testDeduction() {
    console.log('🧪 Testing Ingredient Deduction System...\n');

    try {
        const connection = await db.getConnection();

        try {
            // Check current sugar stock
            console.log('📊 Checking current ingredient stock...');
            const [currentStock] = await connection.query(`
                SELECT id, name, actual_quantity, actual_unit FROM ingredients WHERE id = 72
            `);

            if (currentStock.length > 0) {
                const sugar = currentStock[0];
                console.log(`Current ${sugar.name} stock: ${sugar.actual_quantity} ${sugar.actual_unit}`);
            }

            // Test ingredient deduction with a sample order
            console.log('\n🔧 Testing ingredient deduction...');

            const testOrderId = 999; // Test order ID
            const testItems = [{
                menuItemId: 101, // Coffee menu item ID
                quantity: 1,
                customizations: null,
                name: 'Coffee'
            }];

            console.log('Test items:', testItems);

            // Call the deduction service
            const result = await ingredientDeductionService.deductIngredientsForOrder(testOrderId, testItems);
            console.log('\n✅ Deduction result:', result);

            // Check updated sugar stock
            console.log('\n📊 Checking updated ingredient stock...');
            const [updatedStock] = await connection.query(`
                SELECT id, name, actual_quantity, actual_unit FROM ingredients WHERE id = 72
            `);

            if (updatedStock.length > 0) {
                const sugar = updatedStock[0];
                console.log(`Updated ${sugar.name} stock: ${sugar.actual_quantity} ${sugar.actual_unit}`);

                if (currentStock.length > 0) {
                    const difference = currentStock[0].actual_quantity - sugar.actual_quantity;
                    console.log(`Stock deducted: ${difference} ${sugar.actual_unit}`);
                }
            }

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test if this script is executed directly
if (require.main === module) {
    testDeduction()
        .then(() => {
            console.log('\n✅ Deduction test completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Deduction test failed:', error);
            process.exit(1);
        });
}


