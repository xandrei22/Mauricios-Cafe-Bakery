const db = require('../config/db');
const fs = require('fs');
const path = require('path');

async function setupAdminInventorySystem() {
    console.log('🚀 Setting up Admin Inventory & POS Management System...');
    
    try {
        // Read and execute the enhanced admin schema
        const schemaPath = path.join(__dirname, '../config/enhanced-admin-schema.sql');
        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
        
        // Split SQL statements and execute them
        const statements = schemaSQL.split(';').filter(stmt => stmt.trim().length > 0);
        
        for (const statement of statements) {
            try {
                await db.query(statement);
                console.log('✅ Executed SQL statement successfully');
            } catch (error) {
                // Some ALTER TABLE statements might fail if columns already exist
                if (error.code === 'ER_DUP_FIELDNAME') {
                    console.log('⚠️  Column already exists, skipping...');
                } else {
                    console.log('⚠️  SQL statement failed:', error.message);
                }
            }
        }
        
        // Verify the setup by checking if new tables exist
        const [tables] = await db.query(`
            SELECT TABLE_NAME 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE() 
            AND TABLE_NAME IN ('unit_conversions', 'inventory_deductions', 'admin_activity_log', 'pos_settings')
        `);
        
        console.log(`✅ Found ${tables.length} new tables:`, tables.map(t => t.TABLE_NAME));
        
        // Check if menu_items table has new columns
        const [columns] = await db.query(`
            SELECT COLUMN_NAME 
            FROM information_schema.columns 
            WHERE table_schema = DATABASE() 
            AND table_name = 'menu_items' 
            AND COLUMN_NAME IN ('pos_visible', 'customer_visible', 'allow_customization')
        `);
        
        console.log(`✅ Found ${columns.length} new columns in menu_items:`, columns.map(c => c.COLUMN_NAME));
        
        // Verify unit conversions data
        const [conversions] = await db.query('SELECT COUNT(*) as count FROM unit_conversions');
        console.log(`✅ Unit conversions table has ${conversions[0].count} records`);
        
        // Verify POS settings
        const [settings] = await db.query('SELECT COUNT(*) as count FROM pos_settings');
        console.log(`✅ POS settings table has ${settings[0].count} records`);
        
        console.log('🎉 Admin Inventory & POS Management System setup completed successfully!');
        
    } catch (error) {
        console.error('❌ Setup failed:', error);
        throw error;
    }
}

// Run setup if called directly
if (require.main === module) {
    setupAdminInventorySystem()
        .then(() => {
            console.log('Setup completed. Exiting...');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Setup failed:', error);
            process.exit(1);
        });
}

module.exports = { setupAdminInventorySystem };
