const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDatabaseStructure() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('🔍 Checking database structure...\n');

        // Check if users table exists
        const [tables] = await connection.query('SHOW TABLES');
        console.log('📋 Available tables:');
        tables.forEach(table => {
            console.log(`  - ${Object.values(table)[0]}`);
        });

        // Check loyalty_settings table structure
        console.log('\n🔍 Checking loyalty_settings table structure...');
        try {
            const [columns] = await connection.query('DESCRIBE loyalty_settings');
            console.log('📊 loyalty_settings columns:');
            columns.forEach(col => {
                console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key === 'PRI' ? 'PRIMARY' : col.Key === 'MUL' ? 'INDEX' : ''}`);
            });
        } catch (error) {
            console.log('❌ loyalty_settings table does not exist');
        }

        // Check if users table exists and has data
        console.log('\n🔍 Checking users table...');
        try {
            const [users] = await connection.query('SELECT * FROM users LIMIT 5');
            console.log(`✅ users table exists with ${users.length} records`);
            if (users.length > 0) {
                console.log('📋 Sample users:');
                users.forEach(user => {
                    console.log(`  - ID: ${user.id}, Username: ${user.username}, Role: ${user.role}`);
                });
            }
        } catch (error) {
            console.log('❌ users table does not exist or has issues');
        }

        // Check loyalty_settings foreign key constraints
        console.log('\n🔍 Checking foreign key constraints...');
        try {
            const [constraints] = await connection.query(`
                SELECT 
                    CONSTRAINT_NAME,
                    COLUMN_NAME,
                    REFERENCED_TABLE_NAME,
                    REFERENCED_COLUMN_NAME
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                WHERE TABLE_SCHEMA = ? 
                AND TABLE_NAME = 'loyalty_settings'
                AND REFERENCED_TABLE_NAME IS NOT NULL
            `, [process.env.DB_NAME]);
            
            if (constraints.length > 0) {
                console.log('🔗 Foreign key constraints:');
                constraints.forEach(constraint => {
                    console.log(`  - ${constraint.CONSTRAINT_NAME}: ${constraint.COLUMN_NAME} -> ${constraint.REFERENCED_TABLE_NAME}.${constraint.REFERENCED_COLUMN_NAME}`);
                });
            } else {
                console.log('ℹ️  No foreign key constraints found');
            }
        } catch (error) {
            console.log('❌ Could not check foreign key constraints:', error.message);
        }

    } catch (error) {
        console.error('❌ Database connection error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkDatabaseStructure();

checkDatabaseStructure();
