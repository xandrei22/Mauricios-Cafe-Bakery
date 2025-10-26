const db = require('../config/db');

async function dropIngredientTrigger() {
    try {
        console.log('🔧 Dropping ingredient deduction trigger...');

        // Drop the trigger
        await db.query('DROP TRIGGER IF EXISTS trigger_ingredient_deduction_after_payment');
        console.log('✅ Successfully dropped trigger_ingredient_deduction_after_payment');

        // Also drop any other related triggers
        await db.query('DROP TRIGGER IF EXISTS trigger_auto_ingredient_deduction');
        console.log('✅ Successfully dropped trigger_auto_ingredient_deduction');

        console.log('🎯 Ingredient deduction triggers removed. Deduction will now only happen when orders are marked as "ready".');

    } catch (error) {
        console.error('❌ Error dropping trigger:', error);
    } finally {
        process.exit(0);
    }
}

dropIngredientTrigger();