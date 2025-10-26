const db = require('../config/db');

/**
 * Award welcome points to a new customer if the feature is enabled
 * @param {number} customerId - The ID of the new customer
 * @param {string} customerEmail - The email of the new customer
 * @param {string} customerName - The name of the new customer
 * @returns {Promise<{success: boolean, pointsAwarded: number, message: string}>}
 */
async function awardWelcomePoints(customerId, customerEmail, customerName) {
    try {
        // Check if welcome points are enabled
        const [welcomeSettings] = await db.query(`
            SELECT setting_value FROM loyalty_settings 
            WHERE setting_key = 'welcome_points_enabled'
        `);

        if (welcomeSettings.length === 0 || welcomeSettings[0].setting_value !== 'true') {
            return {
                success: false,
                pointsAwarded: 0,
                message: 'Welcome points are disabled'
            };
        }

        // Get the welcome points amount
        const [welcomePointsSettings] = await db.query(`
            SELECT setting_value FROM loyalty_settings 
            WHERE setting_key = 'welcome_points'
        `);

        if (welcomePointsSettings.length === 0) {
            return {
                success: false,
                pointsAwarded: 0,
                message: 'Welcome points amount not configured'
            };
        }

        const welcomePoints = parseInt(welcomePointsSettings[0].setting_value) || 0;

        if (welcomePoints <= 0) {
            return {
                success: false,
                pointsAwarded: 0,
                message: 'Welcome points amount is 0 or invalid'
            };
        }

        // Award welcome points to the customer
        await db.query(`
            UPDATE customers 
            SET loyalty_points = loyalty_points + ? 
            WHERE id = ?
        `, [welcomePoints, customerId]);

        // Record the welcome points transaction
        await db.query(`
            INSERT INTO loyalty_transactions 
            (customer_id, points_earned, transaction_type, description, created_at) 
            VALUES (?, ?, 'earn', ?, NOW())
        `, [customerId, welcomePoints, `Welcome points for new customer: ${customerName} (${customerEmail})`]);

        console.log(`✅ Awarded ${welcomePoints} welcome points to new customer ${customerId} (${customerEmail})`);

        return {
            success: true,
            pointsAwarded: welcomePoints,
            message: `Welcome points awarded: ${welcomePoints} points`
        };

    } catch (error) {
        console.error('Error awarding welcome points:', error);
        return {
            success: false,
            pointsAwarded: 0,
            message: `Error awarding welcome points: ${error.message}`
        };
    }
}

module.exports = {
        awardWelcomePoints