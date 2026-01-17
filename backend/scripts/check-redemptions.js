const db = require('../config/db');
require('dotenv').config();

async function checkRedemptions() {
    try {
        console.log('🔍 Checking redemption records in database...\n');

        // Check table structure
        console.log('1️⃣ Checking table structure...');
        const [columns] = await db.query('DESCRIBE loyalty_reward_redemptions');
        const orderIdColumn = columns.find(col => col.Field === 'order_id');
        if (orderIdColumn) {
            console.log(`   order_id column: ${orderIdColumn.Type} ${orderIdColumn.Null === 'NO' ? 'NOT NULL ❌' : 'NULL ✅'}`);
            if (orderIdColumn.Null === 'NO') {
                console.log('   ⚠️  WARNING: order_id is NOT NULL. Redemptions without orders will fail!');
                console.log('   💡 Run: node scripts/fix-redemption-order-id.js');
            }
        }

        // Count all redemptions
        console.log('\n2️⃣ Counting all redemptions...');
        const [allCount] = await db.query('SELECT COUNT(*) as count FROM loyalty_reward_redemptions');
        console.log(`   Total redemptions: ${allCount[0].count}`);

        // Count by status
        const [statusCount] = await db.query(`
            SELECT status, COUNT(*) as count 
            FROM loyalty_reward_redemptions 
            GROUP BY status
        `);
        console.log('   By status:');
        statusCount.forEach(row => {
            console.log(`     ${row.status}: ${row.count}`);
        });

        // Get pending redemptions
        console.log('\n3️⃣ Fetching pending redemptions...');
        const [pending] = await db.query(`
            SELECT 
                lrr.id,
                lrr.claim_code,
                lrr.status,
                lrr.order_id,
                lrr.redemption_date,
                lrr.expires_at,
                c.full_name as customer_name,
                lr.name as reward_name
            FROM loyalty_reward_redemptions lrr
            LEFT JOIN customers c ON lrr.customer_id = c.id
            LEFT JOIN loyalty_rewards lr ON lrr.reward_id = lr.id
            WHERE lrr.status = 'pending'
            ORDER BY lrr.redemption_date DESC
            LIMIT 10
        `);
        console.log(`   Found ${pending.length} pending redemptions:`);
        pending.forEach((r, i) => {
            console.log(`     ${i + 1}. ID: ${r.id}, Code: ${r.claim_code}, Customer: ${r.customer_name || 'N/A'}, Reward: ${r.reward_name || 'N/A'}, Order ID: ${r.order_id || 'NULL'}`);
        });

        // Check for redemptions with NULL order_id
        console.log('\n4️⃣ Checking redemptions with NULL order_id...');
        const [nullOrder] = await db.query(`
            SELECT COUNT(*) as count 
            FROM loyalty_reward_redemptions 
            WHERE order_id IS NULL
        `);
        console.log(`   Redemptions with NULL order_id: ${nullOrder[0].count}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('   Code:', error.code);
    } finally {
        // Close database connection if method exists
        if (db.end && typeof db.end === 'function') {
            await db.end();
        } else if (db.pool && db.pool.end && typeof db.pool.end === 'function') {
            await db.pool.end();
        }
        process.exit(0);
    }
}

checkRedemptions();

