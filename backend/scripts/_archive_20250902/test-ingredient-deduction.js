#!/usr/bin/env node

const db = require('../config/db');

async function testIngredientDeduction() {
    try {
        console.log('=== Testing Ingredient Deduction ===');
        
        // Check current sugar inventory
        const [sugarResult] = await db.query('SELECT id, name, actual_quantity FROM ingredients WHERE name LIKE "%sugar%"');
        console.log('Current sugar inventory:', sugarResult);
        
        if (sugarResult.length === 0) {
            console.log('No sugar ingredient found. Creating one for testing...');
            await db.query(`
                INSERT INTO ingredients (name, category, actual_quantity, actual_unit, reorder_level, cost_per_unit, storage_location, sku, notes)
                VALUES ('sugar', 'sweetener', 20.3, 'kg', 2.0, 45.00, 'shelf 1', 'SG111', 'Ensure close')
            `);
            console.log('Sugar ingredient created with 20.3 kg stock');
        }
        
        // Check if there's a menu item that uses sugar
        const [menuResult] = await db.query('SELECT id, name FROM menu_items WHERE name LIKE "%coffee%" LIMIT 1');
        console.log('Menu items found:', menuResult);
        
        if (menuResult.length === 0) {
            console.log('No coffee menu item found. Creating one for testing...');
            await db.query(`
                INSERT INTO menu_items (name, description, price, category, is_available, image_url)
                VALUES ('coffee', 'Hot coffee', 100.00, 'beverages', 1, 'coffee.jpg')
            `);
            console.log('Coffee menu item created');
        }
        
        // Get the menu item ID
        const [menuItemResult] = await db.query('SELECT id FROM menu_items WHERE name = "coffee" LIMIT 1');
        const menuItemId = menuItemResult[0].id;
        console.log('Menu item ID for coffee:', menuItemId);
        
        // Check if there's a recipe mapping
        const [recipeResult] = await db.query(`
            SELECT * FROM menu_item_ingredients 
            WHERE menu_item_id = ? AND ingredient_id = ?
        `, [menuItemId, sugarResult[0].id]);
        
        console.log('Recipe mapping found:', recipeResult);
        
        if (recipeResult.length === 0) {
            console.log('No recipe mapping found. Creating one for testing...');
            await db.query(`
                INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, required_actual_amount, required_display_amount, is_optional)
                VALUES (?, ?, 0.01, 0.01, FALSE)
            `, [menuItemId, sugarResult[0].id]);
            console.log('Recipe mapping created: 0.01 kg sugar per coffee');
        }
        
        // Test ingredient deduction
        const ingredientDeductionService = require('../services/ingredientDeductionService');
        const testItems = [{
            menuItemId: menuItemId,
            quantity: 1,
            name: 'coffee',
            customizations: null
        }];
        
        console.log('Testing ingredient deduction with items:', testItems);
        
        const deductionResult = await ingredientDeductionService.deductIngredientsForOrder(999, testItems);
        console.log('Deduction result:', deductionResult);
        
        // Check updated sugar inventory
        const [updatedSugarResult] = await db.query('SELECT id, name, actual_quantity FROM ingredients WHERE name LIKE "%sugar%"');
        console.log('Updated sugar inventory:', updatedSugarResult);
        
        console.log('=== Test Complete ===');
        
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        process.exit();
    }
}

testIngredientDeduction();