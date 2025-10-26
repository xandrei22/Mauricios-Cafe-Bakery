// Migration script to add staff_id column to orders table
// This enables staff sales performance tracking

const db = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        console.log('🔄 Starting staff_id migration...');
        
        // Read the SQL migration file
        const sqlPath = path.join(__dirname, '../config/add-staff-id-to-orders.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        
        // Split by semicolon and execute each statement
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        for (const statement of statements) {
            if (statement.toLowerCase().includes('describe')) {
                // For DESCRIBE statements, just log the result
                console.log('📋 Checking table structure...');
                const [rows] = await db.query(statement);
                console.log('Orders table structure:');
                rows.forEach(row => {
                    console.log(`  ${row.Field} - ${row.Type} (${row.Null === 'YES' ? 'NULL' : 'NOT NULL'})`);
                });
            } else {
                console.log(`🔧 Executing: ${statement.substring(0, 50)}...`);
                await db.query(statement);
                console.log('✅ Success');
            }
        }
        
        console.log('🎉 Migration completed successfully!');
        console.log('📊 Staff sales performance tracking is now enabled.');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Full error:', error);
    } finally {
        // Close the database connection
        process.exit(0);
    }
}

// Run the migration
runMigration();










