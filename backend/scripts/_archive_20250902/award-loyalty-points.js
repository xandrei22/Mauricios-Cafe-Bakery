const db = require('../config/db');
require('dotenv').config();

async function awardLoyaltyPoints() {
    try {
        console.log('🎁 Awarding loyalty points to customers...\n');

        // Get all customers with paid orders
        const [customers] = await db.query(`
            SELECT DISTINCT c.id, c.full_name, c.email, c.loyalty_points
            FROM customers c
            JOIN orders o ON c.id = o.customer_id
            WHERE o.payment_status = 'paid'
            ORDER BY c.id
        `);

        console.log(`Found ${customers.length} customers with paid orders\n`);

        for (const customer of customers) {
            console.log(`Processing customer: ${customer.full_name} (ID: ${customer.id})`);
            
            // Get total spent from paid orders
            const [orderTotal] = await db.query(`
                SELECT COALESCE(SUM(o.total_price), 0) as total_spent
                FROM orders o
                WHERE o.customer_id = ? AND o.payment_status = 'paid'
            `, [customer.id]);

            const totalSpent = parseFloat(orderTotal[0].total_spent) || 0;
            const pointsToAward = Math.floor(totalSpent); // 1 point per peso
            
            if (pointsToAward > 0) {
                // Check if points were already awarded
                const [existingPoints] = await db.query(`
                    SELECT COALESCE(SUM(points_earned), 0) as total_earned
                    FROM loyalty_transactions 
                    WHERE customer_id = ? AND transaction_type = 'earn'
                `, [customer.id]);

                const alreadyEarned = parseInt(existingPoints[0].total_earned) || 0;
                const pointsNeeded = pointsToAward - alreadyEarned;

                if (pointsNeeded > 0) {
                    console.log(`  - Total spent: ₱${totalSpent}`);
                    console.log(`  - Points already earned: ${alreadyEarned}`);
                    console.log(`  - Points to award: ${pointsNeeded}`);

                    // Award points
                    await db.query(`
                        UPDATE customers 
                        SET loyalty_points = loyalty_points + ? 
                        WHERE id = ?
                    `, [pointsNeeded, customer.id]);

                    // Record transaction for each order that hasn't earned points yet
                    const [unprocessedOrders] = await db.query(`
                        SELECT o.id, o.order_id, o.total_price
                        FROM orders o
                        LEFT JOIN loyalty_transactions lt ON o.id = lt.order_id AND lt.transaction_type = 'earn'
                        WHERE o.customer_id = ? 
                        AND o.payment_status = 'paid'
                        AND lt.id IS NULL
                        ORDER BY o.created_at
                    `, [customer.id]);

                    for (const order of unprocessedOrders) {
                        const orderPoints = Math.floor(order.total_price);
                        if (orderPoints > 0) {
                            await db.query(`
                                INSERT INTO loyalty_transactions 
                                (customer_id, order_id, points_earned, transaction_type, description) 
                                VALUES (?, ?, ?, 'earn', ?)
                            `, [
                                customer.id, 
                                order.id, 
                                orderPoints, 
                                `Earned ${orderPoints} points from order #${order.order_id} (₱${order.total_price})`
                            ]);
                            console.log(`    ✓ Awarded ${orderPoints} points for order ${order.order_id}`);
                        }
                    }

                    console.log(`  ✅ Successfully awarded ${pointsNeeded} points to ${customer.full_name}`);
                } else {
                    console.log(`  - Already has ${alreadyEarned} points (no action needed)`);
                }
            } else {
                console.log(`  - No orders to process`);
            }
            
            console.log('');
        }

        // Show final summary
        console.log('📊 Final Points Summary:');
        const [finalSummary] = await db.query(`
            SELECT 
                c.id,
                c.full_name,
                c.loyalty_points,
                COALESCE(SUM(lt.points_earned), 0) as total_earned,
                COALESCE(SUM(lt.points_redeemed), 0) as total_redeemed
            FROM customers c
            LEFT JOIN loyalty_transactions lt ON c.id = lt.customer_id
            GROUP BY c.id, c.full_name, c.loyalty_points
            ORDER BY c.loyalty_points DESC
        `);

        finalSummary.forEach(customer => {
            console.log(`  ${customer.full_name}: ${customer.loyalty_points} current, ${customer.total_earned} earned, ${customer.total_redeemed} redeemed`);
        });

        console.log('\n✅ Loyalty points awarded successfully!');

    } catch (error) {
        console.error('❌ Error awarding loyalty points:', error);
    } finally {
        process.exit(0);
    }
}

awardLoyaltyPoints();
