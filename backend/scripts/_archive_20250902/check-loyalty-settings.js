const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkLoyaltySettings() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('🔍 Checking loyalty settings...\n');

        // Check loyalty settings
        const [settings] = await connection.query('SELECT * FROM loyalty_settings ORDER BY setting_key');
        console.log(`📊 Found ${settings.length} loyalty settings:`);
        
        settings.forEach(setting => {
            console.log(`  - ${setting.setting_key}: ${setting.setting_value}`);
        });

        // Check if loyalty is enabled
        const loyaltyEnabled = settings.find(s => s.setting_key === 'loyalty_enabled');
        const pointsPerPeso = settings.find(s => s.setting_key === 'points_per_peso');
        
        console.log('\n🎯 Key Settings:');
        console.log(`  - Loyalty System: ${loyaltyEnabled ? loyaltyEnabled.setting_value : 'NOT SET'}`);
        console.log(`  - Points per Peso: ${pointsPerPeso ? pointsPerPeso.setting_value : 'NOT SET'}`);

        if (!loyaltyEnabled || loyaltyEnabled.setting_value !== 'true') {
            console.log('\n⚠️  WARNING: Loyalty system is not enabled!');
            console.log('   Customers will not earn points from orders.');
        }

        if (!pointsPerPeso || parseFloat(pointsPerPeso.setting_value) <= 0) {
            console.log('\n⚠️  WARNING: Points per peso is not set or invalid!');
            console.log('   Customers will not earn points from orders.');
        }

        // Check customer loyalty points
        const [customers] = await connection.query(`
            SELECT id, full_name, loyalty_points, created_at 
            FROM customers 
            WHERE loyalty_points > 0 
            ORDER BY loyalty_points DESC 
            LIMIT 5
        `);
        
        console.log('\n👥 Top customers by loyalty points:');
        if (customers.length === 0) {
            console.log('  - No customers with loyalty points found');
        } else {
            customers.forEach(customer => {
                console.log(`  - ${customer.full_name} (ID: ${customer.id}): ${customer.loyalty_points} points`);
            });
        }

    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkLoyaltySettings();

require('dotenv').config();

async function checkLoyaltySettings() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('🔍 Checking loyalty settings...\n');

        // Check loyalty settings
        const [settings] = await connection.query('SELECT * FROM loyalty_settings ORDER BY setting_key');
        console.log(`📊 Found ${settings.length} loyalty settings:`);
        
        settings.forEach(setting => {
            console.log(`  - ${setting.setting_key}: ${setting.setting_value}`);
        });

        // Check if loyalty is enabled
        const loyaltyEnabled = settings.find(s => s.setting_key === 'loyalty_enabled');
        const pointsPerPeso = settings.find(s => s.setting_key === 'points_per_peso');
        
        console.log('\n🎯 Key Settings:');
        console.log(`  - Loyalty System: ${loyaltyEnabled ? loyaltyEnabled.setting_value : 'NOT SET'}`);
        console.log(`  - Points per Peso: ${pointsPerPeso ? pointsPerPeso.setting_value : 'NOT SET'}`);

        if (!loyaltyEnabled || loyaltyEnabled.setting_value !== 'true') {
            console.log('\n⚠️  WARNING: Loyalty system is not enabled!');
            console.log('   Customers will not earn points from orders.');
        }

        if (!pointsPerPeso || parseFloat(pointsPerPeso.setting_value) <= 0) {
            console.log('\n⚠️  WARNING: Points per peso is not set or invalid!');
            console.log('   Customers will not earn points from orders.');
        }

        // Check customer loyalty points
        const [customers] = await connection.query(`
            SELECT id, full_name, loyalty_points, created_at 
            FROM customers 
            WHERE loyalty_points > 0 
            ORDER BY loyalty_points DESC 
            LIMIT 5
        `);
        
        console.log('\n👥 Top customers by loyalty points:');
        if (customers.length === 0) {
            console.log('  - No customers with loyalty points found');
        } else {
            customers.forEach(customer => {
                console.log(`  - ${customer.full_name} (ID: ${customer.id}): ${customer.loyalty_points} points`);
            });
        }

    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkLoyaltySettings();
