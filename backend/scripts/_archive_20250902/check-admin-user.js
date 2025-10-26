const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkAdminUser() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('🔍 Checking admin user in database...\n');

        // Check all users
        const [users] = await connection.query('SELECT * FROM users ORDER BY id');
        console.log('📋 All users in database:');
        users.forEach(user => {
            console.log(`  - ID: ${user.id}, Username: ${user.username}, Role: ${user.role}, Email: ${user.email}`);
        });

        // Check if there's an admin user
        const [adminUsers] = await connection.query("SELECT * FROM users WHERE role = 'admin'");
        console.log(`\n👑 Admin users found: ${adminUsers.length}`);
        if (adminUsers.length > 0) {
            adminUsers.forEach(admin => {
                console.log(`  - ID: ${admin.id}, Username: ${admin.username}, Email: ${admin.email}`);
            });
        } else {
            console.log('❌ No admin user found!');
        }

        // Check if we need to create an admin user or update existing one
        if (adminUsers.length === 0) {
            console.log('\n🔧 Creating admin user...');
            const [result] = await connection.query(`
                INSERT INTO users (username, email, password, role, full_name, created_at) 
                VALUES (?, ?, ?, ?, ?, NOW())
            `, ['admin', 'alexandrei1628@gmail.com', '$2b$10$dummy.hash.for.admin', 'admin', 'Admin User']);
            
            console.log(`✅ Admin user created with ID: ${result.insertId}`);
        }

        // Check loyalty_settings table
        console.log('\n🔍 Checking loyalty_settings table...');
        try {
            const [settings] = await connection.query('SELECT * FROM loyalty_settings LIMIT 5');
            console.log(`📊 Found ${settings.length} loyalty settings`);
            if (settings.length > 0) {
                settings.forEach(setting => {
                    console.log(`  - ${setting.setting_key}: ${setting.setting_value} (updated_by: ${setting.updated_by})`);
                });
            }
        } catch (error) {
            console.log('❌ loyalty_settings table error:', error.message);
        }

    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkAdminUser();

require('dotenv').config();

async function checkAdminUser() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('🔍 Checking admin user in database...\n');

        // Check all users
        const [users] = await connection.query('SELECT * FROM users ORDER BY id');
        console.log('📋 All users in database:');
        users.forEach(user => {
            console.log(`  - ID: ${user.id}, Username: ${user.username}, Role: ${user.role}, Email: ${user.email}`);
        });

        // Check if there's an admin user
        const [adminUsers] = await connection.query("SELECT * FROM users WHERE role = 'admin'");
        console.log(`\n👑 Admin users found: ${adminUsers.length}`);
        if (adminUsers.length > 0) {
            adminUsers.forEach(admin => {
                console.log(`  - ID: ${admin.id}, Username: ${admin.username}, Email: ${admin.email}`);
            });
        } else {
            console.log('❌ No admin user found!');
        }

        // Check if we need to create an admin user or update existing one
        if (adminUsers.length === 0) {
            console.log('\n🔧 Creating admin user...');
            const [result] = await connection.query(`
                INSERT INTO users (username, email, password, role, full_name, created_at) 
                VALUES (?, ?, ?, ?, ?, NOW())
            `, ['admin', 'alexandrei1628@gmail.com', '$2b$10$dummy.hash.for.admin', 'admin', 'Admin User']);
            
            console.log(`✅ Admin user created with ID: ${result.insertId}`);
        }

        // Check loyalty_settings table
        console.log('\n🔍 Checking loyalty_settings table...');
        try {
            const [settings] = await connection.query('SELECT * FROM loyalty_settings LIMIT 5');
            console.log(`📊 Found ${settings.length} loyalty settings`);
            if (settings.length > 0) {
                settings.forEach(setting => {
                    console.log(`  - ${setting.setting_key}: ${setting.setting_value} (updated_by: ${setting.updated_by})`);
                });
            }
        } catch (error) {
            console.log('❌ loyalty_settings table error:', error.message);
        }

    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkAdminUser();
