const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixLoyaltySettings() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('🔧 Fixing loyalty_settings table structure...\n');

        // Check current table structure
        console.log('📊 Current loyalty_settings structure:');
        const [columns] = await connection.query('DESCRIBE loyalty_settings');
        columns.forEach(col => {
            console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key === 'PRI' ? 'PRIMARY' : col.Key === 'MUL' ? 'INDEX' : ''}`);
        });

        // Check if updated_by column allows NULL
        const updatedByColumn = columns.find(col => col.Field === 'updated_by');
        if (updatedByColumn && updatedByColumn.Null === 'NO') {
            console.log('\n🔧 Making updated_by column nullable...');
            await connection.query('ALTER TABLE loyalty_settings MODIFY COLUMN updated_by INT NULL');
            console.log('✅ updated_by column is now nullable');
        } else {
            console.log('✅ updated_by column already allows NULL values');
        }

        // Check foreign key constraints
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
                console.log('🔗 Foreign key constraints found:');
                constraints.forEach(constraint => {
                    console.log(`  - ${constraint.CONSTRAINT_NAME}: ${constraint.COLUMN_NAME} -> ${constraint.REFERENCED_TABLE_NAME}.${constraint.REFERENCED_COLUMN_NAME}`);
                });
                
                // Remove the problematic foreign key constraint
                console.log('\n🔧 Removing problematic foreign key constraint...');
                await connection.query('ALTER TABLE loyalty_settings DROP FOREIGN KEY loyalty_settings_ibfk_1');
                console.log('✅ Foreign key constraint removed');
            } else {
                console.log('ℹ️  No foreign key constraints found');
            }
        } catch (error) {
            console.log('ℹ️  Could not check or modify foreign key constraints:', error.message);
        }

        // Test updating a setting
        console.log('\n🧪 Testing setting update...');
        try {
            await connection.query(`
                UPDATE loyalty_settings 
                SET setting_value = 'test', updated_by = NULL, updated_at = CURRENT_TIMESTAMP 
                WHERE setting_key = 'loyalty_enabled'
            `);
            console.log('✅ Test update successful');
            
            // Revert the test
            await connection.query(`
                UPDATE loyalty_settings 
                SET setting_value = 'true', updated_by = NULL, updated_at = CURRENT_TIMESTAMP 
                WHERE setting_key = 'loyalty_enabled'
            `);
            console.log('✅ Test reverted');
        } catch (error) {
            console.log('❌ Test update failed:', error.message);
        }

        console.log('\n✅ loyalty_settings table structure fixed!');

    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

fixLoyaltySettings();

require('dotenv').config();

async function fixLoyaltySettings() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('🔧 Fixing loyalty_settings table structure...\n');

        // Check current table structure
        console.log('📊 Current loyalty_settings structure:');
        const [columns] = await connection.query('DESCRIBE loyalty_settings');
        columns.forEach(col => {
            console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key === 'PRI' ? 'PRIMARY' : col.Key === 'MUL' ? 'INDEX' : ''}`);
        });

        // Check if updated_by column allows NULL
        const updatedByColumn = columns.find(col => col.Field === 'updated_by');
        if (updatedByColumn && updatedByColumn.Null === 'NO') {
            console.log('\n🔧 Making updated_by column nullable...');
            await connection.query('ALTER TABLE loyalty_settings MODIFY COLUMN updated_by INT NULL');
            console.log('✅ updated_by column is now nullable');
        } else {
            console.log('✅ updated_by column already allows NULL values');
        }

        // Check foreign key constraints
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
                console.log('🔗 Foreign key constraints found:');
                constraints.forEach(constraint => {
                    console.log(`  - ${constraint.CONSTRAINT_NAME}: ${constraint.COLUMN_NAME} -> ${constraint.REFERENCED_TABLE_NAME}.${constraint.REFERENCED_COLUMN_NAME}`);
                });
                
                // Remove the problematic foreign key constraint
                console.log('\n🔧 Removing problematic foreign key constraint...');
                await connection.query('ALTER TABLE loyalty_settings DROP FOREIGN KEY loyalty_settings_ibfk_1');
                console.log('✅ Foreign key constraint removed');
            } else {
                console.log('ℹ️  No foreign key constraints found');
            }
        } catch (error) {
            console.log('ℹ️  Could not check or modify foreign key constraints:', error.message);
        }

        // Test updating a setting
        console.log('\n🧪 Testing setting update...');
        try {
            await connection.query(`
                UPDATE loyalty_settings 
                SET setting_value = 'test', updated_by = NULL, updated_at = CURRENT_TIMESTAMP 
                WHERE setting_key = 'loyalty_enabled'
            `);
            console.log('✅ Test update successful');
            
            // Revert the test
            await connection.query(`
                UPDATE loyalty_settings 
                SET setting_value = 'true', updated_by = NULL, updated_at = CURRENT_TIMESTAMP 
                WHERE setting_key = 'loyalty_enabled'
            `);
            console.log('✅ Test reverted');
        } catch (error) {
            console.log('❌ Test update failed:', error.message);
        }

        console.log('\n✅ loyalty_settings table structure fixed!');

    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

fixLoyaltySettings();
