#!/usr/bin/env node

const { setupIngredientDeductionTrigger } = require('./setup-ingredient-deduction-trigger');
const ingredientDeductionQueueService = require('../services/ingredientDeductionQueueService');

async function initializeIngredientDeduction() {
    console.log('🍳 Initializing Ingredient Deduction System...\n');

    try {
        // Step 1: Setup database trigger
        console.log('📊 Step 1: Setting up database trigger...');
        await setupIngredientDeductionTrigger();

        // Step 2: Start queue service
        console.log('\n🔄 Step 2: Starting ingredient deduction queue service...');
        ingredientDeductionQueueService.start();

        console.log('\n🎉 Ingredient Deduction System initialized successfully!');
        console.log('\n📋 System Status:');
        console.log('✅ Database trigger: Active');
        console.log('✅ Queue service: Running');
        console.log('✅ Ingredient deduction: Ready');

        console.log('\n🔍 Monitoring:');
        console.log('- Queue service processes items every 10 seconds');
        console.log('- Failed deductions are retried up to 3 times');
        console.log('- All activities are logged to system_logs table');

        console.log('\n💡 To test the system:');
        console.log('1. Complete a payment for any order');
        console.log('2. Check the ingredient_deduction_queue table');
        console.log('3. Monitor inventory levels for changes');

        // Keep the process running to maintain the queue service
        console.log('\n⏳ Queue service is running. Press Ctrl+C to stop.');

        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down ingredient deduction system...');
            ingredientDeductionQueueService.stop();
            console.log('✅ System stopped gracefully');
            process.exit(0);
        });

        process.on('SIGTERM', () => {
            console.log('\n🛑 Shutting down ingredient deduction system...');
            ingredientDeductionQueueService.stop();
            console.log('✅ System stopped gracefully');
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ Failed to initialize ingredient deduction system:', error);
        process.exit(1);
    }
}

// Run initialization
initializeIngredientDeduction();