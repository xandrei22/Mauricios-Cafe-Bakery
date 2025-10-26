const db = require('../config/db');
require('dotenv').config();

async function checkCustomerPoints() {
    try {
        console.log('🔍 Checking customer points after award script...\n');

        const customerId = 49;

        // Check customer points
        const [customers] = await db.query(`
            SELECT id, full_name, loyalty_points, email
            FROM customers WHERE id = ?
        `, [customerId]);

        if (customers.length === 0) {
            console.log('❌ Customer not found');
            return;
        }

        const customer = customers[0];
        console.log(`Customer: ${customer.full_name} (${customer.email})`);
        console.log(`Current points: ${customer.loyalty_points}`);

        // Check loyalty transactions
        const [transactions] = await db.query(`
            SELECT transaction_type, points_earned, points_redeemed, created_at
            FROM loyalty_transactions 
            WHERE customer_id = ?
            ORDER BY created_at DESC
            LIMIT 10
        `, [customerId]);

        console.log('\nRecent transactions:');
        transactions.forEach(tx => {
            if (tx.transaction_type === 'earn') {
                console.log(`  +${tx.points_earned} points earned at ${tx.created_at}`);
            } else if (tx.transaction_type === 'redeem') {
                console.log(`  -${tx.points_redeemed} points redeemed at ${tx.created_at}`);
            }
        });

        // Check total earned vs redeemed
        const [totals] = await db.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN transaction_type = 'earn' THEN points_earned ELSE 0 END), 0) as total_earned,
                COALESCE(SUM(CASE WHEN transaction_type = 'redeem' THEN points_redeemed ELSE 0 END), 0) as total_redeemed
            FROM loyalty_transactions 
            WHERE customer_id = ?
        `, [customerId]);

        console.log('\nTotals:');
        console.log(`  Total earned: ${totals[0].total_earned}`);
        console.log(`  Total redeemed: ${totals[0].total_redeemed}`);
        console.log(`  Expected current: ${totals[0].total_earned - totals[0].total_redeemed}`);
        console.log(`  Actual current: ${customer.loyalty_points}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit(0);
    }
}


