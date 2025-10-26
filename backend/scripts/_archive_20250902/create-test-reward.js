const mysql = require('mysql2/promise');
require('dotenv').config();

async function createTestReward() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('🎁 Creating test reward...\n');

        // Create a simple test reward
        const [result] = await connection.query(`
            INSERT INTO loyalty_rewards (name, description, points_required, reward_type, discount_percentage, is_active) 
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            'Free Coffee',
            'Get any coffee drink for free',
            50,
            'drink',
            null,
            true
        ]);

        console.log(`✅ Test reward created with ID: ${result.insertId}`);

        // Verify it was created
        const [rewards] = await connection.query('SELECT * FROM loyalty_rewards WHERE id = ?', [result.insertId]);
        console.log('\n📋 Reward details:');
        console.log(`  - ID: ${rewards[0].id}`);
        console.log(`  - Name: "${rewards[0].name}"`);
        console.log(`  - Points Required: ${rewards[0].points_required}`);
        console.log(`  - Type: ${rewards[0].reward_type}`);
        console.log(`  - Active: ${rewards[0].is_active}`);

    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

createTestReward();


async function createTestReward() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('🎁 Creating test reward...\n');

        // Create a simple test reward
        const [result] = await connection.query(`
            INSERT INTO loyalty_rewards (name, description, points_required, reward_type, discount_percentage, is_active) 
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            'Free Coffee',
            'Get any coffee drink for free',
            50,
            'drink',
            null,
            true
        ]);

        console.log(`✅ Test reward created with ID: ${result.insertId}`);

        // Verify it was created
        const [rewards] = await connection.query('SELECT * FROM loyalty_rewards WHERE id = ?', [result.insertId]);
        console.log('\n📋 Reward details:');
        console.log(`  - ID: ${rewards[0].id}`);
        console.log(`  - Name: "${rewards[0].name}"`);
        console.log(`  - Points Required: ${rewards[0].points_required}`);
        console.log(`  - Type: ${rewards[0].reward_type}`);
        console.log(`  - Active: ${rewards[0].is_active}`);

    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

createTestReward();
