const db = require('./config/db');

async function debugLoyaltyRewards() {
    try {
        console.log('=== DEBUGGING LOYALTY REWARDS ===');
        
        // Check if loyalty_rewards table exists and has data
        const [rewards] = await db.query('SELECT * FROM loyalty_rewards WHERE is_active = TRUE');
        console.log('Active rewards:', rewards);
        
        // Check if max_redemptions_per_customer field exists
        const [columns] = await db.query('DESCRIBE loyalty_rewards');
        console.log('loyalty_rewards table structure:', columns);
        
        // Test the exact query from the API
        const [testRewards] = await db.query(`
            SELECT * FROM loyalty_rewards WHERE is_active = TRUE ORDER BY points_required ASC
        `);
        console.log('Test query results:', testRewards);
        
        // Check a specific customer's points
        const [customers] = await db.query('SELECT id, loyalty_points FROM customers LIMIT 1');
        if (customers.length > 0) {
            const customerId = customers[0].id;
            const currentPoints = customers[0].loyalty_points;
            console.log(`Customer ${customerId} has ${currentPoints} points`);
            
            // Test the filtering logic
            const availableRewards = testRewards.filter(reward => {
                const redemptionCount = 0; // No redemptions for testing
                const result = currentPoints >= reward.points_required &&
                    redemptionCount < (reward.max_redemptions_per_customer || 1);
                console.log(`Reward ${reward.name}: points_required=${reward.points_required}, max_redemptions=${reward.max_redemptions_per_customer}, canRedeem=${result}`);
                return result;
            });
            
            console.log('Available rewards after filtering:', availableRewards);
        }
        
    } catch (error) {
        console.error('Error debugging loyalty rewards:', error);
    } finally {
        process.exit(0);
    }
}

debugLoyaltyRewards();








